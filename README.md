# Styfi

Styfi is a fashion marketplace prototype with AI-assisted styling and seller tools. The catalogue currently contains demo products; there is no checkout, payment processing or live seller inventory.

## Personal Gemini API key (BYOK)

Each user supplies their own Google Gemini API key in **AI Settings**. The frontend stores the key in that browser's local storage and includes it in the HTTPS request body to the Cloudflare Worker. The Worker uses the supplied key for that request and does not persist it. No shared Gemini API key is required in Cloudflare.

- Create a key at https://aistudio.google.com/apikey.
- Open Styfi → AI Settings → paste the key → Test & Save.
- Remove the key from AI Settings to disconnect it.
- Users are responsible for their Google AI Studio quota and any applicable charges.
- Local storage is accessible to scripts running on the same origin and to people with access to the browser profile. Do not use on shared or untrusted devices. Never log request bodies or API keys.

## AI features

- **Outfit Composer** — Gemini-generated styling suggestions.
- **Trend Detector** — fashion trend analysis based on model knowledge, not live market data.
- **Virtual Try-On** — requests an image generated from the user's photo and selected product.
- **Seller Studio** — requests product-image editing.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, Cloudflare Workers and Google Gemini API.

## Run the frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Vite runs at `http://localhost:3000`. `.env.local` contains only the public Worker URL:

```env
VITE_API_BASE_URL=https://styfi-backend.vishwajeetadkine705.workers.dev
```

Never put a Gemini key in a `VITE_*` variable or commit one to the repository.

## Worker routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/validate-key` | Verify a user's Gemini key |
| POST | `/api/trends` | Fashion trend analysis |
| POST | `/api/compose-outfit` | Outfit recommendations |
| POST | `/api/enhance-image` | Product image editing |
| POST | `/api/virtual-tryon` | Virtual try-on image generation |
| GET | `/api/health` | Worker health |

Set `APP_ORIGIN` to the exact deployed frontend origin, without a trailing slash. For production: `https://styfi-website.vercel.app`. The Worker must allow the `Content-Type` preflight header. Configure `GEMINI_TEXT_MODEL` and `GEMINI_IMAGE_MODEL`; no shared `GEMINI_API_KEY` secret is needed after deploying the BYOK Worker.

## Build

```bash
npm run build
npm run preview
```

## Demo limitations

Marketplace products are static sample data. Prices, sellers and inventory are illustrative. Trend scores are model-generated estimates, not measured market data. Image generation is subject to each user's Google account model access, quotas and billing.
