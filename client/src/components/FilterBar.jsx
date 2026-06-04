import { useVaultTags } from '../hooks/useVaultTags.js';

export default function FilterBar({
  vault,
  filters,
  onFiltersChange,
  onSynthesize,
  streaming,
  includedCount,
  totalCount,
  inventoryLoading,
}) {
  const { tags: vaultTags } = useVaultTags(vault?.name);

  function update(key, value) {
    onFiltersChange((prev) => ({ ...prev, [key]: value || undefined }));
  }

  const activeTags = (filters.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  function toggleTag(tag) {
    const next = new Set(activeTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    const joined = [...next].join(',');
    update('tags', joined || undefined);
  }

  function clearFilters() {
    onFiltersChange({});
  }

  const hasFilters = filters.source || filters.from || filters.to || filters.tags;

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <div className="filter-bar-title">
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em' }}>
            {vault?.name || 'No vault selected'}
          </div>
          {vault && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              {inventoryLoading ? (
                'Loading scope…'
              ) : includedCount != null ? (
                <>
                  <span style={{ color: includedCount > 0 ? 'var(--accent2)' : 'var(--med)' }}>
                    {includedCount}
                  </span>
                  {' of '}
                  {totalCount ?? vault.noteCount} notes in scope
                </>
              ) : (
                `${vault.noteCount} note${vault.noteCount !== 1 ? 's' : ''} in vault`
              )}
            </div>
          )}
        </div>

        <select
          value={filters.source || ''}
          onChange={(e) => update('source', e.target.value)}
          style={{ width: 148 }}
          disabled={!vault}
        >
          <option value="">All sources</option>
          <option value="user-interview">User interviews</option>
          <option value="nps">NPS</option>
          <option value="support-ticket">Support tickets</option>
          <option value="sales-call">Sales calls</option>
          <option value="survey">Surveys</option>
        </select>

        <input
          type="date"
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value)}
          disabled={!vault}
          title="From date"
          style={{ width: 138 }}
        />

        <input
          type="date"
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value)}
          disabled={!vault}
          title="To date"
          style={{ width: 138 }}
        />

        {hasFilters && (
          <button type="button" className="filter-bar-clear" onClick={clearFilters} disabled={!vault}>
            Clear filters
          </button>
        )}

        <button
          type="button"
          onClick={onSynthesize}
          disabled={!vault || streaming || (!inventoryLoading && includedCount === 0)}
          title={!inventoryLoading && includedCount === 0 ? 'No notes match the current filters' : undefined}
          className="filter-bar-synthesize"
        >
          {streaming ? 'Synthesizing…' : 'Synthesize'}
        </button>
      </div>

      {vault && vaultTags.length > 0 && (
        <div className="filter-bar-tags" title="Show notes that have any selected tag">
          <span className="filter-bar-tags-label">Tags</span>
          <div className="filter-bar-tags-list">
            {vaultTags.map(({ name, count }) => {
              const active = activeTags.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`filter-tag${active ? ' active' : ''}`}
                  onClick={() => toggleTag(name)}
                  title={`${count} note${count !== 1 ? 's' : ''}`}
                >
                  {name}
                  <span className="filter-tag-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
