/**
 * Step 4, server side: the content check.
 *
 * This holds the Stream secret, so it runs on a server and never in the
 * browser. The browser sends a small JPEG of the design and the design's
 * text; this forwards both to Stream's `analyze` endpoint, which answers
 * keep, flag or remove for each field, in the response.
 *
 * The same handler runs as a Netlify function in production
 * (`netlify/functions/moderate.ts`) and as middleware in `npm run dev`
 * (`vite.config.ts`).
 *
 * @see https://getstream.io/moderation/docs/node/content-moderation/check/#analyze
 */

import { createHmac } from 'node:crypto';

import { MODERATION } from '../src/brand-kit.ts';

const ANALYZE_URL = 'https://chat.stream-io-api.com/api/v2/moderation/analyze';

/** Stream's default limit for one image in an `analyze` call. */
const MAX_IMAGE_BYTES = 250 * 1024;

export interface ModerationEnv {
  STREAM_API_KEY?: string;
  STREAM_API_SECRET?: string;
}

export async function handleModerate(
  request: Request,
  env: ModerationEnv
): Promise<Response> {
  const { STREAM_API_KEY: apiKey, STREAM_API_SECRET: apiSecret } = env;
  if (!apiKey || !apiSecret) {
    return json({ error: 'Moderation is not set up on the server' }, 503);
  }
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let image: FormDataEntryValue | null;
  let texts: Record<string, string>;
  try {
    const form = await request.formData();
    image = form.get('image');
    texts = JSON.parse(String(form.get('texts') ?? '{}'));
  } catch {
    return json({ error: 'Send a form with an image and texts' }, 400);
  }
  if (!(image instanceof Blob) || image.size > MAX_IMAGE_BYTES) {
    return json({ error: 'Send one JPEG of at most 250 KB' }, 400);
  }

  // A stateless call: verdicts only, nothing goes to a review queue.
  const body = new FormData();
  body.append(
    'payload',
    new Blob([JSON.stringify({ config_key: MODERATION.policy, texts })], {
      type: 'application/json'
    })
  );
  body.append('image:design', image, 'design.jpg');

  const response = await fetch(`${ANALYZE_URL}?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      Authorization: serverToken(apiSecret),
      'stream-auth-type': 'jwt'
    },
    body
  });
  return json(await response.json(), response.status);
}

/**
 * Stream's server token: a JWT of `{ server: true }`, signed HS256 with
 * the API secret. It is what Stream's own Node SDK sends.
 */
function serverToken(secret: string): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ server: true })}`;
  const signature = createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}.${signature}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
