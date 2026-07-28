// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// Phase 22 / NR-33 — Version History tab.
// Accepts authHeaders as a prop (function returning headers object) so it works
// inside RulesConsole's auth context without reading localStorage directly.

import { useEffect, useState, useCallback } from 'react';

const API = '/nexarank/api/v1/rules';

const FIELDS = [
  'type', 'query', 'status', 'enabled', 'priority',
  'boostField', 'boostValue', 'boostFactor',
  'pinnedIdsJson', 'synonymsJson', 'redirectUrl',
  'activateAt', 'expireAt', 'submittedBy', 'approvedBy',
];

const FIELD_LABELS = {
  type: 'Type', query: 'Query', status: 'Status', enabled: 'Enabled',
  priority: 'Priority', boostField: 'Boost Field', boostValue: 'Boost Value',
  boostFactor: 'Boost Factor', pinnedIdsJson: 'Pinned IDs', synonymsJson: 'Synonyms',
  redirectUrl: 'Redirect URL',
  activateAt: 'Activate At', expireAt: 'Expire At',
  submittedBy: 'Submitted By', approvedBy: 'Approved By',
};

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function diffFields(oldState, newState) {
  if (!oldState || !newState) return [];
  return FIELDS
    .filter((f) => fmt(oldState[f]) !== fmt(newState[f]))
    .map((f) => ({ field: f, oldValue: fmt(oldState[f]), newValue: fmt(newState[f]) }));
}

