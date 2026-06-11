// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';
import UserManagement from './UserManagement';
import AuditLog from './AuditLog';
import Analytics from './Analytics';
import SearchQualityCuration from './SearchQualityCuration';
import AiSuggestions from './AiSuggestions';
import UserGroups from './UserGroups';
import FacetManager from './FacetManager';
import ClickIntelligence from './ClickIntelligence';
import SearchQuality from './SearchQuality';
import SearchEngineConfig from './SearchEngineConfig';
import AbTestingTab from '../components/AbTestingTab';
import TriggerConditionBuilder from '../components/TriggerConditionBuilder';
import VersionHistoryTab from '../components/VersionHistoryTab';

const API_BASE = '/nexarank/api/v1';
const RULE_TYPES = ['BOOST', 'PIN', 'BURY', 'SYNONYM'];

const emptyRule = {
  type: 'BOOST', query: '', boostField: '', boostValue: '',
  boostFactor: '', pinnedIds: '', synonyms: '', activateAt: '', expireAt: '',
  requireQuery: true,
  triggerConditions: [],
};

const NAV_GROUPS = [
  { label: 'MERCHANDISING', items: [
      { key: 'all',     label: 'Rules',          icon: '⚡', permission: 'RULES_VIEW' },
      { key: 'pending', label: 'Pending Review',  icon: '◷', permission: 'RULES_APPROVE' },
      { key: 'ab-tests', label: 'A/B Tests', icon: '⚖', permission: 'RULES_VIEW' },
  ]},
  { label: 'CONFIGURATION', items: [
      { key: 'facets',        label: 'Facet Manager',   icon: '▤', permission: 'FACET_VIEW' },
      { key: 'engine-config', label: 'Engine Config',   icon: '⛁', permission: 'ENGINE_CONFIG_VIEW' },
  ]},
  { label: 'INTELLIGENCE', items: [
      { key: 'analytics',          label: 'Analytics',          icon: '▲', permission: 'CLICK_INTELLIGENCE_VIEW' },
      { key: 'ai-suggestions',     label: 'AI Suggestions',     icon: '✦', permission: 'CLICK_INTELLIGENCE_VIEW' },
      { key: 'click-intelligence', label: 'Click Intelligence', icon: '◎', permission: 'CLICK_INTELLIGENCE_VIEW' },
      { key: 'search-quality',     label: 'Search Quality',     icon: '◑', permission: 'SEARCH_QUALITY_VIEW' },
      { key: 'curation',           label: 'Quality Curation',   icon: '⊙', permission: 'SEARCH_QUALITY_RUN' },
  ]},
  { label: 'ADMIN', items: [
      { key: 'users',  label: 'User Management', icon: '◈', permission: 'USER_MANAGEMENT' },
      { key: 'groups', label: 'User Groups',      icon: '◉', permission: 'USER_MANAGEMENT' },
      { key: 'audit',  label: 'Audit Log',        icon: '📋', permission: 'AUDIT_LOG_VIEW' },
  ]},
];

// ── VERSION HISTORY DRAWER ────────────────────────────────────────────────────

