// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

/**
 * NR-154: llm_config is one row per tenant/project (no per-stage column), and
 * three of its six consumers are not pipeline stages at all — so it lives in
 * Configuration alongside Engine Config, not nested inside the Pipeline Editor.
 */
export default function LlmConfigPage({ auth }) {
  const [llmConfig, setLlmConfig]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [llmSaving, setLlmSaving]         = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting]       = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => { fetchLlmConfig(); }, []);

  async function fetchLlmConfig() {
    try {
      const res = await fetch(`${API_BASE}/llm-config`, { headers: authHeaders() });
      if (res.ok) setLlmConfig(await res.json());
    } catch (e) {
      setError('Failed to load LLM config');
    } finally {
      setLoading(false);
    }
  }

  async function saveLlmConfig() {
    setLlmSaving(true);
    try {
      const res = await fetch(`${API_BASE}/llm-config`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(llmConfig),
      });
      if (res.ok) {
        setLlmConfig(await res.json());
        setLlmTestResult({ success: true, message: 'LLM configuration saved' });
        setTimeout(() => setLlmTestResult(null), 3000);
      }
    } catch (e) {
      setError('Failed to save LLM config');
    } finally {
      setLlmSaving(false);
    }
  }

  async function testLlmConnection() {
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/llm-config/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) setLlmTestResult(await res.json());
    } catch (e) {
      setLlmTestResult({ success: false, message: 'Connection test failed: ' + e.message });
    } finally {
      setLlmTesting(false);
    }
  }

  if (loading) return <div style={s.loading}>Loading LLM configuration...</div>;

  return (
    <div style={s.container}>

      <div style={s.header}>
        <div>
          <div style={s.title}>LLM Configuration</div>
          <div style={s.subtitle}>
            One provider per project, shared by every LLM-powered feature —
            query rewrite and classification in the pipeline, plus AI rule
            suggestions, judgment auto-scoring, and zero-result recovery.
          </div>
        </div>
      </div>

      {error && <div style={s.errorMsg}>{error} <button style={s.dismissBtn} onClick={() => setError(null)}>✕</button></div>}

      {llmConfig && (
        <div style={s.formCard}>
          <div style={s.sectionTitle}>LLM Provider Configuration</div>
          <div style={s.sectionDesc}>
            Configure the LLM used for query rewrite, classification, and other
            LLM-powered features. Ollama is fully supported for local dev.
            "Custom / OpenAI-Compatible" covers any provider exposing an
            OpenAI-shaped chat completions API — Groq, Together.ai, Mistral,
            DeepSeek, Azure OpenAI, OpenAI itself, etc. (OPENAI/AZURE_OPENAI/
            ANTHROPIC/COHERE below are named placeholders with no adapter
            behind them yet — use Custom for an OpenAI-compatible provider
            instead of picking one of those.)
          </div>

          {llmTestResult && (
            <div style={llmTestResult.success ? s.successMsg : s.errorMsg}>
              {llmTestResult.success ? '✓ ' : '✗ '}{llmTestResult.message}
            </div>
          )}

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Provider</label>
              <select
                style={s.select}
                value={llmConfig.provider || 'OLLAMA'}
                onChange={e => setLlmConfig(p => ({ ...p, provider: e.target.value }))}
              >
                {['OLLAMA', 'OPENAI_COMPATIBLE', 'OPENAI', 'AZURE_OPENAI', 'ANTHROPIC', 'COHERE'].map(p => (
                  <option key={p} value={p}>{p === 'OPENAI_COMPATIBLE' ? 'CUSTOM / OPENAI-COMPATIBLE' : p}</option>
                ))}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Model</label>
              <input
                style={s.input}
                value={llmConfig.model || ''}
                onChange={e => setLlmConfig(p => ({ ...p, model: e.target.value }))}
                placeholder="gemma3:1b"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Timeout (seconds)</label>
              <input
                style={s.input}
                type="number"
                value={llmConfig.timeoutSeconds || 5}
                onChange={e => setLlmConfig(p => ({ ...p, timeoutSeconds: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div style={s.formRow}>
            <div style={{ ...s.formGroup, flex: 3 }}>
              <label style={s.label}>Endpoint URL</label>
              <input
                style={s.input}
                value={llmConfig.endpoint || ''}
                onChange={e => setLlmConfig(p => ({ ...p, endpoint: e.target.value }))}
                placeholder={llmConfig.provider === 'OPENAI_COMPATIBLE'
                  ? 'https://api.groq.com/openai/v1 (base URL — /chat/completions is appended)'
                  : 'http://localhost:11434'}
              />
            </div>
            <div style={{ ...s.formGroup, flex: 2 }}>
              <label style={s.label}>API Key (if required)</label>
              <input
                style={s.input}
                type="password"
                value={llmConfig.apiKey || ''}
                onChange={e => setLlmConfig(p => ({ ...p, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
          </div>

          {llmConfig.provider === 'OPENAI_COMPATIBLE' && (
            <div style={s.formGroup}>
              <label style={s.label}>Custom Headers (JSON, optional)</label>
              <input
                style={s.input}
                value={llmConfig.customHeaders || ''}
                onChange={e => setLlmConfig(p => ({ ...p, customHeaders: e.target.value }))}
                placeholder='{"X-Custom-Header":"value"} — leave blank for standard Bearer auth'
              />
              <div style={s.hint}>Most OpenAI-compatible providers (Groq, Together.ai, etc.) only need the API Key above — this is for the rare provider that needs something extra.</div>
            </div>
          )}

          <div style={s.formGroup}>
            <label style={s.label}>Prompt Template</label>
            <textarea
              style={{ ...s.input, minHeight: 80, fontFamily: 'monospace', fontSize: 12 }}
              value={llmConfig.promptTemplate || llmConfig.effectivePromptTemplate || ''}
              onChange={e => setLlmConfig(p => ({ ...p, promptTemplate: e.target.value }))}
              placeholder="Leave blank to use default prompt"
            />
            <div style={s.hint}>Use %s as placeholder for the query. Leave blank for default.</div>
          </div>

          {/* Status */}
          {llmConfig.lastStatus && (
            <div style={s.lastTested}>
              Status: <strong style={{
                color: llmConfig.lastStatus === 'CONNECTED' ? '#16a34a' :
                       llmConfig.lastStatus === 'FAILED' ? '#dc2626' : '#64748b'
              }}>{llmConfig.lastStatus}</strong>
              {llmConfig.lastTestedAt && ` — tested ${new Date(llmConfig.lastTestedAt).toLocaleString()}`}
              {llmConfig.lastStatusMessage && ` — ${llmConfig.lastStatusMessage}`}
            </div>
          )}

          <div style={s.actions}>
            <button
              style={{ ...s.btn, ...s.btnPrimary, opacity: llmSaving ? 0.6 : 1 }}
              onClick={saveLlmConfig}
              disabled={llmSaving}
            >
              {llmSaving ? 'Saving...' : '💾 Save LLM Config'}
            </button>
            <button
              style={{ ...s.btn, ...s.btnSecondary, opacity: llmTesting ? 0.6 : 1 }}
              onClick={testLlmConnection}
              disabled={llmTesting}
            >
              {llmTesting ? '⟳ Testing...' : '⚡ Test Connection'}
            </button>
          </div>
        </div>
      )}

      {!llmConfig && (
        <div style={s.empty}>No LLM configuration found. Configure one via the API first.</div>
      )}
    </div>
  );
}

const s = {
  container:          { padding: '24px', fontFamily: 'sans-serif', maxWidth: '960px' },
  header:             { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:              { fontSize: '22px', fontWeight: 700, color: '#1a202c' },
  subtitle:           { fontSize: '13px', color: '#4a5568', marginTop: '4px', lineHeight: '1.5' },
  loading:            { padding: '40px', textAlign: 'center', color: '#4a5568' },
  errorMsg:           { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  successMsg:         { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  dismissBtn:         { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px' },
  formCard:           { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px' },
  sectionTitle:       { fontSize: '16px', fontWeight: 700, color: '#1a202c', marginBottom: '6px' },
  sectionDesc:        { fontSize: '13px', color: '#4a5568', marginBottom: '20px', lineHeight: '1.6' },
  formRow:            { display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-end' },
  formGroup:          { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label:              { fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:              { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: '#0f172a', background: 'white', outline: 'none' },
  select:             { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', color: '#1e293b', background: 'white', outline: 'none' },
  hint:               { fontSize: '11px', color: '#475569', marginTop: '4px' },
  actions:            { display: 'flex', gap: '12px', marginTop: '16px' },
  btn:                { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  btnPrimary:         { background: '#4f46e5', color: 'white' },
  btnSecondary:       { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' },
  lastTested:         { fontSize: '12px', color: '#334155', marginBottom: '12px' },
  empty:              { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '14px', background: '#f8fafc', borderRadius: '8px' },
};
