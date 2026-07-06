// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// NR-36 — Rule Performance tab for Rules Console.

import { useEffect, useState, useCallback } from 'react';

const API = '/nexarank/api/v1';

export default function RulePerformanceTab({ auth }) {
  const [rules, setRules]     = useState([]);
  const [avgCtr, setAvgCtr]   = useState(0);
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  function headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/analytics/rules-performance?days=${days}`, { headers: headers() });
      if (!res.ok) throw new Error(`Failed to load rule performance (${res.status})`);
      const data = await res.json();
      setRules(data.rules || []);
      setAvgCtr(data.avgCtr || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days, auth.token]);

  useEffect(() => { load(); }, [load]);

  const pct = (v) => (v * 100).toFixed(1) + '%';

  const statusColor = (status) => ({
    APPROVED:        { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    PENDING_REVIEW:  { background: 'rgba(255,171,0,0.12)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)' },
    DRAFT:           { background: 'rgba(107,140,186,0.1)', color: '#4a5568', border: '1px solid #e1e4e8' },
    REJECTED:        { background: 'rgba(255,68,68,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.3)' },
    DISABLED:        { background: 'rgba(107,140,186,0.1)', color: '#4a5568', border: '1px solid #e1e4e8' },
  }[status] || {});

  if (loading) return <div style={rp.muted}>Loading rule performance…</div>;

  return (
    <div>
      {error && (
        <div style={rp.errorBanner}>
          <span>⚠ {error}</span>
          <button style={rp.errorDismiss} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div style={rp.card}>
        <div style={rp.cardHeader}>
          <div style={rp.cardTitle}>
            Rule Performance
            <span style={rp.countBadge}>{rules.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={rp.label}>Period</label>
            <select style={rp.select} value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button style={rp.refreshBtn} onClick={load}>↻ Refresh</button>
          </div>
        </div>
        <div style={rp.cardHint}>
          Baseline CTR across all queries: <strong>{pct(avgCtr)}</strong>.
          CTR and revenue are approximated at the query level (no per-click rule attribution yet) —
          treat "CTR Lift" and "Revenue Impact" as directional, not exact.
        </div>

        {rules.length === 0 ? (
          <div style={rp.empty}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>⚡</div>
            <div style={{ color: 'rgba(180,200,230,0.85)', fontWeight: 700 }}>No rules yet</div>
            <div style={rp.muted}>Create a rule to start tracking its performance</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={rp.table}>
              <thead>
                <tr>
                  {['Query', 'Type', 'Status', 'Fired', 'Last Fired', 'CTR', 'CTR Lift', 'Revenue Impact'].map(h => (
                    <th key={h} style={rp.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={r.id} style={{ ...rp.tr, ...(i % 2 === 0 ? rp.trEven : {}) }}>
                    <td style={rp.td}><span style={rp.queryText}>{r.query}</span></td>
                    <td style={rp.td}>{r.type}</td>
                    <td style={rp.td}>
                      <span style={{ ...rp.badge, ...statusColor(r.status) }}>{r.status}</span>
                    </td>
                    <td style={rp.td}>
                      {r.neverFired ? (
                        <span style={{ ...rp.badge, background: 'rgba(255,171,0,0.12)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)' }}>
                          Never fired
                        </span>
                      ) : (
                        <span style={rp.fireCount}>{r.firedCount}×</span>
                      )}
                    </td>
                    <td style={{ ...rp.td, ...rp.metaText }}>
                      {r.lastFiredAt ? new Date(r.lastFiredAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={rp.td}>{pct(r.ctr)}</td>
                    <td style={rp.td}>
                      <span style={{ color: r.ctrLift > 0 ? '#00e676' : r.ctrLift < 0 ? '#ff6b6b' : '#64748b', fontWeight: 700 }}>
                        {r.ctrLift > 0 ? '▲ ' : r.ctrLift < 0 ? '▼ ' : ''}{pct(Math.abs(r.ctrLift))}
                      </span>
                    </td>
                    <td style={rp.td}>${r.revenueImpact.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const rp = {
  card:        { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 12, padding: '20px 24px', marginBottom: 20, backdropFilter: 'blur(4px)', fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle:   { fontSize: 14, fontWeight: 700, color: '#1a202c', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 },
  cardHint:    { fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 },
  countBadge:  { background: '#e8f0fe', color: '#4da6ff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(0,119,255,0.2)' },
  refreshBtn:  { background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4da6ff', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  label:       { fontSize: 10, fontWeight: 700, color: 'rgba(0,210,255,0.95)', letterSpacing: '1.5px', textTransform: 'uppercase' },
  select:      { background: '#ffffff', border: '1px solid rgba(0,119,255,0.2)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(180,200,230,0.9)', padding: '8px 12px', borderBottom: '1px solid #e1e4e8', letterSpacing: '1px', textTransform: 'uppercase' },
  tr:          { borderBottom: '1px solid rgba(0,119,255,0.06)' },
  trEven:      { background: '#f8f9fa' },
  td:          { padding: '10px 12px', color: '#1a202c', verticalAlign: 'middle' },
  queryText:   { color: '#1a202c', fontWeight: 600 },
  metaText:    { color: '#64748b', fontSize: 11 },
  fireCount:   { fontWeight: 700, color: '#1a202c' },
  badge:       { display: 'inline-block', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' },
  empty:       { padding: '48px', textAlign: 'center' },
  muted:       { color: '#64748b', fontSize: 13, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b6b', padding: '10px 16px', fontSize: 13, borderRadius: 8, marginBottom: 16, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  errorDismiss:{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14 },
};
