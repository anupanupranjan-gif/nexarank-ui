// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import RulesConsole from './pages/RulesConsole';

export default function App() {
  const [auth, setAuth] = useState(null);

  function handleLogin(data) {
    setAuth({ token: data.token, username: data.username, role: data.role });
  }

  function handleLogout() {
    setAuth(null);
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <RulesConsole auth={auth} onLogout={handleLogout} />;
}
