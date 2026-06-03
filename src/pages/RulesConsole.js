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
  type: 'BOOST', query: '', boostField: '', boostValue: '',
  boostFactor: '', pinnedIds: '', synonyms: '', activateAt: '', expireAt: '',
};

// ── NAV STRUCTURE ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Merchandising',
    icon: '◈',
    items: [
      { key: 'all',     label: 'Rules',          icon: '⚡', roles: ['VIEWER','MERCHANDISER','APPROVER','ADMIN'] },
      { key: 'pending', label: 'Pending Review',  icon: '◷', roles: ['APPROVER','ADMIN'] },
    ]
  },
  {
    label: 'Configuration',
    icon: '⬡',
    items: [
      { key: 'facets',        label: 'Facet Manager',   icon: '▤', roles: ['ADMIN'] },
      { key: 'engine-config', label: 'Engine Config',   icon: '⛁', roles: ['ADMIN'] },
    ]
  },
  {
    label: 'Analytics',
    icon: '◉',
    items: [
      { key: 'click-intelligence', label: 'Click Intelligence', icon: '◎', roles: ['ADMIN'] },
      { key: 'search-quality',     label: 'Search Quality',     icon: '◑', roles: ['ADMIN'] },
    ]
  },
  {
    label: 'Admin',
    icon: '◆',
    items: [
      { key: 'users', label: 'User Management', icon: '◈', roles: ['ADMIN'] },
    ]
  },
];

