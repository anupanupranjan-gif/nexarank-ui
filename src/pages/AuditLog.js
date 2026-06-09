// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

export default function AuditLog({ auth }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [projectOnly, setProjectOnly] = useState(false);

  function authHeaders() {
    return { 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchAuditLog(); }, [page, projectOnly]);

  async function fetchAuditLog() {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/audit?page=${page}&size=20&projectOnly=${projectOnly}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setEvents(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (e) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  function actionColor(action) {
    if (action.includes('CREATED')) return '#22c55e';
    if (action.includes('APPROVED')) return '#3b82f6';
    if (action.includes('REJECTED')) return '#ef4444';
    if (action.includes('DELETED')) return '#f97316';
    if (action.includes('UPDATED') || action.includes('SAVED')) return '#a855f7';
    return '#94a3b8';
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Audit Log</div>
          <div style={s.subtitle}>{totalElements} events recorded — every action is tracked</div>
        </div>
        <div style={s.controls}>
          <label style={s.toggle}>
            <input type="checkbox" checked={projectOnly}
              onChange={e => { setProjectOnly(e.target.checked); setPage(0); }} />
            <span style={{ marginLeft: 6, color: '#94b4d4', fontSize: 13 }}>This project only</span>
          </label>
          <button style={s.refreshBtn} onClick={() => fetchAuditLog()}>↻ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={s.loading}>Loading audit events...</div>
      ) : events.length === 0 ? (
        <div style={s.empty}>No audit events found.</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Timestamp','Action','Entity','Entity ID','User','Project'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                  <td style={s.td}>
                    <span style={s.timestamp}>
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.actionBadge, background: actionColor(e.action) }}>
                      {e.action}
                    </span>
                  </td>
                  <td style={s.td}><span style={s.entity}>{e.entity || '—'}</span></td>
                  <td style={s.td}>
                    <span style={s.entityId}>
                      {e.entityId ? e.entityId.substring(0, 8) + '...' : '—'}
                    </span>
                  </td>
                  <td style={s.td}><span style={s.username}>{e.username || '—'}</span></td>
                  <td style={s.td}><span style={s.project}>{e.projectId || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button style={s.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { padding: '28px 32px', minHeight: '100vh', background: 'transparent' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:      { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  subtitle:   { fontSize: 13, color: '#94b4d4' },
  controls:   { display: 'flex', alignItems: 'center', gap: 12 },
  toggle:     { display: 'flex', alignItems: 'center', cursor: 'pointer' },
  refreshBtn: { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.3)', color: '#94b4d4', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  loading:    { color: '#94b4d4', padding: 40, textAlign: 'center' },
  empty:      { color: '#64748b', padding: 40, textAlign: 'center' },
  tableWrap:  { background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(0,119,255,0.15)', overflow: 'hidden' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94b4d4', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,119,255,0.15)', background: 'rgba(0,0,0,0.2)' },
  td:         { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle', color: '#e2e8f0' },
  trEven:     { background: 'rgba(255,255,255,0.02)' },
  trOdd:      { background: 'transparent' },
  timestamp:  { fontSize: 12, color: '#94b4d4', fontFamily: 'monospace' },
  actionBadge:{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff' },
  entity:     { fontSize: 13, color: '#e2e8f0' },
  entityId:   { fontSize: 11, fontFamily: 'monospace', color: '#64748b' },
  username:   { fontSize: 13, color: '#94b4d4', fontWeight: 600 },
  project:    { fontSize: 12, color: '#64748b' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  pageBtn:    { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.3)', color: '#94b4d4', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  pageInfo:   { color: '#94b4d4', fontSize: 13 },
};
