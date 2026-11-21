# Styfi — AI Fashion Marketplace

Styfi is a demonstration fashion marketplace. It uses a curated catalogue of sample clothing products to explore AI-assisted outfit recommendations, fashion trend analysis, virtual try-on, and seller image enhancement. It is not a real store and does not process payments or orders.

## Stack

- React 19, TypeScript, and Vite
- Cloudflare Workers for server-side API routes
- Google Gemini API for AI features
- SDXL may be integrated for image-generation workflows where appropriate

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the Worker secret

Copy `.dev.vars.example` to `.dev.vars` and add your Gemini API key:

```ini
GEMINI_API_KEY="your-gemini-api-key"
```

Never put the Gemini API key in a `VITE_*` variable or frontend source file. Never commit `.dev.vars`.

### 3. Run the Worker

In one terminal:

```bash
npm run worker:dev
```

The Worker runs locally at `http://localhost:8787`. Check its health endpoint:

```text
http://localhost:8787/api/health
```

### 4. Run the frontend

In a second terminal:

```bash
npm run dev
```

Vite serves the frontend at `http://localhost:3000`.

## Cloudflare deployment

Authenticate Wrangler:

```bash
npx wrangler login
```

Add the Gemini API key as an encrypted Worker secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Deploy:

```bash
npm run worker:deploy
```

The Worker configuration is in `wrangler.jsonc`. Its current public health route is `GET /api/health`. Feature-specific AI routes will be added after their request/response behavior is agreed and implemented.

## Current implementation status

- [x] Cloudflare Worker project configuration
- [x] Worker health endpoint
- [x] Local secret template and Git ignore rules
- [ ] Gemini API integration
- [ ] AI outfit recommendations
- [ ] AI fashion trend analysis
- [ ] Gemini-powered virtual try-on workflow
- [ ] AI seller image enhancement
- [ ] Connect frontend feature components to Worker routes

AI features must call the backend. The browser must never receive the Gemini API key. AI outputs should not silently fall back to hardcoded sample recommendations or pretend that an image was generated.

## Project structure

```text
StyfiWebsite/
├── components/       # React UI components
├── services/         # Frontend API client
├── worker/
│   └── index.ts      # Cloudflare Worker entry point
├── wrangler.jsonc    # Worker configuration
├── App.tsx
├── index.tsx
├── types.ts
└── package.json
```
