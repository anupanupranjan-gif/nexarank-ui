// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

// NR-65: public, unauthenticated page — reached via a direct link, not
// through the app's own nav (there's no client-side router in this app;
// App.js detects this path from window.location and renders it standalone).
export default function ForgotPassword() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch('/nexarank/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail }),
      });
    } catch (e) { /* best-effort — same UI feedback regardless, anti-enumeration */ }
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.brandName}>Reset your password</div>
        {submitted ? (
          <div style={s.hint}>If an account matches, a reset link has been emailed. Check your inbox.</div>
        ) : (
          <>
            <div style={s.field}>
              <label style={s.label}>Username or Email</label>
              <input style={s.input} value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                autoFocus />
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading || !usernameOrEmail}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}
        <div style={s.backWrap}><a href="/nexarank-ui/" style={s.backLink}>Back to sign in</a></div>
      </div>
    </div>
  );
}

const s = {
  shell:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' },
  card:     { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 16, padding: '36px 40px', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  brandName:{ fontSize: 18, fontWeight: 700, color: '#1a202c', marginBottom: 20, textAlign: 'center' },
  field:    { marginBottom: 16 },
  label:    { display: 'block', fontSize: 11, fontWeight: 700, color: '#2d3748', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' },
  input:    { width: '100%', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 8, padding: '10px 14px', color: '#1a202c', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  hint:     { fontSize: 13, color: '#4a5568', textAlign: 'center', lineHeight: 1.5 },
  btn:      { width: '100%', padding: '11px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #0077ff, #0040aa)' },
  backWrap: { textAlign: 'center', marginTop: 16 },
  backLink: { fontSize: 12, color: '#4a5568', textDecoration: 'none' },
};
