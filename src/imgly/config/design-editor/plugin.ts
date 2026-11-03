/**
 * Design editor configuration.
 *
 * Bundles the feature flags, UI layout, actions and engine settings this
 * demo uses into one plugin, so `initEditor` is a single `addPlugin` call.
 * Keyboard shortcuts come from this config's own catalog in
 * `keyboard/`. The `ly.img.keyboard.shortcuts` feature in `features.ts`
 * only attaches the listener; it registers nothing by itself.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/
 * @see https://img.ly/docs/cesdk/js/configuration-2c1c3d/
 */

import type { EditorPlugin, EditorPluginContext } from '@cesdk/cesdk-js';
import CreativeEditorSDK from '@cesdk/cesdk-js';

import { setupActions } from './actions';
import { setupFeatures } from './features';
import { setupKeyboardShortcuts } from './keyboard/keyboard';
import { setupSettings } from './settings';
import { setupUI } from './ui';

export class DesignEditorConfig implements EditorPlugin {
  name = 'cesdk-design-editor';

  version = CreativeEditorSDK.version;

  async initialize({ cesdk, engine }: EditorPluginContext) {
    if (!cesdk) return;

    // Start from a clean slate, in case an earlier config was applied.
    cesdk.resetEditor();

    setupFeatures(cesdk);
    setupUI(cesdk);
    setupActions(cesdk);
    setupKeyboardShortcuts(cesdk);
    setupSettings(engine);
  }
}
