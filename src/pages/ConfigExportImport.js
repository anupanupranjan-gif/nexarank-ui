// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useRef } from 'react';

const API_BASE = '/nexarank/api/v1';

const CATEGORY_LABELS = {
  rules: 'Rules',
  contentRules: 'Content Rules',
  facets: 'Facets',
  approvalSettings: 'Approval Settings',
  abTests: 'A/B Tests',
  judgmentSets: 'Quality Curation judgment sets',
  suggestionConfig: 'Quality Curation suggestion config',
};

// NR-166's two preconditions, each with its own Configuration screen — used
// to turn a blocked-import error into an actionable link rather than just text.
const GATE_TARGETS = [
  { match: /engine config/i, label: 'Engine Config', tab: 'engine-config' },
  { match: /llm config/i, label: 'LLM Config', tab: 'llm-config' },
];

export default function ConfigExportImport({ auth, onNavigate }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  function authHeaders() {
    return { 'Authorization': `Bearer ${auth.token}` };
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`${API_BASE}/config-export`, { headers: authHeaders() });
      if (!res.ok) {
        setExportError('Export failed (HTTP ' + res.status + ')');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexarank-config-export.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  function handleFileChange(e) {
    setFile(e.target.files?.[0] || null);
    setImportError(null);
    setImportSummary(null);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/config-import`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type — browser sets the multipart boundary
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (res.status === 412) {
        setImportError({ kind: 'gate', message: data?.message || 'Import blocked.' });
      } else if (!res.ok) {
        setImportError({ kind: 'generic', message: data?.message || ('Import failed (HTTP ' + res.status + ')') });
      } else {
        setImportSummary(data);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (e) {
      setImportError({ kind: 'generic', message: 'Import failed: ' + e.message });
    } finally {
      setImporting(false);
    }
  }

  function gateLinksFor(message) {
    return GATE_TARGETS.filter(t => t.match.test(message));
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>Configuration Export / Import</div>
        <div style={s.subtitle}>
          Move rules, content rules, facets, approval settings, A/B tests, and quality
          curation config between environments — a staging/prod pair, or restoring
          after an incident. Export downloads a ZIP; import applies it here.
        </div>
      </div>

      {/* Export */}
      <div style={s.card}>
        <div style={s.cardTitle}>Export</div>
        <div style={s.cardHint}>
          Downloads the current project's LIVE rules, active content rules, facets,
          approval settings, running A/B tests, and quality curation config as a ZIP
          (one JSON file per category). Users, engine config, and LLM config are never
          included — those are environment-specific and excluded by design.
        </div>
        {exportError && <div style={s.errorMsg}>{exportError}</div>}
        <button
          style={{ ...s.btn, ...s.btnPrimary, opacity: exporting ? 0.6 : 1 }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '⟳ Exporting...' : '⬇ Export Configuration'}
        </button>
      </div>

      {/* Import */}
      <div style={s.card}>
        <div style={s.cardTitle}>Import</div>
        <div style={s.cardHint}>
          Blocked entirely unless this project already has a working Engine Config and
          LLM Config — set those up first if you haven't. Import never overwrites or
          deletes existing data: matching items (by original id, on a repeat import of
          the same bundle) get a new version; everything else is added fresh. Imported
          rules/content rules land APPROVED — auto-publish will take them straight to
          LIVE if this project has it on, otherwise they're one manual promote away
          from serving traffic, the same as any other approved rule.
        </div>

        <div style={s.fileRow}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            style={s.fileInput}
          />
          <button
            style={{ ...s.btn, ...s.btnPrimary, opacity: (!file || importing) ? 0.6 : 1 }}
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? '⟳ Importing...' : '⬆ Import Configuration'}
          </button>
        </div>

        {importError?.kind === 'gate' && (
          <div style={s.errorMsg}>
            <div>{importError.message}</div>
            <div style={s.gateLinks}>
              {gateLinksFor(importError.message).map(t => (
                <button key={t.tab} style={s.linkBtn} onClick={() => onNavigate?.(t.tab)}>
                  Go to {t.label} →
                </button>
              ))}
            </div>
          </div>
        )}
        {importError?.kind === 'generic' && (
          <div style={s.errorMsg}>{importError.message}</div>
        )}

        {importSummary && (
          <div style={s.summaryBox}>
            <div style={s.summaryTitle}>✓ Import complete</div>
            <ul style={s.summaryList}>
              {Object.entries(importSummary.imported || {}).map(([key, count]) => (
                <li key={key} style={s.summaryItem}>
                  {CATEGORY_LABELS[key] || key}: {count} imported
                  {importSummary.idCollisionsResolved?.[key]
                    ? ` (${importSummary.idCollisionsResolved[key]} assigned a new id — same id already existed in a different project)`
                    : ''}
                </li>
              ))}
            </ul>
            {importSummary.warnings?.length > 0 && (
              <div style={s.warnings}>
                {importSummary.warnings.map((w, i) => <div key={i} style={s.warningItem}>⚠ {w}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container:    { padding: '24px', fontFamily: 'sans-serif', maxWidth: '900px' },
  header:       { marginBottom: '20px' },
  title:        { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  subtitle:     { fontSize: '13px', color: '#4a5568', marginTop: '4px', lineHeight: '1.5' },
  card:         { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  cardTitle:    { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' },
  cardHint:     { fontSize: '13px', color: '#334155', lineHeight: '1.6', marginBottom: '16px' },
  fileRow:      { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  fileInput:    { fontSize: '13px' },
  btn:          { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' },
  btnPrimary:   { background: '#4f46e5', color: 'white' },
  errorMsg:     { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginTop: '12px', fontSize: '13px' },
  gateLinks:    { display: 'flex', gap: '10px', marginTop: '8px' },
  linkBtn:      { background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 },
  summaryBox:   { marginTop: '16px', padding: '16px 20px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' },
  summaryTitle: { fontSize: '14px', fontWeight: 700, color: '#16a34a', marginBottom: '10px' },
  summaryList:  { margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#166534', lineHeight: '1.8' },
  summaryItem:  {},
  warnings:     { marginTop: '12px', borderTop: '1px solid #bbf7d0', paddingTop: '10px' },
  warningItem:  { fontSize: '13px', color: '#92400e', lineHeight: '1.6' },
};
