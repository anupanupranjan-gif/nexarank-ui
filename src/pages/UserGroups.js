// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

const ALL_PERMISSIONS = [
  { key: 'RULES_VIEW',            label: 'Rules — View',              category: 'Rules' },
  { key: 'RULES_CREATE',          label: 'Rules — Create',            category: 'Rules' },
  { key: 'RULES_EDIT',            label: 'Rules — Edit',              category: 'Rules' },
  { key: 'RULES_DELETE',          label: 'Rules — Delete',            category: 'Rules' },
  { key: 'RULES_APPROVE',         label: 'Rules — Approve',           category: 'Rules' },
  { key: 'FACET_VIEW',            label: 'Facets — View',             category: 'Facets' },
  { key: 'FACET_MANAGE',          label: 'Facets — Manage',           category: 'Facets' },
  { key: 'ENGINE_CONFIG_VIEW',    label: 'Engine Config — View',      category: 'Engine' },
  { key: 'ENGINE_CONFIG_MANAGE',  label: 'Engine Config — Manage',    category: 'Engine' },
  { key: 'CLICK_INTELLIGENCE_VIEW', label: 'Click Intelligence — View', category: 'Intelligence' },
  { key: 'SEARCH_QUALITY_VIEW',   label: 'Search Quality — View',     category: 'Intelligence' },
  { key: 'SEARCH_QUALITY_RUN',    label: 'Search Quality — Run Eval', category: 'Intelligence' },
  { key: 'USER_MANAGEMENT',       label: 'User Management',           category: 'Admin' },
  { key: 'AUDIT_LOG_VIEW',        label: 'Audit Log — View',          category: 'Admin' },
];

const CATEGORIES = ['Rules', 'Facets', 'Engine', 'Intelligence', 'Admin'];

