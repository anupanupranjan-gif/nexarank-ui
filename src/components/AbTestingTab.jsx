// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// Phase 22 / NR-32 — A/B Testing tab for Rules Console.
// Add to nav under MERCHANDISING and wire in content routing.

import { useEffect, useState, useCallback } from 'react';

const API = '/nexarank/api/v1';

export default function AbTestingTab({ auth, onViewRule }) {
  const [tests, setTests]       = useState([]);
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ ruleAId: '', ruleBId: '' });
  const [promoting, setPromoting] = useState(null);

  function headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, rulesRes] = await Promise.all([
        fetch(`${API}/ab-tests`, { headers: headers() }),
        fetch(`${API}/rules`, { headers: headers() }),
      ]);
      if (!testsRes.ok) throw new Error(`Failed to load tests (${testsRes.status})`);
      if (!rulesRes.ok) throw new Error(`Failed to load rules (${rulesRes.status})`);
      setTests(await testsRes.json());
      setRules(await rulesRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => { load(); }, [load]);

  async function createTest() {
    if (!form.ruleAId || !form.ruleBId) { setError('Select both rules'); return; }
    if (form.ruleAId === form.ruleBId)  { setError('Rules must be different'); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/ab-tests`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ruleAId: form.ruleAId, ruleBId: form.ruleBId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setForm({ ruleAId: '', ruleBId: '' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function promote(testId, variant) {
    if (!window.confirm(`Promote variant ${variant} as winner? The other variant will be archived.`)) return;
    setPromoting(testId);
    setError(null);
    try {
      const res = await fetch(`${API}/ab-tests/${testId}/promote`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ variant }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPromoting(null);
    }
  }

  async function archive(testId) {
    if (!window.confirm('Archive this test?')) return;
    try {
      await fetch(`${API}/ab-tests/${testId}/archive`, { method: 'POST', headers: headers() });
      await load();
    } catch (e) { setError(e.message); }
  }

  const liveRules = rules.filter(r => r.status === 'LIVE');

  // NR-119: rule identifier shown as the Variant A/B link — MerchRule has no
  // dedicated "name" field, so this mirrors the same [TYPE] query convention
  // already used in the create-test dropdown above. Falls back to a short
  // id if the summary is missing (shouldn't happen — disabled rules are
  // still fetched, not deleted).
  const ruleLabel = (summary, ruleId) =>
    summary ? `[${summary.type}] ${summary.query}` : `Rule #${(ruleId || '').slice(0, 8)}`;

  const ctr = (clicks, impressions) =>
    impressions === 0 ? '—' : (clicks / impressions * 100).toFixed(1) + '%';

  const statusColor = (status) => ({
    RUNNING:   { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    COMPLETED: { background: 'rgba(0,119,255,0.12)', color: '#4da6ff', border: '1px solid rgba(0,119,255,0.3)' },
    ARCHIVED:  { background: 'rgba(107,140,186,0.1)', color: '#4a5568', border: '1px solid #e1e4e8' },
  }[status] || {});

  if (loading) return <div style={ab.muted}>Loading A/B tests…</div>;

  return (
    <div>
      {error && (
        <div style={ab.errorBanner}>
          <span>⚠ {error}</span>
          <button style={ab.errorDismiss} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Create test form */}
      <div style={ab.card}>
        <div style={ab.cardHeader}>
          <div style={ab.cardTitle}>New A/B Test</div>
          <div style={ab.cardHint}>Both rules must target the same query. Only one running test per query.</div>
        </div>
        <div style={ab.formRow}>
          <div style={ab.fieldGroup}>
            <label style={ab.label}>Variant A — Rule</label>
            <select style={ab.select} value={form.ruleAId}
              onChange={e => setForm({ ...form, ruleAId: e.target.value })}>
              <option value="">Select rule…</option>
              {liveRules.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.type}] {r.query} {r.boostField ? `· ${r.boostField}×${r.boostFactor}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={ab.fieldGroup}>
            <label style={ab.label}>Variant B — Rule</label>
            <select style={ab.select} value={form.ruleBId}
              onChange={e => setForm({ ...form, ruleBId: e.target.value })}>
              <option value="">Select rule…</option>
              {liveRules.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.type}] {r.query} {r.boostField ? `· ${r.boostField}×${r.boostFactor}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button style={{ ...ab.btn, opacity: creating ? 0.6 : 1 }}
            onClick={createTest} disabled={creating}>
            {creating ? 'Creating…' : '+ Start Test'}
          </button>
        </div>
      </div>

      {/* Tests list */}
      <div style={ab.card}>
        <div style={ab.cardHeader}>
          <div style={ab.cardTitle}>
            A/B Tests
            <span style={ab.countBadge}>{tests.length}</span>
          </div>
          <button style={ab.refreshBtn} onClick={load}>↻ Refresh</button>
        </div>

        {tests.length === 0 ? (
          <div style={ab.empty}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>⚖</div>
            <div style={{ color: 'rgba(180,200,230,0.85)', fontWeight: 700 }}>No tests yet</div>
            <div style={ab.muted}>Create a test above to compare two rule variants head to head</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={ab.table}>
              <thead>
                <tr>
                  {['Query', 'Status', 'Variant A', 'Variant B', 'Significance', 'Started', 'Actions'].map(h => (
                    <th key={h} style={ab.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.map((t, i) => {
                  const sigBadge = t.significant
                    ? { label: '✓ Significant', color: '#00e676', bg: 'rgba(0,230,118,0.1)' }
                    : { label: '~ Not yet', color: '#ffab00', bg: 'rgba(255,171,0,0.1)' };
                  const leader = t.ctrA >= t.ctrB ? 'A' : 'B';

                  return (
                    <tr key={t.id} style={{ ...ab.tr, ...(i % 2 === 0 ? ab.trEven : {}) }}>
                      <td style={ab.td}><span style={ab.queryText}>{t.query}</span></td>
                      <td style={ab.td}>
                        <span style={{ ...ab.badge, ...statusColor(t.status) }}>{t.status}</span>
                      </td>
                      <td style={ab.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button style={ab.ruleLink} onClick={() => onViewRule && onViewRule(t.ruleAId)}
                            title="View / edit this rule">
                            {ruleLabel(t.ruleA, t.ruleAId)}
                          </button>
                          <span style={{ color: leader === 'A' ? '#00e676' : '#1a202c', fontSize: 12, fontWeight: leader === 'A' ? 700 : 400 }}>
                            {leader === 'A' ? '▲ ' : ''}{ctr(t.clicksA, t.impressionsA)} CTR
                          </span>
                          <span style={ab.metaText}>{t.impressionsA} impr · {t.clicksA} clicks</span>
                          <span style={ab.actionSummary}>{t.ruleA ? t.ruleA.actionSummary : '—'}</span>
                        </div>
                      </td>
                      <td style={ab.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button style={ab.ruleLink} onClick={() => onViewRule && onViewRule(t.ruleBId)}
                            title="View / edit this rule">
                            {ruleLabel(t.ruleB, t.ruleBId)}
                          </button>
                          <span style={{ color: leader === 'B' ? '#00e676' : '#1a202c', fontSize: 12, fontWeight: leader === 'B' ? 700 : 400 }}>
                            {leader === 'B' ? '▲ ' : ''}{ctr(t.clicksB, t.impressionsB)} CTR
                          </span>
                          <span style={ab.metaText}>{t.impressionsB} impr · {t.clicksB} clicks</span>
                          <span style={ab.actionSummary}>{t.ruleB ? t.ruleB.actionSummary : '—'}</span>
                        </div>
                      </td>
                      <td style={ab.td}>
                        <span style={{ ...ab.badge, background: sigBadge.bg, color: sigBadge.color, border: `1px solid ${sigBadge.color}40` }}>
                          {sigBadge.label}
                        </span>
                      </td>
                      <td style={{ ...ab.td, ...ab.metaText }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td style={ab.td}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {t.status === 'RUNNING' && (
                            <>
                              <button style={{ ...ab.actionBtn, ...ab.actionPromote }}
                                disabled={promoting === t.id}
                                onClick={() => promote(t.id, leader)}
                                title={`Promote variant ${leader} (leading)`}>
                                {promoting === t.id ? '…' : `▲ ${leader}`}
                              </button>
                              <button style={ab.actionBtn} onClick={() => archive(t.id)}
                                title="Archive test">✕</button>
                            </>
                          )}
                          {t.status !== 'RUNNING' && t.winnerId && (
                            <span style={{ ...ab.badge, background: '#f0f6fc', color: '#4da6ff', border: '1px solid rgba(0,119,255,0.2)' }}>
                              Winner: {t.winnerId === t.ruleAId ? 'A' : 'B'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const ab = {
  card:        { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 12, padding: '20px 24px', marginBottom: 20, backdropFilter: 'blur(4px)', fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:   { fontSize: 14, fontWeight: 700, color: '#1a202c', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 },
  cardHint:    { fontSize: 11, color: 'rgba(200,220,245,0.9)' },
  countBadge:  { background: '#e8f0fe', color: '#4da6ff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(0,119,255,0.2)' },
  refreshBtn:  { background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4da6ff', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  formRow:     { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 },
  label:       { fontSize: 10, fontWeight: 700, color: 'rgba(0,210,255,0.95)', letterSpacing: '1.5px', textTransform: 'uppercase' },
  select:      { background: '#ffffff', border: '1px solid rgba(0,119,255,0.2)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  btn:         { background: 'linear-gradient(135deg, #0055cc, #0077ff)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.5px', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(180,200,230,0.9)', padding: '8px 12px', borderBottom: '1px solid #e1e4e8', letterSpacing: '1px', textTransform: 'uppercase' },
  tr:          { borderBottom: '1px solid rgba(0,119,255,0.06)' },
  trEven:      { background: '#f8f9fa' },
  td:          { padding: '10px 12px', color: '#1a202c', verticalAlign: 'middle' },
  queryText:   { color: '#1a202c', fontWeight: 600 },
  metaText:    { color: '#64748b', fontSize: 11 },
  ruleLink:    { background: 'none', border: 'none', padding: 0, margin: 0, color: '#0077ff', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', fontFamily: 'inherit' },
  actionSummary: { color: '#4a5568', fontSize: 10.5, fontStyle: 'italic' },
  badge:       { display: 'inline-block', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' },
  actionBtn:   { background: 'rgba(107,140,186,0.1)', border: '1px solid #e1e4e8', color: '#4a5568', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  actionPromote: { background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676' },
  empty:       { padding: '48px', textAlign: 'center' },
  muted:       { color: '#64748b', fontSize: 13, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b6b', padding: '10px 16px', fontSize: 13, borderRadius: 8, marginBottom: 16, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  errorDismiss:{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14 },
};
