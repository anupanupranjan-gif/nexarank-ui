// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useEffect, useState } from 'react';

const API_BASE = '/nexarank/api/v1';
const ADMIN_ROLES = ['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'];

// NR-120: self-service "my sessions" list/revoke, plus (for admins) a
// tenant-wide view of every active session. A session here is a refresh
// token — revoking it ends that device's ability to silently stay logged
// in; it doesn't necessarily kill an already-issued access token instantly
// (bounded by the access token's own short expiry, an accepted tradeoff).
export default function SessionsModal({ auth, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('mine'); // 'mine' | 'tenant'
  const isAdmin = ADMIN_ROLES.includes(auth.role);

  function authHeaders() {
    return { 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchSessions(); }, [scope]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const url = scope === 'tenant' ? `${API_BASE}/admin/sessions` : `${API_BASE}/auth/sessions`;
      const res = await fetch(url, { headers: authHeaders() });
      setSessions(res.ok ? await res.json() : []);
    } catch (e) { setSessions([]); }
    finally { setLoading(false); }
  }

  async function revoke(id) {
    const url = scope === 'tenant' ? `${API_BASE}/admin/sessions/${id}` : `${API_BASE}/auth/sessions/${id}`;
    await fetch(url, { method: 'DELETE', headers: authHeaders() });
    fetchSessions();
  }

  async function revokeAllMine() {
    if (!window.confirm('Sign out of every session on every device? You will need to log in again here too.')) return;
    await fetch(`${API_BASE}/auth/sessions`, { method: 'DELETE', headers: authHeaders() });
    onClose();
    window.location.reload();
  }

  const fmt = (iso) => iso ? new Date(iso).toLocaleString() : '—';

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.title}>Active Sessions</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {isAdmin && (
          <div style={s.scopeToggle}>
            <button style={{ ...s.scopeBtn, ...(scope === 'mine' ? s.scopeBtnActive : {}) }}
              onClick={() => setScope('mine')}>My Sessions</button>
            <button style={{ ...s.scopeBtn, ...(scope === 'tenant' ? s.scopeBtnActive : {}) }}
              onClick={() => setScope('tenant')}>All Tenant Sessions</button>
          </div>
        )}

        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={s.empty}>No active sessions</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {scope === 'tenant' && <th style={s.th}>User</th>}
                <th style={s.th}>Device</th>
                <th style={s.th}>IP</th>
                <th style={s.th}>Last Active</th>
                <th style={s.th}>Expires</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(sess => (
                <tr key={sess.id}>
                  {scope === 'tenant' && <td style={s.td}>{sess.userId}</td>}
                  <td style={s.td}>{sess.deviceInfo || '—'}</td>
                  <td style={s.td}>{sess.ipAddress || '—'}</td>
                  <td style={s.td}>{fmt(sess.lastUsedAt) !== '—' ? fmt(sess.lastUsedAt) : fmt(sess.issuedAt)}</td>
                  <td style={s.td}>{fmt(sess.expiresAt)}</td>
                  <td style={s.td}>
                    <button style={s.revokeBtn} onClick={() => revoke(sess.id)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {scope === 'mine' && sessions.length > 0 && (
          <button style={s.revokeAllBtn} onClick={revokeAllMine}>Sign out of all sessions</button>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:         { background: '#fff', borderRadius: 12, padding: 24, width: 640, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:         { fontSize: 17, fontWeight: 700, color: '#1a202c' },
  closeBtn:      { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#64748b' },
  scopeToggle:   { display: 'flex', gap: 6, marginBottom: 16 },
  scopeBtn:      { background: 'rgba(0,119,255,0.05)', border: '1px solid #e1e4e8', color: '#64748b', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  scopeBtnActive:{ background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.4)', color: '#0366d6' },
  empty:         { color: '#64748b', padding: 24, textAlign: 'center', fontSize: 13 },
  table:         { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:            { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e1e4e8' },
  td:            { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  revokeBtn:     { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  revokeAllBtn:  { marginTop: 16, background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, width: '100%' },
};
