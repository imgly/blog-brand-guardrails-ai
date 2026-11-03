/**
 * Engine settings: how the canvas behaves.
 *
 * @see https://img.ly/docs/cesdk/js/settings-970c98/
 */

import type { CreativeEngine } from '@cesdk/cesdk-js';

export function setupSettings(engine: CreativeEngine): void {
  // Interaction
  engine.editor.setSetting('doubleClickToCropEnabled', true);

  // Page
  engine.editor.setSetting('page/allowCropInteraction', true);
  engine.editor.setSetting('page/dimOutOfPageAreas', true);
  engine.editor.setSetting('page/moveChildrenWhenCroppingFill', false);
  engine.editor.setSetting('page/selectWhenNoBlocksSelected', false);

  // The image placeholder's striped overlay and Replace button.
  engine.editor.setSetting('placeholderControls/showOverlay', true);
  engine.editor.setSetting('placeholderControls/showButton', true);

  engine.editor.setSetting('colorPicker/colorMode', 'Any');
}
