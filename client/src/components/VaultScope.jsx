import { useState, useEffect } from 'react';

const SOURCE_LABELS = {
  'user-interview': 'Interview',
  nps: 'NPS',
  'support-ticket': 'Support',
  'sales-call': 'Sales',
  survey: 'Survey',
};

const EXCLUDE_LABELS = {
  empty: 'Empty note body',
  source: 'Source filter',
  date: 'Date filter',
  tags: 'Tag filter',
};

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function TreeNode({ node, depth = 0, expanded, onToggle, selectedFilePath, onFileSelect }) {
  if (node.type === 'file') {
    const excludeLabel = node.excludeReason
      ? EXCLUDE_LABELS[node.excludeReason] || 'Excluded'
      : 'Excluded by filters or empty';
    const isSelected = selectedFilePath === node.path;
    return (
      <button
        type="button"
        className={`vault-scope-file${node.included ? '' : ' excluded'}${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        title={node.included ? 'Click to preview · included in synthesis' : `${excludeLabel} · click to preview`}
        onClick={() => onFileSelect?.(node.path)}
      >
        <span className="vault-scope-icon file" aria-hidden>◇</span>
        <span className="vault-scope-file-name">{node.name}</span>
        {node.source && (
          <span className="vault-scope-badge">{SOURCE_LABELS[node.source] || node.source}</span>
        )}
        {node.date && <span className="vault-scope-date">{formatDate(node.date)}</span>}
      </button>
    );
  }

  const childFileCount = countFiles(node);
  const includedCount = countIncluded(node);
  const isExpanded = expanded.has(node.path || '');

  return (
    <div className="vault-scope-folder-group">
      {node.name && (
        <button
          type="button"
          className="vault-scope-folder"
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => onToggle(node.path || '')}
          aria-expanded={isExpanded}
        >
          <span className="vault-scope-chevron">{isExpanded ? '▾' : '▸'}</span>
          <span className="vault-scope-icon folder" aria-hidden>▤</span>
          <span className="vault-scope-folder-name">{node.name}</span>
          <span className="vault-scope-folder-meta">
            {includedCount}/{childFileCount}
          </span>
        </button>
      )}
      {(!node.name || isExpanded) && (
        <div className="vault-scope-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.type === 'file' ? child.path : child.path || child.name}
              node={child}
              depth={node.name ? depth + 1 : depth}
              expanded={expanded}
              onToggle={onToggle}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countFiles(node) {
  if (node.type === 'file') return 1;
  return node.children.reduce((n, c) => n + countFiles(c), 0);
}

function countIncluded(node) {
  if (node.type === 'file') return node.included ? 1 : 0;
  return node.children.reduce((n, c) => n + countIncluded(c), 0);
}

export function collectFolderPaths(node, paths = []) {
  if (node.type === 'folder') {
    paths.push(node.path || '');
    for (const child of node.children) {
      if (child.type === 'folder') collectFolderPaths(child, paths);
    }
  }
  return paths;
}

export default function VaultScope({
  vaultName,
  inventory,
  loading,
  error,
  selectedFilePath,
  onFileSelect,
}) {
  const [expanded, setExpanded] = useState(new Set(['']));

  useEffect(() => {
    if (inventory?.tree) {
      setExpanded(new Set(collectFolderPaths(inventory.tree)));
    }
  }, [vaultName]);

  function toggleFolder(folderPath) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  }

  if (!vaultName) return null;

  const allPaths = inventory?.tree ? collectFolderPaths(inventory.tree) : [];
  const allExpanded = allPaths.length > 0 && allPaths.every((p) => expanded.has(p));

  return (
    <div className="vault-scope vault-scope--panel">
      <div className="vault-scope-header">
        <div>
          <h2 className="vault-scope-title">Synthesis scope</h2>
          {inventory && !loading && (
            <p className="vault-scope-summary">
              <strong>{inventory.includedFiles}</strong> of {inventory.totalFiles} notes
              {inventory.hasActiveFilters && (
                <span className="vault-scope-filter-hint"> · filtered</span>
              )}
            </p>
          )}
        </div>
        {inventory?.tree && (
          <button
            type="button"
            className="vault-scope-expand-btn"
            onClick={() => {
              setExpanded(allExpanded ? new Set(['']) : new Set(allPaths));
            }}
          >
            {allExpanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      <div className="vault-scope-tree-panel">
        {loading && <p className="vault-scope-status">Loading files…</p>}
        {error && <p className="vault-scope-status error">{error}</p>}
        {!loading && !error && inventory?.tree && (
          <TreeNode
            node={inventory.tree}
            expanded={expanded}
            onToggle={toggleFolder}
            selectedFilePath={selectedFilePath}
            onFileSelect={onFileSelect}
          />
        )}
        {!loading && !error && inventory?.totalFiles === 0 && (
          <p className="vault-scope-status">No markdown files in this vault.</p>
        )}
      </div>

      {inventory && inventory.totalFiles > 0 && inventory.includedFiles === 0 && (
        <p className="vault-scope-warning">
          No notes match the current filters.
        </p>
      )}
    </div>
  );
}
