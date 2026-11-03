/**
 * The guardrails panel: one section per step of the article, in order.
 *
 * Sections appear here as their step is built, so every button in the
 * panel does what it says. Each step logs how long it took and how many
 * model calls it made, counted by the gateway client.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';

import { PROMPT_PREFIX } from '../brand-kit';
import { download, exportChecked } from '../export';
import { getGatewayClient, modelCallCount } from '../gateway';
import { generateIntoPlaceholder } from '../generate';
import { startTemplate } from '../template';
import { validate, type CheckResult } from '../validator';
import type { CredentialStatus } from './App';
import { VIOLATIONS, type Violation } from './violations';
import styles from './Panel.module.css';

interface GuardrailsPanelProps {
  cesdk: CreativeEditorSDK | null;
  credentials: CredentialStatus;
  /** The keys section, rendered at the top of the panel. */
  settings?: ReactNode;
}

interface LogEntry {
  label: string;
  ms: number;
  modelCalls: number;
}

export function GuardrailsPanel({
  cesdk,
  credentials,
  settings
}: GuardrailsPanelProps) {
  const [prompt, setPrompt] = useState(
    'over-ear headphones resting on a wooden desk by a window'
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CheckResult[] | null>(null);
  // Step 5: export unlocks after a clean check, and any edit locks it again.
  const [exportUnlocked, setExportUnlocked] = useState(false);
  const [changedSinceCheck, setChangedSinceCheck] = useState(false);

  useEffect(() => {
    if (cesdk == null) return;
    return cesdk.engine.editor.onHistoryUpdatedWithKind((kind) => {
      if (kind !== 'Updated') return;
      setExportUnlocked(false);
      setChangedSinceCheck(true);
    });
  }, [cesdk]);

  const aiAvailable = credentials === 'ok';
  const ready = cesdk != null;

  /** Runs one step, times it, and records the model calls it made. */
  const run = useCallback(async (label: string, step: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    const started = performance.now();
    const callsBefore = modelCallCount();
    try {
      await step();
      setLog((entries) => [
        {
          label,
          ms: Math.round(performance.now() - started),
          modelCalls: modelCallCount() - callsBefore
        },
        ...entries
      ]);
    } catch (cause) {
      console.error(`[brand-guardrails-ai] ${label} failed:`, cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }, []);

  // Step 3
  const onGenerate = () =>
    run('Generate image', async () => {
      if (cesdk == null) return;
      await generateIntoPlaceholder(cesdk, getGatewayClient(), prompt);
    });

  // Step 4
  const onValidate = () =>
    run('Check the design', async () => {
      if (cesdk == null) return;
      const result = await validate(cesdk.engine);
      setReport(result);
      setChangedSinceCheck(false);
      setExportUnlocked(result.every((check) => check.passed));
    });

  // Step 5: exportChecked validates again at the moment of export.
  const onExport = () =>
    run('Export PNG', async () => {
      if (cesdk == null) return;
      const { report: result, file } = await exportChecked(cesdk);
      setReport(result);
      setChangedSinceCheck(false);
      if (file == null) {
        setExportUnlocked(false);
        throw new Error('Export refused: a check failed. See the report above.');
      }
      download(file, 'northwind-ad.png');
    });

  // Test harness: break one rule through the API, like a file from elsewhere.
  const onBreak = (violation: Violation) =>
    run(`Break a rule: ${violation.label}`, async () => {
      if (cesdk == null) return;
      await violation.apply(cesdk.engine);
      cesdk.engine.editor.addUndoStep();
      setReport(null);
    });

  const onStartOver = () =>
    run('Start over', async () => {
      if (cesdk == null) return;
      await startTemplate(cesdk);
      setReport(null);
    });

  return (
    <aside className={styles.panel}>
      <h1 className={styles.title}>Brand guardrails</h1>

      <p className={styles.status} data-status={credentials}>
        {credentialLabel(credentials)}
      </p>

      {settings}

      <section className={styles.section}>
        <h2 className={styles.heading}>3. Generate the image</h2>
        <label className={styles.field}>
          What should the image show?
          <textarea
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <p className={styles.hint}>
          The brand prefix goes in front: "{PROMPT_PREFIX.trim()}"
        </p>
        <div className={styles.buttons}>
          <button
            type="button"
            disabled={!ready || !aiAvailable || busy != null || prompt.trim() === ''}
            onClick={onGenerate}
          >
            Generate image (1 model call)
          </button>
        </div>
        <p className={styles.hint}>
          The image goes into the template's image slot. There is no other
          place in the design it can land.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>4. Check the design</h2>
        <div className={styles.buttons}>
          <button type="button" disabled={!ready || busy != null} onClick={onValidate}>
            Check the design
          </button>
        </div>
        {report && changedSinceCheck && (
          <p className={styles.hint}>
            The design changed after this check. Check again to unlock export.
          </p>
        )}
        {report && (
          <ul className={styles.report}>
            {report.map((check) => (
              <li key={check.rule} data-passed={check.passed}>
                <strong>{check.passed ? 'Pass' : 'Fail'}</strong> {check.rule}
                {!check.passed && <span>{check.message}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>5. Export</h2>
        <div className={styles.buttons}>
          <button
            type="button"
            disabled={!ready || busy != null || !exportUnlocked}
            onClick={onExport}
          >
            Export PNG
          </button>
        </div>
        <p className={styles.hint}>
          {exportUnlocked
            ? 'Every check passed. The design is checked again as it exports.'
            : 'Locked until every check passes. Any edit locks it again.'}
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Test: break a rule</h2>
        <p className={styles.hint}>
          Each button changes the design through code, the way a file from
          somewhere else could. The editor's locks don't stop code; the check
          above does.
        </p>
        <div className={styles.buttons}>
          {VIOLATIONS.map((violation) => (
            <button
              key={violation.label}
              type="button"
              disabled={!ready || busy != null}
              onClick={() => onBreak(violation)}
            >
              {violation.label}
            </button>
          ))}
          <button type="button" disabled={!ready || busy != null} onClick={onStartOver}>
            Start over
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Log</h2>
        {busy && <p className={styles.hint}>Working: {busy}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <ul className={styles.log}>
          {log.map((entry, index) => (
            <li key={index}>
              {entry.label}: {entry.ms} ms, {entry.modelCalls} model call
              {entry.modelCalls === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function credentialLabel(status: CredentialStatus): string {
  switch (status) {
    case 'checking':
      return 'Checking AI credentials';
    case 'ok':
      return 'AI gateway connected';
    case 'missing':
      return 'No AI key. Add one under Keys to generate images.';
    case 'invalid':
      return 'The gateway rejected the AI key. Fix it under Keys.';
    case 'unreachable':
      return 'AI gateway unreachable.';
  }
}
