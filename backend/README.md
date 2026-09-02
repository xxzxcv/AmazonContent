# Shelfmark image-generation backend

A live Supabase Edge Function that proxies to Cloudflare Workers AI to generate
real graphics — not something the Shelfmark Artifact can call directly (a
published Claude Artifact is sandboxed and cannot `fetch()` any external host),
so generation is triggered from chat: ask Claude to generate a graphic for a
module, and it calls this function directly.

- **Project:** `shelfmark` (Supabase project ref `mpqevzrtpyolfcjknccy`)
- **Function:** `generate-graphic`
- **URL:** `https://mpqevzrtpyolfcjknccy.supabase.co/functions/v1/generate-graphic`

## Required secrets

Set these in the Supabase dashboard — Project Settings → Edge Functions →
`generate-graphic` → Secrets (there's no MCP tool that can set these, so this
one step has to happen manually):

- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` — a token scoped to Workers AI (Account → Workers AI → Edit)

## Request shape

```
POST /functions/v1/generate-graphic
Authorization: Bearer <supabase anon/publishable key>
Content-Type: application/json

{
  "mode": "scene" | "reference",
  "prompt": "string, what to generate",
  "width": 1024,
  "height": 1024,
  "model": "optional override, e.g. recraft/recraftv4-1 or @cf/black-forest-labs/flux-1-schnell",
  "referenceImages": ["<base64>", ...]   // required for mode "reference", max 4, each ≤512x512
}
```

- **`scene`** — pure text-to-image (default model `recraft/recraftv4-1`, chosen for
  accurate in-image text rendering and strong composition). No product photo
  involved — good for backgrounds, banners, decorative graphics.
- **`reference`** — grounds the output in real product photo(s) (default model
  `@cf/black-forest-labs/flux-2-klein-9b`, Cloudflare's multi-reference model).
  Reference images must be ≤512x512 (a platform limit on that model) — resize
  before sending.

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
curl -s -X POST "https://mpqevzrtpyolfcjknccy.supabase.co/functions/v1/generate-graphic" \
  -H "Authorization: Bearer <anon key>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"scene","prompt":"a clean product photography backdrop, soft gradient, studio lighting","width":1024,"height":1024}'
```
