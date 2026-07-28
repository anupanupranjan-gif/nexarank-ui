// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
// NR-85: NexaRank Experience Manager UI — content rules for page zones
// (hero banners, promo grids, etc). Same conventions as RulesConsole.js
// (self-contained page, DRAFT/PENDING_REVIEW/ACTIVE approval workflow).
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

const ZONES = ['HERO_BANNER', 'ANNOUNCEMENT_BAR', 'CATEGORY_BANNER', 'PROMO_GRID', 'CATEGORY_SPOTLIGHT', 'FEATURED_PRODUCTS'];
const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE'];

// Content rules target page context, not search facets — a different
// shape from TriggerConditionBuilder's facet_config-driven fields, so this
// is a small purpose-built condition editor rather than reusing that
// component verbatim.
const CONTEXT_FIELDS = ['pageType', 'category', 'query', 'customerSegment', 'deviceType'];

const PROMO_ITEM_COUNT = 4;

// NR-105: PROMO_GRID items live as flattened item1_*..item4_* keys inside the
// same flat contentPayload map (matching the item1_headline/item1_image_url/
// item1_cta_link convention NR-86 established in search-ui's HomePage.jsx —
// fits the existing column with no migration, and keeps the 4 live NR-86 demo
// rules working unmodified).
function emptyPromoItems() {
  const obj = {};
  for (let i = 1; i <= PROMO_ITEM_COUNT; i++) {
    obj[`item${i}_headline`] = '';
    obj[`item${i}_image_url`] = '';
    obj[`item${i}_cta_link`] = '';
  }
  return obj;
}

const emptyPayload = {
  headline: '', subheadline: '', image_url: '', cta_text: '', cta_link: '',
  background_color: '#f5f5f5', text_color: '#1a202c',
  ...emptyPromoItems(),
};

const emptyRule = {
  zone: 'HERO_BANNER', name: '', description: '', priority: 50,
  scheduleStart: '', scheduleEnd: '',
  contentPayload: { ...emptyPayload },
  triggerConditions: [],
};

