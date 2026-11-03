/**
 * Keyboard shortcuts for this editor config.
 *
 * The catalog lives in `./catalogs/us-ansi` so the config stays
 * self-contained. This file is the thin wrapper that registers it. To ship a
 * different layout, swap in a sibling catalog with the same signature.
 *
 * @see ./catalogs/us-ansi
 * @see https://img.ly/docs/cesdk/js/user-interface/keyboard-f4c3d1/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { usAnsiCatalog } from './catalogs/us-ansi';

/** Register this config's keyboard shortcuts. */
export function setupKeyboardShortcuts(cesdk: CreativeEditorSDK): void {
  for (const shortcut of usAnsiCatalog) cesdk.shortcuts.set(shortcut);
}
