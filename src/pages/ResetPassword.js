// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

export default function ResetPassword({ token }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/nexarank/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = res.status === 204 ? {} : await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); return; }
      setDone(true);
    } catch (e) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.brandName}>Set a new password</div>
        {done ? (
          <>
            <div style={s.hint}>Your password has been reset.</div>
            <div style={s.backWrap}><a href="/nexarank-ui/" style={s.backLinkPrimary}>Sign in now</a></div>
          </>
        ) : !token ? (
          <div style={s.error}>Missing or invalid reset link.</div>
        ) : (
          <>
            <div style={s.field}>
              <label style={s.label}>New Password</label>
              <input style={s.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading || !newPassword}>
              {loading ? 'Saving...' : 'Set Password'}
            </button>
          </>
        )}
        {!done && <div style={s.backWrap}><a href="/nexarank-ui/" style={s.backLink}>Back to sign in</a></div>}
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
  error:    { background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  btn:      { width: '100%', padding: '11px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #0077ff, #0040aa)' },
  backWrap: { textAlign: 'center', marginTop: 16 },
  backLink: { fontSize: 12, color: '#4a5568', textDecoration: 'none' },
  backLinkPrimary: { fontSize: 13, color: '#0077ff', textDecoration: 'none', fontWeight: 600 },
};
