// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function UserManagement({ auth }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState({});
  const [form, setForm] = useState({ username: '', password: '', groupIds: [] });
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
      const userList = await res.json();
      setUsers(userList);
    } catch (e) { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, [auth.token]);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers, fetchGroups]);

  useEffect(() => {
    users.forEach(u => fetchMembershipsForUser(u.id));
  }, [users.length, fetchMembershipsForUser]);

  async function createUser() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username: form.username, password: form.password, role: 'VIEWER' })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create user'); return; }
      // Assign selected groups
      for (const gid of (form.groupIds || [])) {
        await fetch(`${API_BASE}/users/${data.id}/groups/${gid}`, { method: 'POST', headers: authHeaders() });
      }
      setSuccess(`User "${data.username}" created`);
      setForm({ username: '', password: '', groupIds: [] });
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

  return (
    <div style={s.page}>
      <div style={s.title}>User Management</div>

      <div style={s.card}>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <div style={s.formRow}>
          <input style={s.input} placeholder="Username"
            value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          <input style={s.input} placeholder="Password" type="password"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <div style={s.groupSelectWrap}>
            <div style={s.groupSelectLabel}>Groups (hold Ctrl to multi-select)</div>
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
        <div style={s.cardTitle}>Users {!loading && <span style={s.countBadge}>{users.length}</span>}</div>
        {loading ? <div style={s.loading}>Loading...</div> : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Username', 'Groups', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} style={i % 2 === 0 ? s.trEven : {}}>
                  <td style={s.td}><span style={s.username}>{user.username}</span></td>
                  <td style={s.td}>
                    <div style={s.groupsCell}>
                      {(memberships[user.id] || []).map(gid => (
                        <span key={gid} style={s.groupTag}>
                          {groups.find(g => g.id === gid)?.name || 'Group'}
                          <button style={s.removeBtn}
                            onClick={() => toggleUserGroup(user.id, gid, true)}>×</button>
                        </span>
                      ))}
                      <select style={s.addSelect} value=""
                        onChange={e => { if(e.target.value) toggleUserGroup(user.id, e.target.value, false); }}>
                        <option value="">+ Add</option>
                        {groups.filter(g => !(memberships[user.id]||[]).includes(g.id))
                          .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  </td>
                  <td style={s.td}>
                    {user.username !== auth.username && (
                      <button style={s.deleteBtn} onClick={() => deleteUser(user.id)}>Delete</button>
                    )}
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

const s = {
  page:           { padding: '28px 32px', minHeight: '100vh' },
  title:          { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 20 },
  card:           { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, marginBottom: 20 },
  cardTitle:      { fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 14 },
  countBadge:     { fontSize: 12, background: 'rgba(0,119,255,0.2)', color: '#4a5568', padding: '2px 8px', borderRadius: 10, marginLeft: 8 },
  formRow:        { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  input:          { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 13, minWidth: 140 },
  groupSelectWrap:{ display: 'flex', flexDirection: 'column', gap: 4 },
  groupSelectLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  multiSelect:    { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 7, padding: '4px 8px', color: '#1a202c', fontSize: 13, minWidth: 180, height: 80 },
  btn:            { background: 'rgba(0,119,255,0.2)', border: '1px solid rgba(0,119,255,0.4)', color: '#1a202c', padding: '8px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-end' },
  error:          { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  success:        { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  loading:        { color: '#4a5568', padding: 20, textAlign: 'center' },
  table:          { width: '100%', borderCollapse: 'collapse' },
  th:             { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e1e4e8' },
  td:             { padding: '10px 12px', borderBottom: '1px solid #e1e4e8', verticalAlign: 'middle' },
  trEven:         { background: '#f8f9fa' },
  username:       { fontSize: 14, color: '#1a202c', fontWeight: 600 },
  groupsCell:     { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  groupTag:       { fontSize: 11, background: '#e8f0fe', border: '1px solid rgba(0,119,255,0.3)', color: '#4a5568', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 },
  removeBtn:      { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 },
  addSelect:      { fontSize: 11, background: '#f0f6fc', border: '1px solid rgba(0,119,255,0.2)', color: '#4a5568', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' },
  deleteBtn:      { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};
