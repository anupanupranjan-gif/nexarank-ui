// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect } from 'react';

const API_BASE = '/nexarank/api/v1';

const GROUP_LABELS = {
  PRE_QUERY:        { label: 'Pre-Query Stages',        icon: '⟳', color: '#4f46e5', desc: 'Transform the query before rule matching' },
  RULE_APPLICATION: { label: 'Rule Application',         icon: '⚡', color: '#d97706', desc: 'Match rules and build enrichment instructions' },
  POST_QUERY:       { label: 'Post-Query Stages',        icon: '◎', color: '#16a34a', desc: 'Add personalization and diversity hints' },
};

const STAGE_DESCRIPTIONS = {
  STOPWORD_REMOVAL:    'Removes common words (a, the, for) before rule matching',
  SPELL_CORRECTION:    'Fixes common eCommerce misspellings (battrey → battery)',
  QUERY_CLASSIFICATION:'Classifies query intent: NAVIGATIONAL, TRANSACTIONAL, CATEGORICAL, INFORMATIONAL (rule-based)',
  LLM_QUERY_CLASSIFICATION: 'Overrides the rule-based classification using the configured LLM, when it returns a confident answer',
  LLM_QUERY_REWRITE:   'Expands query using configured LLM provider (Ollama, OpenAI, etc.)',
  LLM_SYNONYM_SUGGESTION: 'Tracks live query frequency for AI-generated synonym suggestions (AI Suggestions page) — does not call the LLM inline',
  RULE_APPLICATION:    'Matches merchandising rules, resolves A/B tests, builds boost/pin/bury instructions',
  PERSONALIZATION:     'Adds personalizedBoostIds from session click history',
  DIVERSITY:           'Adds maxPerBrand and maxPerCategory diversity hints',
  ZERO_RESULT_RECOVERY: 'When a search returns zero results, search-api asks the configured LLM for an alternative query and retries — this toggle only gates whether that retry runs (not a stage in the enrich() pipeline itself)',
};