export default function VersionHistoryTab({ ruleId, authHeaders, onRestored }) {
  const [history, setHistory]   = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [restoring, setRestoring] = useState(null);

  const apiFetch = useCallback((url, options = {}) => {
    return fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  }, [authHeaders]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/${ruleId}/history`);
      if (!res.ok) throw new Error(`History request failed (${res.status})`);
      setHistory(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ruleId, apiFetch]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const loadSnapshot = async (versionNumber) => {
    if (snapshots[versionNumber]) return snapshots[versionNumber];
    const res = await apiFetch(`${API}/${ruleId}/history/${versionNumber}`);
    if (!res.ok) throw new Error(`Snapshot request failed (${res.status})`);
    const state = await res.json();
    setSnapshots((prev) => ({ ...prev, [versionNumber]: state }));
    return state;
  };

  const toggleExpand = async (versionNumber) => {
    if (expanded === versionNumber) { setExpanded(null); return; }
    try {
      await loadSnapshot(versionNumber);
      if (versionNumber > 1) await loadSnapshot(versionNumber - 1);
      setExpanded(versionNumber);
    } catch (e) {
      setError(e.message);
    }
  };

  const restore = async (versionNumber) => {
    if (!window.confirm(`Restore values from v${versionNumber}? This creates a new version and sends the rule back to Pending Review.`)) return;
    setRestoring(versionNumber);
    setError(null);
    try {
      const res = await apiFetch(`${API}/${ruleId}/rollback/${versionNumber}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Restore failed (${res.status})`);
      setSnapshots({});
      setExpanded(null);
      await loadHistory();
      if (onRestored) onRestored();
    } catch (e) {
      setError(e.message);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div style={vs.muted}>Loading version history…</div>;

  return (
    <div style={vs.container}>
      {error && <div style={vs.errorBanner}>{error}</div>}
      {history.length === 0 && (
        <div style={vs.muted}>No versions yet. Versions are created each time the rule is saved.</div>
      )}

      {history.map((v) => {
        const isOpen   = expanded === v.versionNumber;
        const isLatest = history.length > 0 && v.versionNumber === history[0].versionNumber;
        const state    = snapshots[v.versionNumber];
        const prevState = snapshots[v.versionNumber - 1];
        const changes  = isOpen && v.versionNumber > 1 ? diffFields(prevState, state) : [];

        return (
          <div key={v.versionNumber} style={{ ...vs.card, ...(isOpen ? vs.cardOpen : {}) }}>
            <div style={vs.row} onClick={() => toggleExpand(v.versionNumber)}>
              <span style={vs.badge}>v{v.versionNumber}</span>
              {isLatest && <span style={vs.currentTag}>current</span>}
              <span style={vs.note}>{v.changeNote || '—'}</span>
              <span style={vs.meta}>{v.changedBy} · {new Date(v.changedAt).toLocaleString()}</span>
              <span style={vs.chevron}>{isOpen ? '▾' : '▸'}</span>
            </div>

            {isOpen && state && (
              <div style={vs.detail}>
                {v.versionNumber > 1 && (
                  <div style={vs.section}>
                    <div style={vs.sectionLabel}>Changes from v{v.versionNumber - 1}</div>
                    {changes.length === 0
                      ? <div style={vs.muted}>No field changes (status / audit only).</div>
                      : changes.map((c) => (
                          <div key={c.field} style={vs.diffRow}>
                            <span style={vs.diffField}>{FIELD_LABELS[c.field] || c.field}</span>
                            <span style={vs.diffOld}>{c.oldValue}</span>
                            <span style={vs.diffArrow}>→</span>
                            <span style={vs.diffNew}>{c.newValue}</span>
                          </div>
                        ))
                    }
                  </div>
                )}

                <div style={vs.section}>
                  <div style={vs.sectionLabel}>Full state at v{v.versionNumber}</div>
                  <div style={vs.snapshotGrid}>
                    {FIELDS.map((f) => (
                      <div key={f} style={vs.snapshotCell}>
                        <span style={vs.snapshotLabel}>{FIELD_LABELS[f] || f}</span>
                        <span style={vs.snapshotValue}>{fmt(state[f])}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {!isLatest && (
                  <button
                    style={{ ...vs.restoreBtn, opacity: restoring !== null ? 0.5 : 1 }}
                    disabled={restoring !== null}
                    onClick={(e) => { e.stopPropagation(); restore(v.versionNumber); }}>
                    {restoring === v.versionNumber ? 'Restoring…' : `Restore this version`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const vs = {
  container:    { display: 'flex', flexDirection: 'column', gap: 10, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  card:         { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 8, overflow: 'hidden' },
  cardOpen:     { borderColor: '#0366d6' },
  row:          { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' },
  badge:        { background: '#0366d6', color: '#fff', fontWeight: 600, fontSize: 12, padding: '2px 10px', borderRadius: 999, minWidth: 36, textAlign: 'center' },
  currentTag:   { background: '#f0fdf4', color: '#00a854', fontSize: 11, padding: '2px 8px', borderRadius: 999 },
  note:         { flex: 1, color: '#1a202c', fontSize: 13 },
  meta:         { color: '#4a5568', fontSize: 12 },
  chevron:      { color: '#4a5568' },
  detail:       { padding: '0 16px 16px', borderTop: '1px solid #e1e4e8' },
  section:      { marginTop: 14 },
  sectionLabel: { color: '#4a5568', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  diffRow:      { display: 'grid', gridTemplateColumns: '140px 1fr 24px 1fr', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 13 },
  diffField:    { color: '#2d3748' },
  diffOld:      { color: '#c0392b', background: '#fff5f5', padding: '2px 8px', borderRadius: 4 },
  diffArrow:    { color: '#4a5568', textAlign: 'center' },
  diffNew:      { color: '#00a854', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 },
  snapshotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  snapshotCell: { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  snapshotLabel:{ color: '#4a5568', fontSize: 11 },
  snapshotValue:{ color: '#1a202c', fontSize: 13, wordBreak: 'break-all' },
  restoreBtn:   { marginTop: 14, background: '#0366d6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  errorBanner:  { background: '#fff5f5', border: '1px solid #b91c1c', color: '#c0392b', padding: '8px 12px', borderRadius: 6, fontSize: 13 },
  muted:        { color: '#4a5568', fontSize: 13 },
};
