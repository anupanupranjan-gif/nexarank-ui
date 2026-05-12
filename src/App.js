import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

const RULE_TYPES = ['BOOST', 'PIN', 'BURY', 'SYNONYM'];

const emptyRule = {
  type: 'BOOST',
  query: '',
  boostField: '',
  boostValue: '',
  boostFactor: '',
  pinnedIds: '',
  synonyms: '',
  enabled: true
};

export default function App() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyRule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/rules`);
      const data = await res.json();
      setRules(data);
    } catch (e) {
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }

  async function createRule() {
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        query: form.query,
        enabled: form.enabled,
        ...(form.type === 'BOOST' && {
          boostField: form.boostField,
          boostValue: form.boostValue,
          boostFactor: parseFloat(form.boostFactor) || null
        }),
        ...(form.type === 'PIN' && {
          pinnedIds: form.pinnedIds.split(',').map(s => s.trim()).filter(Boolean)
        }),
        ...(form.type === 'SYNONYM' && {
          synonyms: form.synonyms.split(',').map(s => s.trim()).filter(Boolean)
        })
      };
      await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setForm(emptyRule);
      fetchRules();
    } catch (e) {
      setError('Failed to save rule');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule) {
    await fetch(`${API_BASE}/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled })
    });
    fetchRules();
  }

  async function deleteRule(id) {
    await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE' });
    fetchRules();
  }

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>NexaRank</h1>
        <span style={s.subtitle}>Merchandising Console</span>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>New Rule</h2>
        <div style={s.formRow}>
          <select style={s.select} value={form.type} onChange={e => setForm({...emptyRule, type: e.target.value})}>
            {RULE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input style={s.input} placeholder="Search query (e.g. battery)" value={form.query}
            onChange={e => setForm({...form, query: e.target.value})} />
        </div>

        {form.type === 'BOOST' && (
          <div style={s.formRow}>
            <input style={s.input} placeholder="Boost field (e.g. category)" value={form.boostField}
              onChange={e => setForm({...form, boostField: e.target.value})} />
            <input style={s.input} placeholder="Boost value (e.g. Automotive)" value={form.boostValue}
              onChange={e => setForm({...form, boostValue: e.target.value})} />
            <input style={{...s.input, width: 100}} placeholder="Factor (e.g. 1.5)" value={form.boostFactor}
              onChange={e => setForm({...form, boostFactor: e.target.value})} />
          </div>
        )}

        {form.type === 'PIN' && (
          <input style={s.input} placeholder="Pinned IDs, comma separated (e.g. SIM-001, SIM-002)" value={form.pinnedIds}
            onChange={e => setForm({...form, pinnedIds: e.target.value})} />
        )}

        {form.type === 'SYNONYM' && (
          <input style={s.input} placeholder="Synonyms, comma separated (e.g. tire, tyre, rubber)" value={form.synonyms}
            onChange={e => setForm({...form, synonyms: e.target.value})} />
        )}

        <div style={s.formRow}>
          <label style={s.label}>
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} />
            &nbsp;Enabled
          </label>
          <button style={s.btn} onClick={createRule} disabled={saving || !form.query}>
            {saving ? 'Saving...' : 'Add Rule'}
          </button>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>Rules {!loading && <span style={s.badge}>{rules.length}</span>}</h2>
        {error && <div style={s.error}>{error}</div>}
        {loading ? <div style={s.muted}>Loading...</div> : rules.length === 0 ? (
          <div style={s.muted}>No rules yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Type','Query','Details','Status','Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} style={s.tr}>
                  <td style={s.td}><span style={{...s.badge, ...typeColor(rule.type)}}>{rule.type || '—'}</span></td>
                  <td style={s.td}>{rule.query || '—'}</td>
                  <td style={{...s.td, ...s.muted, fontSize: 12}}>{ruleDetails(rule)}</td>
                  <td style={s.td}>
                    <span style={{...s.badge, background: rule.enabled ? '#d1fae5' : '#fee2e2', color: rule.enabled ? '#065f46' : '#991b1b'}}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => toggleRule(rule)}>
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button style={{...s.btnSm, ...s.btnDanger}} onClick={() => deleteRule(rule.id)}>Delete</button>
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

function ruleDetails(rule) {
  if (rule.type === 'BOOST') return `${rule.boostField}: ${rule.boostValue} x${rule.boostFactor}`;
  if (rule.type === 'PIN') return `Pins: ${(rule.pinnedIds || []).join(', ')}`;
  if (rule.type === 'SYNONYM') return `Synonyms: ${(rule.synonyms || []).join(', ')}`;
  if (rule.type === 'BURY') return 'Bury rule';
  return '—';
}

function typeColor(type) {
  const map = {
    BOOST: { background: '#dbeafe', color: '#1e40af' },
    PIN:   { background: '#fef9c3', color: '#854d0e' },
    BURY:  { background: '#fce7f3', color: '#9d174d' },
    SYNONYM: { background: '#ede9fe', color: '#5b21b6' }
  };
  return map[type] || { background: '#f3f4f6', color: '#374151' };
}

const styles = {
  page:      { fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: '24px 16px', background: '#f9fafb', minHeight: '100vh' },
  header:    { marginBottom: 24 },
  title:     { margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' },
  subtitle:  { fontSize: 14, color: '#6b7280' },
  card:      { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 },
  cardTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111827' },
  formRow:   { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  input:     { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, flex: 1, minWidth: 160 },
  select:    { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14 },
  label:     { fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center' },
  btn:       { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 14, cursor: 'pointer' },
  btnSm:     { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 4 },
  btnDanger: { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
  badge:     { display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' },
  tr:        { borderBottom: '1px solid #f3f4f6' },
  td:        { padding: '10px 12px', fontSize: 14, color: '#111827', verticalAlign: 'middle' },
  muted:     { color: '#9ca3af' },
  error:     { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 }
};
