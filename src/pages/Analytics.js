// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = '/nexarank/api/v1';

export default function Analytics({ auth }) {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  function authHeaders() {
    return { 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchAll(); }, [days]);

  async function fetchAll() {
    try {
      setLoading(true);
      const [ovRes, trRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview?days=${days}`, { headers: authHeaders() }),
        fetch(`${API_BASE}/analytics/trends?days=${days}`, { headers: authHeaders() })
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (trRes.ok) setTrends(await trRes.json());
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

  const formatDate = (d) => d ? d.substring(5) : '';
  const formatPct = (v) => `${(v * 100).toFixed(1)}%`;
  const formatMs = (v) => v ? `${v}ms` : '';

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
              onClick={() => setDays(d)}>{d}d</button>
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
              <div style={s.kpiValue}>{overview.totalClicks?.toLocaleString()}</div>
              <div style={s.kpiLabel}>Total Clicks</div>
              <div style={s.kpiSub}>Last {days} days</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiValue}>{overview.totalSearches || 0}</div>
              <div style={s.kpiLabel}>Total Searches</div>
              <div style={s.kpiSub}>{overview.totalQueries} unique queries</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiValue, color: ctrColor(overview.avgCtr) }}>
                {(overview.avgCtr * 100).toFixed(1)}%
              </div>
              <div style={s.kpiLabel}>Avg CTR</div>
              <div style={{ ...s.kpiSub, color: ctrColor(overview.avgCtr) }}>{ctrLabel(overview.avgCtr)}</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiValue}>{overview.activeRules}</div>
              <div style={s.kpiLabel}>Active Rules</div>
              <div style={s.kpiSub}>{overview.pendingRules} pending review</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiValue, color: overview.zeroResultRate > 0.2 ? '#ef4444' : overview.zeroResultRate > 0.1 ? '#f97316' : '#22c55e' }}>
                {overview.totalSearches > 0 ? `${(overview.zeroResultRate * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div style={s.kpiLabel}>Zero Result Rate</div>
              <div style={s.kpiSub}>{overview.zeroResultCount} zero-result searches</div>
            </div>
            <div style={s.kpiCard}>
              <div style={{ ...s.kpiValue, color: '#94b4d4' }}>
                {overview.avgLatencyMs ? `${overview.avgLatencyMs}ms` : 'N/A'}
              </div>
              <div style={s.kpiLabel}>Avg Latency</div>
              <div style={s.kpiSub}>{overview.avgLatencyMs < 500 ? 'Fast' : overview.avgLatencyMs < 1000 ? 'Normal' : 'Slow'}</div>
            </div>
          </div>

          {/* Trend Charts */}
          {trends.length > 0 && (
            <div style={s.chartsGrid}>
              {/* Search Volume + Zero Result Rate */}
              <div style={s.chartCard}>
                <div style={s.chartTitle}>Search Volume & Zero Result Rate</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={formatPct} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0f1929', border: '1px solid rgba(0,119,255,0.3)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#94b4d4' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94b4d4' }} />
                    <Line yAxisId="left" type="monotone" dataKey="searches" stroke="#3b82f6" strokeWidth={2} dot={false} name="Searches" />
                    <Line yAxisId="right" type="monotone" dataKey="zeroResultRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Zero Result Rate" tickFormatter={formatPct} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Avg Latency */}
              <div style={s.chartCard}>
                <div style={s.chartTitle}>Avg Search Latency (ms)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0f1929', border: '1px solid rgba(0,119,255,0.3)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#94b4d4' }}
                      formatter={formatMs}
                    />
                    <Bar dataKey="avgLatencyMs" fill="#8b5cf6" radius={[3,3,0,0]} name="Latency (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Search Quality Charts */}
          {(overview.latestNdcg10 || overview.latestMrr10) && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Search Quality Score</div>
              <div style={s.qualityGrid}>
                <div style={s.qualityStat}>
                  <div style={{...s.qualityValue, color: overview.latestNdcg10 >= 0.9 ? '#22c55e' : '#f97316'}}>
                    {(overview.latestNdcg10 * 100).toFixed(1)}%
                  </div>
                  <div style={s.qualityLabel}>NDCG@10</div>
                </div>
                <div style={s.qualityStat}>
                  <div style={{...s.qualityValue, color: overview.latestMrr10 >= 0.9 ? '#22c55e' : '#f97316'}}>
                    {(overview.latestMrr10 * 100).toFixed(1)}%
                  </div>
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

          {/* Top Queries */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Top Queries by Click Volume</div>
            {overview.topQueries?.length === 0 ? (
              <div style={s.empty}>No click data yet.</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>{['Query','Clicks','Impressions','CTR','Performance'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {overview.topQueries?.map((q, i) => (
                    <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}><span style={s.queryText}>{q.query}</span></td>
                      <td style={s.td}><span style={s.number}>{q.clicks}</span></td>
                      <td style={s.td}><span style={s.number}>{q.impressions}</span></td>
                      <td style={s.td}><span style={{...s.ctrBadge, background: ctrColor(q.ctr)}}>{(q.ctr*100).toFixed(1)}%</span></td>
                      <td style={s.td}>
                        <div style={s.ctrBar}>
                          <div style={{...s.ctrBarFill, width:`${Math.min(q.ctr/0.3*100,100)}%`, background: ctrColor(q.ctr)}} />
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
            {!overview.topZeroResultQueries?.length ? (
              <div style={s.empty}>No zero-result queries. Great search coverage!</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>{['Query','Occurrences','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {overview.topZeroResultQueries.map((q,i) => (
                    <tr key={i} style={i%2===0?s.trEven:{}}>
                      <td style={s.td}><span style={s.queryText}>{q.query}</span></td>
                      <td style={s.td}><span style={{...s.ctrBadge, background:'#ef4444'}}>{q.occurrences}</span></td>
                      <td style={s.td}><span style={s.actionHint}>→ Create SYNONYM or check index coverage</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Rules Summary */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Rules Summary</div>
            <div style={s.rulesGrid}>
              <div style={s.rulesStat}>
                <div style={{...s.rulesNumber, color:'#22c55e'}}>{overview.activeRules}</div>
                <div style={s.rulesLabel}>Active</div>
              </div>
              <div style={s.rulesStat}>
                <div style={{...s.rulesNumber, color:'#f97316'}}>{overview.pendingRules}</div>
                <div style={s.rulesLabel}>Pending Review</div>
              </div>
            </div>
            {overview.pendingRules > 0 && (
              <div style={s.pendingAlert}>{overview.pendingRules} rule{overview.pendingRules>1?'s':''} waiting for approval</div>
            )}
          </div>
        </>
      ) : <div style={s.empty}>Failed to load analytics.</div>}
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
  kpiGrid:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  kpiCard:        { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 10, padding: '20px 24px' },
  kpiValue:       { fontSize: 32, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 },
  kpiLabel:       { fontSize: 13, fontWeight: 600, color: '#94b4d4', marginBottom: 2 },
  kpiSub:         { fontSize: 11, color: '#64748b' },
  chartsGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  chartCard:      { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 10, padding: '16px 20px' },
  chartTitle:     { fontSize: 13, fontWeight: 600, color: '#94b4d4', marginBottom: 12 },
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
  alertBadge:     { fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 600 },
  actionHint:     { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  qualityGrid:    { display: 'flex', gap: 24 },
  qualityStat:    { textAlign: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  qualityValue:   { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  qualityLabel:   { fontSize: 12, color: '#64748b' },
  rulesGrid:      { display: 'flex', gap: 24 },
  rulesStat:      { textAlign: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  rulesNumber:    { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  rulesLabel:     { fontSize: 12, color: '#64748b' },
  pendingAlert:   { marginTop: 12, padding: '8px 14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 7, fontSize: 13, color: '#fdba74' },
};
