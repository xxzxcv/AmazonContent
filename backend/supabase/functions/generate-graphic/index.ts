import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CF_ACCOUNT = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Chunked to avoid call-stack overflow on large buffers.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Normalizes the three response shapes Workers AI image models return:
// raw image bytes, {result:{image:"<base64>"}}, or {result:{image:"<url>"}}.
async function relayImage(cfResp: Response): Promise<Response> {
  const ct = cfResp.headers.get("content-type") || "";
  if (!cfResp.ok) {
    const text = await cfResp.text();
    return json({ error: "cloudflare_ai_error", status: cfResp.status, detail: text.slice(0, 2000) }, 502);
  }
  if (ct.includes("application/json")) {
    const data = await cfResp.json();
    const img = data?.result?.image;
    if (!img || typeof img !== "string") {
      return json({ error: "no_image_in_response", raw: data }, 502);
    }
    if (/^https?:\/\//.test(img)) {
      const imgResp = await fetch(img);
      const buf = new Uint8Array(await imgResp.arrayBuffer());
      return json({ image: `data:image/png;base64,${bytesToBase64(buf)}` });
    }
    return json({ image: `data:image/png;base64,${img}` });
  }
  if (ct.startsWith("image/")) {
    const buf = new Uint8Array(await cfResp.arrayBuffer());
    return json({ image: `data:${ct};base64,${bytesToBase64(buf)}` });
  }
  const text = await cfResp.text();
  return json({ error: "unexpected_content_type", contentType: ct, raw: text.slice(0, 1000) }, 502);
}

async function handleCloudflare(body: any): Promise<Response> {
  if (!CF_ACCOUNT || !CF_TOKEN) {
    return json({ error: "server_misconfigured", detail: "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN secrets are not set on this Edge Function." }, 500);
  }
  const prompt = String(body?.prompt || "").slice(0, 2000);
  if (!prompt) return json({ error: "prompt_required" }, 400);
  const width = Math.min(Math.max(Number(body?.width) || 1024, 256), 2048);
  const height = Math.min(Math.max(Number(body?.height) || 1024, 256), 2048);
  const mode = body?.mode === "reference" ? "reference" : "scene";

  if (mode === "scene") {
    // Pure text-to-image: no product photo involved. Good for backgrounds,
    // banners, decorative graphics, or headline-text-baked-in modules.
    const model = body?.model || "recraft/recraftv4-1";
    const cfResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: { prompt, size: `${width}x${height}` } }),
      },
    );
    return await relayImage(cfResp);
  }

  // reference mode: grounds the output in the seller's real product photo(s).
  const model = body?.model || "@cf/black-forest-labs/flux-2-klein-9b";
  const refs: string[] = Array.isArray(body?.referenceImages) ? body.referenceImages.slice(0, 4) : [];
  if (!refs.length) return json({ error: "reference_images_required" }, 400);

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  refs.forEach((b64, i) => {
    const bytes = base64ToBytes(b64);
    form.append(`input_image_${i}`, new Blob([bytes], { type: "image/png" }), `ref${i}.png`);
  });

  const cfResp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
    { method: "POST", headers: { "Authorization": `Bearer ${CF_TOKEN}` }, body: form },
  );
  return await relayImage(cfResp);
}

// Gemini image models ("Nano Banana" / "Nano Banana Pro") return generated
// images as inlineData parts inside the normal generateContent response —
// same endpoint shape as text generation, just with image parts requested.
async function handleGemini(body: any): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return json({ error: "server_misconfigured", detail: "GEMINI_API_KEY secret is not set on this Edge Function." }, 500);
  }
  const prompt = String(body?.prompt || "").slice(0, 4000);
  if (!prompt) return json({ error: "prompt_required" }, 400);
  const model = body?.model || "gemini-3-pro-image-preview";
  const refs: string[] = Array.isArray(body?.referenceImages) ? body.referenceImages.slice(0, 6) : [];

  const parts: Record<string, unknown>[] = refs.map((b64) => ({
    inlineData: { mimeType: "image/png", data: b64.includes(",") ? b64.split(",")[1] : b64 },
  }));
  parts.push({ text: prompt });

  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }] }),
    },
  );

  if (!geminiResp.ok) {
    const text = await geminiResp.text();
    return json({ error: "gemini_error", status: geminiResp.status, detail: text.slice(0, 2000) }, 502);
  }

  const data = await geminiResp.json();
  const responseParts: any[] = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = responseParts.find((p) => p?.inlineData?.data);
  if (!imgPart) {
    const textPart = responseParts.find((p) => typeof p?.text === "string");
    return json({ error: "no_image_in_response", detail: textPart?.text || "model returned no image part", raw: data }, 502);
  }
  const mime = imgPart.inlineData.mimeType || "image/png";
  return json({ image: `data:${mime};base64,${imgPart.inlineData.data}` });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400);
  }

  try {
    const provider = body?.provider === "gemini" ? "gemini" : "cloudflare";
    return provider === "gemini" ? await handleGemini(body) : await handleCloudflare(body);
  } catch (e) {
    return json({ error: "exception", detail: String((e as Error)?.message || e) }, 500);
  }
});
