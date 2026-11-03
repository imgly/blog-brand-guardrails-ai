/**
 * Inspector bar: the contextual toolbar above the canvas.
 *
 * Only the controls the template's editable blocks can use: text styling
 * for the headline, fill color, crop for the image placeholder, and
 * position.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/inspector-bar-cd3b78/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupInspectorBar(cesdk: CreativeEditorSDK): void {
  cesdk.ui.setComponentOrder(
    { in: 'ly.img.inspector.bar', when: { editMode: 'Transform' } },
    [
      'ly.img.spacer',
      // Text
      'ly.img.text.typeFace.inspectorBar',
      'ly.img.text.bold.inspectorBar',
      'ly.img.text.italic.inspectorBar',
      'ly.img.text.fontSize.inspectorBar',
      'ly.img.text.alignHorizontal.inspectorBar',
      'ly.img.text.advanced.inspectorBar',
      'ly.img.separator',
      // Fill and crop
      'ly.img.fill.inspectorBar',
      'ly.img.crop.inspectorBar',
      'ly.img.separator',
      'ly.img.position.inspectorBar',
      'ly.img.spacer',
      'ly.img.separator',
      'ly.img.inspectorToggle.inspectorBar'
    ]
  );

  cesdk.ui.setComponentOrder(
    { in: 'ly.img.inspector.bar', when: { editMode: 'Crop' } },
    ['ly.img.cropControls.inspectorBar']
  );
}