export default function RulesConsole({ auth, onLogout }) {
  const [rules, setRules]         = useState([]);
  const [form, setForm]           = useState(emptyRule);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const canCreate  = ['MERCHANDISER','APPROVER','ADMIN'].includes(auth.role);
  const canApprove = ['APPROVER','ADMIN'].includes(auth.role);
  const canDelete  = ['APPROVER','ADMIN'].includes(auth.role);

  useEffect(() => {
    const nonRuleTabs = ['users','facets','engine-config','click-intelligence','search-quality'];
    if (!nonRuleTabs.includes(activeTab)) fetchRules();
  }, [activeTab]);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  async function fetchRules() {
    try {
      setLoading(true);
      const url = activeTab === 'pending' ? `${API_BASE}/rules/pending` : `${API_BASE}/rules`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.status === 403) { onLogout(); return; }
      setRules(await res.json());
    } catch (e) { setError('Failed to load rules'); }
    finally { setLoading(false); }
  }

  async function createRule() {
    setSaving(true);
    try {
      const payload = {
        type: form.type, query: form.query,
        ...(form.type === 'BOOST' && { boostField: form.boostField, boostValue: form.boostValue, boostFactor: parseFloat(form.boostFactor) || null }),
        ...(form.type === 'PIN'   && { pinnedIds: form.pinnedIds.split(',').map(s=>s.trim()).filter(Boolean) }),
        ...(form.type === 'BURY'  && { boostField: form.boostField, boostValue: form.boostValue, boostFactor: parseFloat(form.boostFactor) || null }),
        ...(form.type === 'SYNONYM' && { synonyms: form.synonyms.split(',').map(s=>s.trim()).filter(Boolean) }),
        ...(form.activateAt && { activateAt: new Date(form.activateAt).toISOString() }),
        ...(form.expireAt   && { expireAt:   new Date(form.expireAt).toISOString() }),
      };
      await fetch(`${API_BASE}/rules`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      setForm(emptyRule); fetchRules();
    } catch (e) { setError('Failed to save rule'); }
    finally { setSaving(false); }
  }

  async function approveRule(id) {
    await fetch(`${API_BASE}/rules/${id}/approve`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ comment: 'Approved' }) });
    fetchRules();
  }
  async function rejectRule(id) {
    const comment = window.prompt('Reason for rejection:') || 'Rejected';
    await fetch(`${API_BASE}/rules/${id}/reject`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ comment }) });
    fetchRules();
  }
  async function toggleRule(id) {
    await fetch(`${API_BASE}/rules/${id}/toggle`, { method: 'PATCH', headers: authHeaders() });
    fetchRules();
  }
  async function deleteRule(id) {
    if (!window.confirm('Delete this rule?')) return;
    await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchRules();
  }

  const displayedRules = activeTab === 'pending'
    ? rules.filter(r => r.status === 'PENDING_REVIEW')
    : rules;

  // Filter nav items by role
  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => i.roles.includes(auth.role))
  })).filter(g => g.items.length > 0);

  return (
    <div style={s.shell}>
      {/* Background grid */}
      <div style={s.bgGrid} />

      {/* SIDEBAR */}
      <aside style={{ ...s.sidebar, width: sidebarOpen ? 220 : 56 }}>

        {/* Logo area */}
        <div style={s.logoArea}>
          <div style={s.mrMark}>MR</div>
          {sidebarOpen && (
            <div style={s.brandText}>
              <div style={s.brandProduct}>NexaRank</div>
              <div style={s.brandSub}>by Modern Reliability</div>
            </div>
          )}
          <button style={s.hamburger} onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '←' : '☰'}
          </button>
        </div>

        {/* Nav groups */}
        <nav style={s.nav}>
          {visibleGroups.map(group => (
            <div key={group.label} style={s.navGroup}>
              {sidebarOpen && (
                <div style={s.navGroupLabel}>{group.label}</div>
              )}
              {group.items.map(item => (
                <button
                  key={item.key}
                  style={{
                    ...s.navItem,
                    ...(activeTab === item.key ? s.navItemActive : {}),
                  }}
                  onClick={() => setActiveTab(item.key)}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span style={s.navIcon}>{item.icon}</span>
                  {sidebarOpen && <span style={s.navLabel}>{item.label}</span>}
                  {sidebarOpen && activeTab === item.key && (
                    <span style={s.navActiveDot} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User area at bottom */}
        <div style={s.userArea}>
          <div style={s.userDot} />
          {sidebarOpen && (
            <div style={s.userInfo}>
              <div style={s.userName}>{auth.username}</div>
              <div style={{...s.roleBadge, ...roleColor(auth.role)}}>{auth.role}</div>
            </div>
          )}
          {sidebarOpen && (
            <button style={s.logoutBtn} onClick={onLogout} title="Sign out">⎋</button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={s.main}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.pageTitle}>
            {visibleGroups.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Dashboard'}
          </div>
          <div style={s.topBarRight}>
            <div style={s.liveIndicator}>
              <span style={s.liveDot} />
              <span style={s.liveText}>Live</span>
            </div>
            <div style={s.topBarTime}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={s.errorBanner}>
            <span>⚠ {error}</span>
            <button style={s.errorDismiss} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* CONTENT ROUTING */}
        <div style={s.content}>
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
              {/* Create Rule Form */}
              {canCreate && (
                <div style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardTitle}>New Rule</div>
                    <div style={s.cardHint}>Rules are queued for approval before going live</div>
                  </div>
                  <div style={s.formGrid}>
                    <div style={s.fieldGroup}>
                      <label style={s.fieldLabel}>Type</label>
                      <select style={s.select} value={form.type}
                        onChange={e => setForm({...emptyRule, type: e.target.value})}>
                        {RULE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fieldLabel}>Query</label>
                      <input style={s.input} placeholder="e.g. car battery" value={form.query}
                        onChange={e => setForm({...form, query: e.target.value})} />
                    </div>
                    {(form.type === 'BOOST' || form.type === 'BURY') && <>
                      <div style={s.fieldGroup}>
                        <label style={s.fieldLabel}>Boost Field</label>
                        <input style={s.input} placeholder="e.g. brand" value={form.boostField}
                          onChange={e => setForm({...form, boostField: e.target.value})} />
                      </div>
                      <div style={s.fieldGroup}>
                        <label style={s.fieldLabel}>Boost Value</label>
                        <input style={s.input} placeholder="e.g. Duracell" value={form.boostValue}
                          onChange={e => setForm({...form, boostValue: e.target.value})} />
                      </div>
                      <div style={s.fieldGroup}>
                        <label style={s.fieldLabel}>Factor</label>
                        <input style={s.input} type="number" placeholder="1.5" value={form.boostFactor}
                          onChange={e => setForm({...form, boostFactor: e.target.value})} />
                      </div>
                    </>}
                    {form.type === 'PIN' && (
                      <div style={{...s.fieldGroup, flex: 3}}>
                        <label style={s.fieldLabel}>Product IDs (comma-separated)</label>
                        <input style={s.input} placeholder="SKU-001, SKU-002" value={form.pinnedIds}
                          onChange={e => setForm({...form, pinnedIds: e.target.value})} />
                      </div>
                    )}
                    {form.type === 'SYNONYM' && (
                      <div style={{...s.fieldGroup, flex: 3}}>
                        <label style={s.fieldLabel}>Synonyms (comma-separated)</label>
                        <input style={s.input} placeholder="battery, 12v, car battery" value={form.synonyms}
                          onChange={e => setForm({...form, synonyms: e.target.value})} />
                      </div>
                    )}
                    <div style={s.fieldGroup}>
                      <label style={s.fieldLabel}>Activate At</label>
                      <input style={s.input} type="datetime-local" value={form.activateAt}
                        onChange={e => setForm({...form, activateAt: e.target.value})} />
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fieldLabel}>Expire At</label>
                      <input style={s.input} type="datetime-local" value={form.expireAt}
                        onChange={e => setForm({...form, expireAt: e.target.value})} />
                    </div>
                  </div>
                  <button style={{...s.btn, opacity: saving ? 0.6 : 1}}
                    onClick={createRule} disabled={saving}>
                    {saving ? 'Creating...' : '+ Create Rule'}
                  </button>
                </div>
              )}

              {/* Rules Table */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <div style={s.cardTitle}>
                    {activeTab === 'pending' ? 'Pending Review' : 'All Rules'}
                    <span style={s.countBadge}>{displayedRules.length}</span>
                  </div>
                  <button style={s.refreshBtn} onClick={fetchRules}>↻ Refresh</button>
                </div>

                {loading ? (
                  <div style={s.loadingRow}>
                    <div style={s.loadingSpinner} />
                    <span>Loading rules...</span>
                  </div>
                ) : displayedRules.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>⚡</div>
                    <div style={s.emptyTitle}>No rules yet</div>
                    <div style={s.emptyHint}>Create your first merchandising rule above</div>
                  </div>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {['Type','Query','Details','Status','Schedule','Submitted By','Actions'].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRules.map((rule, i) => (
                          <tr key={rule.id} style={{...s.tr, ...(i%2===0 ? s.trEven : {})}}>
                            <td style={s.td}>
                              <span style={{...s.typeBadge, ...typeColor(rule.type)}}>{rule.type || '—'}</span>
                            </td>
                            <td style={s.td}><span style={s.queryText}>{rule.query || '—'}</span></td>
                            <td style={{...s.td, ...s.detailText}}>{ruleDetails(rule)}</td>
                            <td style={s.td}>
                              <span style={{...s.statusBadge, ...statusColor(rule.status)}}>{rule.status || '—'}</span>
                            </td>
                            <td style={{...s.td, ...s.scheduleText}}>
                              {rule.activateAt ? `▶ ${new Date(rule.activateAt).toLocaleDateString()}` : ''}
                              {rule.activateAt && rule.expireAt ? ' · ' : ''}
                              {rule.expireAt ? `■ ${new Date(rule.expireAt).toLocaleDateString()}` : ''}
                              {!rule.activateAt && !rule.expireAt ? '—' : ''}
                            </td>
                            <td style={{...s.td, ...s.submitterText}}>{rule.submittedBy || '—'}</td>
                            <td style={s.td}>
                              <div style={s.actionGroup}>
                                {canApprove && rule.status === 'PENDING_REVIEW' && <>
                                  <button style={{...s.actionBtn, ...s.actionApprove}} onClick={() => approveRule(rule.id)}>✓</button>
                                  <button style={{...s.actionBtn, ...s.actionReject}} onClick={() => rejectRule(rule.id)}>✕</button>
                                </>}
                                {rule.status === 'APPROVED' && canApprove && (
                                  <button style={s.actionBtn} onClick={() => toggleRule(rule.id)}>
                                    {rule.enabled ? '⏸' : '▶'}
                                  </button>
                                )}
                                {canDelete && (
                                  <button style={{...s.actionBtn, ...s.actionDelete}} onClick={() => deleteRule(rule.id)}>⌫</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function ruleDetails(rule) {
  if (rule.type === 'BOOST' || rule.type === 'BURY')
    return `${rule.boostField}: ${rule.boostValue} ×${rule.boostFactor}`;
  if (rule.type === 'PIN')     return `Pins: ${(rule.pinnedIds||[]).join(', ')}`;
  if (rule.type === 'SYNONYM') return `→ ${(rule.synonyms||[]).join(', ')}`;
  return '—';
}

function typeColor(type) {
  return {
    BOOST:   { background: 'rgba(0,119,255,0.15)', color: '#4da6ff', border: '1px solid rgba(0,119,255,0.3)' },
    PIN:     { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    BURY:    { background: 'rgba(255,68,68,0.12)',  color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.3)' },
    SYNONYM: { background: 'rgba(180,0,255,0.12)', color: '#d066ff', border: '1px solid rgba(180,0,255,0.3)' },
  }[type] || { background: 'rgba(255,255,255,0.05)', color: '#6b8cba' };
}

function statusColor(status) {
  return {
    PENDING_REVIEW: { background: 'rgba(255,171,0,0.12)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)' },
    APPROVED:       { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    REJECTED:       { background: 'rgba(255,68,68,0.12)',  color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.3)' },
    DISABLED:       { background: 'rgba(107,140,186,0.1)', color: '#6b8cba', border: '1px solid rgba(107,140,186,0.2)' },
    DRAFT:          { background: 'rgba(0,180,255,0.1)',   color: '#00b4ff', border: '1px solid rgba(0,180,255,0.3)' },
  }[status] || { background: 'rgba(255,255,255,0.05)', color: '#6b8cba' };
}

function roleColor(role) {
  return {
    ADMIN:        { background: 'rgba(255,68,68,0.15)',   color: '#ff6b6b' },
    APPROVER:     { background: 'rgba(0,230,118,0.15)',   color: '#00e676' },
    MERCHANDISER: { background: 'rgba(0,119,255,0.15)',   color: '#4da6ff' },
    VIEWER:       { background: 'rgba(107,140,186,0.15)', color: '#6b8cba' },
  }[role] || { background: 'rgba(255,255,255,0.1)', color: '#fff' };
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  // Layout
  shell:     { display: 'flex', minHeight: '100vh', background: '#080d1a', fontFamily: "'DM Mono', 'JetBrains Mono', monospace", position: 'relative', overflow: 'hidden' },
  bgGrid:    { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,119,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 },

  // Sidebar
  sidebar:   { display: 'flex', flexDirection: 'column', background: '#0a1020', borderRight: '1px solid rgba(0,119,255,0.15)', transition: 'width 0.25s ease', overflow: 'hidden', position: 'relative', zIndex: 10, flexShrink: 0, minHeight: '100vh' },

  logoArea:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 12px 16px', borderBottom: '1px solid rgba(0,119,255,0.1)', minHeight: 64 },
  mrMark:    { width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #0055cc, #00b4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', flexShrink: 0, boxShadow: '0 0 12px rgba(0,119,255,0.4)' },
  brandText: { flex: 1, minWidth: 0 },
  brandProduct: { fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' },
  brandSub:  { fontSize: '9px', color: 'rgba(0,180,255,0.7)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '1px' },
  hamburger: { background: 'none', border: 'none', color: 'rgba(107,140,186,0.7)', cursor: 'pointer', fontSize: '14px', padding: '4px', marginLeft: 'auto', flexShrink: 0, lineHeight: 1 },

  nav:       { flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' },
  navGroup:  { marginBottom: '20px' },
  navGroupLabel: { fontSize: '9px', fontWeight: 700, color: 'rgba(0,180,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '6px' },
  navItem:   { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(107,140,186,0.8)', fontSize: '12px', textAlign: 'left', transition: 'all 0.15s', position: 'relative', whiteSpace: 'nowrap' },
  navItemActive: { background: 'rgba(0,119,255,0.12)', color: '#4da6ff', borderLeft: '2px solid #0077ff' },
  navIcon:   { fontSize: '13px', flexShrink: 0, width: 16, textAlign: 'center' },
  navLabel:  { flex: 1, fontSize: '12px' },
  navActiveDot: { width: 5, height: 5, borderRadius: '50%', background: '#0077ff', boxShadow: '0 0 6px #0077ff' },

  userArea:  { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderTop: '1px solid rgba(0,119,255,0.1)', background: 'rgba(0,0,0,0.2)' },
  userDot:   { width: 7, height: 7, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 6px #00e676', flexShrink: 0 },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: '11px', color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { display: 'inline-block', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', marginTop: '2px', letterSpacing: '0.5px' },
  logoutBtn: { background: 'none', border: '1px solid rgba(107,140,186,0.2)', borderRadius: '6px', color: 'rgba(107,140,186,0.6)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', flexShrink: 0 },

  // Main
  main:      { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 },

  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(0,119,255,0.1)', background: 'rgba(10,16,32,0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 5 },
  pageTitle: { fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  liveIndicator: { display: 'flex', alignItems: 'center', gap: '6px' },
  liveDot:   { width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676', animation: 'pulse 2s infinite' },
  liveText:  { fontSize: '11px', color: '#00e676', fontWeight: 600, letterSpacing: '1px' },
  topBarTime:{ fontSize: '11px', color: 'rgba(107,140,186,0.6)', letterSpacing: '0.5px' },

  content:   { flex: 1, padding: '24px', overflowY: 'auto' },

  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b6b', padding: '10px 16px', fontSize: '13px', margin: '0 24px 0' },
  errorDismiss: { background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px' },

  // Cards
  card:      { background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,119,255,0.12)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', backdropFilter: 'blur(4px)' },
  cardHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' },
  cardHint:  { fontSize: '11px', color: 'rgba(107,140,186,0.6)' },
  countBadge:{ background: 'rgba(0,119,255,0.15)', color: '#4da6ff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0,119,255,0.2)' },
  refreshBtn:{ background: 'rgba(0,119,255,0.1)', border: '1px solid rgba(0,119,255,0.2)', color: '#4da6ff', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' },

  // Form
  formGrid:  { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '140px' },
  fieldLabel:{ fontSize: '10px', fontWeight: 700, color: 'rgba(0,180,255,0.6)', letterSpacing: '1.5px', textTransform: 'uppercase' },
  input:     { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,119,255,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#e2e8f0', outline: 'none', fontFamily: 'inherit' },
  select:    { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,119,255,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#e2e8f0', outline: 'none', fontFamily: 'inherit' },
  btn:       { background: 'linear-gradient(135deg, #0055cc, #0077ff)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.5px', boxShadow: '0 0 16px rgba(0,119,255,0.3)', fontFamily: 'inherit' },

  // Table
  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th:        { textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'rgba(107,140,186,0.6)', padding: '8px 12px', borderBottom: '1px solid rgba(0,119,255,0.1)', letterSpacing: '1px', textTransform: 'uppercase' },
  tr:        { borderBottom: '1px solid rgba(0,119,255,0.06)', transition: 'background 0.1s' },
  trEven:    { background: 'rgba(0,119,255,0.02)' },
  td:        { padding: '10px 12px', color: '#c8d6e8', verticalAlign: 'middle' },
  queryText: { color: '#e2e8f0', fontWeight: 600 },
  detailText:{ color: 'rgba(107,140,186,0.8)', fontSize: '11px' },
  scheduleText: { color: 'rgba(107,140,186,0.6)', fontSize: '11px' },
  submitterText: { color: 'rgba(107,140,186,0.7)', fontSize: '11px' },

  typeBadge: { display: 'inline-block', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' },
  statusBadge:{ display: 'inline-block', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' },

  actionGroup:{ display: 'flex', gap: '4px' },
  actionBtn: { background: 'rgba(107,140,186,0.1)', border: '1px solid rgba(107,140,186,0.2)', color: '#6b8cba', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' },
  actionApprove: { background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676' },
  actionReject:  { background: 'rgba(255,68,68,0.1)',  border: '1px solid rgba(255,68,68,0.25)', color: '#ff6b6b' },
  actionDelete:  { background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',  color: '#ff6b6b' },

  // Loading / Empty
  loadingRow:{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px', color: 'rgba(107,140,186,0.6)', fontSize: '13px' },
  loadingSpinner: { width: '16px', height: '16px', border: '2px solid rgba(0,119,255,0.2)', borderTopColor: '#0077ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyState:{ padding: '48px', textAlign: 'center' },
  emptyIcon: { fontSize: '32px', marginBottom: '12px', opacity: 0.3 },
  emptyTitle:{ fontSize: '16px', fontWeight: 700, color: 'rgba(107,140,186,0.5)', marginBottom: '6px' },
  emptyHint: { fontSize: '13px', color: 'rgba(107,140,186,0.35)' },
};
