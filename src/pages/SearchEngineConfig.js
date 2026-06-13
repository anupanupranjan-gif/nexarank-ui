// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

const ENGINE_TYPES = ['ELASTICSEARCH', 'SOLR', 'OPENSEARCH'];
const SCHEMES = ['https', 'http'];

const emptyConfig = {
  engineType: 'ELASTICSEARCH',
  host: '',
  port: 9200,
  scheme: 'https',
  indexName: '',
  username: '',
  password: '',
  sslEnabled: true,
  sslVerify: false,
  previewUrl: '',
};

export default function SearchEngineConfig({ auth }) {
  const [config, setConfig]         = useState(emptyConfig);
  const [savedConfig, setSavedConfig] = useState(null);
  const [fields, setFields]         = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [fetchingFields, setFetchingFields] = useState(false);
  const [error, setError]           = useState(null);
  const [saveMsg, setSaveMsg]       = useState(null);
  const [activeSection, setActiveSection] = useState('config');

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/engine-config`, { headers: authHeaders() });
      if (res.status === 204) {
        setConfig(emptyConfig);
        setSavedConfig(null);
      } else if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSavedConfig(data);
      }
    } catch (e) {
      setError('Failed to load engine config');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/engine-config`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSavedConfig(data);
        setSaveMsg('Configuration saved successfully');
        setTestResult(null);
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        setError('Failed to save configuration');
      }
    } catch (e) {
      setError('Error saving configuration');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/engine-config/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setSavedConfig(prev => prev ? {...prev, lastStatus: 'CONNECTED'} : prev);
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Connection test failed: ' + e.message });
    } finally {
      setTesting(false);
    }
  }

  async function fetchFields() {
    setFetchingFields(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/engine-config/fields`, { headers: authHeaders() });
      if (res.status === 204) {
        setFields([]);
        setError('No fields returned. Make sure the connection test passes first.');
      } else if (res.ok) {
        setFields(await res.json());
        setActiveSection('fields');
      } else {
        setError('Failed to fetch fields. Test connection first.');
      }
    } catch (e) {
      setError('Error fetching fields');
    } finally {
      setFetchingFields(false);
    }
  }

  function handleChange(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  function statusColor(status) {
    if (status === 'CONNECTED') return '#22c55e';
    if (status === 'FAILED') return '#ef4444';
    return '#4a5568';
  }

  function statusDot(status) {
    const color = statusColor(status);
    return <span style={{...s.dot, background: color}} />;
  }

  if (loading) return <div style={s.loading}>Loading engine configuration...</div>;

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Search Engine Configuration</div>
          <div style={s.subtitle}>
            Connect NexaRank to your search engine. Works with Elasticsearch, Solr, and OpenSearch.
          </div>
        </div>
        {savedConfig?.lastStatus && (
          <div style={s.statusBadge}>
            {statusDot(savedConfig.lastStatus)}
            <span style={{color: statusColor(savedConfig.lastStatus), fontWeight: 600}}>
              {savedConfig.lastStatus}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      {saveMsg && <div style={s.successMsg}>{saveMsg}</div>}
      {error && <div style={s.errorMsg}>{error}</div>}
      {testResult && (
        <div style={testResult.success ? s.successMsg : s.errorMsg}>
          {testResult.success ? '✓ ' : '✗ '}{testResult.message}
        </div>
      )}

      {/* Section tabs */}
      <div style={s.sectionTabs}>
        {[
          { key: 'config', label: 'Connection Settings' },
          { key: 'fields', label: `Index Fields${fields.length > 0 ? ` (${fields.length})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            style={{...s.sectionTab, ...(activeSection === t.key ? s.sectionTabActive : {})}}
            onClick={() => { setActiveSection(t.key); if (t.key === 'fields' && fields.length === 0) fetchFields(); }}
          >{t.label}</button>
        ))}
      </div>

      {/* Config form */}
      {activeSection === 'config' && (
        <div style={s.formCard}>

          {/* Engine type */}
          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Engine Type</label>
              <select
                style={s.select}
                value={config.engineType}
                onChange={e => handleChange('engineType', e.target.value)}
              >
                {ENGINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Index / Collection Name</label>
              <input
                style={s.input}
                value={config.indexName || ''}
                onChange={e => handleChange('indexName', e.target.value)}
                placeholder="products"
              />
            </div>
          </div>

          {/* Host and port */}
          <div style={s.formRow}>
            <div style={{...s.formGroup, flex: 3}}>
              <label style={s.label}>Host</label>
              <input
                style={s.input}
                value={config.host || ''}
                onChange={e => handleChange('host', e.target.value)}
                placeholder="elasticsearch.example.com"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Port</label>
              <input
                style={s.input}
                type="number"
                value={config.port || ''}
                onChange={e => handleChange('port', parseInt(e.target.value))}
                placeholder="9200"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Scheme</label>
              <select
                style={s.select}
                value={config.scheme || 'https'}
                onChange={e => handleChange('scheme', e.target.value)}
              >
                {SCHEMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Credentials */}
          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Username</label>
              <input
                style={s.input}
                value={config.username || ''}
                onChange={e => handleChange('username', e.target.value)}
                placeholder="elastic"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                value={config.password || ''}
                onChange={e => handleChange('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* SSL options */}
          <div style={s.formRow}>
            <div style={s.checkGroup}>
              <input
                type="checkbox"
                id="sslEnabled"
                checked={config.sslEnabled || false}
                onChange={e => handleChange('sslEnabled', e.target.checked)}
                style={s.checkbox}
              />
              <label htmlFor="sslEnabled" style={s.checkLabel}>SSL Enabled</label>
            </div>
            <div style={s.checkGroup}>
              <input
                type="checkbox"
                id="sslVerify"
                checked={config.sslVerify || false}
                onChange={e => handleChange('sslVerify', e.target.checked)}
                style={s.checkbox}
              />
              <label htmlFor="sslVerify" style={s.checkLabel}>
                Verify SSL Certificate
                <span style={s.hint}>(uncheck for self-signed certs)</span>
              </label>
            </div>
          </div>

          {/* Connection URL preview */}
          {config.host && (
            <div style={s.urlPreview}>
              <span style={s.urlLabel}>Connection URL:</span>
              <span style={s.urlValue}>
                {config.scheme || 'https'}://{config.host}:{config.port || 9200}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={s.actions}>
            {/* Preview URL */}
              <div style={{...s.formGroup, flex: '100%', marginBottom: 16}}>
                <label style={s.label}>Preview URL</label>
                <input
                  style={s.input}
                  type="url"
                  placeholder="https://staging.yoursite.com/search"
                  value={config.previewUrl || ''}
                  onChange={e => handleChange('previewUrl', e.target.value)}
                />
                <div style={{fontSize:11, color:'#4a5568', marginTop:4}}>
                  Merchandisers and approvers will use this URL to preview rule results. Leave blank to disable previewing.
                </div>
              </div>
              <button
              style={{...s.btn, ...s.btnPrimary, opacity: saving ? 0.6 : 1}}
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Configuration'}
            </button>
            <button
              style={{...s.btn, ...s.btnSecondary, opacity: testing ? 0.6 : 1}}
              onClick={testConnection}
              disabled={testing || !savedConfig}
            >
              {testing ? '⟳ Testing...' : '⚡ Test Connection'}
            </button>
            <button
              style={{...s.btn, ...s.btnSuccess, opacity: fetchingFields ? 0.6 : 1}}
              onClick={fetchFields}
              disabled={fetchingFields || !savedConfig}
            >
              {fetchingFields ? '⟳ Fetching...' : '🔍 Fetch Index Fields'}
            </button>
          </div>

          {/* Last tested info */}
          {savedConfig?.lastTestedAt && (
            <div style={s.lastTested}>
              Last tested: {new Date(savedConfig.lastTestedAt).toLocaleString()}
              {savedConfig.lastStatusMessage && ` — ${savedConfig.lastStatusMessage}`}
            </div>
          )}
        </div>
      )}

      {/* Fields tab */}
      {activeSection === 'fields' && (
        <div>
          {fields.length === 0 ? (
            <div style={s.empty}>
              No fields loaded yet. Go to Connection Settings and click
              "Fetch Index Fields" after a successful connection test.
            </div>
          ) : (
            <>
              <div style={s.fieldsHeader}>
                <div style={s.fieldsCount}>{fields.length} fields found in index</div>
                <button style={{...s.btn, ...s.btnSecondary}} onClick={fetchFields}>
                  ↻ Refresh
                </button>
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Field Name', 'Type', 'Facetable', 'Sortable', 'Indexed', 'Sample Values'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, i) => (
                    <tr key={field.name} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}>
                        <span style={s.fieldName}>{field.name}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.typeBadge}>{field.type}</span>
                      </td>
                      <td style={s.td}>{field.facetable ? '✓' : '—'}</td>
                      <td style={s.td}>{field.sortable ? '✓' : '—'}</td>
                      <td style={s.td}>{field.indexed ? '✓' : '—'}</td>
                      <td style={s.td}>
                        <span style={s.sampleValues}>
                          {field.sampleValues?.slice(0, 3).join(', ') || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Info box */}
      <div style={s.infoBox}>
        <div style={s.infoTitle}>How it works</div>
        <div style={s.infoText}>
          NexaRank uses this connection to introspect your search index — fetching field names and
          sample values to power the rule configuration UI. Your product data never leaves your
          infrastructure. NexaRank only reads field metadata and applies merchandising rules at
          query time via the <code style={s.code}>POST /api/v1/rules/enrich</code> endpoint.
        </div>
      </div>
    </div>
  );
}

const s = {
  container:       { padding: '24px', fontFamily: 'sans-serif', maxWidth: '900px' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:           { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  subtitle:        { fontSize: '13px', color: '#4a5568', marginTop: '4px', lineHeight: '1.5' },
  statusBadge:     { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' },
  dot:             { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  loading:         { padding: '40px', textAlign: 'center', color: '#4a5568' },
  successMsg:      { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  errorMsg:        { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  sectionTabs:     { display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' },
  sectionTab:      { padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#b0c4de', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  sectionTabActive:{ color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600 },
  formCard:        { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px' },
  formRow:         { display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-end' },
  formGroup:       { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label:           { fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:           { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: '#0f172a', background: 'white', outline: 'none' },
  select:          { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: '#1e293b', background: 'white', outline: 'none' },
  checkGroup:      { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  checkbox:        { width: '16px', height: '16px', cursor: 'pointer' },
  checkLabel:      { fontSize: '14px', color: '#1e293b', cursor: 'pointer' },
  hint:            { fontSize: '11px', color: '#475569', marginLeft: '6px' },
  urlPreview:      { padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  urlLabel:        { color: '#1e293b', marginRight: '8px', fontWeight: 600 },
  urlValue:        { color: '#2563eb', fontFamily: 'monospace' },
  actions:         { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' },
  btn:             { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' },
  btnPrimary:      { background: '#4f46e5', color: 'white' },
  btnSecondary:    { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' },
  btnSuccess:      { background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' },
  lastTested:      { fontSize: '12px', color: '#334155', marginTop: '4px' },
  fieldsHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  fieldsCount:     { fontSize: '14px', color: '#1a202c', fontWeight: 600 },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:              { padding: '10px 12px', textAlign: 'left', background: '#1a202c', borderBottom: '2px solid #cbd5e1', fontWeight: 600, color: '#1e293b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td:              { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle', color: '#0f172a' },
  trEven:          { background: '#fafafa' },
  fieldName:       { fontFamily: 'monospace', fontWeight: 600, color: '#1a202c' },
  typeBadge:       { background: '#1e40af', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 },
  sampleValues:    { color: '#334155', fontSize: '12px' },
  empty:           { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '14px', background: '#f8fafc', borderRadius: '8px', lineHeight: '1.8' },
  infoBox:         { marginTop: '24px', padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' },
  infoTitle:       { fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '6px' },
  infoText:        { fontSize: '13px', color: '#78350f', lineHeight: '1.7' },
  code:            { background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' },
};