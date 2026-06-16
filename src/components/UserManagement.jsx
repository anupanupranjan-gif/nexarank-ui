// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

const ROLES = [
  { value: 'STAKEHOLDER', label: 'Stakeholder', description: 'Email only — no dashboard access' },
  { value: 'VIEWER',      label: 'Viewer',      description: 'Read-only dashboard access' },
  { value: 'MERCHANDISER',label: 'Merchandiser', description: 'Create and edit rules' },
  { value: 'APPROVER',    label: 'Approver',     description: 'Approve and publish rules' },
  { value: 'ADMIN',       label: 'Admin',        description: 'Full tenant access' },
];

const ROLE_COLORS = {
  STAKEHOLDER:  { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', color: '#a855f7' },
  VIEWER:       { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.35)', color: '#64748b' },
  MERCHANDISER: { bg: 'rgba(0,119,255,0.12)',  border: 'rgba(0,119,255,0.35)',   color: '#0077ff' },
  APPROVER:     { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',   color: '#ca8a04' },
  ADMIN:        { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',   color: '#ef4444' },
};

export default function UserManagement({ auth }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState({});
  const [form, setForm] = useState({ username: '', password: '', email: '', displayName: '', role: 'VIEWER', groupIds: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/groups`, { headers: authHeaders() });
      if (res.ok) setGroups(await res.json());
    } catch (e) {}
  }, [auth.token]);

  const fetchMembershipsForUser = useCallback(async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/groups`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMemberships(m => ({ ...m, [userId]: data.map(x => x.groupId) }));
      }
    } catch (e) {}
  }, [auth.token]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      if (res.status === 403) return;
      setUsers(await res.json());
    } catch (e) { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, [auth.token]);

  useEffect(() => { fetchUsers(); fetchGroups(); }, [fetchUsers, fetchGroups]);
  useEffect(() => { users.forEach(u => fetchMembershipsForUser(u.id)); }, [users.length, fetchMembershipsForUser]);

  async function createUser() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email || null,
          displayName: form.displayName || null,
          role: form.role,
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create user'); return; }
      for (const gid of (form.groupIds || [])) {
        await fetch(`${API_BASE}/users/${data.id}/groups/${gid}`, { method: 'POST', headers: authHeaders() });
      }
      setSuccess(`User "${data.username}" created as ${form.role}`);
      setForm({ username: '', password: '', email: '', displayName: '', role: 'VIEWER', groupIds: [] });
      fetchUsers();
    } catch (e) { setError('Failed to create user'); }
    finally { setSaving(false); }
  }

  async function deleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchUsers();
  }

  async function toggleUserGroup(userId, groupId, isMember) {
    const method = isMember ? 'DELETE' : 'POST';
    await fetch(`${API_BASE}/users/${userId}/groups/${groupId}`, { method, headers: authHeaders() });
    fetchMembershipsForUser(userId);
  }

  const selectedRoleMeta = ROLES.find(r => r.value === form.role);

  return (
    <div style={s.page}>
      <div style={s.title}>User Management</div>

      <div style={s.card}>
        {error   && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <div style={s.sectionLabel}>New User</div>
        <div style={s.formRow}>
          <input style={s.input} placeholder="Username *"
            value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          <input style={s.input} placeholder="Password *" type="password"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <input style={s.input} placeholder="Email address"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input style={s.input} placeholder="Display name"
            value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
        </div>

        <div style={s.formRow2}>
          <div style={s.roleWrap}>
            <div style={s.fieldLabel}>Role</div>
            <select style={s.select}
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {selectedRoleMeta && (
              <div style={s.roleHint}>{selectedRoleMeta.description}</div>
            )}
          </div>

          <div style={s.groupSelectWrap}>
            <div style={s.fieldLabel}>Groups <span style={s.optional}>(hold Ctrl to multi-select)</span></div>
            <select style={s.multiSelect} multiple
              value={form.groupIds}
              onChange={e => setForm({...form, groupIds: Array.from(e.target.selectedOptions).map(o => o.value)})}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <button style={s.btn} onClick={createUser}
            disabled={saving || !form.username || !form.password}>
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>
          Users {!loading && <span style={s.countBadge}>{users.length}</span>}
        </div>
        {loading ? <div style={s.loading}>Loading...</div> : (
          <table style={s.table}>
            <thead>
              <tr>
                {['User', 'Email', 'Role', 'Groups', 'Actions'].map(h =>
                  <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const roleColors = ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER;
                return (
                  <tr key={user.id} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}>
                      <div style={s.username}>{user.displayName || user.username}</div>
                      {user.displayName && <div style={s.usernameSmall}>{user.username}</div>}
                    </td>
                    <td style={s.td}>
                      <span style={s.email}>{user.email || <span style={s.noEmail}>—</span>}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{...s.roleBadge, background: roleColors.bg, border: `1px solid ${roleColors.border}`, color: roleColors.color}}>
                        {user.role === 'STAKEHOLDER' ? '✉ ' : ''}{user.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.groupsCell}>
                        {(memberships[user.id] || []).map(gid => (
                          <span key={gid} style={s.groupTag}>
                            {groups.find(g => g.id === gid)?.name || 'Group'}
                            {user.role !== 'STAKEHOLDER' && (
                              <button style={s.removeBtn}
                                onClick={() => toggleUserGroup(user.id, gid, true)}>×</button>
                            )}
                          </span>
                        ))}
                        {user.role !== 'STAKEHOLDER' && (
                          <select style={s.addSelect} value=""
                            onChange={e => { if (e.target.value) toggleUserGroup(user.id, e.target.value, false); }}>
                            <option value="">+ Add</option>
                            {groups.filter(g => !(memberships[user.id] || []).includes(g.id))
                              .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td style={s.td}>
                      {user.username !== auth.username && (
                        <button style={s.deleteBtn} onClick={() => deleteUser(user.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  page:            { padding: '28px 32px', minHeight: '100vh' },
  title:           { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 20 },
  card:            { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, marginBottom: 20 },
  cardTitle:       { fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 14 },
  countBadge:      { fontSize: 12, background: 'rgba(0,119,255,0.2)', color: '#4a5568', padding: '2px 8px', borderRadius: 10, marginLeft: 8 },
  sectionLabel:    { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  formRow:         { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 },
  formRow2:        { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  input:           { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 13, minWidth: 160 },
  fieldLabel:      { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  optional:        { fontWeight: 400, textTransform: 'none', letterSpacing: 0 },
  roleWrap:        { display: 'flex', flexDirection: 'column' },
  select:          { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 13, minWidth: 160 },
  roleHint:        { fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  groupSelectWrap: { display: 'flex', flexDirection: 'column' },
  multiSelect:     { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 7, padding: '4px 8px', color: '#1a202c', fontSize: 13, minWidth: 180, height: 80 },
  btn:             { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.4)', color: '#0055cc', padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-end' },
  error:           { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  success:         { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  loading:         { color: '#64748b', padding: 20, textAlign: 'center' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  th:              { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e1e4e8' },
  td:              { padding: '10px 12px', borderBottom: '1px solid #e1e4e8', verticalAlign: 'middle' },
  trEven:          { background: '#f8f9fa' },
  username:        { fontSize: 14, color: '#1a202c', fontWeight: 600 },
  usernameSmall:   { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  email:           { fontSize: 13, color: '#4a5568' },
  noEmail:         { color: '#cbd5e1' },
  roleBadge:       { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, display: 'inline-block' },
  groupsCell:      { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  groupTag:        { fontSize: 11, background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 },
  removeBtn:       { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 },
  addSelect:       { fontSize: 11, background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4a5568', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' },
  deleteBtn:       { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};
