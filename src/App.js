// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import RulesConsole from './pages/RulesConsole';

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
      tenantId: data.tenantId || 'default',
      projectId: data.projectId || 'main',
      groupId: data.groupId || '',
      permissions: data.permissions || [],
    };
    localStorage.setItem('nexarank_auth', JSON.stringify(authData));
    setAuth(authData);
  }

  function handleLogout() {
    localStorage.removeItem('nexarank_auth');
    setAuth(null);
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }
  return <RulesConsole auth={auth} onLogout={handleLogout} />;
}
