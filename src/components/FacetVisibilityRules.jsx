// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// Phase 24 / NR-38 — Facet Visibility Rules tab for FacetManager.
//
// Usage in FacetManager:
//   import FacetVisibilityRules from '../components/FacetVisibilityRules';
//   {activeTab === 'visibility' && <FacetVisibilityRules auth={auth} allFacets={facets} />}

import { useState, useEffect, useCallback } from 'react';

const API = '/nexarank/api/v1/facets/visibility';
const FACETS_API = '/nexarank/api/v1/facets';

const emptyRule = {
  name: '',
  triggerFacetField: '',
  triggerFacetValue: '',
  showFacets: [],
  hideFacets: [],
  priority: 50,
  enabled: true,
};

export default function FacetVisibilityRules({ auth, allFacets = [] }) {
  const [rules, setRules]           = useState([]);
  const [form, setForm]             = useState(emptyRule);
  const [editingId, setEditingId]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [preview, setPreview]       = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [facetValues, setFacetValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);

  function headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
  }

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: headers() });
      if (res.ok) setRules(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Load facet values when trigger field changes
  useEffect(() => {
    if (!form.triggerFacetField) { setFacetValues([]); return; }
    setLoadingValues(true);
    fetch(`${FACETS_API}/values?field=${encodeURIComponent(form.triggerFacetField)}&size=50`,
          { headers: headers() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFacetValues(data))
      .catch(() => setFacetValues([]))
      .finally(() => setLoadingValues(false));
  }, [form.triggerFacetField]);

  async function save() {
    if (!form.triggerFacetField || !form.triggerFacetValue || !form.name) {
      setError('Name, trigger field and trigger value are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setForm(emptyRule);
      setEditingId(null);
      setPreview(null);
      await loadRules();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name || '',
      triggerFacetField: rule.triggerFacetField || '',
      triggerFacetValue: rule.triggerFacetValue || '',
      showFacets: rule.showFacets || [],
      hideFacets: rule.hideFacets || [],
      priority: rule.priority || 50,
      enabled: rule.enabled !== false,
    });
    setPreview(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteRule(id) {
    if (!window.confirm('Delete this visibility rule?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE', headers: headers() });
    await loadRules();
  }

  async function runPreview() {
    if (!form.triggerFacetField || !form.triggerFacetValue) {
      setError('Set trigger field and value to preview');
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`${API}/preview`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          triggerFacetField: form.triggerFacetField,
          triggerFacetValue: form.triggerFacetValue,
        }),
      });
      if (res.ok) setPreview(await res.json());
    } catch (e) { setError(e.message); }
    finally { setPreviewing(false); }
  }

  function toggleFacet(list, field) {
    return list.includes(field) ? list.filter(f => f !== field) : [...list, field];
  }

  const termsFacets = allFacets.filter(f => f.facetType === 'TERMS' || f.facetType === 'terms');

  return (
    <div style={vs.container}>
      {error && (
        <div style={vs.errorBanner}>
          <span>⚠ {error}</span>
          <button style={vs.errorDismiss} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Form */}
      <div style={vs.card}>
        <div style={vs.cardHeader}>
          <div style={vs.cardTitle}>{editingId ? '✎ Edit Visibility Rule' : '+ New Visibility Rule'}</div>
          <div style={vs.cardHint}>Control which facets appear based on what the user has selected</div>
        </div>

        <div style={vs.formGrid}>
          {/* Rule name */}
          <div style={{ ...vs.fieldGroup, flex: '100%' }}>
            <label style={vs.label}>Rule Name</label>
            <input style={vs.input} placeholder="e.g. Battery category facets"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Trigger field */}
          <div style={vs.fieldGroup}>
            <label style={vs.label}>When facet field</label>
            <select style={vs.select} value={form.triggerFacetField}
              onChange={e => setForm({ ...form, triggerFacetField: e.target.value, triggerFacetValue: '' })}>
              <option value="">Select field…</option>
              {termsFacets.map(f => (
                <option key={f.fieldName} value={f.fieldName}>
                  {f.displayLabel || f.fieldName}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger value */}
          <div style={vs.fieldGroup}>
            <label style={vs.label}>equals</label>
            {loadingValues ? (
              <div style={vs.muted}>Loading values…</div>
            ) : facetValues.length > 0 ? (
              <select style={vs.select} value={form.triggerFacetValue}
                onChange={e => setForm({ ...form, triggerFacetValue: e.target.value })}>
                <option value="">Select value…</option>
                {facetValues.map(v => (
                  <option key={v.value} value={v.value}>{v.value} ({v.count})</option>
                ))}
              </select>
            ) : (
              <input style={vs.input} placeholder="e.g. Battery"
                value={form.triggerFacetValue}
                onChange={e => setForm({ ...form, triggerFacetValue: e.target.value })} />
            )}
          </div>

          {/* Priority */}
          <div style={{ ...vs.fieldGroup, maxWidth: 120 }}>
            <label style={vs.label}>Priority</label>
            <input style={vs.input} type="number" min="1" max="100" value={form.priority}
              onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 50 })} />
          </div>
        </div>

        {/* Show/Hide facet pickers */}
        {allFacets.length > 0 && (
          <div style={vs.facetPickerGrid}>
            <div style={vs.facetPickerCol}>
              <div style={vs.pickerLabel}>
                <span style={vs.showBadge}>SHOW</span>
                <span style={vs.pickerHint}>Make these facets visible</span>
              </div>
              <div style={vs.chipGrid}>
                {allFacets.map(f => {
                  const selected = form.showFacets.includes(f.fieldName);
                  return (
                    <button key={f.fieldName}
                      style={{ ...vs.chip, ...(selected ? vs.chipShow : {}) }}
                      onClick={() => setForm({ ...form,
                        showFacets: toggleFacet(form.showFacets, f.fieldName),
                        hideFacets: form.hideFacets.filter(x => x !== f.fieldName)
                      })}>
                      {f.displayLabel || f.fieldName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={vs.facetPickerCol}>
              <div style={vs.pickerLabel}>
                <span style={vs.hideBadge}>HIDE</span>
                <span style={vs.pickerHint}>Remove these facets from view</span>
              </div>
              <div style={vs.chipGrid}>
                {allFacets.map(f => {
                  const selected = form.hideFacets.includes(f.fieldName);
                  return (
                    <button key={f.fieldName}
                      style={{ ...vs.chip, ...(selected ? vs.chipHide : {}) }}
                      onClick={() => setForm({ ...form,
                        hideFacets: toggleFacet(form.hideFacets, f.fieldName),
                        showFacets: form.showFacets.filter(x => x !== f.fieldName)
                      })}>
                      {f.displayLabel || f.fieldName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button style={{ ...vs.btn, opacity: saving ? 0.6 : 1 }}
            onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editingId ? '✓ Save Changes' : '+ Create Rule'}
          </button>
          {editingId && (
            <button style={vs.cancelBtn}
              onClick={() => { setEditingId(null); setForm(emptyRule); setPreview(null); }}>
              Cancel
            </button>
          )}
          <button style={vs.previewBtn} onClick={runPreview} disabled={previewing}>
            {previewing ? 'Previewing…' : '👁 Preview'}
          </button>
        </div>

        {/* Preview result */}
        {preview && (
          <div style={vs.previewBox}>
            <div style={vs.previewTitle}>
              Preview: When {preview.context && Object.entries(preview.context).map(([k,v]) => `${k}=${v}`).join(', ')}
            </div>
            <div style={vs.previewCols}>
              <div>
                <div style={{ ...vs.pickerLabel, marginBottom: 6 }}>
                  <span style={vs.showBadge}>VISIBLE ({(preview.visible || []).length})</span>
                </div>
                {(preview.visible || []).map(f => (
                  <div key={f.fieldName} style={vs.previewFacet}>
                    <span style={vs.previewField}>{f.displayLabel || f.fieldName}</span>
                    <span style={vs.previewType}>{f.facetType}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ ...vs.pickerLabel, marginBottom: 6 }}>
                  <span style={vs.hideBadge}>HIDDEN ({(preview.hidden || []).length})</span>
                </div>
                {Array.from(preview.hidden || []).map(f => (
                  <div key={f} style={{ ...vs.previewFacet, opacity: 0.5 }}>
                    <span style={vs.previewField}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rules list */}
      <div style={vs.card}>
        <div style={vs.cardHeader}>
          <div style={vs.cardTitle}>
            Visibility Rules
            <span style={vs.countBadge}>{rules.length}</span>
          </div>
          <button style={vs.refreshBtn} onClick={loadRules}>↻</button>
        </div>

        {loading ? (
          <div style={vs.muted}>Loading…</div>
        ) : rules.length === 0 ? (
          <div style={vs.empty}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>👁</div>
            <div style={{ color: '#1a202c', fontWeight: 700 }}>No visibility rules yet</div>
            <div style={vs.muted}>Create a rule above to control context-sensitive facets</div>
          </div>
        ) : (
          <table style={vs.table}>
            <thead>
              <tr>
                {['Name', 'When', 'Show', 'Hide', 'Priority', 'Actions'].map(h => (
                  <th key={h} style={vs.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => (
                <tr key={rule.id} style={{ ...vs.tr, ...(i % 2 === 0 ? vs.trEven : {}) }}>
                  <td style={vs.td}>
                    <span style={{ color: '#1a202c', fontWeight: 600 }}>{rule.name}</span>
                    {!rule.enabled && <span style={vs.disabledTag}>disabled</span>}
                  </td>
                  <td style={vs.td}>
                    <span style={vs.triggerBadge}>{rule.triggerFacetField}</span>
                    <span style={vs.equals}>=</span>
                    <span style={vs.triggerValue}>{rule.triggerFacetValue}</span>
                  </td>
                  <td style={vs.td}>
                    <div style={vs.facetTags}>
                      {(rule.showFacets || []).map(f => (
                        <span key={f} style={vs.showTag}>{f}</span>
                      ))}
                      {(rule.showFacets || []).length === 0 && <span style={vs.muted}>—</span>}
                    </div>
                  </td>
                  <td style={vs.td}>
                    <div style={vs.facetTags}>
                      {(rule.hideFacets || []).map(f => (
                        <span key={f} style={vs.hideTag}>{f}</span>
                      ))}
                      {(rule.hideFacets || []).length === 0 && <span style={vs.muted}>—</span>}
                    </div>
                  </td>
                  <td style={vs.td}><span style={vs.muted}>{rule.priority}</span></td>
                  <td style={vs.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={vs.editBtn} onClick={() => startEdit(rule)}>✎</button>
                      <button style={vs.deleteBtn} onClick={() => deleteRule(rule.id)}>⌫</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const vs = {
  container:    { fontFamily: "'DM Mono','JetBrains Mono',monospace" },
  card:         { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 12, padding: '20px 24px', marginBottom: 20 },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:    { fontSize: 14, fontWeight: 700, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8 },
  cardHint:     { fontSize: 11, color: '#4a5568' },
  countBadge:   { background: '#f0f6fc', color: '#0366d6', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid #c8e1ff' },
  refreshBtn:   { background: '#f0f6fc', border: '1px solid #c8e1ff', color: '#0366d6', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  formGrid:     { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 },
  label:        { fontSize: 10, fontWeight: 700, color: '#2d3748', letterSpacing: '1.5px', textTransform: 'uppercase' },
  input:        { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  select:       { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  facetPickerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 },
  facetPickerCol:  { border: '1px solid #e1e4e8', borderRadius: 8, padding: '12px' },
  pickerLabel:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  pickerHint:   { fontSize: 11, color: '#4a5568' },
  showBadge:    { background: '#f0fdf4', color: '#00a854', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: '1px solid #86efac' },
  hideBadge:    { background: '#fff5f5', color: '#c0392b', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: '1px solid #fca5a5' },
  chipGrid:     { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:         { background: '#f8f9fa', border: '1px solid #e1e4e8', color: '#4a5568', borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
  chipShow:     { background: '#f0fdf4', border: '1px solid #00a854', color: '#00a854' },
  chipHide:     { background: '#fff5f5', border: '1px solid #c0392b', color: '#c0392b' },
  btn:          { background: 'linear-gradient(135deg,#0055cc,#0077ff)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' },
  cancelBtn:    { background: '#f8f9fa', border: '1px solid #e1e4e8', color: '#4a5568', borderRadius: 8, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  previewBtn:   { background: '#f0f6fc', border: '1px solid #c8e1ff', color: '#0366d6', borderRadius: 8, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  previewBox:   { marginTop: 16, background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 8, padding: 16 },
  previewTitle: { fontSize: 12, fontWeight: 700, color: '#1a202c', marginBottom: 12 },
  previewCols:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  previewFacet: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #e1e4e8' },
  previewField: { fontSize: 12, color: '#1a202c', flex: 1 },
  previewType:  { fontSize: 10, color: '#4a5568', background: '#f0f6fc', padding: '1px 6px', borderRadius: 3 },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:           { textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#2d3748', padding: '8px 12px', borderBottom: '2px solid #e1e4e8', textTransform: 'uppercase', letterSpacing: '1px' },
  tr:           { borderBottom: '1px solid #e1e4e8' },
  trEven:       { background: '#f8f9fa' },
  td:           { padding: '10px 12px', color: '#1a202c', verticalAlign: 'middle' },
  triggerBadge: { background: '#f0f6fc', color: '#0366d6', fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #c8e1ff' },
  equals:       { color: '#4a5568', margin: '0 4px', fontSize: 11 },
  triggerValue: { color: '#1a202c', fontWeight: 600, fontSize: 12 },
  facetTags:    { display: 'flex', flexWrap: 'wrap', gap: 4 },
  showTag:      { background: '#f0fdf4', color: '#00a854', fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid #86efac' },
  hideTag:      { background: '#fff5f5', color: '#c0392b', fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid #fca5a5' },
  disabledTag:  { background: '#f8f9fa', color: '#4a5568', fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid #e1e4e8', marginLeft: 6 },
  editBtn:      { background: '#f0f6fc', border: '1px solid #c8e1ff', color: '#0366d6', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  deleteBtn:    { background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  empty:        { padding: '48px', textAlign: 'center' },
  muted:        { color: '#4a5568', fontSize: 12 },
  errorBanner:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', padding: '10px 16px', fontSize: 13, borderRadius: 8, marginBottom: 16 },
  errorDismiss: { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 14 },
};
