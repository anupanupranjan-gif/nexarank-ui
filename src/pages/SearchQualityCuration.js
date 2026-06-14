// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';
const SEARCH_API = '/api/v1/search';
const GRADE_LABELS = ['Irrelevant', 'Poor', 'Fair', 'Perfect'];
const GRADE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e'];

export default function SearchQualityCuration({ auth }) {
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);
  const [suggestedQueries, setSuggestedQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [judgments, setJudgments] = useState({});
  const [setStats, setSetStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [showNewSet, setShowNewSet] = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchSets(); fetchSuggestedQueries(); }, []);
  useEffect(() => { if (activeSet) { fetchJudgments(); fetchSetStats(); } }, [activeSet]);
  useEffect(() => { if (selectedQuery) searchForQuery(selectedQuery); }, [selectedQuery]);

  async function fetchSets() {
    const res = await fetch(`${API_BASE}/judgments/sets`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSets(data);
      if (data.length > 0 && !activeSet) setActiveSet(data[0]);
    }
  }

  async function fetchSuggestedQueries() {
    const res = await fetch(`${API_BASE}/judgments/suggested-queries?limit=30`, { headers: authHeaders() });
    if (res.ok) setSuggestedQueries(await res.json());
  }

  async function fetchJudgments() {
    if (!activeSet) return;
    const res = await fetch(`${API_BASE}/judgments/sets/${activeSet.id}/judgments`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      const map = {};
      data.forEach(j => { map[`${j.query}::${j.productId}`] = j.grade; });
      setJudgments(map);
    }
  }

  async function fetchSetStats() {
    if (!activeSet) return;
    const res = await fetch(`${API_BASE}/judgments/sets/${activeSet.id}/stats`, { headers: authHeaders() });
    if (res.ok) setSetStats(await res.json());
  }

  async function searchForQuery(query) {
    setSearching(true);
    try {
      const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}&size=10&mode=keyword`, {
        headers: { 'X-API-Key': process.env.REACT_APP_SEARCH_API_KEY || 'searchx-dev-key-2026' }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.hits || data.products || []);
      }
    } catch (e) { setSearchResults([]); }
    finally { setSearching(false); }
  }

  async function saveJudgment(productId, productTitle, grade) {
    if (!activeSet || !selectedQuery) return;
    await fetch(`${API_BASE}/judgments/sets/${activeSet.id}/judgments`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ query: selectedQuery, productId, productTitle, grade })
    });
    setJudgments(prev => ({ ...prev, [`${selectedQuery}::${productId}`]: grade }));
    fetchSetStats();
  }

  async function createSet() {
    if (!newSetName.trim()) return;
    const res = await fetch(`${API_BASE}/judgments/sets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newSetName })
    });
    if (res.ok) {
      const newSet = await res.json();
      setSets(prev => [newSet, ...prev]);
      setActiveSet(newSet);
      setNewSetName('');
      setShowNewSet(false);
    }
  }

  async function deleteSet(setId) {
    if (!window.confirm('Delete this judgment set?')) return;
    await fetch(`${API_BASE}/judgments/sets/${setId}`, { method: 'DELETE', headers: authHeaders() });
    fetchSets();
    if (activeSet?.id === setId) setActiveSet(null);
  }

  const getGrade = (productId) => judgments[`${selectedQuery}::${productId}`];
  const judgedCount = suggestedQueries.filter(q =>
    Object.keys(judgments).some(k => k.startsWith(q.query + '::'))
  ).length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Search Quality Curation</div>
          <div style={s.subtitle}>Rate search results to build relevance judgment sets for NDCG/MRR evaluation</div>
        </div>
      </div>

      <div style={s.layout}>
        {/* LEFT PANEL — Judgment Sets + Query List */}
        <div style={s.leftPanel}>
          {/* Judgment Set Selector */}
          <div style={s.setSection}>
            <div style={s.setHeader}>
              <span style={s.setLabel}>Judgment Set</span>
              <button style={s.newSetBtn} onClick={() => setShowNewSet(v => !v)}>+ New</button>
            </div>

            {showNewSet && (
              <div style={s.newSetForm}>
                <input style={s.newSetInput} placeholder="Set name e.g. Baseline Q3 2026"
                  value={newSetName} onChange={e => setNewSetName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSet()} />
                <button style={s.createSetBtn} onClick={createSet}>Create</button>
              </div>
            )}

            {sets.map(set => (
              <div key={set.id} style={{
                ...s.setItem,
                ...(activeSet?.id === set.id ? s.setItemActive : {})
              }} onClick={() => setActiveSet(set)}>
                <div style={s.setName}>{set.name}</div>
                <button style={s.deleteSetBtn} onClick={e => { e.stopPropagation(); deleteSet(set.id); }}>✕</button>
              </div>
            ))}

            {sets.length === 0 && (
              <div style={s.emptySet}>Create a judgment set to get started</div>
            )}
          </div>

          {/* Set Stats */}
          {setStats && activeSet && (
            <div style={s.statsBar}>
              <span style={s.statItem}><b>{setStats.queriesJudged}</b> queries judged</span>
              <span style={s.statItem}><b>{setStats.totalJudgments}</b> total judgments</span>
            </div>
          )}

          {/* Query List */}
          <div style={s.querySection}>
            <div style={s.queryLabel}>
              Top Queries ({judgedCount}/{suggestedQueries.length} judged)
            </div>
            {suggestedQueries.map(q => {
              const isJudged = Object.keys(judgments).some(k => k.startsWith(q.query + '::'));
              return (
                <div key={q.query}
                  style={{
                    ...s.queryItem,
                    ...(selectedQuery === q.query ? s.queryItemActive : {}),
                    ...(isJudged ? s.queryItemJudged : {})
                  }}
                  onClick={() => setSelectedQuery(q.query)}>
                  <div style={s.queryText}>{q.query}</div>
                  <div style={s.queryMeta}>
                    {isJudged && <span style={s.judgedBadge}>✓</span>}
                    <span style={s.clickCount}>{q.clicks} clicks</span>
                  </div>
                </div>
              );
            })}
            {suggestedQueries.length === 0 && (
              <div style={s.emptyQuery}>Search some queries first to see suggestions</div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Search Results with Grade Buttons */}
        <div style={s.rightPanel}>
          {!selectedQuery ? (
            <div style={s.selectPrompt}>
              <div style={s.promptIcon}>◑</div>
              <div style={s.promptText}>Select a query from the left to start rating results</div>
              <div style={s.promptSub}>Grade each result 0-3 based on relevance to the query</div>
            </div>
          ) : (
            <>
              <div style={s.resultHeader}>
                <div style={s.resultQuery}>Results for: <strong>{selectedQuery}</strong></div>
                <div style={s.gradeScale}>
                  {GRADE_LABELS.map((label, i) => (
                    <span key={i} style={{...s.gradeLegend, color: GRADE_COLORS[i]}}>
                      {i} = {label}
                    </span>
                  ))}
                </div>
              </div>

              {searching ? (
                <div style={s.loading}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div style={s.noResults}>No results found for "{selectedQuery}"</div>
              ) : (
                <div style={s.resultList}>
                  {searchResults.map((hit, i) => {
                    const productId = hit.id || hit._id || String(i);
                    const productTitle = hit.name || hit.title || hit.productName || `Product ${productId}`;
                    const currentGrade = getGrade(productId);

                    return (
                      <div key={productId} style={s.resultCard}>
                        <div style={s.resultRank}>#{i + 1}</div>
                        <div style={s.resultInfo}>
                          <div style={s.resultTitle}>{productTitle}</div>
                          <div style={s.resultId}>ID: {productId}</div>
                          {hit.category && <div style={s.resultMeta}>{hit.category}</div>}
                          {hit.price && <div style={s.resultPrice}>${hit.price}</div>}
                        </div>
                        <div style={s.gradeButtons}>
                          {[0, 1, 2, 3].map(grade => (
                            <button key={grade}
                              style={{
                                ...s.gradeBtn,
                                background: currentGrade === grade ? GRADE_COLORS[grade] : 'rgba(255,255,255,0.05)',
                                color: currentGrade === grade ? '#fff' : '#64748b',
                                borderColor: currentGrade === grade ? GRADE_COLORS[grade] : 'rgba(255,255,255,0.1)',
                              }}
                              onClick={() => saveJudgment(productId, productTitle, grade)}
                              title={GRADE_LABELS[grade]}>
                              {grade}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:           { padding: '28px 32px', minHeight: '100vh' },
  header:         { marginBottom: 20 },
  title:          { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle:       { fontSize: 13, color: '#4a5568' },
  layout:         { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' },
  leftPanel:      { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, overflow: 'hidden' },
  setSection:     { padding: 12, borderBottom: '1px solid #e1e4e8' },
  setHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  setLabel:       { fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' },
  newSetBtn:      { fontSize: 11, background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' },
  newSetForm:     { display: 'flex', gap: 6, marginBottom: 8 },
  newSetInput:    { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 6, padding: '5px 8px', color: '#1a202c', fontSize: 12 },
  createSetBtn:   { background: 'rgba(0,119,255,0.2)', border: '1px solid rgba(0,119,255,0.4)', color: '#1a202c', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  setItem:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2 },
  setItemActive:  { background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)' },
  setName:        { fontSize: 13, color: '#1a202c' },
  deleteSetBtn:   { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 },
  emptySet:       { fontSize: 12, color: '#475569', textAlign: 'center', padding: '8px 0' },
  statsBar:       { display: 'flex', gap: 12, padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #e1e4e8' },
  statItem:       { fontSize: 11, color: '#64748b' },
  querySection:   { padding: 8, maxHeight: 500, overflowY: 'auto' },
  queryLabel:     { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', marginBottom: 4 },
  queryItem:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2 },
  queryItemActive:{ background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)' },
  queryItemJudged:{ opacity: 0.7 },
  queryText:      { fontSize: 13, color: '#1a202c' },
  queryMeta:      { display: 'flex', alignItems: 'center', gap: 6 },
  judgedBadge:    { fontSize: 11, color: '#22c55e', fontWeight: 700 },
  clickCount:     { fontSize: 11, color: '#475569' },
  emptyQuery:     { fontSize: 12, color: '#475569', textAlign: 'center', padding: '12px 8px' },
  rightPanel:     { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, minHeight: 400 },
  selectPrompt:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  promptIcon:     { fontSize: 40, opacity: 0.3 },
  promptText:     { fontSize: 15, color: '#4a5568', fontWeight: 600 },
  promptSub:      { fontSize: 13, color: '#475569' },
  resultHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #e1e4e8' },
  resultQuery:    { fontSize: 14, color: '#1a202c' },
  gradeScale:     { display: 'flex', gap: 12 },
  gradeLegend:    { fontSize: 11 },
  loading:        { padding: 40, textAlign: 'center', color: '#4a5568' },
  noResults:      { padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 },
  resultList:     { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  resultCard:     { display: 'flex', alignItems: 'center', gap: 12, background: '#f8f9fa', borderRadius: 8, padding: '12px 14px' },
  resultRank:     { fontSize: 12, color: '#475569', fontWeight: 700, minWidth: 28, textAlign: 'center' },
  resultInfo:     { flex: 1, minWidth: 0 },
  resultTitle:    { fontSize: 14, color: '#1a202c', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  resultId:       { fontSize: 11, color: '#475569' },
  resultMeta:     { fontSize: 11, color: '#64748b' },
  resultPrice:    { fontSize: 12, color: '#22c55e', fontWeight: 600 },
  gradeButtons:   { display: 'flex', gap: 6 },
  gradeBtn:       { width: 32, height: 32, border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' },
};
