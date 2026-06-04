// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function ClickIntelligence({ auth }) {
  const [summary, setSummary]             = useState(null);
  const [lowCtr, setLowCtr]               = useState([]);
  const [boostCandidates, setBoostCandidates] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeSection, setActiveSection] = useState('summary');
  const [error, setError]                 = useState(null);
  const [ruleMsg, setRuleMsg]             = useState(null);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, lowRes, boostRes] = await Promise.all([
        fetch(`${API_BASE}/click-intelligence/summary`,       { headers: authHeaders() }),
        fetch(`${API_BASE}/click-intelligence/low-ctr?limit=20`, { headers: authHeaders() }),
        fetch(`${API_BASE}/click-intelligence/boost-candidates?limit=20`, { headers: authHeaders() }),
      ]);
      setSummary(await sumRes.json());
      setLowCtr(await lowRes.json());
      setBoostCandidates(await boostRes.json());
    } catch (e) {
      setError('Failed to load click intelligence data');
    } finally {
      setLoading(false);
    }
  }

  async function createBoostRule(item) {
    try {
      const payload = {
        type: 'BOOST',
        query: item.query,
        boostField: 'productId',
        boostValue: item.productId,
        boostFactor: 2.0,
      };
      const res = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setRuleMsg(`BOOST rule created for "${item.query}" → ${item.productTitle}`);
        setTimeout(() => setRuleMsg(null), 4000);
      } else {
        setRuleMsg('Failed to create rule');
      }
    } catch (e) {
      setRuleMsg('Error creating rule');
    }
  }

  if (loading) return <div style={s.loading}>Loading click intelligence...</div>;
  if (error)   return <div style={s.error}>{error}</div>;

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Click Intelligence</div>
          <div style={s.subtitle}>CTR analysis from Kafka clickstream pipeline</div>
        </div>
        <button style={s.refreshBtn} onClick={fetchAll}>↻ Refresh</button>
      </div>

      {/* Rule created message */}
      {ruleMsg && <div style={s.successMsg}>{ruleMsg}</div>}

      {/* Summary cards */}
      {summary && (
        <div style={s.cardRow}>
          <div style={s.card}>
            <div style={s.cardValue}>{summary.lowCtrQueryCount}</div>
            <div style={s.cardLabel}>Low CTR Queries</div>
            <div style={s.cardHint}>CTR below {(summary.thresholds.lowCtrThreshold * 100).toFixed(0)}%</div>
          </div>
          <div style={s.card}>
            <div style={{...s.cardValue, color: '#22c55e'}}>{summary.boostCandidateCount}</div>
            <div style={s.cardLabel}>Boost Candidates</div>
            <div style={s.cardHint}>High CTR at low positions</div>
          </div>
          <div style={s.card}>
            <div style={{...s.cardValue, color: '#f59e0b'}}>{summary.thresholds.minImpressions}</div>
            <div style={s.cardLabel}>Min Impressions</div>
            <div style={s.cardHint}>Threshold for analysis</div>
          </div>
          <div style={s.card}>
            <div style={{...s.cardValue, color: '#06b6d4'}}>{summary.thresholds.lowPositionFloor}</div>
            <div style={s.cardLabel}>Position Floor</div>
            <div style={s.cardHint}>Avg position threshold</div>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div style={s.sectionTabs}>
        {[
          { key: 'low-ctr',  label: `Low CTR Queries (${lowCtr.length})` },
          { key: 'boost',    label: `Boost Candidates (${boostCandidates.length})` },
        ].map(t => (
          <button
            key={t.key}
            style={{...s.sectionTab, ...(activeSection === t.key ? s.sectionTabActive : {})}}
            onClick={() => setActiveSection(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* Low CTR table */}
      {activeSection === 'low-ctr' && (
        <div style={s.tableWrap}>
          {lowCtr.length === 0 ? (
            <div style={s.empty}>
              No low CTR queries yet. Need at least {summary?.thresholds?.minImpressions} impressions per query.
              Keep using the search UI to generate click data.
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['Query', 'Product', 'Clicks', 'Impressions', 'CTR', 'Avg Position', 'Action'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowCtr.map((item, i) => (
                  <tr key={item.id} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}><span style={s.queryBadge}>{item.query}</span></td>
                    <td style={s.td}><div style={s.productTitle}>{item.productTitle}</div></td>
                    <td style={s.td}>{item.clickCount}</td>
                    <td style={s.td}>{item.impressionCount}</td>
                    <td style={s.td}><span style={s.ctrBad}>{(item.ctr * 100).toFixed(1)}%</span></td>
                    <td style={s.td}>{item.avgPosition.toFixed(1)}</td>
                    <td style={s.td}>
                      <button style={s.actionBtn} onClick={() => createBoostRule(item)}>
                        + BOOST Rule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Boost candidates table */}
      {activeSection === 'boost' && (
        <div style={s.tableWrap}>
          {boostCandidates.length === 0 ? (
            <div style={s.empty}>
              No boost candidates yet. These appear when products have high CTR
              but are ranking below position {summary?.thresholds?.lowPositionFloor}.
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['Query', 'Product', 'Clicks', 'CTR', 'Avg Position', 'Opportunity', 'Action'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boostCandidates.map((item, i) => (
                  <tr key={item.id} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}><span style={s.queryBadge}>{item.query}</span></td>
                    <td style={s.td}><div style={s.productTitle}>{item.productTitle}</div></td>
                    <td style={s.td}>{item.clickCount}</td>
                    <td style={s.td}><span style={s.ctrGood}>{(item.ctr * 100).toFixed(1)}%</span></td>
                    <td style={s.td}><span style={s.positionBad}>#{item.avgPosition.toFixed(1)}</span></td>
                    <td style={s.td}>
                      <span style={s.opportunityBadge}>
                        Move to top {Math.ceil(item.avgPosition / 2)}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.actionBtn} onClick={() => createBoostRule(item)}>
                        + BOOST Rule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  container:        { padding: '24px', fontFamily: 'sans-serif' },
  header:           { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:            { fontSize: '22px', fontWeight: 700, color: '#e2e8f0' },
  subtitle:         { fontSize: '13px', color: '#94b4d4', marginTop: '4px' },
  refreshBtn:       { padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  loading:          { padding: '40px', textAlign: 'center', color: '#94b4d4' },
  error:            { padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626' },
  successMsg:       { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  cardRow:          { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  card:             { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  cardValue:        { fontSize: '32px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' },
  cardLabel:        { fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' },
  cardHint:         { fontSize: '11px', color: '#475569' },
  sectionTabs:      { display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' },
  sectionTab:       { padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#94b4d4', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  sectionTabActive: { color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600 },
  tableWrap:        { overflowX: 'auto' },
  table:            { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:               { padding: '10px 12px', textAlign: 'left', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#1e293b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td:               { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven:           { background: '#f1f5f9' },
  queryBadge:       { background: '#7c3aed', color: '#ffffff', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 },
  productTitle:     { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' },
  ctrBad:           { background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 },
  ctrGood:          { background: '#16a34a', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 },
  positionBad:      { background: '#d97706', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 },
  opportunityBadge: { background: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' },
  actionBtn:        { padding: '6px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  empty:            { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '14px', background: '#f1f5f9', borderRadius: '8px', lineHeight: '1.6' },
};
