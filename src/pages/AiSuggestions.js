// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function AiSuggestions({ auth }) {
  const [boostSuggestions, setBoostSuggestions] = useState([]);
  const [synonymSuggestions, setSynonymSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState({});
  const [applied, setApplied] = useState({});

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchSuggestions(); }, []);

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
        </>
      )}
    </div>
  );
}

const s = {
  page:         { padding: '28px 32px', minHeight: '100vh' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  subtitle:     { fontSize: 13, color: '#94b4d4' },
  refreshBtn:   { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.3)', color: '#94b4d4', padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  loading:      { color: '#94b4d4', padding: 40, textAlign: 'center' },
  section:      { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 10, padding: 20, marginBottom: 20 },
  sectionHeader:{ marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionIcon:  { fontSize: 16 },
  sectionDesc:  { fontSize: 12, color: '#64748b' },
  empty:        { color: '#64748b', fontSize: 13, padding: '12px 0', textAlign: 'center' },
  cards:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  card:         { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,119,255,0.15)', borderRadius: 9, padding: 16 },
  cardDimmed:   { opacity: 0.6 },
  cardApplied:  { border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardType:     { fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 6 },
  positionBadge:{ fontSize: 11, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: 6 },
  cardQuery:    { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  cardProduct:  { fontSize: 13, color: '#94b4d4', marginBottom: 6 },
  cardReason:   { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.4 },
  existingNote: { fontSize: 11, color: '#f97316', marginBottom: 8 },
  aiSuggestion: { background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 10 },
  aiLabel:      { fontSize: 11, color: '#7c3aed', fontWeight: 600 },
  aiText:       { fontSize: 12, color: '#c4b5fd' },
  cardActions:  { display: 'flex', justifyContent: 'flex-end' },
  applyBtn:     { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.3)', color: '#94b4d4', padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  appliedBadge: { fontSize: 12, color: '#22c55e', fontWeight: 600 },
};
