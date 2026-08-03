// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/nexarank/api/v1';

// NR-65: self-service profile — every real dashboard role, own account only.
export default function Profile({ auth }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` };
  }

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setDisplayName(data.displayName || '');
        setEmail(data.email || '');
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ displayName, email }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error || 'Failed to update profile'); return; }
      setProfile(data);
      setProfileSuccess(data.emailVerified ? 'Profile updated.' : 'Profile updated — check your inbox to verify the new email address.');
    } catch (e) { setProfileError('Failed to update profile'); }
    finally { setSavingProfile(false); }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/users/me/change-password`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.error || 'Failed to change password');
        return;
      }
      setPasswordSuccess('Password changed.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) { setPasswordError('Failed to change password'); }
    finally { setSavingPassword(false); }
  }

  if (!profile) return <div style={s.page}><div style={s.loading}>Loading...</div></div>;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.sectionLabel}>Account</div>
        <div style={s.staticRow}><span style={s.staticLabel}>Username</span><span style={s.staticValue}>{profile.username}</span></div>
        <div style={s.staticRow}><span style={s.staticLabel}>Role</span><span style={s.staticValue}>{profile.role}</span></div>

        {profileError && <div style={s.error}>{profileError}</div>}
        {profileSuccess && <div style={s.success}>{profileSuccess}</div>}

        <div style={s.field}>
          <label style={s.label}>Display Name</label>
          <input style={s.input} value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>
            Email {!profile.emailVerified && <span style={s.unverified}>unverified</span>}
          </label>
          <input style={s.input} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <button style={s.btn} onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div style={s.card}>
        <div style={s.sectionLabel}>Change Password</div>
        {passwordError && <div style={s.error}>{passwordError}</div>}
        {passwordSuccess && <div style={s.success}>{passwordSuccess}</div>}
        <div style={s.field}>
          <label style={s.label}>Current Password</label>
          <input style={s.input} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>New Password</label>
          <input style={s.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Confirm New Password</label>
          <input style={s.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
        <button style={s.btn} onClick={savePassword} disabled={savingPassword || !currentPassword || !newPassword}>
          {savingPassword ? 'Saving...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page:         { maxWidth: 560 },
  title:        { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 20 },
  card:         { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 10, padding: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 },
  staticRow:    { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f3f5', marginBottom: 12 },
  staticLabel:  { fontSize: 13, color: '#64748b' },
  staticValue:  { fontSize: 13, color: '#1a202c', fontWeight: 600 },
  field:        { marginBottom: 14 },
  label:        { display: 'block', fontSize: 11, fontWeight: 700, color: '#2d3748', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  unverified:   { color: '#ca8a04', fontWeight: 600, marginLeft: 6, textTransform: 'none', letterSpacing: 0 },
  input:        { width: '100%', background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: 7, padding: '8px 12px', color: '#1a202c', fontSize: 13, boxSizing: 'border-box' },
  btn:          { background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.4)', color: '#0055cc', padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  error:        { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  success:      { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 },
  loading:      { color: '#64748b', padding: 20 },
};
