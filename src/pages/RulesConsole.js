// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import FacetManager from './FacetManager';
import ClickIntelligence from './ClickIntelligence';
import SearchQuality from './SearchQuality';
import SearchEngineConfig from './SearchEngineConfig';

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
  activateAt: '',
  expireAt: '',
};

export default function RulesConsole({ auth, onLogout }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyRule);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canCreate = ['MERCHANDISER', 'APPROVER', 'ADMIN'].includes(auth.role);
  const canApprove = ['APPROVER', 'ADMIN'].includes(auth.role);
  const canDelete = ['APPROVER', 'ADMIN'].includes(auth.role);
  const isAdmin = auth.role === 'ADMIN';

  useEffect(() => {
    if (activeTab !== 'users') fetchRules();
  }, [activeTab]);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  async function fetchRules() {
    try {
      setLoading(true);
      const url = activeTab === 'pending'
        ? `${API_BASE}/rules/pending`
        : `${API_BASE}/rules`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.status === 403) { onLogout(); return; }
      setRules(await res.json());
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
        }),
        ...(form.activateAt && { activateAt: new Date(form.activateAt).toISOString() }),
        ...(form.expireAt && { expireAt: new Date(form.expireAt).toISOString() })
      };
      await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: authHeaders(),
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

  async function approveRule(id) {
    await fetch(`${API_BASE}/rules/${id}/approve`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ comment: 'Approved' })
    });
    fetchRules();
  }

  async function rejectRule(id) {
    const comment = window.prompt('Reason for rejection:') || 'Rejected';
    await fetch(`${API_BASE}/rules/${id}/reject`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ comment })
    });
    fetchRules();
  }

  async function toggleRule(id) {
    await fetch(`${API_BASE}/rules/${id}/toggle`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    fetchRules();
  }

  async function deleteRule(id) {
    if (!window.confirm('Delete this rule?')) return;
    await fetch(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    fetchRules();
  }

  const s = styles;
  const displayedRules = activeTab === 'pending'
    ? rules.filter(r => r.status === 'PENDING_REVIEW')
    : rules;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>NexaRank</h1>
          <span style={s.subtitle}>Merchandising Console</span>
        </div>
        <div style={s.userBar}>
          <span style={s.userInfo}>{auth.username}</span>
          <span style={{...s.badge, ...roleColor(auth.role)}}>{auth.role}</span>
          <button style={s.logoutBtn} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      <div style={s.navBar}>
        <button style={{...s.navTab, ...(activeTab === 'all' ? s.navTabActive : {})}}
          onClick={() => setActiveTab('all')}>Rules</button>
        {canApprove && (
          <button style={{...s.navTab, ...(activeTab === 'pending' ? s.navTabActive : {})}}
            onClick={() => setActiveTab('pending')}>Pending Review</button>
        )}
        {isAdmin && (
          <button style={{...s.navTab, ...(activeTab === 'users' ? s.navTabActive : {})}}
            onClick={() => setActiveTab('users')}>User Management</button>
        )}
        {isAdmin && (
          <>
            <button style={{...s.navTab, ...(activeTab === 'facets' ? s.navTabActive : {})}}
              onClick={() => setActiveTab('facets')}>Facet Manager</button>
            <button style={{...s.navTab, ...(activeTab === 'click-intelligence' ? s.navTabActive : {})}}
              onClick={() => setActiveTab('click-intelligence')}>Click Intelligence</button>
            <button style={{...s.navTab, ...(activeTab === 'search-quality' ? s.navTabActive : {})}}
              onClick={() => setActiveTab('search-quality')}>Search Quality</button>
            <button style={{...s.navTab, ...(activeTab === 'engine-config' ? s.navTabActive : {})}}
              onClick={() => setActiveTab('engine-config')}>Engine Config</button>
          </>
        )}
      </div>

      {activeTab === 'engine-config' ? (
        <SearchEngineConfig auth={auth} />
      ) : activeTab === 'click-intelligence' ? (
        <ClickIntelligence auth={auth} />
      ) : activeTab === 'search-quality' ? (
        <SearchQuality auth={auth} />
      ) : activeTab === 'facets' ? (
        <FacetManager auth={auth} />
      ) : activeTab === 'users' ? (
        <UserManagement auth={auth} />
      ) : (
        <>
          {canCreate && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>New Rule</h2>
              <div style={s.formRow}>
                <select style={s.select} value={form.type}
                  onChange={e => setForm({...emptyRule, type: e.target.value})}>
                  {RULE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input style={s.input} placeholder="Search query (e.g. battery)"
                  value={form.query} onChange={e => setForm({...form, query: e.target.value})} />
              </div>

              {form.type === 'BOOST' && (
                <div style={s.formRow}>
                  <input style={s.input} placeholder="Boost field (e.g. category)"
                    value={form.boostField} onChange={e => setForm({...form, boostField: e.target.value})} />
                  <input style={s.input} placeholder="Boost value (e.g. Automotive)"
                    value={form.boostValue} onChange={e => setForm({...form, boostValue: e.target.value})} />
                  <input style={{...s.input, width: 100}} placeholder="Factor (e.g. 1.5)"
                    value={form.boostFactor} onChange={e => setForm({...form, boostFactor: e.target.value})} />
                </div>
              )}
              {form.type === 'PIN' && (
                <input style={s.input} placeholder="Pinned IDs, comma separated"
                  value={form.pinnedIds} onChange={e => setForm({...form, pinnedIds: e.target.value})} />
              )}
              {form.type === 'SYNONYM' && (
                <input style={s.input} placeholder="Synonyms, comma separated"
                  value={form.synonyms} onChange={e => setForm({...form, synonyms: e.target.value})} />
              )}

              <div style={{...s.formRow, marginTop: 8}}>
                <button style={s.btn} onClick={createRule} disabled={saving || !form.query}>
                  {saving ? 'Saving...' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}

          <div style={s.card}>
            {error && <div style={s.error}>{error}</div>}
            {loading ? <div style={s.muted}>Loading...</div> : displayedRules.length === 0 ? (
              <div style={s.muted}>No rules found.</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Type','Query','Details','Status','Schedule','Submitted By','Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedRules.map(rule => (
                    <tr key={rule.id} style={s.tr}>
                      <td style={s.td}>
                        <span style={{...s.badge, ...typeColor(rule.type)}}>{rule.type || '—'}</span>
                      </td>
                      <td style={s.td}>{rule.query || '—'}</td>
                      <td style={{...s.td, ...s.muted, fontSize: 12}}>{ruleDetails(rule)}</td>
                      <td style={s.td}>
                        <span style={{...s.badge, ...statusColor(rule.status)}}>
                          {rule.status || '—'}
                        </span>
                      </td>
                      <td style={{...s.td, fontSize: 11, color: '#6b7280'}}>
                        {rule.activateAt ? `From: ${new Date(rule.activateAt).toLocaleDateString()}` : ''}
                        {rule.activateAt && rule.expireAt ? <br/> : ''}
                        {rule.expireAt ? `To: ${new Date(rule.expireAt).toLocaleDateString()}` : ''}
                        {!rule.activateAt && !rule.expireAt ? '—' : ''}
                      </td>
                      <td style={{...s.td, fontSize: 12}}>{rule.submittedBy || '—'}</td>
                      <td style={s.td}>
                        {canApprove && rule.status === 'PENDING_REVIEW' && (
                          <>
                            <button style={{...s.btnSm, ...s.btnSuccess}} onClick={() => approveRule(rule.id)}>Approve</button>
                            <button style={{...s.btnSm, ...s.btnDanger}} onClick={() => rejectRule(rule.id)}>Reject</button>
                          </>
                        )}
                        {rule.status === 'APPROVED' && canApprove && (
                          <button style={s.btnSm} onClick={() => toggleRule(rule.id)}>
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        {canDelete && (
                          <button style={{...s.btnSm, ...s.btnDanger}} onClick={() => deleteRule(rule.id)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
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
    BOOST:   { background: '#dbeafe', color: '#1e40af' },
    PIN:     { background: '#fef9c3', color: '#854d0e' },
    BURY:    { background: '#fce7f3', color: '#9d174d' },
    SYNONYM: { background: '#ede9fe', color: '#5b21b6' }
  };
  return map[type] || { background: '#f3f4f6', color: '#374151' };
}

function statusColor(status) {
  const map = {
    PENDING_REVIEW: { background: '#fef9c3', color: '#854d0e' },
    APPROVED:       { background: '#d1fae5', color: '#065f46' },
    REJECTED:       { background: '#fee2e2', color: '#991b1b' },
    DISABLED:       { background: '#f3f4f6', color: '#6b7280' },
    DRAFT:          { background: '#e0e7ff', color: '#3730a3' }
  };
  return map[status] || { background: '#f3f4f6', color: '#374151' };
}

function roleColor(role) {
  const map = {
    ADMIN:        { background: '#fce7f3', color: '#9d174d' },
    APPROVER:     { background: '#d1fae5', color: '#065f46' },
    MERCHANDISER: { background: '#dbeafe', color: '#1e40af' },
    VIEWER:       { background: '#f3f4f6', color: '#374151' }
  };
  return map[role] || { background: '#f3f4f6', color: '#374151' };
}

const styles = {
  page:       { fontFamily: 'system-ui, sans-serif', maxWidth: 1024, margin: '0 auto', padding: '24px 16px', background: '#f9fafb', minHeight: '100vh' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' },
  subtitle:   { fontSize: 14, color: '#6b7280' },
  userBar:    { display: 'flex', alignItems: 'center', gap: 10 },
  userInfo:   { fontSize: 14, color: '#374151', fontWeight: 500 },
  navBar:     { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 },
  navTab:     { background: 'none', border: 'none', borderBottom: '2px solid transparent', padding: '8px 16px', fontSize: 14, cursor: 'pointer', color: '#6b7280', marginBottom: -1 },
  navTabActive: { color: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  card:       { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 },
  cardTitle:  { margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111827' },
  formRow:    { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  input:      { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, flex: 1, minWidth: 160 },
  select:     { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14 },
  btn:        { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 14, cursor: 'pointer' },
  btnSm:      { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 4 },
  btnSuccess: { background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' },
  btnDanger:  { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
  logoutBtn:  { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer', color: '#6b7280' },
  badge:      { display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' },
  tr:         { borderBottom: '1px solid #f3f4f6' },
  td:         { padding: '10px 12px', fontSize: 14, color: '#111827', verticalAlign: 'middle' },
  muted:      { color: '#9ca3af' },
  error:      { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 }
};
