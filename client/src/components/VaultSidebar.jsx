const VAULT_COLORS = [
  '#7c6af7', '#2dd4bf', '#f87171', '#fb923c',
  '#a78bfa', '#34d399', '#f472b6', '#60a5fa',
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VAULT_COLORS[Math.abs(hash) % VAULT_COLORS.length];
}

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function VaultSidebar({ vaults, selected, onSelect, error, onOpenSettings }) {
  return (
    <div style={{
      width: 220,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '18px 16px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Feedback Synthesis
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          {vaults.length} vault{vaults.length !== 1 ? 's' : ''} connected
        </div>
      </div>

      <div style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{
            fontSize: 12, color: 'var(--high)',
            background: 'var(--high-bg)',
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            margin: '4px 0 8px',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {vaults.length === 0 && !error && (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 8px', lineHeight: 1.6 }}>
            No vaults found in your folder. Add subfolders with markdown notes, or open Settings to
            change the path.
          </div>
        )}

        {vaults.map(vault => {
          const color = getColor(vault.name);
          const isSelected = selected?.name === vault.name;
          return (
            <button
              key={vault.name}
              onClick={() => onSelect(vault)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                background: isSelected ? 'var(--bg4)' : 'transparent',
                border: isSelected ? '1px solid var(--border2)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
                marginBottom: 2,
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: isSelected ? `0 0 6px ${color}80` : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  color: isSelected ? 'var(--text)' : 'var(--text2)',
                  fontWeight: isSelected ? 500 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {vault.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {vault.noteCount} notes
                  {vault.lastModified ? ` · ${timeAgo(vault.lastModified)}` : ''}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text3)',
      }}>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              width: '100%',
              textAlign: 'left',
              fontSize: 12,
              color: 'var(--text2)',
              padding: '6px 0 10px',
              borderRadius: 'var(--radius)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text2)'; }}
          >
            Settings
          </button>
        )}
        <div style={{ fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>localhost:3001</div>
      </div>
    </div>
  );
}
