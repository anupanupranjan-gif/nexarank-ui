// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
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

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <h1 style={s.title}>NexaRank</h1>
          <p style={s.subtitle}>Merchandising Console</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

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
          style={{...s.btn, ...(loading ? s.btnDisabled : {})}}
          onClick={handleLogin}
          disabled={loading || !username || !password}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
  card:      { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '40px 36px', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  logo:      { textAlign: 'center', marginBottom: 32 },
  title:     { margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' },
  subtitle:  { margin: '4px 0 0', fontSize: 14, color: '#6b7280' },
  field:     { marginBottom: 16 },
  label:     { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:     { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  btn:       { width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  btnDisabled: { background: '#93c5fd', cursor: 'not-allowed' },
  error:     { background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 16 }
};
