/**
 * Dock: the asset libraries down the left edge.
 *
 * There is no AI entry. In this demo AI output may land in one place only,
 * the template's image placeholder, and `src/generate.ts` puts it there.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/dock-cb916c/
 * @see https://img.ly/docs/cesdk/js/user-interface/appearance/icons-679e32/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupDock(cesdk: CreativeEditorSDK): void {
  cesdk.engine.editor.setSetting('dock/hideLabels', false);
  cesdk.engine.editor.setSetting('dock/iconSize', 'large');

  // Images and uploads only. In a locked template the user does not add
  // new elements; they fill the slots the template leaves open.
  cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, [
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.image',
      icon: '@imgly/Image',
      label: 'libraries.ly.img.image.label',
      entries: ['ly.img.image', 'ly.img.image.upload']
    },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.upload',
      icon: '@imgly/Upload',
      label: 'libraries.ly.img.upload.label',
      entries: ['ly.img.upload']
    }
  ]);
}
