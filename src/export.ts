/**
 * Step 5: export only a design that passes every check.
 *
 * `exportChecked` runs the validator at the moment of export and refuses
 * if any check fails. It does not trust an earlier result: code can
 * change a design without the editor noticing, so the only result that
 * counts is the one taken right before the file is made.
 *
 * `gateEditorExports` puts the same check in front of the editor's own
 * export buttons, so there is no second way out of the editor.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { validate, type CheckResult } from './validator';

export interface ExportResult {
  report: CheckResult[];
  /** The exported file, or null when a check failed. */
  file: Blob | null;
}

export async function exportChecked(
  cesdk: CreativeEditorSDK,
  mimeType: 'image/png' | 'application/pdf' = 'image/png'
): Promise<ExportResult> {
  const engine = cesdk.engine;
  const report = await validate(engine);
  if (report.some((check) => !check.passed)) return { report, file: null };

  const page = engine.scene.getPages()[0];
  return { report, file: await engine.block.export(page, { mimeType }) };
}

/**
 * Wraps every export action the editor registered (its Export Images
 * and PDF buttons run these) so the validator runs first. A failing
 * design gets a notification listing what to fix instead of a file.
 */
export function gateEditorExports(cesdk: CreativeEditorSDK): void {
  for (const id of cesdk.actions.list({ matcher: 'export*' })) {
    if (id === 'exportScene') continue; // saving a draft is not publishing
    const original = cesdk.actions.get(id);
    if (original == null) continue;
    cesdk.actions.register(id, async (...args: any[]) => {
      const report = await validate(cesdk.engine);
      const failed = report.filter((check) => !check.passed);
      if (failed.length > 0) {
        cesdk.ui.showNotification({
          type: 'error',
          message: `Export blocked: ${failed.map((check) => check.message).join(' ')}`,
          duration: 'long'
        });
        return;
      }
      return (original as (...a: any[]) => unknown)(...args);
    });
  }
}

/** Plain browser download with a filename of our choosing. */
export function download(file: Blob, filename: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking in the same task can cancel the download before the browser
  // has read the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
