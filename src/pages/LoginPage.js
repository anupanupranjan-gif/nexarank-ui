// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

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

  return (
    <div style={s.page}>
      {/* Background grid */}
      <div style={s.bgGrid} />

      {/* Glow orbs */}
      <div style={s.orb1} />
      <div style={s.orb2} />

      {/* Card */}
      <div style={s.card}>

        {/* MR Brand mark */}
        <div style={s.brandArea}>
          <div style={s.mrMark}>MR</div>
          <div style={s.brandName}>Modern Reliability</div>
        </div>

        {/* Divider */}
        <div style={s.divider} />

        {/* Product name */}
        <div style={s.productArea}>
          <div style={s.productName}>NexaRank</div>
          <div style={s.productTag}>SearchXM · Search Experience Management</div>
        </div>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <span style={s.errorIcon}>⚠</span> {error}
          </div>
        )}

        {/* Fields */}
        <div style={s.field}>
          <label style={s.label}>Username</label>
          <input
            style={s.input}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter username"
            autoFocus
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
          />
        </div>

        <button
          style={{
            ...s.btn,
            opacity: (loading || !username || !password) ? 0.5 : 1,
            cursor:  (loading || !username || !password) ? 'not-allowed' : 'pointer',
          }}
          onClick={handleLogin}
          disabled={loading || !username || !password}
        >
          {loading ? (
            <span style={s.btnInner}>
              <span style={s.spinner} /> Signing in...
            </span>
          ) : (
            <span style={s.btnInner}>
              Sign In →
            </span>
          )}
        </button>

        {/* Footer */}
        <div style={s.footer}>
          <span style={s.footerDot} />
          <span style={s.footerText}>Secured · Enterprise Search Platform</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#080d1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
    position: 'relative',
    overflow: 'hidden',
  },

  bgGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(0,119,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,255,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },

  orb1: {
    position: 'fixed',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,85,204,0.15) 0%, transparent 70%)',
    top: '-100px',
    left: '-100px',
    pointerEvents: 'none',
  },

  orb2: {
    position: 'fixed',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,180,255,0.1) 0%, transparent 70%)',
    bottom: '-80px',
    right: '-80px',
    pointerEvents: 'none',
  },

  card: {
    position: 'relative',
    zIndex: 10,
    background: 'rgba(10,16,32,0.9)',
    border: '1px solid rgba(0,119,255,0.2)',
    borderRadius: '16px',
    padding: '36px 40px',
    width: '380px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 0 60px rgba(0,85,204,0.2), 0 0 0 1px rgba(0,119,255,0.1)',
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },

  mrMark: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0055cc, #00b4ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.5px',
    boxShadow: '0 0 16px rgba(0,119,255,0.5)',
    flexShrink: 0,
  },

  brandName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: '0.5px',
  },

  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, rgba(0,119,255,0.4), rgba(0,180,255,0.2), transparent)',
    marginBottom: '20px',
  },

  productArea: {
    marginBottom: '28px',
  },

  productName: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.5px',
    lineHeight: 1.1,
    marginBottom: '6px',
    background: 'linear-gradient(135deg, #ffffff 0%, #4da6ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  productTag: {
    fontSize: '10px',
    color: 'rgba(0,180,255,0.6)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },

  errorBox: {
    background: 'rgba(255,68,68,0.1)',
    border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff6b6b',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  errorIcon: { fontSize: '14px' },

  field: { marginBottom: '16px' },

  label: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: 'rgba(0,180,255,0.6)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '7px',
  },

  input: {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,119,255,0.2)',
    borderRadius: '8px',
    padding: '11px 14px',
    fontSize: '13px',
    color: '#e2e8f0',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },

  btn: {
    width: '100%',
    background: 'linear-gradient(135deg, #0055cc, #0077ff)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: 700,
    marginTop: '8px',
    letterSpacing: '1px',
    boxShadow: '0 0 20px rgba(0,119,255,0.35)',
    fontFamily: 'inherit',
    transition: 'box-shadow 0.2s',
  },

  btnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  spinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    marginTop: '24px',
  },

  footerDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#00e676',
    boxShadow: '0 0 6px #00e676',
    display: 'inline-block',
  },

  footerText: {
    fontSize: '10px',
    color: 'rgba(107,140,186,0.5)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
};
