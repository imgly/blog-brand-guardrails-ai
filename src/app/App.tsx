/**
 * App shell: the editor on the left, the guardrails panel on the right.
 *
 * Before the editor mounts, the app resolves both keys (pasted into the
 * app, or from .env), checks the license with IMG.LY's licensing server
 * and probes the AI gateway. A rejected license is left out so the editor
 * still starts, with a watermark. Without a working gateway key the
 * editor still runs; only image generation is switched off.
 */

import { useCallback, useEffect, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js/react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { Configuration } from '@cesdk/cesdk-js';

import { initEditor } from '../imgly';
import { installBrandKit } from '../brand-kit';
import { gateEditorExports } from '../export';
import { startTemplate } from '../template';
import { GuardrailsPanel } from './GuardrailsPanel';
import { KeysPanel } from './KeysPanel';
import { installAiCredentials, probeAiCredentials } from './ai-credentials';
import {
  clearStoredKeys,
  getLicenseKey,
  saveStoredKeys,
  validateLicense,
  type LicenseStatus,
  type StoredKeys
} from './settings';
import styles from './App.module.css';

export type CredentialStatus =
  | 'checking'
  | 'ok'
  | 'missing'
  | 'invalid'
  | 'unreachable';

interface AppProps {
  config: Partial<Configuration>;
}

export default function App({ config }: AppProps) {
  const [credentials, setCredentials] = useState<CredentialStatus>('checking');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | 'checking'>('checking');
  const [editorConfig, setEditorConfig] = useState<Partial<Configuration> | null>(null);
  const [cesdk, setCesdk] = useState<CreativeEditorSDK | null>(null);

  // Bumped whenever the keys change, so the editor remounts with them.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCesdk(null);
    setEditorConfig(null);
    setCredentials('checking');
    setLicenseStatus('checking');

    (async () => {
      const license = getLicenseKey();
      const status: LicenseStatus = license
        ? await validateLicense(license, config.userId ?? 'brand-guardrails-ai-user')
        : 'none';
      const probe = await probeAiCredentials();
      if (cancelled) return;

      setCredentials(probe.status);
      setLicenseStatus(status);
      setEditorConfig({
        ...config,
        // Only a key the server accepted goes to the engine. A rejected
        // key would stop the editor from loading at all.
        license: status === 'valid' ? license : undefined
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [config, generation]);

  const handleInit = useCallback(async (instance: CreativeEditorSDK) => {
    // The init callback swallows errors, so log them here.
    try {
      installAiCredentials(instance);

      await initEditor(instance);
      await installBrandKit(instance);
      gateEditorExports(instance);

      await startTemplate(instance);

      setCesdk(instance);

      // Handy in the browser console while following the article.
      if (import.meta.env.DEV) (window as any).cesdk = instance;
    } catch (error) {
      console.error('[brand-guardrails-ai] editor init failed:', error);
    }
  }, []);

  const applyKeys = (keys: StoredKeys) => {
    saveStoredKeys(keys);
    setGeneration((n) => n + 1);
  };

  const clearKeys = () => {
    clearStoredKeys();
    setGeneration((n) => n + 1);
  };

  return (
    <div className={styles.app}>
      <div className={styles.editorRow}>
        {editorConfig == null ? (
          <div className={styles.editor} aria-hidden="true" />
        ) : (
          <CreativeEditor
            key={generation}
            className={styles.editor}
            config={editorConfig}
            init={handleInit}
          />
        )}
        <GuardrailsPanel
          cesdk={cesdk}
          credentials={credentials}
          settings={
            <KeysPanel
              licenseStatus={licenseStatus}
              credentials={credentials}
              busy={editorConfig == null}
              onApply={applyKeys}
              onClear={clearKeys}
            />
          }
        />
      </div>
    </div>
  );
}
