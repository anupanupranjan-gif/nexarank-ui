// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

/**
 * NR-70: two-tier audit log.
 *
 * Tier 1 (Rule Changes) is project-scoped rule-change history for MERCHANDISER
 * and above. Tier 2 (Full Audit Log / API Access / Auth Failures) is ADMIN-only
 * security-posture data.
 *
 * The tiers are separate tabs backed by separate endpoints with separate role
 * matchers — not one dataset with rows filtered out by role after the fact.
 * `mode="tier1"` renders only the Tier 1 view, for the merchandiser-facing
 * "Rule History" nav entry.
 */
export default function AuditLog({ auth, mode = 'full' }) {
  const isAdmin = ['ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(auth.role);
  const showTier2 = mode === 'full' && isAdmin;

  const TABS = showTier2
    ? [
        { key: 'rule-changes', label: 'Rule Changes' },
        { key: 'full',         label: 'Full Audit Log' },
        { key: 'api-access',   label: 'API Access' },
        { key: 'auth-failures',label: 'Auth Failures' },
      ]
    : [{ key: 'rule-changes', label: 'Rule Changes' }];

  const [tab, setTab]                 = useState('rule-changes');
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalEls]  = useState(0);
  const [actions, setActions]         = useState([]);
  const [expanded, setExpanded]       = useState({});

  // Filters
  const [actor, setActor]         = useState('');
  const [action, setAction]       = useState('');
  const [days, setDays]           = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [useRange, setUseRange]   = useState(false);

  const authHeaders = useCallback(
    () => ({ 'Authorization': `Bearer ${auth.token}` }), [auth.token]);

  function filterQuery() {
    const p = new URLSearchParams();
    if (actor) p.set('actor', actor);
    if (action) p.set('action', action);
    if (useRange && startDate && endDate) {
      p.set('startDate', startDate);
      p.set('endDate', endDate);
    } else {
      p.set('days', String(days));
    }
    return p.toString();
  }

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let url;
      if (tab === 'rule-changes')      url = `${API_BASE}/audit/rule-changes?page=${page}&size=25&${filterQuery()}`;
      else if (tab === 'full')         url = `${API_BASE}/audit/full?page=${page}&size=25&${filterQuery()}`;
      else if (tab === 'api-access')   url = `${API_BASE}/audit/api-access?page=${page}&size=25`;
      else                             url = `${API_BASE}/audit/auth-failures?page=${page}&size=25`;

      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) { setRows([]); setTotalPages(0); setTotalEls(0); return; }
      const data = await res.json();
      setRows(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalEls(data.totalElements ?? 0);
      if (data.actions) setActions(data.actions);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, actor, action, days, startDate, endDate, useRange, authHeaders]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(0); setExpanded({}); }, [tab]);

  async function exportCsv() {
    const path = tab === 'rule-changes' ? 'rule-changes/export.csv'
               : tab === 'full'         ? 'full/export.csv'
               : `api-access/export.csv?type=${tab === 'auth-failures' ? 'AUTH_FAILURE' : 'API_ACCESS'}&`;
    const joiner = path.includes('?') ? '' : '?';
    try {
      const res = await fetch(`${API_BASE}/audit/${path}${joiner}${filterQuery()}`,
        { headers: authHeaders() });
      if (!res.ok) { alert('Export failed'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nexarank-audit-${tab}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  function actionColor(a) {
    if (!a) return '#64748b';
    if (a.includes('CREATED'))   return '#16a34a';
    if (a.includes('APPROVED') || a.includes('PROMOTED')) return '#2563eb';
    if (a.includes('REJECTED') || a.includes('DELETED') || a.includes('FAILURE')) return '#dc2626';
    if (a.includes('DEMOTED'))   return '#d97706';
    return '#64748b';
  }

  const fmt = t => (t ? new Date(t).toLocaleString() : '—');

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{mode === 'tier1' ? 'Rule Change History' : 'Audit Log'}</div>
          <div style={s.subtitle}>
            {tab === 'rule-changes'
              ? 'Every rule state change in the project(s) you have access to, with the exact fields that changed.'
              : tab === 'full'
              ? 'Complete tenant-wide audit trail across every entity type.'
              : tab === 'api-access'
              ? 'API access records: endpoint, parameters, response code and latency.'
              : 'Failed authentication attempts, with source IP and timestamp.'}
          </div>
        </div>
        <button style={s.exportBtn} onClick={exportCsv}>⬇ Export CSV</button>
      </div>

      {TABS.length > 1 && (
        <div style={s.tabNav}>
          {TABS.map(t => (
            <button key={t.key}
              style={{ ...s.tabBtn, ...(tab === t.key ? s.tabBtnActive : {}) }}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Filters — only the event-log tabs support actor/action/date filtering */}
      {(tab === 'rule-changes' || tab === 'full') && (
        <div style={s.filters}>
          <input style={s.input} placeholder="Filter by actor…"
                 value={actor} onChange={e => { setActor(e.target.value); setPage(0); }} />
          <select style={s.select} value={action}
                  onChange={e => { setAction(e.target.value); setPage(0); }}>
            <option value="">All actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {!useRange ? (
            <select style={s.select} value={days}
                    onChange={e => { setDays(Number(e.target.value)); setPage(0); }}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          ) : (
            <>
              <input style={s.input} type="date" value={startDate}
                     onChange={e => { setStartDate(e.target.value); setPage(0); }} />
              <input style={s.input} type="date" value={endDate}
                     onChange={e => { setEndDate(e.target.value); setPage(0); }} />
            </>
          )}
          <button style={s.linkBtn} onClick={() => setUseRange(v => !v)}>
            {useRange ? 'Use preset range' : 'Custom range'}
          </button>
          <div style={s.count}>{totalElements} events</div>
        </div>
      )}

      {loading ? (
        <div style={s.loading}>Loading audit records…</div>
      ) : rows.length === 0 ? (
        <div style={s.empty}>No audit records for this filter.</div>
      ) : tab === 'rule-changes' ? (
        <RuleChangeTable rows={rows} expanded={expanded} setExpanded={setExpanded}
                         actionColor={actionColor} fmt={fmt} />
      ) : tab === 'full' ? (
        <FullAuditTable rows={rows} actionColor={actionColor} fmt={fmt} />
      ) : (
        <AccessTable rows={rows} fmt={fmt} isAuthFailures={tab === 'auth-failures'} />
      )}

      {totalPages > 1 && (
        <div style={s.pager}>
          <button style={s.pageBtn} disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button style={s.pageBtn} disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

/** Tier 1 — the field-level diff is the point of this view, so it renders inline. */
function RuleChangeTable({ rows, expanded, setExpanded, actionColor, fmt }) {
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>When</th>
          <th style={s.th}>Actor</th>
          <th style={s.th}>Action</th>
          <th style={s.th}>Rule</th>
          <th style={s.th}>State</th>
          <th style={s.th}>Changes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const open = !!expanded[r.id];
          const changes = r.changes || [];
          return (
            <React.Fragment key={r.id}>
              <tr style={s.tr}>
                <td style={s.td}>{fmt(r.timestamp)}</td>
                <td style={s.td}><strong>{r.actor || '—'}</strong></td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: actionColor(r.action) }}>{r.action}</span>
                </td>
                <td style={s.td}>
                  <div style={s.ruleName}>{r.ruleName || '—'}</div>
                  <div style={s.ruleId}>{r.ruleId}</div>
                </td>
                <td style={s.td}>
                  {r.previousState || r.newState ? (
                    <span style={s.state}>
                      {r.previousState || '—'} <span style={s.arrow}>→</span> {r.newState || '—'}
                    </span>
                  ) : '—'}
                </td>
                <td style={s.td}>
                  {changes.length === 0 ? (
                    <span style={s.muted}>No field changes</span>
                  ) : (
                    <button style={s.linkBtn}
                            onClick={() => setExpanded(p => ({ ...p, [r.id]: !open }))}>
                      {open ? '▾' : '▸'} {changes.length} field{changes.length === 1 ? '' : 's'} changed
                    </button>
                  )}
                  {r.reason && <div style={s.reason}>“{r.reason}”</div>}
                </td>
              </tr>
              {open && changes.length > 0 && (
                <tr>
                  <td style={s.diffCell} colSpan={6}>
                    {changes.map((c, i) => (
                      <div key={i} style={s.diffRow}>
                        <span style={s.diffField}>{c.label || c.field}</span>
                        <span style={s.oldVal}>{c.oldValue}</span>
                        <span style={s.arrow}>→</span>
                        <span style={s.newVal}>{c.newValue}</span>
                      </div>
                    ))}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

/** Tier 2 — every entity type, so the shape is generic rather than rule-specific. */
function FullAuditTable({ rows, actionColor, fmt }) {
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>When</th>
          <th style={s.th}>Tier</th>
          <th style={s.th}>Actor</th>
          <th style={s.th}>Action</th>
          <th style={s.th}>Entity</th>
          <th style={s.th}>Details</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} style={s.tr}>
            <td style={s.td}>{fmt(r.createdAt)}</td>
            <td style={s.td}>
              <span style={{ ...s.tierBadge, background: r.tier === 1 ? '#e0e7ff' : '#fef3c7',
                             color: r.tier === 1 ? '#3730a3' : '#92400e' }}>
                T{r.tier}
              </span>
            </td>
            <td style={s.td}><strong>{r.username || '—'}</strong></td>
            <td style={s.td}>
              <span style={{ ...s.badge, background: actionColor(r.action) }}>{r.action}</span>
            </td>
            <td style={s.td}>
              <div style={s.ruleName}>{r.entityName || r.entity || '—'}</div>
              <div style={s.ruleId}>{r.entityId || ''}</div>
            </td>
            <td style={s.td}>
              {r.details || <span style={s.muted}>—</span>}
              {r.reason && <div style={s.reason}>“{r.reason}”</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tier 2 — API access log and failed authentication share one shape. */
function AccessTable({ rows, fmt, isAuthFailures }) {
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>When</th>
          <th style={s.th}>User</th>
          <th style={s.th}>Endpoint</th>
          {!isAuthFailures && <th style={s.th}>Method</th>}
          <th style={s.th}>{isAuthFailures ? 'Detail' : 'Params'}</th>
          <th style={s.th}>Status</th>
          {!isAuthFailures && <th style={s.th}>Latency</th>}
          <th style={s.th}>IP</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} style={s.tr}>
            <td style={s.td}>{fmt(r.createdAt)}</td>
            <td style={s.td}><strong>{r.username || 'anonymous'}</strong></td>
            <td style={s.tdMono}>{r.endpoint}</td>
            {!isAuthFailures && <td style={s.td}>{r.httpMethod}</td>}
            <td style={s.tdMono}>{r.params || <span style={s.muted}>—</span>}</td>
            <td style={s.td}>
              <span style={{ ...s.badge,
                background: r.responseCode >= 400 ? '#dc2626'
                          : r.responseCode >= 300 ? '#d97706' : '#16a34a' }}>
                {r.responseCode ?? '—'}
              </span>
            </td>
            {!isAuthFailures && <td style={s.td}>{r.latencyMs != null ? `${r.latencyMs} ms` : '—'}</td>}
            <td style={s.tdMono}>{r.ipAddress || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const s = {
  container:   { padding: '24px', fontFamily: 'sans-serif' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:       { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  subtitle:    { fontSize: '13px', color: '#4a5568', marginTop: '4px', lineHeight: '1.5', maxWidth: '760px' },
  exportBtn:   { padding: '9px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' },
  tabNav:      { display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '2px solid #e2e8f0' },
  tabBtn:      { padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabBtnActive:{ color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600 },
  filters:     { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  input:       { padding: '8px 11px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#0f172a', background: 'white' },
  select:      { padding: '8px 11px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#1e293b', background: 'white' },
  count:       { marginLeft: 'auto', fontSize: '13px', color: '#475569', fontWeight: 600 },
  loading:     { padding: '40px', textAlign: 'center', color: '#4a5568' },
  empty:       { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '14px', background: '#f8fafc', borderRadius: '8px' },
  table:       { width: '100%', borderCollapse: 'collapse', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  th:          { textAlign: 'left', padding: '11px 14px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr:          { borderBottom: '1px solid #f1f5f9' },
  td:          { padding: '11px 14px', fontSize: '13px', color: '#1e293b', verticalAlign: 'top' },
  tdMono:      { padding: '11px 14px', fontSize: '12px', color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '280px', verticalAlign: 'top' },
  badge:       { display: 'inline-block', padding: '3px 8px', borderRadius: '5px', color: 'white', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px' },
  tierBadge:   { display: 'inline-block', padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700 },
  ruleName:    { fontWeight: 600, color: '#0f172a' },
  ruleId:      { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' },
  state:       { fontSize: '12px', color: '#334155', fontWeight: 600 },
  arrow:       { color: '#94a3b8', margin: '0 4px' },
  muted:       { color: '#94a3b8' },
  reason:      { fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' },
  linkBtn:     { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '13px', padding: 0, fontWeight: 600 },
  diffCell:    { padding: '12px 14px 14px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  diffRow:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0', fontFamily: 'monospace' },
  diffField:   { minWidth: '150px', fontWeight: 700, color: '#0f172a', fontFamily: 'sans-serif' },
  oldVal:      { padding: '2px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' },
  newVal:      { padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: '4px' },
  pager:       { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', marginTop: '18px' },
  pageBtn:     { padding: '7px 14px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155' },
  pageInfo:    { fontSize: '13px', color: '#475569' },
};
