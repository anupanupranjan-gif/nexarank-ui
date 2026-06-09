// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [tenantId, setTenantId]   = useState('');
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [branding, setBranding]   = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(false);

  async function fetchBranding(id) {
    if (!id) { setBranding(null); return; }
    setBrandingLoading(true);
    try {
      const res = await fetch(`/nexarank/api/v1/admin/public/tenants/${id}/branding`);
      if (res.ok) setBranding(await res.json());
      else setBranding(null);
    } catch (e) { setBranding(null); }
    finally { setBrandingLoading(false); }
  }

  function handleTenantBlur() {
    fetchBranding(tenantId.trim());
  }

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/nexarank/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      onLogin(data);
    } catch (e) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  const accentColor = branding?.brandColor || '#0077ff';
  const displayName = branding?.displayName || 'NexaRank';
  const logoUrl     = branding?.logoUrl || '';

  return (
    <div style={s.shell}>
      <div style={s.bgGrid} />
      <div style={s.card}>
        {/* Logo / Branding area */}
        <div style={s.brandArea}>
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} style={s.tenantLogo} />
          ) : (
            <div style={{ ...s.mark, background: `linear-gradient(135deg, ${accentColor}, #0040aa)` }}>
              {displayName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div style={s.brandName}>{displayName}</div>
          {branding && branding.tenantId !== 'NexaRank' && (
            <div style={s.poweredBy}>powered by NexaRank</div>
          )}
          {!branding && <div style={s.tagline}>Search Experience Management</div>}
        </div>

        {/* Tenant field */}
        <div style={s.field}>
          <label style={s.label}>Workspace</label>
          <input
            style={s.input}
            placeholder="your-company (optional)"
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            onBlur={handleTenantBlur}
          />
          {brandingLoading && <div style={s.hint}>Loading workspace...</div>}
        </div>

        <div style={s.field}>
          <label style={s.label}>Username</label>
          <input
            style={s.input}
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          style={{ ...s.btn, background: `linear-gradient(135deg, ${accentColor}, #0040aa)`, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

const s = {
  shell:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1a', position: 'relative' },
  bgGrid:     { position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,119,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' },
  card:       { background: 'rgba(15,25,41,0.95)', border: '1px solid rgba(0,119,255,0.2)', borderRadius: 16, padding: '36px 40px', width: 360, position: 'relative', zIndex: 1 },
  brandArea:  { textAlign: 'center', marginBottom: 28 },
  mark:       { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 auto 12px' },
  tenantLogo: { height: 48, maxWidth: 180, objectFit: 'contain', marginBottom: 12 },
  brandName:  { fontSize: 20, fontWeight: 700, color: '#e2e8f0' },
  tagline:    { fontSize: 12, color: '#64748b', marginTop: 4 },
  poweredBy:  { fontSize: 11, color: '#64748b', marginTop: 4 },
  field:      { marginBottom: 16 },
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#94b4d4', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' },
  input:      { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  hint:       { fontSize: 11, color: '#64748b', marginTop: 4 },
  error:      { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  btn:        { width: '100%', padding: '11px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
};
