/**
 * Step 4, browser side: the content check.
 *
 * Renders the page as a small JPEG (Stream takes up to 250 KB per image)
 * and sends it, with every text in the design, to `/api/moderate`, which
 * holds the Stream secret (see `server/moderate.ts`).
 */

import type { CreativeEngine } from '@cesdk/cesdk-js';

export interface Verdict {
  /** `image` for the rendered design, or the name of a text block. */
  field: string;
  action: 'keep' | 'flag' | 'remove' | 'error';
  /** What Stream matched: image categories, words, or the error. */
  labels: string[];
}

export async function moderateDesign(engine: CreativeEngine): Promise<Verdict[]> {
  const page = engine.scene.getPages()[0];
  const image = await engine.block.export(page, {
    mimeType: 'image/jpeg',
    jpegQuality: 0.8,
    targetWidth: 540,
    targetHeight: 675
  });

  const texts: Record<string, string> = {};
  for (const block of engine.block.findByType('text')) {
    const name = engine.block.getName(block) || `text-${block}`;
    texts[name] = engine.block.getString(block, 'text/text');
  }

  const form = new FormData();
  form.append('image', image, 'design.jpg');
  form.append('texts', JSON.stringify(texts));
  const response = await fetch('/api/moderate', { method: 'POST', body: form });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? result.message ?? `HTTP ${response.status}`);
  }

  return [
    toVerdict('image', result.images?.design),
    ...Object.entries(result.texts ?? {}).map(([field, verdict]) =>
      toVerdict(field, verdict)
    )
  ];
}

function toVerdict(field: string, verdict: any): Verdict {
  // Stream leaves `action` out when it could not screen a field. That is
  // not a pass.
  if (verdict == null || verdict.error != null || verdict.action == null) {
    return { field, action: 'error', labels: [verdict?.error ?? 'not screened'] };
  }
  const labels = [
    ...(verdict.classifications ?? []),
    ...(verdict.ocr_classifications ?? [])
  ].map((c: { name: string }) => c.name);
  return { field, action: verdict.action, labels };
}
