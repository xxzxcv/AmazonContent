# A+ Content generator backend

Two live Supabase Edge Functions used by the standalone app in `../webapp/`
(and previously by chat-driven calls against the Shelfmark Artifact, which
can't `fetch()` any external host itself — a published Claude Artifact is
sandboxed).

- **Project:** `shelfmark` (Supabase project ref `mpqevzrtpyolfcjknccy`)
- **Functions:** `generate-content`, `generate-graphic`
- **Base URL:** `https://mpqevzrtpyolfcjknccy.supabase.co/functions/v1`

## Required secrets

Set these in the Supabase dashboard — Project Settings → Edge Functions →
Manage secrets (there's no MCP tool that can set these, so this one step has
to happen manually):

- `GEMINI_API_KEY` — a Google AI Studio API key. Text generation (content specs,
  feature suggestions) works on the free tier. **Image generation (Nano Banana /
  Nano Banana Pro) requires billing enabled** on the Google Cloud project behind
  the key — without it, `generate-graphic` with `provider:"gemini"` returns a
  `429` quota error. Enable billing at https://aistudio.google.com or the linked
  Google Cloud project, then no code change is needed.
- `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` — optional, only needed if
  calling `generate-graphic` with `provider:"cloudflare"` (Workers AI fallback).

## `generate-content` — drafts module specs / feature suggestions (Gemini text)

```
POST /functions/v1/generate-content
Content-Type: application/json

{
  "mode": "modules" | "features",   // default "modules"
  "productName": "string",
  "brand": "string, optional",
  "description": "string",
  "features": [{"text": "string", "approved": true}, ...],  // "modules" mode only
  "moduleCount": 7,                  // "modules" mode only
  "style": "string, visual direction guide",  // "modules" mode only
  "imageCount": 4,                   // "modules" mode only
  "model": "optional override, default gemini-flash-latest"
}
```

`mode:"modules"` responds `{"modules":[{"type","title","bullets","imagePrompt","layoutNotes"}, ...]}`.
`mode:"features"` responds `{"features": ["string", ...]}`.

## `generate-graphic` — generates the actual image (Gemini or Cloudflare)

```
POST /functions/v1/generate-graphic
Content-Type: application/json

{
  "provider": "gemini" | "cloudflare",   // default "cloudflare"
  "prompt": "string, what to generate",
  "width": 1464,
  "height": 600,
  "model": "optional override",
  "referenceImages": ["<base64>", ...]
}
```

- **`provider:"gemini"`** (recommended — grounds output in real product photos
  via Nano Banana / Nano Banana Pro, default model `gemini-3-pro-image-preview`).
  Needs billing enabled, see above.
- **`provider:"cloudflare"`** — the original Workers AI path.
  - **`mode:"scene"`** — pure text-to-image (default model `recraft/recraftv4-1`).
  - **`mode:"reference"`** — grounds output in real product photo(s) (default
    model `@cf/black-forest-labs/flux-2-klein-9b`). Reference images must be
    ≤512x512 (a platform limit on that model) — resize before sending.

## Response

```
{ "image": "data:image/png;base64,..." }
```
or on failure:
```
{ "error": "<code>", "detail"?: "...", "status"?: 502 }
```

## Testing it

```bash
curl -s -X POST "https://mpqevzrtpyolfcjknccy.supabase.co/functions/v1/generate-content" \
  -H "Content-Type: application/json" \
  -d '{"mode":"features","productName":"Value Plus Blue Centrefeed Rolls","description":"Highly absorbent, embossed 2-ply, pack of 6"}'
```