export default function PipelineEditor({ auth }) {
  const [stages, setStages]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(null);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState('pipeline');

  // Pipeline preview
  const [previewQuery, setPreviewQuery]     = useState('battery');
  const [previewSession, setPreviewSession] = useState('');
  const [previewing, setPreviewing]         = useState(false);
  const [previewResult, setPreviewResult]   = useState(null);
  const [previewError, setPreviewError]     = useState(null);

  // Stopword management
  const [stopwords, setStopwords]       = useState([]);
  const [newStopword, setNewStopword]   = useState('');
  const [addingWord, setAddingWord]     = useState(false);

  // LLM config
  const [llmConfig, setLlmConfig]       = useState(null);
  const [llmSaving, setLlmSaving]       = useState(false);
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting]     = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  useEffect(() => {
    fetchStages();
    fetchStopwords();
    fetchLlmConfig();
  }, []);

  // ── Stages ──────────────────────────────────────────────────────────────────

  async function fetchStages() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pipeline/stages`, { headers: authHeaders() });
      if (res.ok) setStages(await res.json());
      else setError('Failed to load pipeline stages');
    } catch (e) {
      setError('Failed to load pipeline stages');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStage(stageName, enabled) {
    setSaving(stageName);
    try {
      const res = await fetch(`${API_BASE}/pipeline/stages/${stageName}/toggle`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setStages(prev => prev.map(s =>
          s.stageName === stageName ? { ...s, enabled } : s
        ));
      }
    } catch (e) {
      setError('Failed to update stage');
    } finally {
      setSaving(null);
    }
  }

  // ── Pipeline preview ─────────────────────────────────────────────────────────

  async function runPreview() {
    if (!previewQuery.trim()) return;
    setPreviewing(true);
    setPreviewResult(null);
    setPreviewError(null);
    try {
      const body = { query: previewQuery };
      if (previewSession.trim()) body.sessionId = previewSession.trim();

      const res = await fetch(`${API_BASE}/rules/enrich`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPreviewResult(await res.json());
      } else {
        setPreviewError('Preview request failed');
      }
    } catch (e) {
      setPreviewError('Preview failed: ' + e.message);
    } finally {
      setPreviewing(false);
    }
  }

  // ── Stopwords ────────────────────────────────────────────────────────────────

  async function fetchStopwords() {
    try {
      const res = await fetch(`${API_BASE}/pipeline/stopwords`, { headers: authHeaders() });
      if (res.ok) setStopwords(await res.json());
    } catch (e) {}
  }

  async function addStopword() {
    if (!newStopword.trim()) return;
    setAddingWord(true);
    try {
      const res = await fetch(`${API_BASE}/pipeline/stopwords`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ word: newStopword.trim() }),
      });
      if (res.ok) {
        const added = await res.json();
        setStopwords(prev => [...prev, added]);
        setNewStopword('');
      }
    } catch (e) {
      setError('Failed to add stopword');
    } finally {
      setAddingWord(false);
    }
  }

  async function deleteStopword(word) {
    try {
      await fetch(`${API_BASE}/pipeline/stopwords/${word}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setStopwords(prev => prev.filter(s => s.word !== word));
    } catch (e) {
      setError('Failed to delete stopword');
    }
  }

  // ── LLM Config ───────────────────────────────────────────────────────────────

  async function fetchLlmConfig() {
    try {
      const res = await fetch(`${API_BASE}/llm-config`, { headers: authHeaders() });
      if (res.ok) setLlmConfig(await res.json());
    } catch (e) {}
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <div style={s.loading}>Loading pipeline configuration...</div>;

  // Group stages by group
  const grouped = {};
  stages.forEach(stage => {
    if (!grouped[stage.stageGroup]) grouped[stage.stageGroup] = [];
    grouped[stage.stageGroup].push(stage);
  });

  const tabs = [
    { key: 'pipeline', label: 'Pipeline Stages' },
    { key: 'preview',  label: 'Pipeline Preview' },
    { key: 'stopwords',label: `Stopwords (${stopwords.length})` },
    { key: 'llm',      label: 'LLM Config' },
  ];

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Query Pipeline Editor</div>
          <div style={s.subtitle}>
            Configure how NexaRank transforms queries before enrichment.
            Each stage produces instructions — your search engine applies them.
          </div>
        </div>
        <div style={s.pipelineBadge}>
          {stages.filter(s => s.enabled).length} / {stages.length} stages active
        </div>
      </div>

      {error && <div style={s.errorMsg}>{error} <button style={s.dismissBtn} onClick={() => setError(null)}>✕</button></div>}

      {/* Tab nav */}
      <div style={s.tabNav}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...s.tabBtn, ...(activeTab === t.key ? s.tabBtnActive : {}) }}
            onClick={() => setActiveTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── PIPELINE STAGES TAB ─────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div>
          {['PRE_QUERY', 'RULE_APPLICATION', 'POST_QUERY'].map((group, gi) => {
            const groupStages = grouped[group] || [];
            const meta = GROUP_LABELS[group];
            return (
              <div key={group} style={s.groupCard}>
                {/* Group header */}
                <div style={{ ...s.groupHeader, borderLeft: `4px solid ${meta.color}` }}>
                  <div style={s.groupLeft}>
                    <span style={{ ...s.groupIcon, color: meta.color }}>{meta.icon}</span>
                    <div>
                      <div style={{ ...s.groupTitle, color: meta.color }}>{meta.label}</div>
                      <div style={s.groupDesc}>{meta.desc}</div>
                    </div>
                  </div>
                  <div style={s.groupCount}>
                    {groupStages.filter(s => s.enabled).length}/{groupStages.length} enabled
                  </div>
                </div>

                {/* Connector arrow between groups */}
                {gi < 2 && <div style={s.connector}>↓</div>}

                {/* Stages */}
                {groupStages.length === 0 ? (
                  <div style={s.noStages}>No stages configured for this group</div>
                ) : (
                  groupStages
                    .sort((a, b) => a.stageOrder - b.stageOrder)
                    .map(stage => (
                      <div key={stage.stageName}
                        style={{ ...s.stageRow, opacity: stage.enabled ? 1 : 0.5 }}>
                        <div style={s.stageLeft}>
                          <div style={s.stageName}>{stage.stageName}</div>
                          <div style={s.stageDesc}>
                            {STAGE_DESCRIPTIONS[stage.stageName] || ''}
                          </div>
                        </div>
                        <div style={s.stageRight}>
                          <span style={{
                            ...s.statusPill,
                            background: stage.enabled ? '#dcfce7' : '#f1f5f9',
                            color: stage.enabled ? '#16a34a' : '#64748b',
                          }}>
                            {stage.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                          <button
                            style={{
                              ...s.toggleBtn,
                              background: stage.enabled ? '#fef2f2' : '#f0fdf4',
                              color: stage.enabled ? '#dc2626' : '#16a34a',
                              border: `1px solid ${stage.enabled ? '#fca5a5' : '#86efac'}`,
                              opacity: saving === stage.stageName ? 0.6 : 1,
                            }}
                            onClick={() => toggleStage(stage.stageName, !stage.enabled)}
                            disabled={saving === stage.stageName ||
                              stage.stageName === 'RULE_APPLICATION'}
                          >
                            {saving === stage.stageName ? '...' :
                              stage.stageName === 'RULE_APPLICATION' ? 'Core' :
                              stage.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PIPELINE PREVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div style={s.previewCard}>
          <div style={s.previewTitle}>Run a query through the pipeline</div>
          <div style={s.previewDesc}>
            See exactly what each stage produces. The same call search-api makes to
            <code style={s.code}> POST /rules/enrich</code>.
          </div>

          <div style={s.previewForm}>
            <div style={s.formGroup}>
              <label style={s.label}>Query</label>
              <input
                style={s.input}
                value={previewQuery}
                onChange={e => setPreviewQuery(e.target.value)}
                placeholder="e.g. battery"
                onKeyDown={e => e.key === 'Enter' && runPreview()}
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Session ID (optional)</label>
              <input
                style={s.input}
                value={previewSession}
                onChange={e => setPreviewSession(e.target.value)}
                placeholder="e.g. sess-1"
              />
            </div>
            <button
              style={{ ...s.btn, ...s.btnPrimary, opacity: previewing ? 0.6 : 1, alignSelf: 'flex-end' }}
              onClick={runPreview}
              disabled={previewing || !previewQuery.trim()}
            >
              {previewing ? '⟳ Running...' : '▶ Run Preview'}
            </button>
          </div>

          {previewError && <div style={s.errorMsg}>{previewError}</div>}

          {previewResult && (
            <div style={s.previewResults}>

              {/* Query transformation */}
              <div style={s.resultSection}>
                <div style={s.resultSectionTitle}>Query Transformation</div>
                <div style={s.queryFlow}>
                  <div style={s.queryBox}>
                    <div style={s.queryLabel}>Original</div>
                    <div style={s.queryValue}>{previewResult.originalQuery}</div>
                  </div>
                  <div style={s.queryArrow}>→</div>
                  <div style={s.queryBox}>
                    <div style={s.queryLabel}>Final</div>
                    <div style={{ ...s.queryValue, color: '#4f46e5' }}>
                      {previewResult.expandedQuery || previewResult.originalQuery}
                    </div>
                  </div>
                </div>
              </div>

              {/* Applied rules */}
              <div style={s.resultSection}>
                <div style={s.resultSectionTitle}>Rules Applied ({previewResult.appliedRules?.length || 0})</div>
                {previewResult.boosts?.length > 0 && (
                  <div style={s.instructionGroup}>
                    <div style={s.instructionLabel}>BOOST</div>
                    {previewResult.boosts.map((b, i) => (
                      <div key={i} style={s.instructionRow}>
                        <span style={s.instrField}>{b.field}</span>
                        <span style={s.instrEq}>=</span>
                        <span style={s.instrValue}>{b.value}</span>
                        <span style={s.instrFactor}>×{b.factor}</span>
                      </div>
                    ))}
                  </div>
                )}
                {previewResult.pins?.length > 0 && (
                  <div style={s.instructionGroup}>
                    <div style={s.instructionLabel}>PIN</div>
                    {previewResult.pins.map((p, i) => (
                      <div key={i} style={s.instructionRow}>
                        <span style={s.instrValue}>{p.productId}</span>
                        <span style={s.instrFactor}>pos {p.position}</span>
                      </div>
                    ))}
                  </div>
                )}
                {previewResult.buries?.length > 0 && (
                  <div style={s.instructionGroup}>
                    <div style={s.instructionLabel}>BURY</div>
                    {previewResult.buries.map((b, i) => (
                      <div key={i} style={s.instructionRow}>
                        <span style={s.instrField}>{b.field}</span>
                        <span style={s.instrEq}>=</span>
                        <span style={s.instrValue}>{b.value}</span>
                        <span style={s.instrFactor}>×{b.factor}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(!previewResult.appliedRules?.length) && (
                  <div style={s.noRules}>No rules matched for this query</div>
                )}
              </div>

              {/* Personalization */}
              {previewResult.personalizedBoostIds?.length > 0 && (
                <div style={s.resultSection}>
                  <div style={s.resultSectionTitle}>Personalization</div>
                  <div style={s.instructionGroup}>
                    <div style={s.instructionLabel}>BOOST PRODUCTS</div>
                    <div style={s.instrValue}>{previewResult.personalizedBoostIds.join(', ')}</div>
                  </div>
                </div>
              )}

              {/* Diversity */}
              {(previewResult.maxPerBrand || previewResult.maxPerCategory) && (
                <div style={s.resultSection}>
                  <div style={s.resultSectionTitle}>Diversity Hints</div>
                  <div style={s.diversityRow}>
                    <div style={s.diversityItem}>
                      <span style={s.diversityLabel}>Max per brand</span>
                      <span style={s.diversityValue}>{previewResult.maxPerBrand}</span>
                    </div>
                    <div style={s.diversityItem}>
                      <span style={s.diversityLabel}>Max per category</span>
                      <span style={s.diversityValue}>{previewResult.maxPerCategory}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* A/B test */}
              {previewResult.abTestId && (
                <div style={s.resultSection}>
                  <div style={s.resultSectionTitle}>A/B Test</div>
                  <div style={s.abRow}>
                    <span style={s.abLabel}>Test ID:</span>
                    <span style={s.abValue}>{previewResult.abTestId}</span>
                    <span style={s.abVariant}>Variant {previewResult.abVariant}</span>
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <details style={s.rawDetails}>
                <summary style={s.rawSummary}>View raw EnrichedQuery response</summary>
                <pre style={s.rawJson}>{JSON.stringify(previewResult, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* ── STOPWORDS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'stopwords' && (
        <div style={s.formCard}>
          <div style={s.sectionTitle}>Stopword List</div>
          <div style={s.sectionDesc}>
            Words removed from queries before rule matching. Scoped per project.
            Changes take effect immediately — no redeployment needed.
          </div>

          {/* Add stopword */}
          <div style={s.addRow}>
            <input
              style={{ ...s.input, flex: 1 }}
              value={newStopword}
              onChange={e => setNewStopword(e.target.value)}
              placeholder="Add a stopword..."
              onKeyDown={e => e.key === 'Enter' && addStopword()}
            />
            <button
              style={{ ...s.btn, ...s.btnPrimary, opacity: addingWord ? 0.6 : 1 }}
              onClick={addStopword}
              disabled={addingWord || !newStopword.trim()}
            >
              {addingWord ? 'Adding...' : '+ Add'}
            </button>
          </div>

          {/* Stopword chips */}
          <div style={s.chipGrid}>
            {stopwords.sort((a, b) => a.word.localeCompare(b.word)).map(sw => (
              <div key={sw.word} style={s.chip}>
                <span style={s.chipWord}>{sw.word}</span>
                <button
                  style={s.chipDelete}
                  onClick={() => deleteStopword(sw.word)}
                  title="Remove stopword"
                >✕</button>
              </div>
            ))}
          </div>

          {stopwords.length === 0 && (
            <div style={s.empty}>No stopwords configured. Add words above.</div>
          )}
        </div>
      )}

      {/* ── LLM CONFIG TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'llm' && llmConfig && (
        <div style={s.formCard}>
          <div style={s.sectionTitle}>LLM Provider Configuration</div>
          <div style={s.sectionDesc}>
            Configure the LLM used for query rewrite. Works with Ollama, OpenAI,
            Azure OpenAI, Anthropic, and Cohere.
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
                {['OLLAMA', 'OPENAI', 'AZURE_OPENAI', 'ANTHROPIC', 'COHERE'].map(p => (
                  <option key={p} value={p}>{p}</option>
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
                placeholder="http://localhost:11434"
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

      {activeTab === 'llm' && !llmConfig && (
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
  pipelineBadge:      { padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1d4ed8', fontWeight: 600 },
  loading:            { padding: '40px', textAlign: 'center', color: '#4a5568' },
  errorMsg:           { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' },
  successMsg:         { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  dismissBtn:         { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px' },
  tabNav:             { display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '2px solid #e2e8f0' },
  tabBtn:             { padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabBtnActive:       { color: '#4f46e5', borderBottom: '2px solid #4f46e5', fontWeight: 600 },
  groupCard:          { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0', marginBottom: '16px', overflow: 'hidden' },
  groupHeader:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' },
  groupLeft:          { display: 'flex', alignItems: 'center', gap: '12px' },
  groupIcon:          { fontSize: '20px' },
  groupTitle:         { fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  groupDesc:          { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  groupCount:         { fontSize: '12px', color: '#64748b', fontWeight: 600 },
  connector:          { textAlign: 'center', fontSize: '20px', color: '#cbd5e1', padding: '4px 0', background: '#f8fafc' },
  noStages:           { padding: '16px 20px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' },
  stageRow:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: 'white', transition: 'opacity 0.2s' },
  stageLeft:          { flex: 1 },
  stageName:          { fontSize: '13px', fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' },
  stageDesc:          { fontSize: '12px', color: '#64748b', marginTop: '3px' },
  stageRight:         { display: 'flex', alignItems: 'center', gap: '10px' },
  statusPill:         { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 },
  toggleBtn:          { padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
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
  addRow:             { display: 'flex', gap: '12px', marginBottom: '20px' },
  chipGrid:           { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip:               { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '20px', fontSize: '13px' },
  chipWord:           { color: '#1e293b', fontFamily: 'monospace' },
  chipDelete:         { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '0', lineHeight: 1 },
  empty:              { padding: '40px', textAlign: 'center', color: '#475569', fontSize: '14px', background: '#f8fafc', borderRadius: '8px' },
  previewCard:        { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px' },
  previewTitle:       { fontSize: '16px', fontWeight: 700, color: '#1a202c', marginBottom: '6px' },
  previewDesc:        { fontSize: '13px', color: '#4a5568', marginBottom: '20px', lineHeight: '1.6' },
  previewForm:        { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' },
  previewResults:     { marginTop: '20px' },
  resultSection:      { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '12px' },
  resultSectionTitle: { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
  queryFlow:          { display: 'flex', alignItems: 'center', gap: '16px' },
  queryBox:           { flex: 1, background: '#f8fafc', borderRadius: '6px', padding: '10px 14px' },
  queryLabel:         { fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' },
  queryValue:         { fontSize: '15px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' },
  queryArrow:         { fontSize: '20px', color: '#94a3b8' },
  instructionGroup:   { marginBottom: '8px' },
  instructionLabel:   { fontSize: '11px', fontWeight: 700, color: '#4f46e5', marginBottom: '6px', textTransform: 'uppercase' },
  instructionRow:     { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
  instrField:         { fontFamily: 'monospace', color: '#1e293b', fontSize: '13px' },
  instrEq:            { color: '#94a3b8' },
  instrValue:         { fontFamily: 'monospace', color: '#4f46e5', fontSize: '13px' },
  instrFactor:        { background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  noRules:            { color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' },
  diversityRow:       { display: 'flex', gap: '16px' },
  diversityItem:      { display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '8px 14px', borderRadius: '6px' },
  diversityLabel:     { fontSize: '12px', color: '#16a34a' },
  diversityValue:     { fontSize: '18px', fontWeight: 700, color: '#15803d' },
  abRow:              { display: 'flex', alignItems: 'center', gap: '12px' },
  abLabel:            { fontSize: '12px', color: '#64748b' },
  abValue:            { fontFamily: 'monospace', fontSize: '12px', color: '#1e293b' },
  abVariant:          { background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 },
  rawDetails:         { marginTop: '12px' },
  rawSummary:         { cursor: 'pointer', fontSize: '13px', color: '#64748b', padding: '8px 0' },
  rawJson:            { background: '#1e293b', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', maxHeight: '400px' },
  code:               { background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#1d4ed8' },
};
