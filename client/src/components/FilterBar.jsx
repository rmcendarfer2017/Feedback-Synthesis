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

  const hasFilters = filters.tags || filters.source || filters.from || filters.to;

  const SOURCES = [
    { value: 'user-interview', label: 'User interview' },
    { value: 'nps', label: 'NPS' },
    { value: 'support-ticket', label: 'Support ticket' },
    { value: 'sales-call', label: 'Sales call' },
    { value: 'survey', label: 'Survey' },
    { value: 'unknown', label: 'Unknown' },
  ];

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
          className="filter-bar-select"
          value={filters.source || ''}
          onChange={(e) => update('source', e.target.value)}
          disabled={!vault}
          title="Filter by feedback source"
        >
          <option value="">All sources</option>
          {SOURCES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {vault && (
          <div className="filter-bar-dates">
            <input
              type="date"
              className="filter-bar-date-input"
              value={filters.from || ''}
              onChange={(e) => update('from', e.target.value)}
              title="From date"
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>to</span>
            <input
              type="date"
              className="filter-bar-date-input"
              value={filters.to || ''}
              onChange={(e) => update('to', e.target.value)}
              title="To date"
            />
          </div>
        )}

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
        <div className="filter-bar-secondary">
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
        </div>
      )}
    </div>
  );
}
