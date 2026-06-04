export default function EmptyState({ vault, onSynthesize, includedCount, totalCount }) {
  if (!vault) return null;

  const scopeLine = includedCount != null && totalCount != null
    ? `${includedCount} of ${totalCount} notes in scope`
    : `${vault.noteCount} notes in vault`;

  return (
    <div className="empty-state empty-state--centered">
      <div className="empty-state-icon">◇</div>
      <h2 className="empty-state-title">Ready to synthesize</h2>
      <p className="empty-state-desc">
        {scopeLine} in <strong>{vault.name}</strong>. Click any file on the left to preview it,
        then run synthesis to extract themes, evidence, and actions.
      </p>
      <button type="button" className="empty-state-btn" onClick={onSynthesize}>
        Synthesize {vault.name}
      </button>
    </div>
  );
}
