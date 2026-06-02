// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function SearchQuality({ auth }) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState(null);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  useEffect(() => { fetchLatest(); }, []);

  async function fetchLatest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/search-quality`, { headers: authHeaders() });
      if (res.status === 204) {
        setResult(null);
      } else {
        setResult(await res.json());
      }
    } catch (e) {
      setError('Failed to load search quality data');
    } finally {
      setLoading(false);
    }
  }

  async function runEvaluation() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/search-quality/run`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        setError('Evaluation failed — check nexarank-api logs');
      }
    } catch (e) {
      setError('Failed to run evaluation');
    } finally {
      setRunning(false);
    }
  }

  function fmt(val) {
    return val != null ? (val * 100).toFixed(1) + '%' : '—';
  }

  function scoreColor(val) {
    if (val >= 0.95) return '#16a34a';
    if (val >= 0.80) return '#d97706';
    return '#dc2626';
  }

  if (loading) return <div style={s.loading}>Loading search quality...</div>;

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Search Quality</div>
          <div style={s.subtitle}>NDCG@5, NDCG@10, MRR@10 — 30 curated automotive queries</div>
        </div>
        <button
          style={{...s.runBtn, opacity: running ? 0.6 : 1}}
          onClick={runEvaluation}
          disabled={running}
        >
          {running ? '⟳ Running evaluation...' : '▶ Run Evaluation'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {!result && !error && (
        <div style={s.empty}>
          No evaluation has been run yet. Click "Run Evaluation" to compute
          NDCG@10 and MRR@10 across 30 curated queries.
          This takes about 30-60 seconds.
        </div>
      )}

      {result && (
        <>
          {/* Run info */}
          <div style={s.runInfo}>
            Last run: {new Date(result.evaluatedAt).toLocaleString()} —
            {result.evaluatedQueries} of {result.totalQueries} queries evaluated
          </div>

          {/* Primary score cards */}
          <div style={s.cardRow}>
            <div style={s.scoreCard}>
              <div style={{...s.scoreValue, color: scoreColor(result.ndcg5)}}>
                {fmt(result.ndcg5)}
              </div>
              <div style={s.scoreLabel}>NDCG@5</div>
              <div style={s.scoreHint}>Top 5 result quality</div>
            </div>
            <div style={s.scoreCard}>
              <div style={{...s.scoreValue, color: scoreColor(result.ndcg10)}}>
                {fmt(result.ndcg10)}
              </div>
              <div style={s.scoreLabel}>NDCG@10</div>
              <div style={s.scoreHint}>Full page quality</div>
            </div>
            <div style={s.scoreCard}>
              <div style={{...s.scoreValue, color: scoreColor(result.mrr10)}}>
                {fmt(result.mrr10)}
              </div>
              <div style={s.scoreLabel}>MRR@10</div>
              <div style={s.scoreHint}>First relevant result</div>
            </div>
          </div>

          {/* BM25 vs Hybrid comparison */}
          {result.byMode && (
            <div style={s.section}>
              <div style={s.sectionTitle}>BM25 vs Hybrid Comparison</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Mode', 'NDCG@5', 'NDCG@10', 'MRR@10', 'NDCG@10 Lift vs BM25'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(result.byMode).map((m, i) => (
                    <tr key={m.mode} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}>
                        <span style={m.mode.includes('Hybrid') ? s.hybridBadge : s.bm25Badge}>
                          {m.mode}
                        </span>
                      </td>
                      <td style={s.td}>{fmt(m.ndcg5)}</td>
                      <td style={s.td}>
                        <strong style={{color: scoreColor(m.ndcg10)}}>
                          {fmt(m.ndcg10)}
                        </strong>
                      </td>
                      <td style={s.td}>{fmt(m.mrr10)}</td>
                      <td style={s.td}>
                        {m.ndcg10LiftVsBaseline > 0 ? (
                          <span style={s.liftBadge}>
                            +{m.ndcg10LiftVsBaseline.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={s.baselineBadge}>baseline</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* By intent breakdown */}
          {result.byIntent && (
            <div style={s.section}>
              <div style={s.sectionTitle}>NDCG@10 by Query Intent</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Intent', 'Queries', 'NDCG@10', 'MRR@10', 'Quality'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(result.byIntent)
                    .sort((a, b) => a.ndcg10 - b.ndcg10)
                    .map((intent, i) => (
                    <tr key={intent.intent} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}>
                        <span style={s.intentBadge}>{intent.intent}</span>
                      </td>
                      <td style={s.td}>{intent.queryCount}</td>
                      <td style={s.td}>
                        <strong style={{color: scoreColor(intent.ndcg10)}}>
                          {fmt(intent.ndcg10)}
                        </strong>
                      </td>
                      <td style={s.td}>{fmt(intent.mrr10)}</td>
                      <td style={s.td}>
                        <div style={s.barWrap}>
                          <div style={{
                            ...s.bar,
                            width: `${intent.ndcg10 * 100}%`,
                            background: scoreColor(intent.ndcg10)
                          }}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Interview answer */}
          <div style={s.interviewBox}>
            <div style={s.interviewTitle}>📋 Interview Answer</div>
            <div style={s.interviewText}>
              "On our 30-query automotive test set, hybrid BM25+vector search scored
              NDCG@10 of {result.ndcg10?.toFixed(3)} and MRR@10 of {result.mrr10?.toFixed(3)},
              compared to BM25 baseline of {result.byMode?.bm25?.ndcg10?.toFixed(3)} — a{' '}
              {result.byMode?.hybrid?.ndcg10LiftVsBaseline?.toFixed(1)}% NDCG@10 improvement.
              The biggest gains were on semantic and problem-statement queries where
              vector embeddings capture intent that keyword matching misses entirely."
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  container:      { padding: '24px', fontFamily: 'sans-serif' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:          { fontSize: '22px', fontWeight: 700, color: '#1e293b' },
  subtitle:       { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  runBtn:         { padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
  loading:        { padding: '40px', textAlign: 'center', color: '#64748b' },
  error:          { padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginBottom: '16px' },
  empty:          { padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '8px', lineHeight: '1.8' },
  runInfo:        { fontSize: '12px', color: '#94a3b8', marginBottom: '16px' },
  cardRow:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  scoreCard:      { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  scoreValue:     { fontSize: '40px', fontWeight: 800, marginBottom: '4px' },
  scoreLabel:     { fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' },
  scoreHint:      { fontSize: '12px', color: '#94a3b8' },
  section:        { marginBottom: '24px' },
  sectionTitle:   { fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' },
  table:          { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:             { padding: '10px 12px', textAlign: 'left', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td:             { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven:         { background: '#fafafa' },
  hybridBadge:    { background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 },
  bm25Badge:      { background: '#fafafa', color: '#64748b', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' },
  liftBadge:      { background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 },
  baselineBadge:  { background: '#f1f5f9', color: '#94a3b8', padding: '3px 8px', borderRadius: '10px', fontSize: '12px' },
  intentBadge:    { background: '#faf5ff', color: '#7c3aed', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' },
  barWrap:        { width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
  bar:            { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  interviewBox:   { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginTop: '8px' },
  interviewTitle: { fontSize: '14px', fontWeight: 600, color: '#92400e', marginBottom: '8px' },
  interviewText:  { fontSize: '13px', color: '#78350f', lineHeight: '1.7', fontStyle: 'italic' },
};
