// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useRef } from 'react';

const API_BASE = '/nexarank/api/v1';

const AVAILABLE_FIELDS = [
  { fieldName: 'category',     displayLabel: 'Category',        facetType: 'TERMS', showCount: true  },
  { fieldName: 'brand',        displayLabel: 'Brand',           facetType: 'TERMS', showCount: true  },
  { fieldName: 'price',        displayLabel: 'Price Range',     facetType: 'RANGE', showCount: false },
  { fieldName: 'rating',       displayLabel: 'Avg. Rating',     facetType: 'RANGE', showCount: false },
  { fieldName: 'rating_count', displayLabel: 'Rating Count',    facetType: 'RANGE', showCount: false },
  { fieldName: 'title',        displayLabel: 'Title',           facetType: 'TERMS', showCount: true  },
];

export default function FacetManager({ auth }) {
  const [facets, setFacets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [engineFields, setEngineFields] = useState([]);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [fetchingFields, setFetchingFields] = useState(false);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragItem = useRef(null);

  useEffect(() => { fetchFacets(); }, []);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  async function fetchEngineFields() {
    setFetchingFields(true);
    try {
      const res = await fetch('/nexarank/api/v1/engine-config/fields', { headers: authHeaders() });
      if (res.ok) {
        const fields = await res.json();
        setEngineFields(fields.filter(f => f.facetable));
        setShowFieldPicker(true);
      } else {
        alert('No engine config found. Please configure the search engine first.');
      }
    } catch (e) { alert('Failed to fetch fields from search engine'); }
    finally { setFetchingFields(false); }
  }

  async function importFieldAsFacet(field) {
    const payload = {
      field: field.name,
      label: field.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: (field.type === 'double' || field.type === 'float' || field.type === 'integer') ? 'RANGE' :
            field.type === 'boolean' ? 'BOOLEAN' : 'TERMS',
      enabled: true,
      sortOrder: 99
    };
    const res = await fetch('/nexarank/api/v1/facets', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
    });
    if (res.ok) { fetchFacets(); }
  }

  async function fetchFacets() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/facets`, { headers: authHeaders() });
      setFacets(await res.json());
    } catch (e) {
      setError('Failed to load facets');
    } finally {
      setLoading(false);
    }
  }

  async function addFacet(field) {
    if (facets.find(f => f.fieldName === field.fieldName)) {
      setError(`${field.displayLabel} is already configured`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/facets`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...field,
          sortOrder: facets.length + 1,
          enabled: true,
          maxValues: field.facetType === 'TERMS' ? 10 : null,
          rangeMin: field.facetType === 'RANGE' ? 0 : null,
          rangeMax: field.facetType === 'RANGE' ? 500 : null,
          rangeInterval: field.facetType === 'RANGE' ? 50 : null,
        })
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to add facet');
        return;
      }
      setSuccess(`${field.displayLabel} added`);
      setTimeout(() => setSuccess(null), 2000);
      fetchFacets();
    } catch (e) {
      setError('Failed to add facet');
    }
  }

  async function toggleFacet(id) {
    await fetch(`${API_BASE}/facets/${id}/toggle`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    fetchFacets();
  }

  async function deleteFacet(id) {
    if (!window.confirm('Remove this facet?')) return;
    await fetch(`${API_BASE}/facets/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    fetchFacets();
  }

  async function saveLabel(id) {
    const facet = facets.find(f => f.id === id);
    await fetch(`${API_BASE}/facets/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ...facet, displayLabel: editLabel })
    });
    setEditingId(null);
    fetchFacets();
  }

  async function toggleShowCount(facet) {
    await fetch(`${API_BASE}/facets/${facet.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ...facet, showCount: !facet.showCount })
    });
    fetchFacets();
  }

  async function updateSortOrder(reordered) {
    for (let i = 0; i < reordered.length; i++) {
      await fetch(`${API_BASE}/facets/${reordered[i].id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ ...reordered[i], sortOrder: i + 1 })
      });
    }
    fetchFacets();
  }

  function handleDragStart(index) {
    dragItem.current = index;
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index) {
    const reordered = [...facets];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(index, 0, dragged);
    setDragOverIndex(null);
    dragItem.current = null;
    setFacets(reordered);
    updateSortOrder(reordered);
  }

  const configuredFields = new Set(facets.map(f => f.fieldName));
  const availableToAdd = AVAILABLE_FIELDS.filter(f => !configuredFields.has(f.fieldName));

  const s = styles;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div style={{fontSize:20, fontWeight:700, color:'#e2e8f0'}}>Facet Manager</div>
        <button style={styles.fetchBtn} onClick={fetchEngineFields} disabled={fetchingFields}>
          {fetchingFields ? 'Fetching...' : '⬇ Fetch Fields from Engine'}
        </button>
      </div>

      {showFieldPicker && engineFields.length > 0 && (
        <div style={styles.fieldPicker}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <span style={{fontSize:13, fontWeight:600, color:'#94b4d4'}}>
              Facetable Fields from Search Engine
            </span>
            <button style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:16}}
              onClick={() => setShowFieldPicker(false)}>✕</button>
          </div>
          <div style={styles.fieldList}>
            {engineFields.map(f => (
              <div key={f.name} style={styles.fieldItem}>
                <div>
                  <span style={{fontSize:13, color:'#e2e8f0', fontWeight:500, marginRight:8}}>{f.name}</span>
                  <span style={{fontSize:11, color:'#64748b', background:'rgba(0,0,0,0.2)', padding:'1px 6px', borderRadius:4}}>{f.type}</span>
                </div>
                <button style={styles.importBtn} onClick={() => importFieldAsFacet(f)}>+ Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>

      {/* Left panel — available fields */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={s.card}>
          <h3 style={s.panelTitle}>Available Fields</h3>
          <p style={s.hint}>Click a field to add it as a facet</p>
          {availableToAdd.length === 0 ? (
            <div style={s.muted}>All fields configured</div>
          ) : (
            availableToAdd.map(field => (
              <div key={field.fieldName} style={s.availableField}
                onClick={() => addFacet(field)}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{field.displayLabel}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {field.fieldName} · {field.facetType}
                </div>
                <span style={{...s.badge, ...typeColor(field.facetType)}}>
                  {field.facetType}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel — configured facets */}
      <div style={{ flex: 1 }}>
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Configured Facets
              {!loading && <span style={{ ...s.badge, marginLeft: 8, background: '#f3f4f6', color: '#374151' }}>{facets.length}</span>}
            </h3>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Drag to reorder</div>
          </div>

          {error && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>{success}</div>}

          {loading ? <div style={s.muted}>Loading...</div> : facets.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
              <div style={{ fontWeight: 600, color: '#374151' }}>No facets configured</div>
              <div style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>Click fields on the left to add them</div>
            </div>
          ) : (
            facets.map((facet, index) => (
              <div
                key={facet.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                style={{
                  ...s.facetRow,
                  borderColor: dragOverIndex === index ? '#2563eb' : '#e5e7eb',
                  background: dragOverIndex === index ? '#eff6ff' : '#fff',
                  opacity: !facet.enabled ? 0.6 : 1,
                }}
              >
                <span style={s.dragHandle}>⠿</span>

                <div style={{ flex: 1 }}>
                  {editingId === facet.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        style={{ ...s.input, flex: 1 }}
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveLabel(facet.id)}
                        autoFocus
                      />
                      <button style={s.btnSm} onClick={() => saveLabel(facet.id)}>Save</button>
                      <button style={s.btnSm} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                        {facet.displayLabel}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>({facet.fieldName})</span>
                      <button style={s.editBtn} onClick={() => { setEditingId(facet.id); setEditLabel(facet.displayLabel); }}>
                        ✏️
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{...s.badge, ...typeColor(facet.facetType)}}>{facet.facetType}</span>
                    {facet.facetType === 'TERMS' && facet.maxValues && (
                      <span style={s.metaBadge}>max {facet.maxValues} values</span>
                    )}
                    {facet.facetType === 'RANGE' && facet.rangeMin != null && (
                      <span style={s.metaBadge}>{facet.rangeMin} – {facet.rangeMax}</span>
                    )}
                    <label style={s.checkLabel}>
                      <input type="checkbox" checked={facet.showCount}
                        onChange={() => toggleShowCount(facet)} />
                      &nbsp;Show count
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    ...s.badge,
                    background: facet.enabled ? '#d1fae5' : '#fee2e2',
                    color: facet.enabled ? '#065f46' : '#991b1b'
                  }}>
                    {facet.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <button style={s.btnSm} onClick={() => toggleFacet(facet.id)}>
                    {facet.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button style={{...s.btnSm, ...s.btnDanger}} onClick={() => deleteFacet(facet.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function typeColor(type) {
  const map = {
    TERMS: { background: '#dbeafe', color: '#1e40af' },
    RANGE: { background: '#fef9c3', color: '#854d0e' },
    BOOLEAN: { background: '#ede9fe', color: '#5b21b6' }
  };
  return map[type] || { background: '#f3f4f6', color: '#374151' };
}

const styles = {
  fetchBtn:   { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.3)', color: '#94b4d4', padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  fieldPicker:{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 10, padding: 16, marginBottom: 20 },
  fieldList:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 },
  fieldItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 12px' },
  importBtn:  { fontSize: 11, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' },
  card:        { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 },
  panelTitle:  { margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#111827' },
  hint:        { margin: '0 0 12px', fontSize: 12, color: '#6b7280' },
  availableField: {
    border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px',
    marginBottom: 8, cursor: 'pointer', position: 'relative',
    transition: 'all 0.15s',
    ':hover': { background: '#f9fafb' }
  },
  facetRow:    {
    border: '2px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
    marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12,
    cursor: 'grab', transition: 'all 0.15s',
  },
  dragHandle:  { fontSize: 18, color: '#d1d5db', cursor: 'grab', paddingTop: 2, userSelect: 'none' },
  input:       { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  btnSm:       { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  btnDanger:   { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
  editBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 4px' },
  badge:       { display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  metaBadge:   { background: '#e5e7eb', color: '#374151', borderRadius: 4, padding: '2px 8px', fontSize: 11 },
  checkLabel:  { fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  muted:       { color: '#4b5563', fontSize: 14 },
  emptyState:  { textAlign: 'center', padding: '40px 20px' },
  error:       { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 },
  successMsg:  { background: '#d1fae5', color: '#065f46', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 },
};
