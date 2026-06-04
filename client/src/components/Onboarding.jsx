import { useState } from 'react';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'apiKey', label: 'API key' },
  { id: 'vault', label: 'Vaults' },
  { id: 'done', label: 'Ready' },
];

export default function Onboarding({ status, onComplete, isSettings }) {
  const startStep = isSettings
    ? (status?.apiKeySet ? (status?.vaultRootSet ? 2 : 1) : 1)
    : 0;

  const [step, setStep] = useState(startStep);
  const [apiKey, setApiKey] = useState('');
  const [vaultRoot, setVaultRoot] = useState(status?.vaultRoot || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(status);

  async function refreshStatus() {
    const res = await fetch('/api/setup');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setPreview(data);
    return data;
  }

  async function savePartial(body) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save settings');
      setPreview(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleApiKeyContinue() {
    if (!apiKey.trim() && !preview?.apiKeySet) {
      setError('Paste your Anthropic API key to continue.');
      return;
    }
    if (apiKey.trim()) {
      const saved = await savePartial({ apiKey: apiKey.trim() });
      if (!saved) return;
      setApiKey('');
    }
    setStep(2);
  }

  async function handleTestKey() {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/setup/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Key test failed');
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleVaultContinue() {
    if (!vaultRoot.trim()) {
      setError('Enter the folder path that contains your vault folders.');
      return;
    }
    const saved = await savePartial({ vaultRoot: vaultRoot.trim() });
    if (!saved) return;
    if (!saved.vaultRootValid) {
      setError('That path does not exist or cannot be read. Check the path and try again.');
      return;
    }
    setStep(3);
  }

  function useSampleVault() {
    if (preview?.sampleVaultPath) {
      setVaultRoot(preview.sampleVaultPath);
      setError(null);
    }
  }

  async function handleFinish() {
    const latest = await refreshStatus();
    if (latest?.ready) onComplete(latest);
    else setError('Complete API key and vault folder setup before continuing.');
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <header className="onboarding-header">
          <div className="onboarding-logo">◇</div>
          <div>
            <h1>{isSettings ? 'Settings' : 'Welcome to Feedback Synthesis'}</h1>
            <p className="onboarding-sub">
              {isSettings
                ? 'Update your Anthropic key or vault folders.'
                : 'Connect your Obsidian notes and Claude in a few steps.'}
            </p>
          </div>
        </header>

        <nav className="onboarding-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`onboarding-step-pill${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
            >
              <span className="onboarding-step-num">{i < step ? '✓' : i + 1}</span>
              {s.label}
            </div>
          ))}
        </nav>

        {error && <div className="onboarding-error">{error}</div>}

        <div className="onboarding-body">
          {step === 0 && (
            <>
              <p>
                This app reads markdown feedback from folders on your computer and uses Claude
                to synthesize themes, priorities, and quotes.
              </p>
              <ul className="onboarding-list">
                <li>
                  <strong>Vault folders</strong> — point at a parent directory. Each subfolder
                  with markdown notes becomes a vault (e.g. one folder per product or study).
                </li>
                <li>
                  <strong>API key</strong> — stored only in your local <code>.env</code> file,
                  never sent to the browser after setup.
                </li>
                <li>
                  <strong>Try it first</strong> — you can use the included sample vaults with no
                  Obsidian setup required.
                </li>
              </ul>
            </>
          )}

          {step === 1 && (
            <>
              <p>
                Create an API key at{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                  console.anthropic.com
                </a>
                . It should start with <code>sk-ant-</code>.
              </p>
              {preview?.apiKeySet && (
                <p className="onboarding-hint">
                  A key is already saved {preview.apiKeyHint}. Leave the field blank to keep it,
                  or paste a new key to replace it.
                </p>
              )}
              <label className="onboarding-label" htmlFor="api-key">
                Anthropic API key
              </label>
              <input
                id="api-key"
                type="password"
                className="onboarding-input"
                placeholder="sk-ant-api03-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="onboarding-btn-secondary"
                onClick={handleTestKey}
                disabled={testing || (!apiKey.trim() && !preview?.apiKeySet)}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p>
                Choose the <strong>parent folder</strong> that contains your vault subfolders —
                not a single Obsidian vault’s inner <code>.obsidian</code> directory.
              </p>
              <div className="onboarding-callout">
                Example: if notes live in <code>D:\Notes\ProductA</code> and{' '}
                <code>D:\Notes\ProductB</code>, set the path to <code>D:\Notes</code>.
              </div>
              <label className="onboarding-label" htmlFor="vault-root">
                Vault parent folder
              </label>
              <input
                id="vault-root"
                type="text"
                className="onboarding-input onboarding-input-mono"
                placeholder="C:\Users\you\Documents\feedback-vaults"
                value={vaultRoot}
                onChange={(e) => setVaultRoot(e.target.value)}
              />
              <button type="button" className="onboarding-btn-secondary" onClick={useSampleVault}>
                Use sample vaults (try without Obsidian)
              </button>
              {preview?.vaultCount > 0 && vaultRoot === preview?.vaultRoot && (
                <p className="onboarding-hint success">
                  Found {preview.vaultCount} vault{preview.vaultCount !== 1 ? 's' : ''} in this folder.
                </p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="onboarding-done-title">You&apos;re set up</p>
              {(preview?.vaults?.length ?? 0) > 0 ? (
                <>
                  <p>We found these vaults:</p>
                  <ul className="onboarding-vault-list">
                    {preview.vaults.map((v) => (
                      <li key={v.name}>
                        <span className="onboarding-vault-dot" />
                        <span>{v.name}</span>
                        <span className="onboarding-vault-meta">{v.noteCount} notes</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="onboarding-hint">
                  No vaults with markdown notes were found. You can fix the folder path in Settings
                  later, or run synthesis after adding <code>.md</code> files to subfolders.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="onboarding-footer">
          {step > 0 && step < 3 && (
            <button
              type="button"
              className="onboarding-btn-ghost"
              onClick={() => { setStep(step - 1); setError(null); }}
              disabled={saving}
            >
              Back
            </button>
          )}
          <div className="onboarding-footer-right">
            {isSettings && step < 3 && (
              <button type="button" className="onboarding-btn-ghost" onClick={() => onComplete(preview)}>
                Cancel
              </button>
            )}
            {step === 0 && (
              <button type="button" className="onboarding-btn-primary" onClick={() => setStep(1)}>
                Get started
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={handleApiKeyContinue}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Continue'}
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={handleVaultContinue}
                disabled={saving}
              >
                {saving ? 'Scanning…' : 'Continue'}
              </button>
            )}
            {step === 3 && (
              <button type="button" className="onboarding-btn-primary" onClick={handleFinish}>
                {isSettings ? 'Save & close' : 'Open Feedback Synthesis'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