export default function ContentManager({ auth }) {
  const [rules, setRules] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(emptyRule);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [historyRuleId, setHistoryRuleId] = useState(null);

  const canCreate = ['MERCHANDISER', 'APPROVER', 'ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(auth.role);
  const canApprove = ['APPROVER', 'ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(auth.role);
  const canDelete = canApprove;

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ size: '100' });
      if (zoneFilter) params.set('zone', zoneFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/content-rules?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to load content rules (${res.status})`);
      const page = await res.json();
      setRules(page.content || []);
      setTotalElements(page.totalElements ?? (page.content || []).length);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [zoneFilter, statusFilter]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  function toIso(local) {
    return local ? new Date(local).toISOString() : null;
  }
  function fromIso(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toRequestBody(f) {
    return {
      zone: f.zone,
      name: f.name,
      description: f.description,
      priority: Number(f.priority) || 50,
      scheduleStart: toIso(f.scheduleStart),
      scheduleEnd: toIso(f.scheduleEnd),
      contentPayload: f.contentPayload,
      triggerConditions: f.triggerConditions,
    };
  }

  async function createRule() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/content-rules`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setForm(emptyRule);
      await fetchRules();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      zone: rule.zone,
      name: rule.name || '',
      description: rule.description || '',
      priority: rule.priority,
      scheduleStart: fromIso(rule.scheduleStart),
      scheduleEnd: fromIso(rule.scheduleEnd),
      contentPayload: { ...emptyPayload, ...(rule.contentPayload || {}) },
      triggerConditions: rule.triggerConditions || [],
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyRule);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/content-rules/${editingId}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      cancelEdit();
      await fetchRules();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function doAction(id, action, body) {
    try {
      const res = await fetch(`${API_BASE}/content-rules/${id}/${action}`, {
        method: 'POST', headers: authHeaders(), body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`${action} failed (${res.status})`);
      await fetchRules();
    } catch (e) { setError(e.message); }
  }

  async function deleteRule(id) {
    if (!window.confirm('Delete this content rule?')) return;
    try {
      const res = await fetch(`${API_BASE}/content-rules/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await fetchRules();
    } catch (e) { setError(e.message); }
  }

  function updatePayload(key, value) {
    setForm(f => ({ ...f, contentPayload: { ...f.contentPayload, [key]: value } }));
  }

  function addCondition() {
    setForm(f => ({ ...f, triggerConditions: [...f.triggerConditions, { facetField: '', facetValues: [] }] }));
  }
  function removeCondition(idx) {
    setForm(f => ({ ...f, triggerConditions: f.triggerConditions.filter((_, i) => i !== idx) }));
  }
  function setConditionField(idx, field) {
    setForm(f => ({ ...f, triggerConditions: f.triggerConditions.map((c, i) => i === idx ? { ...c, facetField: field, facetValues: [] } : c) }));
  }
  function setConditionValues(idx, csv) {
    const values = csv.split(',').map(v => v.trim()).filter(Boolean);
    setForm(f => ({ ...f, triggerConditions: f.triggerConditions.map((c, i) => i === idx ? { ...c, facetValues: values } : c) }));
  }

  return (
    <div style={s.container}>
      {error && (
        <div style={s.errorBanner}>
          <span>⚠ {error}</span>
          <button style={s.errorDismiss} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {historyRuleId && (
        <ContentVersionDrawer ruleId={historyRuleId} authHeaders={authHeaders} onClose={() => setHistoryRuleId(null)} />
      )}

      {canCreate && (
        <div style={s.editorRow}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>{editingId ? '✎ Edit Content Rule' : '+ New Content Rule'}</div>
              <div style={s.cardHint}>{editingId ? 'Editing will re-submit for approval' : 'Rules are queued for approval before going live'}</div>
            </div>

            <div style={s.formGrid}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Zone</label>
                <select style={s.select} value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Name</label>
                <input style={s.input} placeholder="e.g. Summer Sale Hero" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Priority</label>
                <input style={s.input} type="number" value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })} />
                <span style={s.fieldHint}>Higher number wins when multiple rules match</span>
              </div>
              <div style={{ ...s.fieldGroup, flex: '100%' }}>
                <label style={s.fieldLabel}>Description</label>
                <input style={s.input} placeholder="Internal note" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Schedule Start</label>
                <input style={s.input} type="datetime-local" value={form.scheduleStart}
                  onChange={e => setForm({ ...form, scheduleStart: e.target.value })} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Schedule End</label>
                <input style={s.input} type="datetime-local" value={form.scheduleEnd}
                  onChange={e => setForm({ ...form, scheduleEnd: e.target.value })} />
              </div>
            </div>

            <div style={s.sectionLabel}>Content</div>
            {form.zone === 'PROMO_GRID' ? (
              <div style={s.promoItemsBox}>
                <div style={s.conditionsHint}>Up to {PROMO_ITEM_COUNT} items · leave a slot's Image URL and Headline blank to skip it</div>
                {Array.from({ length: PROMO_ITEM_COUNT }, (_, i) => i + 1).map(i => (
                  <div key={i} style={s.promoItemRow}>
                    <div style={s.promoItemBadge}>Item {i}</div>
                    <input style={{ ...s.input, flex: 1 }} placeholder="Image URL"
                      value={form.contentPayload[`item${i}_image_url`] || ''}
                      onChange={e => updatePayload(`item${i}_image_url`, e.target.value)} />
                    <input style={{ ...s.input, flex: 1 }} placeholder="Headline"
                      value={form.contentPayload[`item${i}_headline`] || ''}
                      onChange={e => updatePayload(`item${i}_headline`, e.target.value)} />
                    <input style={{ ...s.input, flex: 1 }} placeholder="CTA link (/category/x)"
                      value={form.contentPayload[`item${i}_cta_link`] || ''}
                      onChange={e => updatePayload(`item${i}_cta_link`, e.target.value)} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.formGrid}>
                <div style={{ ...s.fieldGroup, flex: '100%' }}>
                  <label style={s.fieldLabel}>Headline</label>
                  <input style={s.input} value={form.contentPayload.headline}
                    onChange={e => updatePayload('headline', e.target.value)} />
                </div>
                <div style={{ ...s.fieldGroup, flex: '100%' }}>
                  <label style={s.fieldLabel}>Subheadline</label>
                  <input style={s.input} value={form.contentPayload.subheadline}
                    onChange={e => updatePayload('subheadline', e.target.value)} />
                </div>
                <div style={{ ...s.fieldGroup, flex: '100%' }}>
                  <label style={s.fieldLabel}>Image URL</label>
                  <input style={s.input} placeholder="https://..." value={form.contentPayload.image_url}
                    onChange={e => updatePayload('image_url', e.target.value)} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.fieldLabel}>CTA Text</label>
                  <input style={s.input} value={form.contentPayload.cta_text}
                    onChange={e => updatePayload('cta_text', e.target.value)} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.fieldLabel}>CTA Link</label>
                  <input style={s.input} placeholder="/sale/summer" value={form.contentPayload.cta_link}
                    onChange={e => updatePayload('cta_link', e.target.value)} />
                </div>
              </div>
            )}
            <div style={s.formGrid}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Background Color</label>
                <div style={s.colorRow}>
                  <input type="color" style={s.colorSwatch} value={form.contentPayload.background_color}
                    onChange={e => updatePayload('background_color', e.target.value)} />
                  <input style={s.input} value={form.contentPayload.background_color}
                    onChange={e => updatePayload('background_color', e.target.value)} />
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Text Color</label>
                <div style={s.colorRow}>
                  <input type="color" style={s.colorSwatch} value={form.contentPayload.text_color}
                    onChange={e => updatePayload('text_color', e.target.value)} />
                  <input style={s.input} value={form.contentPayload.text_color}
                    onChange={e => updatePayload('text_color', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={s.sectionLabel}>Trigger Conditions</div>
            <div style={s.conditionsBox}>
              <div style={s.conditionsHint}>AND between conditions · OR between values (comma-separated)</div>
              {form.triggerConditions.length === 0 && (
                <div style={s.emptyHintSmall}>No conditions — rule fires on every page matching this zone</div>
              )}
              {form.triggerConditions.map((c, idx) => (
                <div key={idx} style={s.conditionRow}>
                  {idx > 0 && <div style={s.andBadge}>AND</div>}
                  <select style={{ ...s.select, width: 160 }} value={c.facetField}
                    onChange={e => setConditionField(idx, e.target.value)}>
                    <option value="">Select field…</option>
                    {CONTEXT_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input style={{ ...s.input, flex: 1 }} placeholder="homepage, category-page"
                    value={c.facetValues.join(', ')}
                    onChange={e => setConditionValues(idx, e.target.value)} />
                  <button style={s.removeBtn} onClick={() => removeCondition(idx)}>×</button>
                </div>
              ))}
              <button style={s.addBtn} onClick={addCondition}>+ Add Condition</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} disabled={saving}
                onClick={editingId ? saveEdit : createRule}>
                {saving ? 'Saving…' : editingId ? '✓ Save Changes' : '+ Create Content Rule'}
              </button>
              {editingId && (
                <button style={{ ...s.btn, background: '#f1f5f9', color: '#475569', boxShadow: 'none' }} onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={s.previewCard}>
            <div style={s.cardHeader}><div style={s.cardTitle}>Preview</div></div>
            <BannerPreview zone={form.zone} payload={form.contentPayload} />
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.cardTitle}>Content Rules <span style={s.countBadge}>{totalElements}</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select style={s.select} value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
              <option value="">All zones</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            <button style={s.refreshBtn} onClick={fetchRules}>↻ Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={s.loadingRow}>Loading content rules…</div>
        ) : rules.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>🖼</div>
            <div style={s.emptyTitle}>No content rules yet</div>
            <div style={s.emptyHint}>Create your first zone banner above</div>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{['Zone', 'Name', 'Priority', 'Status', 'Schedule', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => (
                  <tr key={rule.id} style={{ ...s.tr, ...(i % 2 === 0 ? s.trEven : {}) }}>
                    <td style={s.td}><span style={s.zoneBadge}>{rule.zone}</span></td>
                    <td style={s.td}>{rule.name}</td>
                    <td style={s.td}>{rule.priority}</td>
                    <td style={s.td}><span style={{ ...s.statusBadge, ...statusColor(rule.status) }}>{rule.status}</span></td>
                    <td style={{ ...s.td, ...s.scheduleText }}>
                      {rule.scheduleStart ? `▶ ${new Date(rule.scheduleStart).toLocaleDateString()}` : ''}
                      {rule.scheduleStart && rule.scheduleEnd ? ' · ' : ''}
                      {rule.scheduleEnd ? `■ ${new Date(rule.scheduleEnd).toLocaleDateString()}` : ''}
                      {!rule.scheduleStart && !rule.scheduleEnd ? '—' : ''}
                    </td>
                    <td style={s.td}>
                      <div style={s.actionGroup}>
                        {canCreate && (
                          <button style={s.actionBtn} onClick={() => startEdit(rule)} title="Edit">✎</button>
                        )}
                        {canCreate && rule.status === 'DRAFT' && (
                          <button style={{ ...s.actionBtn, ...s.actionApprove }} onClick={() => doAction(rule.id, 'submit')} title="Submit for review">➤</button>
                        )}
                        {canApprove && rule.status === 'PENDING_REVIEW' && <>
                          <button style={{ ...s.actionBtn, ...s.actionApprove }} onClick={() => doAction(rule.id, 'approve', { comment: '' })} title="Approve">✓</button>
                          <button style={{ ...s.actionBtn, ...s.actionReject }} onClick={() => {
                            const comment = window.prompt('Rejection reason (optional):') || '';
                            doAction(rule.id, 'reject', { comment });
                          }} title="Reject">✕</button>
                        </>}
                        <button style={s.actionBtn} onClick={() => setHistoryRuleId(rule.id)} title="Version history">⏱</button>
                        {canDelete && (
                          <button style={{ ...s.actionBtn, ...s.actionDelete }} onClick={() => deleteRule(rule.id)} title="Delete">⌫</button>
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
    </div>
  );
}

// ── Live preview ────────────────────────────────────────────────────────────

// NR-105: mirrors search-ui/src/pages/HomePage.jsx's parsePromoItems — same
// item{i}_image_url/item{i}_headline/item{i}_cta_link convention, item kept
// only if it has an image or headline.
function parsePromoItems(payload) {
  const items = [];
  for (let i = 1; i <= PROMO_ITEM_COUNT; i++) {
    const imageUrl = payload[`item${i}_image_url`];
    const headline = payload[`item${i}_headline`];
    const ctaLink = payload[`item${i}_cta_link`];
    if (imageUrl || headline) items.push({ imageUrl, headline, ctaLink });
  }
  return items;
}

function BannerPreview({ zone, payload }) {
  const bg = payload.background_color || '#f5f5f5';
  const fg = payload.text_color || '#1a202c';
  const isBar = zone === 'ANNOUNCEMENT_BAR';

  if (zone === 'PROMO_GRID') {
    const items = parsePromoItems(payload);
    return items.length === 0 ? (
      <div style={p.promoEmpty}>No items yet — fill in Item 1 above to see a preview</div>
    ) : (
      <div style={p.promoStrip}>
        {items.map((item, i) => (
          <div key={i} style={p.promoCard}>
            {item.imageUrl && <div style={{ ...p.promoImg, backgroundImage: `url(${item.imageUrl})` }} />}
            {item.headline && <div style={p.promoHeadline}>{item.headline}</div>}
            {item.ctaLink && <div style={p.promoCtaLink}>{item.ctaLink} →</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      ...p.frame,
      background: bg, color: fg,
      minHeight: isBar ? 44 : 180,
      backgroundImage: !isBar && payload.image_url ? `url(${payload.image_url})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      <div style={p.overlay}>
        {isBar ? (
          <div style={p.barContent}>
            <span>{payload.headline || 'Announcement text'}</span>
            {payload.cta_text && <span style={p.ctaBar}>{payload.cta_text} →</span>}
          </div>
        ) : (
          <>
            {payload.headline && <div style={p.headline}>{payload.headline}</div>}
            {payload.subheadline && <div style={p.subheadline}>{payload.subheadline}</div>}
            {payload.cta_text && <button style={{ ...p.ctaBtn, color: bg, background: fg }}>{payload.cta_text}</button>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Version history (list only — no diff/rollback; backend NR-84 only
// exposes GET .../versions, unlike MerchRule's snapshot-by-version +
// rollback endpoints) ────────────────────────────────────────────────────

function ContentVersionDrawer({ ruleId, authHeaders, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/content-rules/${ruleId}/versions`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [ruleId]);

  return (
    <>
      <div style={d.backdrop} onClick={onClose} />
      <div style={d.drawer}>
        <div style={d.header}>
          <div style={d.title}>⏱ Version History</div>
          <button style={d.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={d.body}>
          {loading ? <div style={s.loadingRow}>Loading…</div> : history.length === 0 ? (
            <div style={s.emptyHintSmall}>No versions yet.</div>
          ) : history.map(v => (
            <div key={v.versionNumber} style={d.versionCard}>
              <span style={d.versionBadge}>v{v.versionNumber}</span>
              <span style={d.versionNote}>{v.changeNote || '—'}</span>
              <span style={d.versionMeta}>{v.changedBy} · {new Date(v.changedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function statusColor(status) {
  return {
    DRAFT: { background: 'rgba(0,180,255,0.1)', color: '#00b4ff', border: '1px solid rgba(0,180,255,0.3)' },
    PENDING_REVIEW: { background: 'rgba(255,171,0,0.12)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)' },
    ACTIVE: { background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.3)' },
    INACTIVE: { background: 'rgba(107,140,186,0.1)', color: '#4a5568', border: '1px solid #e1e4e8' },
  }[status] || { background: 'rgba(255,255,255,0.05)', color: '#4a5568' };
}

const s = {
  container: { display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'DM Mono', 'JetBrains Mono', monospace" },
  editorRow: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  card: { flex: 2, background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20 },
  previewCard: { flex: 1, background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, position: 'sticky', top: 20 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8 },
  cardHint: { fontSize: 11, color: '#64748b' },
  formGrid: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px', minWidth: 160 },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' },
  fieldHint: { fontSize: 10, color: '#94a3b8' },
  input: { background: '#fff', border: '1px solid #e1e4e8', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  select: { background: '#fff', border: '1px solid #e1e4e8', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: '#1a202c', outline: 'none', fontFamily: 'inherit' },
  colorRow: { display: 'flex', gap: 8, alignItems: 'center' },
  colorSwatch: { width: 36, height: 34, padding: 2, border: '1px solid #e1e4e8', borderRadius: 6, cursor: 'pointer' },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: 16, marginBottom: 8 },
  conditionsBox: { border: '1px solid #e1e4e8', borderRadius: 8, padding: '12px 14px', background: '#f8f9fa' },
  conditionsHint: { fontSize: 10, color: '#4a5568', marginBottom: 8 },
  promoItemsBox: { border: '1px solid #e1e4e8', borderRadius: 8, padding: '12px 14px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 },
  promoItemRow: { display: 'flex', alignItems: 'center', gap: 8 },
  promoItemBadge: { background: '#e8f0fe', color: '#0366d6', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, minWidth: 44, textAlign: 'center' },
  conditionRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  andBadge: { background: '#e8f0fe', color: '#0366d6', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 },
  removeBtn: { background: 'none', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 5, padding: '4px 8px', fontSize: 13, cursor: 'pointer' },
  addBtn: { background: '#f0f6fc', border: '1px solid #c8e1ff', color: '#0366d6', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  emptyHintSmall: { color: '#94a3b8', fontSize: 12 },
  btn: { background: '#0366d6', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  countBadge: { background: '#e8f0fe', color: '#0366d6', fontSize: 11, padding: '2px 8px', borderRadius: 999 },
  refreshBtn: { background: 'none', border: '1px solid #e1e4e8', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#4a5568', cursor: 'pointer' },
  loadingRow: { padding: 20, color: '#64748b', fontSize: 13 },
  emptyState: { padding: '40px 20px', textAlign: 'center' },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: 700, color: '#1a202c' },
  emptyHint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #e1e4e8' },
  tr: {},
  trEven: { background: '#f8f9fa' },
  td: { padding: '10px 12px', fontSize: 13, color: '#1a202c', borderBottom: '1px solid #f1f3f5' },
  zoneBadge: { background: '#f1f5f9', color: '#475569', fontSize: 11, padding: '2px 8px', borderRadius: 4 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  scheduleText: { fontSize: 11, color: '#64748b' },
  actionGroup: { display: 'flex', gap: 4 },
  actionBtn: { background: 'none', border: '1px solid #e1e4e8', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer', color: '#4a5568' },
  actionApprove: { borderColor: '#00e676', color: '#00a854' },
  actionReject: { borderColor: '#ff6b6b', color: '#c0392b' },
  actionDelete: { borderColor: '#ff6b6b', color: '#c0392b' },
  errorBanner: { background: '#fff5f5', border: '1px solid #ff6b6b', color: '#c0392b', padding: '10px 14px', borderRadius: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between' },
  errorDismiss: { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13 },
};

const p = {
  frame: { borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  overlay: { padding: 20, textAlign: 'center', width: '100%' },
  headline: { fontSize: 20, fontWeight: 800, marginBottom: 6 },
  subheadline: { fontSize: 13, opacity: 0.85, marginBottom: 12 },
  ctaBtn: { border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'default' },
  barContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 13, fontWeight: 600 },
  ctaBar: { fontSize: 12, fontWeight: 700, textDecoration: 'underline' },
  promoStrip: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 },
  promoCard: { flex: '0 0 140px', border: '1px solid #e1e4e8', borderRadius: 8, overflow: 'hidden', background: '#fff' },
  promoImg: { height: 90, backgroundSize: 'cover', backgroundPosition: 'center', background: '#f1f5f9' },
  promoHeadline: { fontSize: 12, fontWeight: 700, color: '#1a202c', padding: '8px 8px 2px' },
  promoCtaLink: { fontSize: 10, color: '#0366d6', padding: '0 8px 8px' },
  promoEmpty: { color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '30px 10px' },
};

const d = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 },
  drawer: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#f1f3f5', borderLeft: '1px solid #e1e4e8', zIndex: 50, display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #e1e4e8' },
  title: { fontSize: 14, fontWeight: 700, color: '#1a202c' },
  closeBtn: { background: 'none', border: '1px solid #e1e4e8', borderRadius: 6, color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '4px 8px' },
  body: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  versionCard: { background: '#fff', border: '1px solid #e1e4e8', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  versionBadge: { background: '#0366d6', color: '#fff', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 999, alignSelf: 'flex-start' },
  versionNote: { fontSize: 13, color: '#1a202c' },
  versionMeta: { fontSize: 11, color: '#64748b' },
};
