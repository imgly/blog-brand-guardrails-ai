# Brand guardrails for AI-generated assets

Reference implementation for the IMG.LY article "How to keep AI-generated marketing assets on-brand".

A marketing template that a sales rep, franchisee or customer fills in, with the brand enforced by the editor instead of by a guidelines PDF: a locked logo and legal line, a palette the user cannot leave, two approved typefaces, one image slot that is the only place AI generation can land, and a validator that refuses to export anything that breaks the rules.

Built on IMG.LY's [AI Editor starter kit](https://github.com/imgly/starterkit-ai-editor-react-web) (React, CE.SDK 1.82.1). Built by Graeme ([graeme10142](https://github.com/graeme10142)).

**Status:** steps 1 to 5 are built. Step 6 (a human approval step) is optional in the article and not in the demo yet.

## Run it

Prerequisites: Node.js 22.18 or newer (it runs the TypeScript setup script directly), a Chromium, Firefox or Safari release from the last two years.

```bash
git clone https://github.com/imgly/blog-brand-guardrails-ai.git
cd blog-brand-guardrails-ai
npm install
npm run dev
```

Open http://localhost:5173. The engine assets load from IMG.LY's CDN, so there is nothing else to download.

## Keys

The app needs two keys from the [IMG.LY dashboard](https://img.ly/dashboard). Paste them into the Keys section of the panel (stored in that browser's localStorage only), or copy `.env.example` to `.env` and fill them in for local development.

| Key | What it is | Without it |
|---|---|---|
| CE.SDK license (`VITE_CESDK_LICENSE`) | Licenses the editor. Trial licenses are bound to the hostnames you register | The editor runs with a watermark |
| AI gateway key (`VITE_AI_API_KEY`, `sk_...`) | Pays for model calls, in credits | The "Generate image" button is disabled. The template, the locks and the validator still work |
| Stream key and secret (`STREAM_API_KEY`, `STREAM_API_SECRET`) | The content check (step 4), through [Stream's moderation API](https://getstream.io/moderation/). `.env` only: they are read on the server and never reach the browser | The content check fails with "could not run", so nothing exports. That's deliberate: an unchecked design is not a passing one |

With the Stream keys in `.env`, create the moderation policy once:

```bash
npm run setup:stream
```

It builds the policy from `src/brand-kit.ts`: a blocklist of the brand's banned words, and the image categories the brand refuses. Run it again after changing either.

## What to click

The panel on the right follows the article's steps.

3. **Generate the image.** Describe the picture and click "Generate image". The brand's prompt prefix goes in front, and the image lands in the template's image slot, the only place it can.
4. **Check the design.** Six checks: palette, typefaces, logo size, logo clear space, safe area, and the content check. Each failure says what to fix.
5. **Export PNG.** Unlocks after a clean check, and locks again on any edit. The editor's own Export Images and PDF buttons go through the same check.

**Test: break a rule.** Each button breaks one rule through the engine API, the way a design file from elsewhere could; the editor's locks don't stop code. Check the design to see the refusal, then "Start over".

## Where the code is

| File | Step | What it does |
|---|---|---|
| `src/brand-kit.ts` | 1 | The brand kit: palette, typefaces, logo rules, safe area, prompt prefix |
| `src/template.ts` | 2 | The locked template and what the user may change on each block |
| `src/generate.ts` | 3 | Image generation, written into the template's image slot and nowhere else |
| `src/gateway.ts` | 3 | Gateway client, schema-checked model input, and the model call counter |
| `src/validator.ts` | 4 | The six checks, each with its rule and a message to act on |
| `src/moderation.ts` | 4 | Content check, browser side: renders a small JPEG and sends it with the design's text |
| `server/moderate.ts` | 4 | Content check, server side: holds the Stream secret, calls Stream's `analyze` |
| `netlify/functions/moderate.ts` | 4 | The same handler as a Netlify function at `/api/moderate`. In `npm run dev` it runs as middleware (`vite.config.ts`) |
| `scripts/setup-stream.ts` | 4 | Creates the Stream policy from the brand kit |
| `src/export.ts` | 5 | Export only after every check passes, checked again at the moment of export; the editor's own export buttons are gated too |
| `src/app/violations.ts` | | The "break a rule" test buttons |
| `src/app/GuardrailsPanel.tsx` | | The panel that runs the steps |
| `src/app/settings.ts`, `src/app/KeysPanel.tsx` | | Where the keys come from, and the license check |
| `src/app/ai-credentials/` | | Hands the gateway key to the generation client, from the starter kit |
| `src/imgly/` | | Editor configuration from the starter kit, trimmed to a design editor with no AI panels |

## License

The editor configuration in `src/imgly/` and the credential handling in `src/app/ai-credentials/` come from IMG.LY's [AI Editor starter kit](https://github.com/imgly/starterkit-ai-editor-react-web). CE.SDK itself needs a license from IMG.LY: see [img.ly/pricing](https://img.ly/pricing).
