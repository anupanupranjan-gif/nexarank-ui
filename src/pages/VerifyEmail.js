// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useEffect, useState } from 'react';

export default function VerifyEmail({ token }) {
  const [status, setStatus] = useState('pending'); // pending | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Missing or invalid verification link.'); return; }
    (async () => {
      try {
        const res = await fetch('/nexarank/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = res.status === 204 ? {} : await res.json();
          setError(data.error || 'Failed to verify email');
          setStatus('error');
          return;
        }
        setStatus('success');
      } catch (e) {
        setError('Could not reach the server. Please try again.');
        setStatus('error');
      }
    })();
  }, [token]);

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.brandName}>Email Verification</div>
        {status === 'pending' && <div style={s.hint}>Verifying...</div>}
        {status === 'success' && (
          <>
            <div style={s.hint}>Your email is verified.</div>
            <div style={s.backWrap}><a href="/nexarank-ui/" style={s.backLinkPrimary}>Sign in now</a></div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={s.error}>{error}</div>
            <div style={s.backWrap}><a href="/nexarank-ui/" style={s.backLink}>Back to sign in</a></div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  shell:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' },
  card:     { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 16, padding: '36px 40px', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' },
  brandName:{ fontSize: 18, fontWeight: 700, color: '#1a202c', marginBottom: 20 },
  hint:     { fontSize: 13, color: '#4a5568', lineHeight: 1.5 },
  error:    { background: '#fff5f5', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13 },
  backWrap: { textAlign: 'center', marginTop: 16 },
  backLink: { fontSize: 12, color: '#4a5568', textDecoration: 'none' },
  backLinkPrimary: { fontSize: 13, color: '#0077ff', textDecoration: 'none', fontWeight: 600 },
};
