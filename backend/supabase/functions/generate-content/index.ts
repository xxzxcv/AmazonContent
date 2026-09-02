import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

const RULES = [
  "Only use facts given in the product info below — never invent reviews, testimonials, awards, certifications, or competitor claims.",
  "If a comparison module is requested, only compare against 'typical' or 'standard' alternatives in generic terms, never a named competitor or brand.",
  "Write for Amazon A+ Content: short, scannable copy. Headlines under 8 words, body lines under 20 words.",
  "Every imagePrompt must describe a photo-realistic composition grounded in the seller's real product photos — not an abstract illustration replacing the product.",
].join("\n");

function buildModulesPrompt(body: any): string {
  const { productName, brand, description, features, moduleCount, style, imageCount } = body;
  const approvedFeatures = Array.isArray(features)
    ? features.filter((f: any) => f?.approved !== false).map((f: any) => f?.text || f).join("; ")
    : "";
  return [
    "You are drafting the module-by-module spec for an Amazon A+ Content page.",
    "",
    "PRODUCT INFO",
    `Name: ${productName || "(unnamed product)"}`,
    `Brand: ${brand || "(no brand given)"}`,
    `Description: ${description || "(none given)"}`,
    `Approved features: ${approvedFeatures || "(none given — infer conservatively from the description only)"}`,
    `Reference photos available: ${Number(imageCount) || 0}`,
    "",
    "STYLE",
    style ? String(style).slice(0, 500) : "No specific style given — propose something fitting for the product category.",
    "",
    "RULES",
    RULES,
    "",
    `Return exactly ${Number(moduleCount) || 7} modules as JSON only, matching this shape:`,
    `{"modules":[{"type":"hero|feature_bullets|use_cases|comparison|whats_in_box|brand_story|faq","title":"string","bullets":["string", ...],"imagePrompt":"string describing the photo-realistic image to generate, referencing the real product photo","layoutNotes":"string, one line"}]}`,
    "Output raw JSON only — no markdown fences, no commentary.",
  ].join("\n");
}

function buildFeaturesPrompt(body: any): string {
  const { productName, brand, description } = body;
  return [
    "Suggest 5-8 concrete, sellable features/benefits for this Amazon product, based only on the info given.",
    "Never invent specs, certifications, or claims not implied by the description.",
    "",
    `Name: ${productName || "(unnamed product)"}`,
    `Brand: ${brand || "(no brand given)"}`,
    `Description: ${description || "(none given)"}`,
    "",
    `Return JSON only: {"features":["string", ...]}. Each feature is a short phrase (under 12 words). No markdown fences, no commentary.`,
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!GEMINI_API_KEY) {
    return json({ error: "server_misconfigured", detail: "GEMINI_API_KEY secret is not set on this Edge Function." }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400);
  }
  if (!body?.productName && !body?.description) {
    return json({ error: "product_info_required", detail: "Provide at least productName or description." }, 400);
  }

  const model = body?.model || "gemini-flash-latest";
  const prompt = body?.mode === "features" ? buildFeaturesPrompt(body) : buildModulesPrompt(body);

  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!geminiResp.ok) {
      const text = await geminiResp.text();
      return json({ error: "gemini_error", status: geminiResp.status, detail: text.slice(0, 2000) }, 502);
    }

    const data = await geminiResp.json();
    const text = data?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text;
    if (!text) return json({ error: "no_text_in_response", raw: data }, 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "unparseable_json", raw: text.slice(0, 4000) }, 502);
    }
    return json(parsed);
  } catch (e) {
    return json({ error: "exception", detail: String((e as Error)?.message || e) }, 500);
  }
});
