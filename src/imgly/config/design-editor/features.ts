/**
 * Which editor features this demo turns on.
 *
 * Only what the locked template needs: text editing for the headline,
 * replacing and cropping the image placeholder, moving and aligning the
 * headline, fill colors from the brand palette. Features control what the
 * UI shows; what a user may change on each block is set separately, by
 * the block scopes in `src/template.ts`.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupFeatures(cesdk: CreativeEditorSDK): void {
  cesdk.feature.enable([
    'ly.img.keyboard.shortcuts' /* Attaches the listener for the catalog in `keyboard/` */,

    'ly.img.navigation' /* Navigation bar, undo/redo, zoom, export */,
    'ly.img.canvas' /* Canvas menu */,
    'ly.img.dock' /* Asset dock */,
    'ly.img.library.panel' /* Asset library panel */,
    'ly.img.inspector' /* Inspector panel */,
    'ly.img.inspector.bar' /* Contextual toolbar */,
    'ly.img.inspector.toggle' /* Inspector toggle button */,
    'ly.img.notifications' /* Undo/redo and export-blocked notifications */,

    'ly.img.text' /* The headline is a real text block */,
    'ly.img.transform' /* Move and resize the headline */,
    'ly.img.position' /* Align the headline */,
    'ly.img.replace' /* Replace the placeholder's image */,
    'ly.img.crop' /* Crop the placeholder's image */,
    'ly.img.fill.color' /* Text color, from the brand palette */,
    'ly.img.fill.image'
  ]);
}
