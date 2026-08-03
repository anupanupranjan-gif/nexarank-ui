// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

// NR-121 step 7: scoped self-service view for a PROJECT_ADMIN (a user
// holding both MERCHANDISER + APPROVER on the ACTIVE project — not a
// distinct stored role). Deliberately much smaller than UserManagement.js:
// only the current project's roster, only MERCHANDISER/APPROVER/Project
// Admin assignment on THIS project — no user creation/deletion, no other
// projects, matching the backend's own canManageProjectRoles scoping.
export default function MyTeam({ auth }) {
  const [roster, setRoster] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [addForm, setAddForm] = useState({ userId: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users/project-roster/${auth.projectId}`, { headers: authHeaders() });
      if (res.status === 403) { setError('You do not administer this project'); return; }
      setRoster(await res.json());
    } catch (e) { setError('Failed to load team'); }
    finally { setLoading(false); }
  }, [auth.token, auth.projectId]);

  const fetchDirectory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/users/directory`, { headers: authHeaders() });
      if (res.ok) setDirectory(await res.json());
    } catch (e) {}
  }, [auth.token]);

  useEffect(() => { fetchRoster(); fetchDirectory(); }, [fetchRoster, fetchDirectory]);

  async function addMember() {
    if (!addForm.userId || !addForm.role) return;
    if (addForm.role === 'PROJECT_ADMIN') {
      await fetch(`${API_BASE}/users/${addForm.userId}/projects/${auth.projectId}/project-admin`, { method: 'POST', headers: authHeaders() });
    } else {
      await fetch(`${API_BASE}/users/${addForm.userId}/projects/${auth.projectId}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ role: addForm.role }),
      });
    }
    setAddForm({ userId: '', role: '' });
    fetchRoster();
  }

  async function removeMember(userId, role) {
    await fetch(`${API_BASE}/users/${userId}/projects/${auth.projectId}?role=${role}`, { method: 'DELETE', headers: authHeaders() });
    fetchRoster();
  }

  const grouped = Object.entries(
    roster.reduce((acc, row) => {
      (acc[row.userId] = acc[row.userId] || { username: row.username, email: row.email, roles: [] }).roles.push(row.role);
      return acc;
    }, {})
  );

  return (
    <div style={s.page}>
      <div style={s.title}>My Team</div>
      <div style={s.subtitle}>Merchandisers and approvers on this project only — you administer this project because you hold both roles here.</div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        <div style={s.sectionLabel}>Add Team Member</div>
        <div style={s.formRow}>
          <select style={s.select} value={addForm.userId}
            onChange={e => setAddForm(f => ({ ...f, userId: e.target.value }))}>
            <option value="">Select user...</option>
            {directory.map(u =>
              <option key={u.id} value={u.id}>{u.displayName || u.username} ({u.username})</option>)}
          </select>
          <select style={s.select} value={addForm.role}
            onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            <option value="">Select role...</option>
            <option value="MERCHANDISER">Merchandiser</option>
            <option value="APPROVER">Approver</option>
            <option value="PROJECT_ADMIN">Project Admin (both)</option>
          </select>
          <button style={s.btn} disabled={!addForm.userId || !addForm.role} onClick={addMember}>+ Add</button>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Team {!loading && <span style={s.countBadge}>{grouped.length}</span>}</div>
        {loading ? <div style={s.loading}>Loading...</div> : grouped.length === 0 ? (
          <div style={s.loading}>No merchandisers or approvers assigned to this project yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['User', 'Email', 'Roles', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {grouped.map(([userId, u], i) => {
                const isProjectAdmin = u.roles.includes('MERCHANDISER') && u.roles.includes('APPROVER');
                return (
                  <tr key={userId} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}>{u.username}</td>
                    <td style={s.td}><span style={s.email}>{u.email || <span style={s.noEmail}>—</span>}</span></td>
                    <td style={s.td}>
                      <span style={s.roleBadge}>{isProjectAdmin ? 'Project Admin' : u.roles.join(', ')}</span>
                    </td>
                    <td style={s.td}>
                      {u.roles.map(r => (
                        <button key={r} style={s.removeBtn} onClick={() => removeMember(userId, r)}>
                          Remove {r}
                        </button>
                      ))}
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
  page:         { padding: '28px 32px', minHeight: '100vh' },
  title:        { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle:     { fontSize: 13, color: '#64748b', marginBottom: 20 },
  card:         { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, marginBottom: 20 },
  cardTitle:    { fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 14 },
  countBadge:   { fontSize: 12, background: 'rgba(0,119,255,0.2)', color: '#4a5568', padding: '2px 8px', borderRadius: 10, marginLeft: 8 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  formRow:      { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  select:       { background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 13, minWidth: 180 },
  btn:          { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.4)', color: '#0055cc', padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  error:        { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  loading:      { color: '#64748b', padding: 20, textAlign: 'center' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e1e4e8' },
  td:           { padding: '10px 12px', borderBottom: '1px solid #e1e4e8', verticalAlign: 'middle' },
  trEven:       { background: '#f8f9fa' },
  email:        { fontSize: 13, color: '#4a5568' },
  noEmail:      { color: '#cbd5e1' },
  roleBadge:    { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, display: 'inline-block', background: 'rgba(0,119,255,0.12)', border: '1px solid rgba(0,119,255,0.35)', color: '#0077ff' },
  removeBtn:    { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, marginRight: 6 },
};
