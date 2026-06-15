// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function AiSuggestions({ auth }) {
  const [boostSuggestions, setBoostSuggestions] = useState([]);
  const [synonymSuggestions, setSynonymSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState({});
  const [applied, setApplied] = useState({});
  const [config, setConfig]       = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false); 
  const [watchedQueries, setWatchedQueries] = useState([]);
  const [alerts, setAlerts]                 = useState([]);
  const [newWatchedQuery, setNewWatchedQuery] = useState({query:'', expectedMinCtr:'', expectedMaxPosition:'', notes:''});
  const [addingWatched, setAddingWatched]   = useState(false);
  const [signals, setSignals]       = useState([]);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [signalSuggestions, setSignalSuggestions] = useState([]);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchSuggestions(); fetchConfig(); fetchWatchedQueries(); fetchSignals(); }, []);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const [boostRes, synRes] = await Promise.all([
        fetch(`${API_BASE}/suggestions/boost`, { headers: authHeaders() }),
        fetch(`${API_BASE}/suggestions/synonyms`, { headers: authHeaders() })
      ]);
      if (boostRes.ok) setBoostSuggestions(await boostRes.json());
      if (synRes.ok) setSynonymSuggestions(await synRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  async function fetchConfig() {
  try {
    const res = await fetch(`${API_BASE}/suggestions/config`, { headers: authHeaders() });
    if (res.ok) setConfig(await res.json());
  } catch (e) {}
}

async function saveConfig() {
  setSavingConfig(true);
  try {
    const res = await fetch(`${API_BASE}/suggestions/config`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(config),
    });
    if (res.ok) {
      setConfig(await res.json());
      setShowConfig(false);
    }
  } catch (e) {} finally { setSavingConfig(false); }
}
async function fetchWatchedQueries() {
  try {
    const [wqRes, alertRes] = await Promise.all([
      fetch(`${API_BASE}/suggestions/watched-queries`, { headers: authHeaders() }),
      fetch(`${API_BASE}/suggestions/alerts`, { headers: authHeaders() })
    ]);
    if (wqRes.ok) setWatchedQueries(await wqRes.json());
    if (alertRes.ok) setAlerts(await alertRes.json());
  } catch (e) {}
}
async function fetchSignals() {
  try {
    const [sigRes, sigSugRes] = await Promise.all([
      fetch(`${API_BASE}/signals/active`, { headers: authHeaders() }),
      fetch(`${API_BASE}/suggestions/signals`, { headers: authHeaders() })
    ]);
    if (sigRes.ok) setSignals(await sigRes.json());
    if (sigSugRes.ok) setSignalSuggestions(await sigSugRes.json());
  } catch (e) {}
}

async function seedDemoSignals() {
  setSeedingDemo(true);
  try {
    await fetch(`${API_BASE}/signals/seed-demo`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify(['P001','P002','P003','P004'])
    });
    fetchSignals();
  } catch (e) {} finally { setSeedingDemo(false); }
}

async function addWatchedQuery() {
  if (!newWatchedQuery.query.trim()) return;
  setAddingWatched(true);
  try {
    const res = await fetch(`${API_BASE}/suggestions/watched-queries`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        ...newWatchedQuery,
        expectedMinCtr: newWatchedQuery.expectedMinCtr ? parseFloat(newWatchedQuery.expectedMinCtr) : null,
        expectedMaxPosition: newWatchedQuery.expectedMaxPosition ? parseFloat(newWatchedQuery.expectedMaxPosition) : null,
      }),
    });
    if (res.ok) {
      setNewWatchedQuery({query:'', expectedMinCtr:'', expectedMaxPosition:'', notes:''});
      fetchWatchedQueries();
    }
  } catch (e) {} finally { setAddingWatched(false); }
}

async function deleteWatchedQuery(id) {
  await fetch(`${API_BASE}/suggestions/watched-queries/${id}`, {
    method: 'DELETE', headers: authHeaders()
  });
  fetchWatchedQueries();
}
  async function applySuggestion(suggestion, key) {
    setApplying(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API_BASE}/suggestions/apply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(suggestion)
      });
      if (res.ok) {
        setApplied(prev => ({ ...prev, [key]: true }));
      }
    } catch (e) { console.error(e); }
    finally { setApplying(prev => ({ ...prev, [key]: false })); }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>AI-Suggested Rules</div>
          <div style={s.subtitle}>Rules suggested from click patterns and zero-result analysis</div>
        </div>
        <button style={s.refreshBtn} onClick={fetchSuggestions}>↻ Refresh</button>
      </div>
    {/* Config Panel */}
