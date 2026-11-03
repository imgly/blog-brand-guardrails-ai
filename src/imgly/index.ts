/**
 * Editor initialization.
 *
 * Wires the design editor configuration and the standard asset sources
 * into a CE.SDK instance.
 *
 * There are no AI panels in the editor on purpose. The starter kit's AI
 * Apps plugin lets a user generate an image and drop it anywhere on the
 * page; this demo allows AI output in exactly one place, the template's
 * image placeholder, and `src/generate.ts` is the only code that puts it
 * there.
 *
 * @see https://img.ly/docs/cesdk/js/get-started/overview-e18f40/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import {
  ColorPaletteAssetSource,
  CropPresetsAssetSource,
  DemoAssetSources,
  TypefaceAssetSource,
  UploadAssetSources
} from '@cesdk/cesdk-js/plugins';

import { DesignEditorConfig } from './config/design-editor/plugin';

export { DesignEditorConfig } from './config/design-editor/plugin';

export async function initEditor(cesdk: CreativeEditorSDK): Promise<void> {
  await cesdk.addPlugin(new DesignEditorConfig());
  cesdk.ui.setTheme('light');

  await Promise.all([
    cesdk.addPlugin(new ColorPaletteAssetSource()),
    cesdk.addPlugin(new TypefaceAssetSource()),
    cesdk.addPlugin(new CropPresetsAssetSource())
  ]);
  await cesdk.addPlugin(
    new UploadAssetSources({ include: ['ly.img.image.upload'] })
  );
  await cesdk.addPlugin(new DemoAssetSources({ include: ['ly.img.image.*'] }));
}
