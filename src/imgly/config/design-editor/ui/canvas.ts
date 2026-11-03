/**
 * Canvas bar and canvas menu.
 *
 * The canvas menu is what pops up next to a selected block. It offers
 * only what the template's editable blocks allow: editing the headline's
 * text and replacing the placeholder's image. The canvas bar is empty,
 * since a user filling in the template does not add pages.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/canvas-menu-3d8b1e/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupCanvas(cesdk: CreativeEditorSDK): void {
  cesdk.ui.setComponentOrder({ in: 'ly.img.canvas.bar', at: 'bottom' }, []);

  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.menu', when: { editMode: 'Transform' } },
    [
      'ly.img.text.edit.canvasMenu',
      'ly.img.replace.canvasMenu',
      'ly.img.separator',
      'ly.img.options.canvasMenu'
    ]
  );

  cesdk.ui.setComponentOrder(
    { in: 'ly.img.canvas.menu', when: { editMode: 'Text' } },
    [
      'ly.img.text.color.canvasMenu',
      'ly.img.separator',
      'ly.img.text.bold.canvasMenu',
      'ly.img.text.italic.canvasMenu',
      'ly.img.text.underline.canvasMenu',
      'ly.img.text.strikethrough.canvasMenu'
    ]
  );
}
