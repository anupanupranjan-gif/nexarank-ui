// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// Phase 23 / NR-37 v2 — Trigger Condition Builder for the Rule form.
// Inspired by Endeca Experience Manager's section conditions UI.
//
// Props:
//   query         — current query value from the rule form (used to scope facet values)
//   conditions    — [{facetField, facetValues:[]}]
//   onChange      — called with updated conditions array
//   authHeaders   — function returning auth headers
//   apiBase       — API base URL

import { useState, useEffect, useCallback } from 'react';

const API = '/nexarank/api/v1';

export default function TriggerConditionBuilder({ query, conditions, onChange, authHeaders }) {
  const [facets, setFacets]           = useState([]);  // from facet_config
  const [valueOptions, setValueOptions] = useState({}); // field -> [{value,count}]
  const [loadingValues, setLoadingValues] = useState({});

  // Load configured TERMS facets on mount
  useEffect(() => {
    async function loadFacets() {
      try {
        const res = await fetch(`${API}/facets?enabledOnly=true`, { headers: authHeaders() });
        if (!res.ok) return;
        const all = await res.json();
        // Only TERMS facets have discrete values worth selecting
        setFacets(all);
      } catch (e) { console.error('Failed to load facets', e); }
    }
    loadFacets();
  }, []);

  const loadValues = useCallback(async (field) => {
    if (valueOptions[field]) return; // already loaded
    setLoadingValues(prev => ({ ...prev, [field]: true }));
    try {
      const q = query && query !== '*' ? `&query=${encodeURIComponent(query)}` : '';
      const res = await fetch(`${API}/facets/values?field=${encodeURIComponent(field)}&size=30${q}`,
              { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setValueOptions(prev => ({ ...prev, [field]: data }));
    } catch (e) { console.error('Failed to load facet values', e); }
    finally { setLoadingValues(prev => ({ ...prev, [field]: false })); }
  }, [query, valueOptions, authHeaders]);

  function addCondition() {
    onChange([...conditions, { facetField: '', facetValues: [] }]);
  }

  function removeCondition(idx) {
    onChange(conditions.filter((_, i) => i !== idx));
  }

  function setField(idx, field) {
    const updated = conditions.map((c, i) =>
      i === idx ? { ...c, facetField: field, facetValues: [] } : c
    );
    onChange(updated);
    const facet = facets.find(f => f.fieldName === field);
    if (field && (!facet || facet.facetType === 'TERMS')) loadValues(field);
  }

  function toggleValue(idx, value) {
    const updated = conditions.map((c, i) => {
      if (i !== idx) return c;
      const values = c.facetValues.includes(value)
        ? c.facetValues.filter(v => v !== value)
        : [...c.facetValues, value];
      return { ...c, facetValues: values };
    });
    onChange(updated);
  }

  if (facets.length === 0) return null;

  return (
    <div style={tc.container}>
      <div style={tc.header}>
        <span style={tc.headerLabel}>Trigger Conditions</span>
        <span style={tc.headerHint}>AND between conditions · OR between values</span>
      </div>

      {conditions.length === 0 && (
        <div style={tc.empty}>No conditions — rule fires on query match only</div>
      )}

      {conditions.map((cond, idx) => (
        <div key={idx} style={tc.conditionRow}>
          {idx > 0 && <div style={tc.andBadge}>AND</div>}

          {/* Facet field selector */}
          <div style={tc.fieldCol}>
            <select style={tc.select}
              value={cond.facetField}
              onChange={e => setField(idx, e.target.value)}>
              <option value="">Select facet…</option>
              {facets.map(f => (
                <option key={f.fieldName} value={f.fieldName}>
                  {f.displayLabel || f.fieldName}
                </option>
              ))}
            </select>
          </div>

          {/* Value multi-select */}
          {cond.facetField && (() => {
            const facet = facets.find(f => f.fieldName === cond.facetField);
            const facetType = facet?.facetType || 'TERMS';

            if (facetType === 'BOOLEAN') {
              return (
                <div style={tc.valuesCol}>
                  <div style={tc.valueGrid}>
                    {['true', 'false'].map(v => {
                      const selected = cond.facetValues.includes(v);
                      return (
                        <button key={v}
                          style={{ ...tc.valueChip, ...(selected ? tc.valueChipSelected : {}) }}
                          onClick={() => toggleValue(idx, v)}>
                          {v === 'true' ? '✓ Yes' : '✗ No'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (facetType === 'RANGE') {
              const minVal = cond.facetValues.find(v => v.startsWith('min:'))?.substring(4) || '';
              const maxVal = cond.facetValues.find(v => v.startsWith('max:'))?.substring(4) || '';
              return (
                <div style={tc.valuesCol}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...tc.select, width: 80 }} type="number" placeholder="Min"
                      value={minVal}
                      onChange={e => {
                        const others = cond.facetValues.filter(v => !v.startsWith('min:'));
                        const updated = conditions.map((c, i) =>
                          i === idx ? { ...c, facetValues: e.target.value
                            ? [...others, `min:${e.target.value}`]
                            : others } : c);
                        onChange(updated);
                      }} />
                    <span style={{ color: '#64748b', fontSize: 12 }}>to</span>
                    <input style={{ ...tc.select, width: 80 }} type="number" placeholder="Max"
                      value={maxVal}
                      onChange={e => {
                        const others = cond.facetValues.filter(v => !v.startsWith('max:'));
                        const updated = conditions.map((c, i) =>
                          i === idx ? { ...c, facetValues: e.target.value
                            ? [...others, `max:${e.target.value}`]
                            : others } : c);
                        onChange(updated);
                      }} />
                  </div>
                </div>
              );
            }

            // TERMS — existing chip UI
            return (
              <div style={tc.valuesCol}>
                {loadingValues[cond.facetField] ? (
                  <span style={tc.loading}>Loading values…</span>
                ) : (
                  <div style={tc.valueGrid}>
                    {(valueOptions[cond.facetField] || []).map(opt => {
                      const selected = cond.facetValues.includes(opt.value);
                      return (
                        <button key={opt.value}
                          style={{ ...tc.valueChip, ...(selected ? tc.valueChipSelected : {}) }}
                          onClick={() => toggleValue(idx, opt.value)}>
                          {opt.value}
                          <span style={tc.valueCount}>{opt.count.toLocaleString()}</span>
                        </button>
                      );
                    })}
                    {(valueOptions[cond.facetField] || []).length === 0 && (
                      <span style={tc.loading}>No values found</span>
                    )}
                  </div>
                )}
                {cond.facetValues.length > 0 && (
                  <div style={tc.selectedSummary}>
                    Selected: {cond.facetValues.map(v => (
                      <span key={v} style={tc.selectedTag}>
                        {v}
                        <button style={tc.removeTag}
                          onClick={() => toggleValue(idx, v)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <button style={tc.removeBtn} onClick={() => removeCondition(idx)}
            title="Remove condition">×</button>
        </div>
      ))}

      <button style={tc.addBtn} onClick={addCondition}>+ Add Condition</button>
    </div>
  );
}

const tc = {
  container:   { border: '1px solid #e1e4e8', borderRadius: 8, padding: '14px 16px', marginTop: 12, background: '#f8f9fa', fontFamily: "'DM Mono','JetBrains Mono',monospace" },
  header:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  headerLabel: { fontSize: 11, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '1.5px' },
  headerHint:  { fontSize: 10, color: '#4a5568' },
  empty:       { color: '#4a5568', fontSize: 12, paddingBottom: 8 },
  conditionRow:{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  andBadge:    { background: '#e8f0fe', color: '#0366d6', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, alignSelf: 'center', letterSpacing: 1 },
  fieldCol:    { minWidth: 160 },
  valuesCol:   { flex: 1, minWidth: 200 },
  select:      { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#1a202c', outline: 'none', fontFamily: 'inherit', width: '100%' },
  valueGrid:   { display: 'flex', flexWrap: 'wrap', gap: 6 },
  valueChip:   { background: '#ffffff', border: '1px solid #e1e4e8', color: '#4a5568', borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' },
  valueChipSelected: { background: '#f0f6fc', border: '1px solid #0366d6', color: '#0366d6' },
  valueCount:  { color: '#8a94a6', fontSize: 10 },
  loading:     { color: '#4a5568', fontSize: 11 },
  selectedSummary: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  selectedTag: { background: '#f0f6fc', color: '#0366d6', fontSize: 11, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 },
  removeTag:   { background: 'none', border: 'none', color: '#0366d6', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 },
  removeBtn:   { background: 'none', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 5, padding: '4px 8px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' },
  addBtn:      { background: '#f0f6fc', border: '1px solid #c8e1ff', color: '#0366d6', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' },
};
