// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RulesConsole from './pages/RulesConsole';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import VerifyEmail from './pages/VerifyEmail';

// NR-120: access tokens are now short-lived (15 min); this refreshes them
// silently well inside that window using the HttpOnly refresh cookie, so a
// session stays alive as long as the underlying refresh token (7 days) does,
// without the user noticing anything changed from the pre-NR-120 24h token.
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function loadAuth() {
  try {
    const stored = localStorage.getItem('nexarank_auth');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [auth, setAuth] = useState(loadAuth);

  function handleLogin(data) {
    const authData = {
      token: data.token,
      username: data.username,
      role: data.role,
      roles: data.roles || [data.role],
      tenantId: data.tenantId || 'default',
      projectId: data.projectId || 'main',
      groupId: data.groupId || '',
      permissions: data.permissions || [],
    };
    localStorage.setItem('nexarank_auth', JSON.stringify(authData));
    // Set role-appropriate default tab, clear any stale tab from previous session
    const defaultTab = {
      STAKEHOLDER:  'all',
      VIEWER:       'all',
      MERCHANDISER: 'all',
      APPROVER:     'pending',
      ADMIN:        'all',
      TENANT_ADMIN: 'all',
      SUPER_ADMIN:  'all',
    }[data.role] || 'all';
    localStorage.setItem('nexarank_active_tab', defaultTab);
    setAuth(authData);
  }

  async function handleLogout() {
    // NR-120: best-effort — revoke the session server-side so it doesn't sit
    // valid in the refresh-token table until its 7-day expiry, but never let
    // a network hiccup block the user from actually logging out client-side.
    try {
      await fetch('/nexarank/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore — client-side logout proceeds regardless */ }
    localStorage.removeItem('nexarank_auth');
    setAuth(null);
  }

  useEffect(() => {
    if (!auth) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/nexarank/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok) { handleLogout(); return; }
        const data = await res.json();
        // NR-121 step 7: a plain refresh re-resolves role(s) for whatever
        // project is currently active server-side (last_active_project_id) —
        // keep the client in sync in case they changed since login (e.g. an
        // admin just granted this session's user Project Admin), not just
        // the token.
        const updated = { ...auth, token: data.token, role: data.role, roles: data.roles || [data.role], projectId: data.projectId };
        localStorage.setItem('nexarank_auth', JSON.stringify(updated));
        setAuth(updated);
      } catch (e) { /* transient network failure — next tick retries, don't force logout */ }
    }, SILENT_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  // NR-65: these are public pages reached via a direct emailed link, not
  // through the app's own nav — no client-side router exists in this app
  // (nginx's try_files already falls back to index.html for any path, so
  // a direct browser navigation here still loads this bundle), so routing
  // is a plain window.location.pathname check ahead of the normal
  // authenticated/unauthenticated split below. Checked regardless of
  // whether an existing session is present.
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (path.endsWith('/forgot-password')) return <ForgotPassword />;
  if (path.endsWith('/reset-password')) return <ResetPassword token={token} />;
  if (path.endsWith('/accept-invite')) return <AcceptInvite token={token} />;
  if (path.endsWith('/verify-email')) return <VerifyEmail token={token} />;

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }
  return <RulesConsole auth={auth} onLogout={handleLogout} />;
}
