import { useState, useEffect, useCallback } from 'react';
import VaultSidebar from './components/VaultSidebar.jsx';
import SynthesisReport from './components/SynthesisReport.jsx';
import FilterBar from './components/FilterBar.jsx';
import EmptyState from './components/EmptyState.jsx';
import VaultScope from './components/VaultScope.jsx';
import NotePreview from './components/NotePreview.jsx';
import Onboarding from './components/Onboarding.jsx';
import { useVaultInventory } from './hooks/useVaultInventory.js';

export default function App() {
  const [setup, setSetup] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState([]);
  const [selectedVault, setSelectedVault] = useState(null);
  const [filters, setFilters] = useState({});
  const [report, setReport] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [error, setError] = useState(null);
  const [vaultError, setVaultError] = useState(null);

  const loadVaults = useCallback(async () => {
    try {
      const r = await fetch('/api/vaults');
      const data = await r.json();
      if (data.error) {
        setVaultError(data.error);
        setVaults([]);
        setSelectedVault(null);
      } else {
        setVaultError(null);
        setVaults(data);
        setSelectedVault((prev) => {
          if (prev && data.some((v) => v.name === prev.name)) return prev;
          return data.length > 0 ? data[0] : null;
        });
      }
    } catch {
      setVaultError('Could not connect to server. Is it running?');
      setVaults([]);
    }
  }, []);

  const loadSetup = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch('/api/setup');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        setSetup(data);
        return data;
      } catch {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
    setSetup({ ready: false, serverError: true });
    return null;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const status = await loadSetup();
      if (status?.ready) await loadVaults();
      setLoading(false);
    })();
  }, [loadSetup, loadVaults]);

  async function handleSetupComplete(status) {
    setSetup(status);
    setShowSettings(false);
    await loadVaults();
  }

  if (loading) {
    return (
      <div className="onboarding">
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Loading…</p>
      </div>
    );
  }

  if (setup?.serverError) {
    return (
      <ServerConnectionError onRetry={async () => {
        setLoading(true);
        const status = await loadSetup();
        if (status?.ready) await loadVaults();
        setLoading(false);
      }} />
    );
  }

  if (!setup?.ready || showSettings) {
    return (
      <Onboarding
        status={setup}
        isSettings={showSettings}
        onComplete={handleSetupComplete}
      />
    );
  }

  return (
    <MainApp
      vaults={vaults}
      selectedVault={selectedVault}
      setSelectedVault={setSelectedVault}
      filters={filters}
      setFilters={setFilters}
      report={report}
      setReport={setReport}
      streaming={streaming}
      setStreaming={setStreaming}
      streamBuffer={streamBuffer}
      setStreamBuffer={setStreamBuffer}
      error={error}
      setError={setError}
      vaultError={vaultError}
      onOpenSettings={() => setShowSettings(true)}
    />
  );
}

function MainApp({
  vaults,
  selectedVault,
  setSelectedVault,
  filters,
  setFilters,
  report,
  setReport,
  streaming,
  setStreaming,
  streamBuffer,
  setStreamBuffer,
  error,
  setError,
  vaultError,
  onOpenSettings,
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  const { inventory, loading: inventoryLoading, error: inventoryError } = useVaultInventory(
    selectedVault?.name,
    filters,
  );

  function selectVault(v) {
    setSelectedVault(v);
    setReport(null);
    setError(null);
    setSelectedFile(null);
  }

  async function runSynthesis() {
    if (!selectedVault) return;
    setStreaming(true);
    setReport(null);
    setStreamBuffer('');
    setError(null);
    setSelectedFile(null);

    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultName: selectedVault.name, filters }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.error) {
              setError(event.error);
              setStreaming(false);
              return;
            }
            if (event.done) {
              try {
                const parsed = JSON.parse(fullText);
                setReport(parsed);
              } catch {
                setError('Failed to parse synthesis response. Please try again.');
              }
              setStreaming(false);
              return;
            }
            if (event.chunk) {
              fullText += event.chunk;
              setStreamBuffer(fullText);
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setStreaming(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VaultSidebar
        vaults={vaults}
        selected={selectedVault}
        onSelect={selectVault}
        error={vaultError}
        onOpenSettings={onOpenSettings}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FilterBar
          vault={selectedVault}
          filters={filters}
          onFiltersChange={setFilters}
          onSynthesize={runSynthesis}
          streaming={streaming}
          includedCount={inventory?.includedFiles}
          totalCount={inventory?.totalFiles}
          inventoryLoading={inventoryLoading}
        />
        <div className="app-workspace">
          {selectedVault && (
            <aside className="app-scope-panel">
              <VaultScope
                vaultName={selectedVault.name}
                inventory={inventory}
                loading={inventoryLoading}
                error={inventoryError}
                selectedFilePath={selectedFile}
                onFileSelect={setSelectedFile}
              />
            </aside>
          )}
          <main className="app-main-panel">
            {error && (
              <div className="app-error-banner">
                {error}
              </div>
            )}
            {streaming && !report && (
              <StreamingIndicator buffer={streamBuffer} />
            )}
            {report && (
              <SynthesisReport
                report={report}
                vaultName={selectedVault?.name}
                onNewSynthesis={() => { setReport(null); setSelectedFile(null); }}
              />
            )}
            {!streaming && !report && !error && selectedFile && selectedVault && (
              <NotePreview
                vaultName={selectedVault.name}
                filePath={selectedFile}
                onClose={() => setSelectedFile(null)}
              />
            )}
            {!streaming && !report && !error && selectedVault && !selectedFile && (
              <EmptyState
                vault={selectedVault}
                onSynthesize={runSynthesis}
                includedCount={inventory?.includedFiles}
                totalCount={inventory?.totalFiles}
              />
            )}
            {!streaming && !report && !error && !selectedVault && (
              <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 48, textAlign: 'center' }}>
                Select a vault from the sidebar to view its files and run synthesis.
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function ServerConnectionError({ onRetry }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Cannot connect to server</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.65, marginBottom: 16 }}>
          The app could not reach the API. This usually means the dev server is not running, or you
          opened the wrong URL in the browser.
        </p>
        <ol className="onboarding-list" style={{ textAlign: 'left', marginBottom: 20 }}>
          <li>
            In the project folder, run <code>start.bat</code> (or <code>npm run start</code>).
          </li>
          <li>Keep that terminal window open.</li>
          <li>
            Open the <strong>Local</strong> URL from the terminal — often{' '}
            <code>http://localhost:5173</code>. If you see port <code>5174</code>, use that instead.
          </li>
          <li>Do not open <code>index.html</code> directly from the file explorer.</li>
        </ol>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            className="onboarding-btn-primary"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Retry connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StreamingIndicator({ buffer }) {
  const progress = Math.min(buffer.length / 800, 1);
  return (
    <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '2px solid var(--bg4)',
        borderTop: '2px solid var(--accent)',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 20px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Synthesizing feedback…</p>
      <div style={{
        height: 3, background: 'var(--bg3)', borderRadius: 4,
        overflow: 'hidden', maxWidth: 240, margin: '0 auto',
      }}>
        <div style={{
          height: '100%', background: 'var(--accent)',
          width: `${Math.round(progress * 100)}%`,
          transition: 'width 0.3s ease',
          borderRadius: 4,
        }} />
      </div>
    </div>
  );
}
