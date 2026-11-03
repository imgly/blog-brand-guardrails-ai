/**
 * Step 3: AI generation lands in the image placeholder, and nowhere else.
 *
 * There is one function, and it takes no target: it always writes into
 * the template's image block. The editor has no AI panels (see
 * `src/imgly/index.ts`), so this is the only way a generated image gets
 * into the design.
 *
 * The user's prompt goes after the brand kit's prefix, so every image
 * starts from the brand's look before the user's own words.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { GatewayClient } from '@imgly/plugin-ai-generation-web';

import { PROMPT_PREFIX } from './brand-kit';
import { buildInput } from './gateway';
import { BLOCK, findBlock } from './template';

// Gateway model ID, on IMG.LY's published model list. Any text-to-image
// ID from GET https://gateway.img.ly/v1/models works.
export const MODEL = 'ideogram/v3';

export async function generateIntoPlaceholder(
  cesdk: CreativeEditorSDK,
  client: GatewayClient,
  prompt: string
): Promise<void> {
  // The placeholder is 4:3, one of the formats Ideogram V3 accepts, so the
  // image fills it without cropping.
  const input = await buildInput(client, MODEL, {
    prompt: PROMPT_PREFIX + prompt,
    format: '4:3',
    style: 'REALISTIC'
  });
  const uri = await persistImage(await client.generate(MODEL, input, {}));

  const engine = cesdk.engine;
  const image = findBlock(engine, BLOCK.image);
  const fill = engine.block.getFill(image);
  // A library pick leaves a source set on the fill, which would win over
  // the new URI, so clear it.
  engine.block.setSourceSet(fill, 'fill/image/sourceSet', []);
  engine.block.setString(fill, 'fill/image/imageFileURI', uri);
  engine.block.resetCrop(image);
  // The slot is filled now. The editor does the same when a user picks
  // an image, which hides the placeholder overlay; the user can still
  // replace the image, because the block's scopes are unchanged.
  engine.block.setPlaceholderEnabled(image, false);
  engine.editor.addUndoStep();
}

/**
 * Gateway output URLs are short-lived (they redirect to signed storage
 * that expires within the hour), and the engine cannot always fetch them
 * directly. Download the image once and hand the engine a local object
 * URL. A product would upload the blob to its own storage here instead,
 * so saved designs keep working.
 */
export async function persistImage(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not download generated image (${response.status})`);
  }
  return URL.createObjectURL(await response.blob());
}
