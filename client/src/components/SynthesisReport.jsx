function Badge({ level }) {
  const styles = {
    High: { color: 'var(--high)', bg: 'var(--high-bg)' },
    Medium: { color: 'var(--med)', bg: 'var(--med-bg)' },
    Low: { color: 'var(--low)', bg: 'var(--low-bg)' },
  };
  const s = styles[level] || styles.Low;
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
      letterSpacing: '0.02em',
    }}>
      {level}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function copyReport(report, vaultName) {
  const lines = [
    `# Feedback Synthesis — ${vaultName}`,
    '',
    `## Summary`,
    report.summary,
    '',
    `## Themes`,
  ];
  report.themes.forEach((t, i) => {
    lines.push(`\n### ${i + 1}. ${t.name} [${t.priority}]`);
    lines.push(t.summary);
    lines.push('\n**Evidence:**');
    t.evidence.forEach(e => lines.push(`- [${e.source}] ${e.quote}`));
  });
  lines.push('\n## Recommendations');
  report.recommendations.forEach((r, i) => {
    lines.push(`\n${i + 1}. **${r.action}**`);
    lines.push(r.detail);
  });
  lines.push('\n## Open Questions');
  report.openQuestions.forEach(q => lines.push(`- ${q}`));
  navigator.clipboard.writeText(lines.join('\n'));
}

export default function SynthesisReport({ report, vaultName, onNewSynthesis }) {
  const totalNotes = Object.values(report.sourceCounts || {}).reduce((a, b) => a + b, 0);
  const topSource = Object.entries(report.sourceCounts || {})
    .filter(([k]) => k !== 'unknown')
    .sort((a, b) => b[1] - a[1])[0];

  const sentimentColor = report.sentiment?.average >= 4 ? 'var(--low)'
    : report.sentiment?.average >= 3 ? 'var(--teal)'
    : report.sentiment?.average >= 2 ? 'var(--med)'
    : 'var(--high)';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 6 }}>
            {vaultName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 560 }}>
            {report.summary}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 20, flexShrink: 0 }}>
          {onNewSynthesis && (
            <button
              type="button"
              onClick={onNewSynthesis}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius)',
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              New synthesis
            </button>
          )}
          <button
            type="button"
            onClick={() => copyReport(report, vaultName)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--radius)',
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Copy as markdown
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 32 }}>
        <StatCard label="Notes analyzed" value={totalNotes} />
        <StatCard label="Themes found" value={report.themes?.length || 0} />
        <StatCard
          label="Avg sentiment"
          value={<span style={{ color: sentimentColor }}>{report.sentiment?.average?.toFixed(1)}/5</span>}
          sub={report.sentiment?.label}
        />
        <StatCard
          label="Top source"
          value={<span style={{ fontSize: 14, paddingTop: 4, display: 'block' }}>
            {topSource ? topSource[0].replace('-', ' ') : '—'}
          </span>}
          sub={topSource ? `${topSource[1]} notes` : ''}
        />
      </div>

      {/* Themes */}
      <div style={{ marginBottom: 32 }}>
        <SectionLabel>Key themes</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.themes?.map((theme, i) => (
            <div key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, flex: 1, letterSpacing: '-0.01em' }}>
                  {theme.name}
                </div>
                <Badge level={theme.priority} />
                <span style={{
                  fontSize: 11, color: 'var(--text3)',
                  background: 'var(--bg4)', padding: '2px 8px',
                  borderRadius: 20, border: '1px solid var(--border)',
                }}>
                  {theme.signalCount} signals
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
                {theme.summary}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {theme.evidence?.map((ev, j) => (
                  <div key={j} style={{
                    fontSize: 12, color: 'var(--text2)',
                    background: 'var(--bg3)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    borderLeft: '2px solid var(--border2)',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 500,
                      background: 'var(--bg4)', color: 'var(--text3)',
                      padding: '1px 6px', borderRadius: 4,
                      whiteSpace: 'nowrap', marginTop: 1, flexShrink: 0,
                    }}>
                      {ev.source}
                    </span>
                    <span style={{ lineHeight: 1.6 }}>
                      {ev.quote}
                      {ev.participant && (
                        <span style={{ color: 'var(--text3)', marginLeft: 6 }}>— {ev.participant}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 32 }}>
        <SectionLabel>Recommended actions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {report.recommendations?.map((rec, i) => (
            <div key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex', gap: 12,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'var(--accent2)', fontWeight: 500,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.01em' }}>
                  {rec.action}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {rec.detail}
                </div>
                {rec.theme && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                    ↳ {rec.theme}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open questions */}
      <div>
        <SectionLabel>Open questions</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {report.openQuestions?.map((q, i) => (
            <div key={i} style={{
              fontSize: 13, color: 'var(--text2)',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>?</span>
              {q}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
