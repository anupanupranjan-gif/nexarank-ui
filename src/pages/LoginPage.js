// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [tenantId, setTenantId]   = useState('');
  const [error, setError]         = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [branding, setBranding]   = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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
    setErrorCode(null);
    setResendSent(false);
    try {
      const res = await fetch('/nexarank/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include', // NR-120: so the browser stores the HttpOnly refresh-token cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setErrorCode(data.code || null); return; }
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

  // NR-65: a correct-password-but-unverified account has no Bearer token to
  // authenticate a resend with, so this hits the same public/anti-
  // enumeration endpoint forgot-password uses.
  async function handleResendVerification() {
    try {
      await fetch('/nexarank/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: username }),
      });
    } catch (e) { /* best-effort — same UI feedback regardless */ }
    setResendSent(true);
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

        {error && (
          <div style={s.error}>
            {error}
            {errorCode === 'EMAIL_NOT_VERIFIED' && (
              resendSent ? (
                <div style={s.hint}>Verification email sent — check your inbox.</div>
              ) : (
                <button style={s.linkBtn} onClick={handleResendVerification}>Resend verification email</button>
              )
            )}
          </div>
        )}

        <button
          style={{ ...s.btn, background: `linear-gradient(135deg, ${accentColor}, #0040aa)`, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={s.forgotWrap}>
          <a href="/nexarank-ui/forgot-password" style={s.forgotLink}>Forgot password?</a>
        </div>
      </div>
    </div>
  );
}

const s = {
  shell:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', position: 'relative' },
  bgGrid:     { position: 'fixed', inset: 0, display: 'none' },
  card:       { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 16, padding: '36px 40px', width: 360, position: 'relative', zIndex: 1, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  brandArea:  { textAlign: 'center', marginBottom: 28 },
  mark:       { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 auto 12px' },
  tenantLogo: { height: 48, maxWidth: 180, objectFit: 'contain', marginBottom: 12 },
  brandName:  { fontSize: 20, fontWeight: 700, color: '#1a202c' },
  tagline:    { fontSize: 12, color: '#4a5568', marginTop: 4 },
  poweredBy:  { fontSize: 11, color: '#4a5568', marginTop: 4 },
  field:      { marginBottom: 16 },
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#2d3748', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' },
  input:      { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 8, padding: '10px 14px', color: '#1a202c', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  hint:       { fontSize: 11, color: '#4a5568', marginTop: 4 },
  error:      { background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  btn:        { width: '100%', padding: '11px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  linkBtn:    { display: 'block', background: 'none', border: 'none', color: '#0077ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 6, textDecoration: 'underline' },
  forgotWrap: { textAlign: 'center', marginTop: 14 },
  forgotLink: { fontSize: 12, color: '#4a5568', textDecoration: 'none' },
};