<div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
  <button style={s.refreshBtn} onClick={() => setShowConfig(!showConfig)}>
    ⚙ Thresholds
  </button>
</div>

{showConfig && config && (
  <div style={{...s.section, marginBottom: 20}}>
    <div style={s.sectionTitle}>Suggestion Thresholds</div>
    <div style={{display:'flex', gap:16, flexWrap:'wrap', marginTop:16}}>
      {[
        {key:'maxClickPosition', label:'Max Click Position', hint:'Positions above this are boost candidates'},
        {key:'minClicks', label:'Min Clicks', hint:'Minimum clicks before suggesting'},
        {key:'minImpressions', label:'Min Impressions', hint:'Minimum impressions to reduce noise'},
        {key:'minCtr', label:'Min CTR', hint:'CTR below this triggers boost suggestion'},
        {key:'lookbackDays', label:'Lookback Days', hint:'Days of history to analyze'},
        {key:'maxSuggestions', label:'Max Suggestions', hint:'Maximum suggestions to return'},
      ].map(field => (
        <div key={field.key} style={{display:'flex', flexDirection:'column', gap:4, minWidth:160}}>
          <label style={{fontSize:11, fontWeight:700, color:'#0f172a', textTransform:'uppercase'}}>{field.label}</label>
          <input
            style={{padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:6, fontSize:13, background:'white'}}
            type="number"
            step={field.key === 'minCtr' ? '0.01' : '1'}
            value={config[field.key] || ''}
            onChange={e => setConfig(p => ({...p, [field.key]: parseFloat(e.target.value)}))}
          />
          <div style={{fontSize:11, color:'#64748b'}}>{field.hint}</div>
        </div>
      ))}
    </div>
    <div style={{marginTop:16, display:'flex', gap:8}}>
      <button style={{...s.refreshBtn, background:'#4f46e5', color:'white', border:'none'}}
        onClick={saveConfig} disabled={savingConfig}>
        {savingConfig ? 'Saving...' : '💾 Save Thresholds'}
      </button>
      <button style={s.refreshBtn} onClick={() => setShowConfig(false)}>Cancel</button>
    </div>
  </div>
)}
      {loading ? (
        <div style={s.loading}>Analyzing click patterns...</div>
      ) : (
        <>
          {/* Boost Suggestions */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>
                <span style={s.sectionIcon}>▲</span>
                Boost Candidates
              </div>
              <div style={s.sectionDesc}>Products clicked at low positions — boost them higher</div>
            </div>

            {boostSuggestions.length === 0 ? (
              <div style={s.empty}>No boost candidates found. Generate more search traffic first.</div>
            ) : (
              <div style={s.cards}>
                {boostSuggestions.map((s_item, i) => {
                  const key = `boost-${i}`;
                  const isApplied = applied[key];
                  const isApplying = applying[key];

                  return (
                    <div key={i} style={{
                      ...s.card,
                      ...(s_item.alreadyHasRule ? s.cardDimmed : {}),
                      ...(isApplied ? s.cardApplied : {})
                    }}>
                      <div style={s.cardTop}>
                        <div style={s.cardType}>BOOST</div>
                        <div style={s.positionBadge}>pos {s_item.avgPosition}</div>
                      </div>
                      <div style={s.cardQuery}>"{s_item.query}"</div>
                      <div style={s.cardProduct}>{s_item.productTitle}</div>
                      <div style={s.cardReason}>{s_item.reason}</div>
                      {s_item.alreadyHasRule && (
                        <div style={s.existingNote}>⚠ Rule already exists for this query</div>
                      )}
                      <div style={s.cardActions}>
                        {isApplied ? (
                          <span style={s.appliedBadge}>✓ Created as Pending Review</span>
                        ) : (
                          <button style={s.applyBtn}
                            disabled={isApplying || s_item.alreadyHasRule}
                            onClick={() => applySuggestion(s_item, key)}>
                            {isApplying ? 'Creating...' : s_item.alreadyHasRule ? 'Already has rule' : '+ Create Rule'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Synonym Suggestions */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>
                <span style={s.sectionIcon}>⟷</span>
                Synonym Suggestions
              </div>
              <div style={s.sectionDesc}>AI-powered synonym suggestions for zero-result queries</div>
            </div>

            {synonymSuggestions.length === 0 ? (
              <div style={s.empty}>
                No meaningful zero-result queries found.
                When customers search for terms with no results, AI will suggest synonyms here.
              </div>
            ) : (
              <div style={s.cards}>
                {synonymSuggestions.map((s_item, i) => {
                  const key = `syn-${i}`;
                  const isApplied = applied[key];
                  const isApplying = applying[key];

                  return (
                    <div key={i} style={{...s.card, ...(isApplied ? s.cardApplied : {})}}>
                      <div style={s.cardTop}>
                        <div style={{...s.cardType, background: 'rgba(139,92,246,0.2)', color: '#a78bfa'}}>SYNONYM</div>
                      </div>
                      <div style={s.cardQuery}>"{s_item.query}"</div>
                      <div style={s.cardReason}>{s_item.reason}</div>
                      {s_item.aiSuggestion && (
                        <div style={s.aiSuggestion}>
                          <span style={s.aiLabel}>AI suggests: </span>
                          <span style={s.aiText}>{s_item.aiSuggestion}</span>
                        </div>
                      )}
                      <div style={s.cardActions}>
                        {isApplied ? (
                          <span style={s.appliedBadge}>✓ Created as Pending Review</span>
                        ) : (
                          <button style={{...s.applyBtn, background: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.4)'}}
                            disabled={isApplying}
                            onClick={() => applySuggestion(s_item, key)}>
                            {isApplying ? 'Creating...' : '+ Create Synonym Rule'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Watched Queries */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>
                <span style={s.sectionIcon}>👁</span>
                Watched Queries
              </div>
              <div style={s.sectionDesc}>Monitor high-priority queries and get alerted when performance drops</div>
            </div>

            {/* Add form */}
            <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
              <input style={{...s.input, flex:2, minWidth:140}} placeholder="Query to watch..."
                value={newWatchedQuery.query}
                onChange={e => setNewWatchedQuery(p => ({...p, query: e.target.value}))} />
              <input style={{...s.input, width:90}} placeholder="Min CTR" type="number" step="0.01"
                value={newWatchedQuery.expectedMinCtr}
                onChange={e => setNewWatchedQuery(p => ({...p, expectedMinCtr: e.target.value}))} />
              <input style={{...s.input, width:100}} placeholder="Max Position" type="number"
                value={newWatchedQuery.expectedMaxPosition}
                onChange={e => setNewWatchedQuery(p => ({...p, expectedMaxPosition: e.target.value}))} />
              <input style={{...s.input, flex:2, minWidth:140}} placeholder="Notes (optional)"
                value={newWatchedQuery.notes}
                onChange={e => setNewWatchedQuery(p => ({...p, notes: e.target.value}))} />
              <button style={{...s.applyBtn, padding:'8px 16px'}}
                onClick={addWatchedQuery} disabled={addingWatched || !newWatchedQuery.query.trim()}>
                {addingWatched ? 'Adding...' : '+ Watch'}
              </button>
            </div>

            {/* Alert list */}
            {alerts.length === 0 && watchedQueries.length === 0 && (
              <div style={s.empty}>No watched queries. Add queries above to monitor their performance.</div>
            )}
            {alerts.map((alert, i) => (
              <div key={i} style={{
                ...s.card,
                marginBottom: 8,
                borderLeft: `4px solid ${alert.status === 'BREACH' ? '#ef4444' : alert.status === 'NO_DATA' ? '#f97316' : '#22c55e'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                    <span style={{...s.cardQuery, marginBottom:0}}>{alert.query}</span>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10,
                      background: alert.status === 'BREACH' ? '#fef2f2' : alert.status === 'NO_DATA' ? '#fff7ed' : '#f0fdf4',
                      color: alert.status === 'BREACH' ? '#dc2626' : alert.status === 'NO_DATA' ? '#f97316' : '#16a34a'
                    }}>{alert.status}</span>
                  </div>
                  <div style={s.cardReason}>{alert.message}</div>
                  {alert.ctr !== undefined && (
                    <div style={{fontSize:12, color:'#64748b'}}>
                      CTR: {(alert.ctr * 100).toFixed(1)}% · Clicks: {alert.clicks} · Impressions: {alert.impressions}
                    </div>
                  )}
                  {alert.notes && <div style={{fontSize:11, color:'#94a3b8', marginTop:4}}>{alert.notes}</div>}
                </div>
                <button style={{...s.applyBtn, background:'#fef2f2', borderColor:'#fca5a5', color:'#dc2626'}}
                  onClick={() => deleteWatchedQuery(alert.watchedQueryId)}>Remove</button>
              </div>
            ))}
          </div>

          {/* Business Signals */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={s.sectionTitle}>
                    <span style={s.sectionIcon}>📡</span>
                    Business Signals
                  </div>
                  <div style={s.sectionDesc}>
                    ERP/PIM signals — inventory, margin, promotions, seasonal flags
                  </div>
                </div>
                <button style={s.refreshBtn} onClick={seedDemoSignals} disabled={seedingDemo}>
                  {seedingDemo ? 'Seeding...' : '🧪 Seed Demo Data'}
                </button>
              </div>
            </div>

            {signals.length > 0 && (
              <div style={{marginBottom: 16}}>
                <div style={{fontSize:12, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase'}}>
                  Active Signals ({signals.length})
                </div>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {signals.map((sig, i) => (
                    <div key={i} style={{
                      padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                      background: sig.signalType === 'PROMOTED' || sig.signalType === 'SEASONAL'
                        ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: sig.signalType === 'PROMOTED' || sig.signalType === 'SEASONAL'
                        ? '#16a34a' : '#dc2626',
                      border: `1px solid ${sig.signalType === 'PROMOTED' || sig.signalType === 'SEASONAL'
                        ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                    }}>
                      {sig.productId} · {sig.signalType}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {signalSuggestions.length === 0 ? (
              <div style={s.empty}>
                No business signals. Click "Seed Demo Data" to load test signals,
                or ingest real signals via POST /api/v1/signals/ingest
              </div>
            ) : (
              <div style={s.cards}>
                {signalSuggestions.map((sig, i) => (
                  <div key={i} style={{
                    ...s.card,
                    borderLeft: `4px solid ${sig.type === 'BOOST' ? '#22c55e' : '#ef4444'}`
                  }}>
                    <div style={s.cardTop}>
                      <div style={{
                        ...s.cardType,
                        background: sig.type === 'BOOST' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: sig.type === 'BOOST' ? '#16a34a' : '#dc2626'
                      }}>{sig.type}</div>
                      <div style={{fontSize:11, color:'#94a3b8'}}>{sig.signalType}</div>
                    </div>
                    <div style={s.cardQuery}>{sig.productId}</div>
                    <div style={s.cardReason}>{sig.reason}</div>
                    {sig.value && (
                      <div style={{fontSize:11, color:'#64748b', marginTop:4}}>
                        Signal: {sig.value}
                      </div>
                    )}
                    <div style={{fontSize:10, color:'#94a3b8', marginTop:6}}>
                      Source: {sig.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  page:         { padding: '28px 32px', minHeight: '100vh' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle:     { fontSize: 13, color: '#4a5568' },
  refreshBtn:   { background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  loading:      { color: '#4a5568', padding: 40, textAlign: 'center' },
  section:      { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, marginBottom: 20 },
  sectionHeader:{ marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionIcon:  { fontSize: 16 },
  sectionDesc:  { fontSize: 12, color: '#64748b' },
  empty:        { color: '#64748b', fontSize: 13, padding: '12px 0', textAlign: 'center' },
  cards:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  card:         { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 9, padding: 16 },
  cardDimmed:   { opacity: 0.6 },
  cardApplied:  { border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardType:     { fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 6 },
  positionBadge:{ fontSize: 11, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: 6 },
  cardQuery:    { fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  cardProduct:  { fontSize: 13, color: '#4a5568', marginBottom: 6 },
  cardReason:   { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.4 },
  existingNote: { fontSize: 11, color: '#f97316', marginBottom: 8 },
  aiSuggestion: { background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 10 },
  aiLabel:      { fontSize: 11, color: '#7c3aed', fontWeight: 600 },
  aiText:       { fontSize: 12, color: '#c4b5fd' },
  cardActions:  { display: 'flex', justifyContent: 'flex-end' },
  applyBtn:     { background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  appliedBadge: { fontSize: 12, color: '#22c55e', fontWeight: 600 },
  input: { padding:'8px 10px', border:'1px solid #e1e4e8', borderRadius:6, fontSize:13, background:'white', outline:'none' },
};