function VersionDrawer({ rule, auth, onClose }) {
  if (!rule) return null;

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  return (
    <>
      {/* Backdrop */}
      <div style={ds.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={ds.drawer}>
        <div style={ds.drawerHeader}>
          <div style={ds.drawerTitle}>
            <span style={ds.drawerIcon}>⏱</span>
            Version History
          </div>
          <div style={ds.drawerMeta}>
            <span style={{ ...s.typeBadge, ...typeColor(rule.type) }}>{rule.type}</span>
            <span style={ds.drawerQuery}>{rule.query}</span>
          </div>
          <button style={ds.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={ds.drawerBody}>
          <VersionHistoryTab
            ruleId={rule.id}
            authHeaders={authHeaders}
            onRestored={onClose}
          />
        </div>
      </div>
    </>
  );
}

const ds = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' },
  drawer: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#f1f3f5', borderLeft: '1px solid rgba(0,119,255,0.2)', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' },
  drawerHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px', borderBottom: '1px solid #e1e4e8', flexShrink: 0 },
  drawerTitle: { fontSize: 14, fontWeight: 700, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  drawerIcon: { fontSize: 16 },
  drawerMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  drawerQuery: { fontSize: 12, color: '#4a5568', fontFamily: 'inherit' },
  closeBtn: { background: 'none', border: '1px solid #e1e4e8', borderRadius: 6, color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '4px 8px', flexShrink: 0 },
  drawerBody: { flex: 1, overflowY: 'auto', padding: '16px 20px' },
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function RulesConsole({ auth, onLogout }) {
  const [rules, setRules]             = useState([]);
  const [form, setForm]               = useState(emptyRule);
  const [activeTab, setActiveTab]     = useState(
    () => localStorage.getItem('nexarank_active_tab') || 'all'
  );
  const [conflicts, setConflicts]     = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [error, setError]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects]       = useState([]);
  const [activeProject, setActiveProject] = useState(auth.projectId || 'main');
  const [historyRule, setHistoryRule] = useState(null); // rule whose history drawer is open

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

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_BASE}/admin/tenants/${auth.tenantId}/projects`, { headers: authHeaders() });
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error('Failed to load projects', e); }
  }

  function handleProjectSwitch(projectId) {
    setActiveProject(projectId);
    auth.projectId = projectId;
    fetchRules();
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

  async function checkConflicts(query) {
    if (!query) return;
    try {
      const res = await fetch(`${API_BASE}/rules/conflicts?query=${encodeURIComponent(query)}`, { headers: authHeaders() });
      if (res.ok) setConflicts(await res.json());
    } catch (e) {}
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
        requireQuery: form.requireQuery,
        triggerConditions: form.triggerConditions.filter(
          c => c.facetField && c.facetValues && c.facetValues.length > 0
        ),
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

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      type: rule.type || 'BOOST',
      query: rule.query || '',
      boostField: rule.boostField || '',
      boostValue: rule.boostValue || '',
      boostFactor: rule.boostFactor || '',
      pinnedIds: (rule.pinnedIds || []).join(', '),
      synonyms: (rule.synonyms || []).join(', '),
      activateAt: rule.activateAt ? rule.activateAt.slice(0, 16) : '',
      expireAt: rule.expireAt ? rule.expireAt.slice(0, 16) : '',
      requireQuery: rule.requireQuery !== false,
      triggerConditions: (rule.triggerConditions || []).map(c => ({
        facetField: c.facetField || '',
        facetValues: c.facetValues || [],
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyRule);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload = {
        type: form.type, query: form.query,
        ...(form.type === 'BOOST' && { boostField: form.boostField, boostValue: form.boostValue, boostFactor: parseFloat(form.boostFactor) || null }),
        ...(form.type === 'PIN'   && { pinnedIds: form.pinnedIds.split(',').map(s=>s.trim()).filter(Boolean) }),
        ...(form.type === 'BURY'  && { boostField: form.boostField, boostValue: form.boostValue, boostFactor: parseFloat(form.boostFactor) || null }),
        ...(form.type === 'SYNONYM' && { synonyms: form.synonyms.split(',').map(s=>s.trim()).filter(Boolean) }),
        requireQuery: form.requireQuery,
        triggerConditions: form.triggerConditions.filter(
          c => c.facetField && c.facetValues && c.facetValues.length > 0
        ),
        ...(form.activateAt && { activateAt: new Date(form.activateAt).toISOString() }),
        ...(form.expireAt   && { expireAt:   new Date(form.expireAt).toISOString() }),
      };
      await fetch(`${API_BASE}/rules/${editingId}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload)
      });
      setEditingId(null);
      setForm(emptyRule);
      fetchRules();
    } catch (e) { setError('Failed to update rule'); }
    finally { setSaving(false); }
  }

  const displayedRules = activeTab === 'pending'
    ? rules.filter(r => r.status === 'PENDING_REVIEW')
    : rules;

  const hasPermission = (perm) => auth.permissions && auth.permissions.includes(perm);
  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => !i.permission || hasPermission(i.permission))
  })).filter(g => g.items.length > 0);

  return (
    <div style={s.shell}>
      <div style={s.bgGrid} />

      {/* VERSION HISTORY DRAWER */}
      {historyRule && (
        <VersionDrawer
          rule={historyRule}
          auth={auth}
          onClose={() => { setHistoryRule(null); fetchRules(); }}
        />
      )}

      {/* SIDEBAR */}
      <aside style={{ ...s.sidebar, width: sidebarOpen ? 220 : 56 }}>
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

        {sidebarOpen && projects.length > 1 && (
          <div style={s.projectSwitcher}>
            <div style={s.projectLabel2}>PROJECT</div>
            <select style={s.projectSelect} value={activeProject}
              onChange={e => handleProjectSwitch(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <nav style={s.nav}>
          {visibleGroups.map(group => (
            <div key={group.label} style={s.navGroup}>
              {sidebarOpen && <div style={s.navGroupLabel}>{group.label}</div>}
              {group.items.map(item => (
                <button key={item.key}
                  style={{ ...s.navItem, ...(activeTab === item.key ? s.navItemActive : {}) }}
                  onClick={() => { setActiveTab(item.key); localStorage.setItem('nexarank_active_tab', item.key); }}
                  title={!sidebarOpen ? item.label : undefined}>
                  <span style={s.navIcon}>{item.icon}</span>
                  {sidebarOpen && <span style={s.navLabel}>{item.label}</span>}
                  {sidebarOpen && activeTab === item.key && <span style={s.navActiveDot} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={s.userArea}>
          <div style={s.userDot} />
          {sidebarOpen && (
            <div style={s.userInfo}>
              <div style={s.userName}>{auth.username}</div>
              <div style={s.tenantBadge}>{auth.tenantId} / {auth.projectId}</div>
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
        <div style={s.topBar}>
          <div style={s.pageTitle}>
            {visibleGroups.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Dashboard'}
          </div>
          <div style={s.topBarRight}>
            <div style={s.liveIndicator}>
              <span style={s.liveDot} />
              <span style={s.liveText}>Live</span>
            </div>
            <div style={s.tenantContext}>
              <span style={s.tenantLabel}>{auth.tenantId}</span>
              <span style={s.projectLabel}>{auth.projectId}</span>
            </div>
            <div style={s.topBarTime}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        {error && (
          <div style={s.errorBanner}>
            <span>⚠ {error}</span>
            <button style={s.errorDismiss} onClick={() => setError(null)}>✕</button>
          </div>
        )}

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
          ) : activeTab === 'ai-suggestions' ? (
            <AiSuggestions auth={auth} />
          ) : activeTab === 'curation' ? (
            <SearchQualityCuration auth={auth} />
          ) : activeTab === 'analytics' ? (
            <Analytics auth={auth} />
          ) : activeTab === 'groups' ? (
            <UserGroups auth={auth} />
          ) : activeTab === 'ab-tests' ? (
            <AbTestingTab auth={auth} />
          ) : activeTab === 'audit' ? (
            <AuditLog auth={auth} />
          ) : (
            <>
              {canCreate && (
                <div style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardTitle}>{editingId ? '✎ Edit Rule' : 'New Rule'}</div>
                    <div style={s.cardHint}>
                      {editingId ? 'Editing will re-submit for approval' : 'Rules are queued for approval before going live'}
                    </div>
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
                    <div style={{...s.fieldGroup, flex: '100%', minWidth: '100%'}}>
                      <label style={s.fieldLabel}>
                        <input type="checkbox" checked={form.requireQuery}
                          onChange={e => setForm({...form, requireQuery: e.target.checked})}
                          style={{marginRight: 6}} />
                        Require Query Match
                        <span style={{color:'#64748b', fontWeight:400, marginLeft:8, fontSize:10}}>
                          {form.requireQuery ? 'fires only when query matches' : 'fires on any query (category/brand pages)'}
                        </span>
                      </label>
                    </div>
                    <div style={{flex: '100%', minWidth: '100%'}}>
                      <TriggerConditionBuilder
                        query={form.query}
                        conditions={form.triggerConditions}
                        onChange={conditions => setForm({...form, triggerConditions: conditions})}
                        authHeaders={authHeaders}
                      />
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
                  <div style={{display:'flex', gap:8}}>
                    <button style={{...s.btn, opacity: saving ? 0.6 : 1}}
                      onClick={editingId ? saveEdit : createRule} disabled={saving}>
                      {saving ? 'Saving...' : editingId ? '✓ Save Changes' : '+ Create Rule'}
                    </button>
                    {editingId && (
                      <button style={{...s.btn, background:'rgba(107,140,186,0.2)', boxShadow:'none'}}
                        onClick={cancelEdit}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                                {canCreate && (
                                  <button style={{...s.actionBtn, ...s.actionEdit}}
                                    onClick={() => startEdit(rule)} title="Edit rule">✎</button>
                                )}
                              {canApprove && rule.status === 'PENDING_REVIEW' && <>
                                  <button style={{...s.actionBtn, ...s.actionApprove}} onClick={() => approveRule(rule.id)}>✓</button>
                                  <button style={{...s.actionBtn, ...s.actionReject}} onClick={() => rejectRule(rule.id)}>✕</button>
                                </>}
                                {rule.status === 'APPROVED' && canApprove && (
                                  <button style={s.actionBtn} onClick={() => toggleRule(rule.id)}>
                                    {rule.enabled ? '⏸' : '▶'}
                                  </button>
                                )}
                                {/* Version History button */}
                                <button
                                  style={{...s.actionBtn, ...s.actionHistory}}
                                  onClick={() => setHistoryRule(rule)}
                                  title="Version history">
                                  ⏱
                                </button>
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

// ── HELPERS ───────────────────────────────────────────────────────────────────

function ruleDetails(rule) {
  let detail = '';
  if (rule.type === 'BOOST' || rule.type === 'BURY')
    detail = `${rule.boostField}: ${rule.boostValue} ×${rule.boostFactor}`;
  else if (rule.type === 'PIN')
    detail = `Pins: ${(rule.pinnedIds||[]).join(', ')}`;
  else if (rule.type === 'SYNONYM')
    detail = `→ ${(rule.synonyms||[]).join(', ')}`;
  const conditions = rule.triggerConditions || [];
  if (conditions.length > 0) {
    const condStr = conditions
      .filter(c => c.facetField)
      .map(c => `${c.facetField}∈[${(c.facetValues||[]).join('|')}]`)
      .join(' AND ');
    if (condStr) detail += ` | ⬡ ${condStr}`;
  }
  if (!rule.requireQuery) detail += ' | any query';
  return detail || '—';
}

function typeColor(type) {
  return {
    BOOST:   { background: '#e8f0fe', color: '#4da6ff', border: '1px solid rgba(0,119,255,0.3)' },
    PIN:     { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    BURY:    { background: 'rgba(255,68,68,0.12)',  color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.3)' },
    SYNONYM: { background: 'rgba(180,0,255,0.12)', color: '#d066ff', border: '1px solid rgba(180,0,255,0.3)' },
  }[type] || { background: 'rgba(255,255,255,0.05)', color: '#4a5568' };
}

function statusColor(status) {
  return {
    PENDING_REVIEW: { background: 'rgba(255,171,0,0.12)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)' },
    APPROVED:       { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    REJECTED:       { background: 'rgba(255,68,68,0.12)',  color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.3)' },
    DISABLED:       { background: 'rgba(107,140,186,0.1)', color: '#4a5568', border: '1px solid #e1e4e8' },
    DRAFT:          { background: 'rgba(0,180,255,0.1)',   color: '#00b4ff', border: '1px solid rgba(0,180,255,0.3)' },
  }[status] || { background: 'rgba(255,255,255,0.05)', color: '#4a5568' };
}

function roleColor(role) {
  return {
    ADMIN:        { background: 'rgba(255,68,68,0.15)',   color: '#ff6b6b' },
    APPROVER:     { background: 'rgba(0,230,118,0.15)',   color: '#00e676' },
    MERCHANDISER: { background: '#e8f0fe',   color: '#4da6ff' },
    VIEWER:       { background: 'rgba(107,140,186,0.15)', color: '#4a5568' },
  }[role] || { background: 'rgba(255,255,255,0.1)', color: '#fff' };
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  shell:     { display: 'flex', minHeight: '100vh', background: '#f8f9fa', fontFamily: "'DM Mono', 'JetBrains Mono', monospace", position: 'relative', overflow: 'hidden' },
  bgGrid:    { display: 'none' },
  sidebar:   { display: 'flex', flexDirection: 'column', background: '#f1f3f5', borderRight: '1px solid #e1e4e8', transition: 'width 0.25s ease', overflow: 'hidden', position: 'relative', zIndex: 10, flexShrink: 0, minHeight: '100vh' },
  logoArea:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 12px 16px', borderBottom: '1px solid #e1e4e8', minHeight: 64 },
  mrMark:    { width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #0055cc, #00b4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', flexShrink: 0, boxShadow: '0 0 12px rgba(0,119,255,0.4)' },
  brandText: { flex: 1, minWidth: 0 },
  brandProduct: { fontSize: '13px', fontWeight: 700, color: '#1a202c', letterSpacing: '0.5px' },
  brandSub:  { fontSize: '9px', color: '#8a94a6', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '1px' },
  hamburger: { background: 'none', border: 'none', color: '#8a94a6', cursor: 'pointer', fontSize: '14px', padding: '4px', marginLeft: 'auto', flexShrink: 0, lineHeight: 1 },
  nav:       { flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' },
  navGroup:  { marginBottom: '20px' },
  navGroupLabel: { fontSize: '9px', fontWeight: 700, color: '#8a94a6', letterSpacing: '2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '6px' },
  navItem:   { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 8px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '12px', textAlign: 'left', transition: 'all 0.15s', position: 'relative', whiteSpace: 'nowrap' },
  navItemActive: { background: '#f0f6fc', color: '#0077ff', borderLeft: '2px solid #0077ff' },
  navIcon:   { fontSize: '13px', flexShrink: 0, width: 16, textAlign: 'center' },
  navLabel:  { flex: 1, fontSize: '12px' },
  navActiveDot: { width: 5, height: 5, borderRadius: '50%', background: '#0077ff', boxShadow: '0 0 6px #0077ff' },
  projectSwitcher: { padding: '8px 10px', borderBottom: '1px solid #e1e4e8', marginBottom: 4 },
  projectLabel2:  { fontSize: 9, fontWeight: 700, color: 'rgba(0,180,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 },
  projectSelect:  { width: '100%', background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.3)', color: '#1a202c', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer', outline: 'none' },
  tenantBadge: { fontSize: 10, color: '#64748b', marginTop: 1 },
  tenantContext: { display: 'flex', alignItems: 'center', gap: 6, background: '#f0f6fc', border: '1px solid #c8e1ff', borderRadius: 6, padding: '3px 10px' },
  tenantLabel:  { fontSize: 12, color: '#0366d6', fontWeight: 600 },
  projectLabel: { fontSize: 12, color: '#586069', borderLeft: '1px solid #c8e1ff', paddingLeft: 6 },
  userArea:  { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderTop: '1px solid #e1e4e8', background: '#f1f3f5' },
  userDot:   { width: 7, height: 7, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 6px #00e676', flexShrink: 0 },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: '11px', color: '#1a202c', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { display: 'inline-block', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', marginTop: '2px', letterSpacing: '0.5px' },
  logoutBtn: { background: 'none', border: '1px solid #e1e4e8', borderRadius: '6px', color: '#8a94a6', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', flexShrink: 0 },
  main:      { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0, background: '#f8f9fa' },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e1e4e8', background: '#ffffff', position: 'sticky', top: 0, zIndex: 5 },
  pageTitle: { fontSize: '15px', fontWeight: 700, color: '#1a202c', letterSpacing: '0.5px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  liveIndicator: { display: 'flex', alignItems: 'center', gap: '6px' },
  liveDot:   { width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676', animation: 'pulse 2s infinite' },
  liveText:  { fontSize: '11px', color: '#00a854', fontWeight: 600, letterSpacing: '1px' },
  topBarTime:{ fontSize: '11px', color: '#8a94a6', letterSpacing: '0.5px' },
  content:   { flex: 1, padding: '24px', overflowY: 'auto', background: '#f8f9fa' },
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', padding: '10px 16px', fontSize: '13px', margin: '0 24px 0' },
  errorDismiss: { background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px' },
  card:      { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', backdropFilter: 'none' },
  cardHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#1a202c', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' },
  cardHint:  { fontSize: '11px', color: '#4a5568' },
  countBadge:{ background: '#e8f0fe', color: '#4da6ff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0,119,255,0.2)' },
  refreshBtn:{ background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4da6ff', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' },
  formGrid:  { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '140px' },
  fieldLabel:{ fontSize: '10px', fontWeight: 700, color: '#2d3748', letterSpacing: '1.5px', textTransform: 'uppercase' },
  input:     { background: '#ffffff', border: '1px solid rgba(0,119,255,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  select:    { background: '#ffffff', border: '1px solid rgba(0,119,255,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  btn:       { background: 'linear-gradient(135deg, #0055cc, #0077ff)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.5px', boxShadow: '0 0 16px rgba(0,119,255,0.3)', fontFamily: 'inherit' },
  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th:        { textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'rgba(180,200,230,0.9)', padding: '8px 12px', borderBottom: '1px solid #e1e4e8', letterSpacing: '1px', textTransform: 'uppercase' },
  tr:        { borderBottom: '1px solid #e1e4e8', transition: 'background 0.1s' },
  trEven:    { background: '#f8f9fa' },
  td:        { padding: '10px 12px', color: '#1a202c', verticalAlign: 'middle' },
  queryText: { color: '#1a202c', fontWeight: 600 },
  detailText:{ color: '#4a5568', fontSize: '11px' },
  scheduleText: { color: '#4a5568', fontSize: '11px' },
  submitterText: { color: '#4a5568', fontSize: '11px' },
  typeBadge: { display: 'inline-block', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' },
  statusBadge:{ display: 'inline-block', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' },
  actionGroup:{ display: 'flex', gap: '4px' },
  actionBtn: { background: 'rgba(107,140,186,0.1)', border: '1px solid #e1e4e8', color: '#4a5568', borderRadius: '5px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' },
  actionApprove: { background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676' },
  actionReject:  { background: 'rgba(255,68,68,0.1)',  border: '1px solid rgba(255,68,68,0.25)', color: '#ff6b6b' },
  actionDelete:  { background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',  color: '#ff6b6b' },
  actionHistory: { background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.2)', color: '#00b4ff' },
  actionEdit:    { background: 'rgba(180,0,255,0.08)', border: '1px solid rgba(180,0,255,0.2)', color: '#d066ff' },
  loadingRow:{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px', color: '#4a5568', fontSize: '13px' },
  loadingSpinner: { width: '16px', height: '16px', border: '2px solid rgba(0,119,255,0.2)', borderTopColor: '#0077ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyState:{ padding: '48px', textAlign: 'center' },
  emptyIcon: { fontSize: '32px', marginBottom: '12px', opacity: 0.3 },
  emptyTitle:{ fontSize: '16px', fontWeight: 700, color: '#1a202c', marginBottom: '6px' },
  emptyHint: { fontSize: '13px', color: '#4a5568' },
  conflictWarning: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  conflictItem:    { padding: '8px 12px', background: 'rgba(249,115,22,0.08)', border: '1px solid', borderRadius: 7, display: 'flex', alignItems: 'flex-start', gap: 6 },
};