export default function UserGroups({ auth }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [saving, setSaving] = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/groups`, { headers: authHeaders() });
      setGroups(await res.json());
    } catch (e) { setGroups([]); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingGroup(null);
    setForm({ name: '', description: '', permissions: [] });
    setShowForm(true);
  }

  function openEdit(group) {
    setEditingGroup(group);
    setForm({
      name: group.name,
      description: group.description || '',
      permissions: (group.permissions || []).map(p => p.permission),
    });
    setShowForm(true);
  }

  function togglePermission(perm) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm]
    }));
  }

  function selectAll(category) {
    const catPerms = ALL_PERMISSIONS.filter(p => p.category === category).map(p => p.key);
    const allSelected = catPerms.every(p => form.permissions.includes(p));
    setForm(f => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter(p => !catPerms.includes(p))
        : [...new Set([...f.permissions, ...catPerms])]
    }));
  }

  async function saveGroup() {
    setSaving(true);
    try {
      const url = editingGroup ? `${API_BASE}/groups/${editingGroup.id}` : `${API_BASE}/groups`;
      const method = editingGroup ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      setShowForm(false);
      fetchGroups();
    } catch (e) { alert('Failed to save group'); }
    finally { setSaving(false); }
  }

  async function deleteGroup(id) {
    if (!window.confirm('Delete this group? Users in this group will lose their permissions.')) return;
    await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchGroups();
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>User Groups</div>
          <div style={s.subtitle}>Define permission sets and assign users to groups</div>
        </div>
        <button style={s.createBtn} onClick={openCreate}>+ New Group</button>
      </div>

      {loading ? (
        <div style={s.loading}>Loading groups...</div>
      ) : (
        <div style={s.groupGrid}>
          {groups.map(group => (
            <div key={group.id} style={s.groupCard}>
              <div style={s.groupHeader}>
                <div>
                  <div style={s.groupName}>{group.name}</div>
                  {group.description && <div style={s.groupDesc}>{group.description}</div>}
                </div>
                <div style={s.groupActions}>
                  {!group.default && (
                    <>
                      <button style={s.editBtn} onClick={() => openEdit(group)}>Edit</button>
                      <button style={s.deleteBtn} onClick={() => deleteGroup(group.id)}>✕</button>
                    </>
                  )}
                  {group.default && <span style={s.defaultBadge}>Default</span>}
                </div>
              </div>
              <div style={s.permCount}>
                {(group.permissions || []).length} permissions
              </div>
              <div style={s.permTags}>
                {(group.permissions || []).slice(0, 6).map(p => (
                  <span key={p.permission} style={s.permTag}>{p.permission.replace(/_/g, ' ')}</span>
                ))}
                {(group.permissions || []).length > 6 && (
                  <span style={s.permTagMore}>+{(group.permissions || []).length - 6} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>{editingGroup ? 'Edit Group' : 'New Group'}</div>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Group Name</label>
              <input style={s.input} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Merchandising Team" />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Description</label>
              <input style={s.input} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description" />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Permissions</label>
              {CATEGORIES.map(cat => (
                <div key={cat} style={s.permCategory}>
                  <div style={s.catHeader}>
                    <span style={s.catLabel}>{cat}</span>
                    <button style={s.selectAllBtn} onClick={() => selectAll(cat)}>
                      {ALL_PERMISSIONS.filter(p => p.category === cat).every(p => form.permissions.includes(p.key))
                        ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={s.permCheckboxes}>
                    {ALL_PERMISSIONS.filter(p => p.category === cat).map(perm => (
                      <label key={perm.key} style={s.checkLabel}>
                        <input type="checkbox"
                          checked={form.permissions.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)} />
                        <span style={s.checkText}>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={s.saveBtn} disabled={saving || !form.name}
                onClick={saveGroup}>
                {saving ? 'Saving...' : 'Save Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:         { padding: '28px 32px', minHeight: '100vh' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle:     { fontSize: 13, color: '#4a5568' },
  createBtn:    { background: 'rgba(0,119,255,0.2)', border: '1px solid rgba(0,119,255,0.4)', color: '#4a5568', padding: '8px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  loading:      { color: '#4a5568', padding: 40, textAlign: 'center' },
  groupGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  groupCard:    { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 16 },
  groupHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  groupName:    { fontSize: 15, fontWeight: 700, color: '#1a202c' },
  groupDesc:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  groupActions: { display: 'flex', gap: 6, alignItems: 'center' },
  editBtn:      { background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '3px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  deleteBtn:    { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '3px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  defaultBadge: { fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' },
  permCount:    { fontSize: 12, color: '#64748b', marginBottom: 8 },
  permTags:     { display: 'flex', flexWrap: 'wrap', gap: 4 },
  permTag:      { fontSize: 10, background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4a5568', padding: '2px 6px', borderRadius: 4 },
  permTagMore:  { fontSize: 10, color: '#64748b', padding: '2px 6px' },
  modal:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox:     { background: '#0f1929', border: '1px solid rgba(0,119,255,0.3)', borderRadius: 12, padding: 24, width: 560, maxHeight: '85vh', overflowY: 'auto' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: 700, color: '#1a202c' },
  closeBtn:     { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 },
  fieldGroup:   { marginBottom: 16 },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:        { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 14, boxSizing: 'border-box' },
  permCategory: { marginBottom: 12, background: '#f8f9fa', borderRadius: 8, padding: 10 },
  catHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catLabel:     { fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' },
  selectAllBtn: { background: 'none', border: 'none', color: 'rgba(0,180,255,0.7)', cursor: 'pointer', fontSize: 11 },
  permCheckboxes: { display: 'flex', flexDirection: 'column', gap: 6 },
  checkLabel:   { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  checkText:    { fontSize: 13, color: '#1a202c' },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn:    { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#4a5568', padding: '8px 18px', borderRadius: 7, cursor: 'pointer' },
  saveBtn:      { background: 'rgba(0,119,255,0.25)', border: '1px solid rgba(0,119,255,0.4)', color: '#1a202c', padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 },
};
