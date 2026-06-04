import { useState, useEffect } from 'react';

const SOURCE_LABELS = {
  'user-interview': 'User interview',
  nps: 'NPS',
  'support-ticket': 'Support ticket',
  'sales-call': 'Sales call',
  survey: 'Survey',
};

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function NotePreview({ vaultName, filePath, onClose }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vaultName || !filePath) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `/api/vaults/${encodeURIComponent(vaultName)}/preview?path=${encodeURIComponent(filePath)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setNote(null);
        } else {
          setNote(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load note.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vaultName, filePath]);

  const fileName = filePath?.split('/').pop() || filePath;

  return (
    <div className="note-preview">
      <div className="note-preview-toolbar">
        <button type="button" className="note-preview-back" onClick={onClose}>
          ← Back
        </button>
        <span className="note-preview-path" title={filePath}>
          {fileName}
        </span>
      </div>

      {loading && <p className="note-preview-status">Loading note…</p>}
      {error && <p className="note-preview-status error">{error}</p>}

      {note && !loading && (
        <>
          <div className="note-preview-meta">
            {note.source && (
              <span className="note-preview-badge">
                {SOURCE_LABELS[note.source] || note.source}
              </span>
            )}
            {note.date && <span>{formatDate(note.date)}</span>}
            {note.sentiment != null && (
              <span>Sentiment {note.sentiment}/5</span>
            )}
            {note.participant && <span>{note.participant}</span>}
          </div>

          {note.tags?.length > 0 && (
            <div className="note-preview-tags">
              {note.tags.map((tag) => (
                <span key={tag} className="note-preview-tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="note-preview-body">
            {note.body || (
              <p className="note-preview-empty">This note has no body content and will be excluded from synthesis.</p>
            )}
          </div>

          <p className="note-preview-footer">
            {note.bodyLength > 0
              ? `${note.bodyLength.toLocaleString()} characters · included in synthesis if filters match`
              : 'Empty note — excluded from synthesis'}
          </p>
        </>
      )}
    </div>
  );
}
