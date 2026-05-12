// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';
const ROLES = ['VIEWER', 'MERCHANDISER', 'APPROVER', 'ADMIN'];

const emptyForm = { username: '', password: '', role: 'MERCHANDISER' };

export default function UserManagement({ auth }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      setUsers(await res.json());
    } catch (e) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      setSuccess(`User "${data.username}" created successfully`);
      setForm(emptyForm);
      fetchUsers();
    } catch (e) {
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id, username) {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    fetchUsers();
  }

  const s = styles;

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.cardTitle}>Create User</h2>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <div style={s.formRow}>
          <input style={s.input} placeholder="Username"
            value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          <input style={s.input} placeholder="Password" type="password"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <select style={s.select} value={form.role}
            onChange={e => setForm({...form, role: e.target.value})}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button style={s.btn} onClick={createUser}
            disabled={saving || !form.username || !form.password}>
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>Users {!loading && <span style={s.badge}>{users.length}</span>}</h2>
        {loading ? <div style={s.muted}>Loading...</div> : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Username', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={s.tr}>
                  <td style={s.td}>{user.username}</td>
                  <td style={s.td}>
                    <span style={{...s.badge, ...roleColor(user.role)}}>{user.role}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{...s.badge, background: user.enabled ? '#d1fae5' : '#fee2e2',
                      color: user.enabled ? '#065f46' : '#991b1b'}}>
                      {user.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {user.username !== auth.username && (
                      <button style={{...s.btnSm, ...s.btnDanger}}
                        onClick={() => deleteUser(user.id, user.username)}>
                        Delete
                      </button>
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
  card:      { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 },
  cardTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#111827' },
  formRow:   { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input:     { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, flex: 1, minWidth: 160 },
  select:    { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14 },
  btn:       { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 14, cursor: 'pointer' },
  btnSm:     { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  btnDanger: { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
  badge:     { display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' },
  tr:        { borderBottom: '1px solid #f3f4f6' },
  td:        { padding: '10px 12px', fontSize: 14, color: '#111827', verticalAlign: 'middle' },
  muted:     { color: '#9ca3af' },
  error:     { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 },
  success:   { background: '#d1fae5', color: '#065f46', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 }
};
