// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function Analytics({ auth }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  function authHeaders() {
    return { 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchOverview(); }, [days]);

  async function fetchOverview() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/analytics/overview?days=${days}`, { headers: authHeaders() });
      if (res.ok) setOverview(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function ctrColor(ctr) {
    if (ctr >= 0.2) return '#22c55e';
    if (ctr >= 0.1) return '#f97316';
    return '#ef4444';
  }

  function ctrLabel(ctr) {
    if (ctr >= 0.2) return 'Good';
    if (ctr >= 0.1) return 'Average';
    return 'Poor';
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Analytics</div>
          <div style={s.subtitle}>Search performance and rule effectiveness</div>
        </div>
        <div style={s.periodSelector}>
          {[7, 30, 90].map(d => (
            <button key={d} style={{ ...s.periodBtn, ...(days === d ? s.periodBtnActive : {}) }}
              onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={s.loading}>Loading analytics...</div>
      ) : overview ? (
        <>
          {/* KPI Cards */}
          <div style={s.kpiGrid}>
            <div style={s.kpiCard}>
              <div style={s.kpiValue}>{overview.totalClicks.toLocaleString()}</div>
              <div style={s.kpiLabel}>Total Clicks</div>
              <div style={s.kpiSub}>Last {days} days</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiValue}>{overview.totalQueries}</div>
              <div style={s.kpiLabel}>Unique Queries</div>
              <div style={s.kpiSub}>With click data</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiValue, color: ctrColor(overview.avgCtr) }}>
                {(overview.avgCtr * 100).toFixed(1)}%
              </div>
              <div style={s.kpiLabel}>Avg CTR</div>
              <div style={{ ...s.kpiSub, color: ctrColor(overview.avgCtr) }}>
                {ctrLabel(overview.avgCtr)}
              </div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiValue}>{overview.activeRules}</div>
              <div style={s.kpiLabel}>Active Rules</div>
              <div style={s.kpiSub}>{overview.pendingRules} pending review</div>
            </div>
          </div>

          {/* Top Queries Table */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Top Queries by Click Volume</div>
            {overview.topQueries.length === 0 ? (
              <div style={s.empty}>No click data yet. Start searching to generate data.</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Query', 'Clicks', 'Impressions', 'CTR', 'Performance'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.topQueries.map((q, i) => (
                    <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}>
                        <span style={s.queryText}>{q.query}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.number}>{q.clicks}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.number}>{q.impressions}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.ctrBadge, background: ctrColor(q.ctr) }}>
                          {(q.ctr * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={s.ctrBar}>
                          <div style={{
                            ...s.ctrBarFill,
                            width: `${Math.min(q.ctr * 100 / 0.3 * 100, 100)}%`,
                            background: ctrColor(q.ctr)
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Zero Result Queries */}
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Zero Result Queries
              {overview.zeroResultCount > 0 && (
                <span style={s.alertBadge}>{overview.zeroResultCount} in last {days}d</span>
              )}
            </div>
            {overview.topZeroResultQueries?.length === 0 ? (
              <div style={s.empty}>No zero-result queries. Great search coverage!</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Query</th>
                    <th style={s.th}>Occurrences</th>
                    <th style={s.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.topZeroResultQueries || []).map((q, i) => (
                    <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}><span style={s.queryText}>{q.query}</span></td>
                      <td style={s.td}><span style={{...s.ctrBadge, background: '#ef4444'}}>{q.occurrences}</span></td>
                      <td style={s.td}><span style={s.actionHint}>→ Create SYNONYM or check index coverage</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Search Quality Score */}
          {(overview.latestNdcg10 || overview.latestMrr10) && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Search Quality Score</div>
              <div style={s.qualityGrid}>
                <div style={s.qualityStat}>
                  <div style={{...s.qualityValue, color: overview.latestNdcg10 >= 0.9 ? '#22c55e' : '#f97316'}}>{(overview.latestNdcg10 * 100).toFixed(1)}%</div>
                  <div style={s.qualityLabel}>NDCG@10</div>
                </div>
                <div style={s.qualityStat}>
                  <div style={{...s.qualityValue, color: overview.latestMrr10 >= 0.9 ? '#22c55e' : '#f97316'}}>{(overview.latestMrr10 * 100).toFixed(1)}%</div>
                  <div style={s.qualityLabel}>MRR@10</div>
                </div>
                <div style={s.qualityStat}>
                  <div style={{...s.qualityValue, color: '#94b4d4', fontSize: 14}}>
                    {overview.latestQualityRunAt ? new Date(overview.latestQualityRunAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={s.qualityLabel}>Last Evaluation</div>
                </div>
              </div>
            </div>
          )}

          {/* Rules Summary */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Rules Summary</div>
            <div style={s.rulesGrid}>
              <div style={s.rulesStat}>
                <div style={{ ...s.rulesNumber, color: '#22c55e' }}>{overview.activeRules}</div>
                <div style={s.rulesLabel}>Active</div>
              </div>
              <div style={s.rulesStat}>
                <div style={{ ...s.rulesNumber, color: '#f97316' }}>{overview.pendingRules}</div>
                <div style={s.rulesLabel}>Pending Review</div>
              </div>
            </div>
            {overview.pendingRules > 0 && (
              <div style={s.pendingAlert}>
                {overview.pendingRules} rule{overview.pendingRules > 1 ? 's' : ''} waiting for approval
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={s.empty}>Failed to load analytics.</div>
      )}
    </div>
  );
}

const s = {
  page:           { padding: '28px 32px', minHeight: '100vh' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:          { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  subtitle:       { fontSize: 13, color: '#94b4d4' },
  periodSelector: { display: 'flex', gap: 6 },
  periodBtn:      { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.2)', color: '#64748b', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  periodBtnActive:{ background: 'rgba(0,119,255,0.2)', border: '1px solid rgba(0,119,255,0.4)', color: '#94b4d4' },
  loading:        { color: '#94b4d4', padding: 40, textAlign: 'center' },
  empty:          { color: '#64748b', padding: 20, textAlign: 'center', fontSize: 13 },
  kpiGrid:        { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  kpiCard:        { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 10, padding: '20px 24px' },
  kpiValue:       { fontSize: 32, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 },
  kpiLabel:       { fontSize: 13, fontWeight: 600, color: '#94b4d4', marginBottom: 2 },
  kpiSub:         { fontSize: 11, color: '#64748b' },
  section:        { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 10, padding: 20, marginBottom: 20 },
  sectionTitle:   { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 },
  table:          { width: '100%', borderCollapse: 'collapse' },
  th:             { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94b4d4', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,119,255,0.15)' },
  td:             { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  trEven:         { background: 'rgba(255,255,255,0.02)' },
  queryText:      { fontSize: 14, color: '#e2e8f0', fontWeight: 500 },
  number:         { fontSize: 14, color: '#94b4d4', fontFamily: 'monospace' },
  ctrBadge:       { fontSize: 12, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 10 },
  ctrBar:         { height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, width: 100, overflow: 'hidden' },
  ctrBarFill:     { height: '100%', borderRadius: 3, transition: 'width 0.3s ease' },
  rulesGrid:      { display: 'flex', gap: 24 },
  rulesStat:      { textAlign: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  rulesNumber:    { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  rulesLabel:     { fontSize: 12, color: '#64748b' },
  alertBadge:    { fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 600 },
  actionHint:    { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  qualityGrid:   { display: 'flex', gap: 24 },
  qualityStat:   { textAlign: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  qualityValue:  { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  qualityLabel:  { fontSize: 12, color: '#64748b' },
  pendingAlert:   { marginTop: 12, padding: '8px 14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 7, fontSize: 13, color: '#fdba74' },
};
