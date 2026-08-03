// Copyright (c) 2026 Anup Ranjan. Licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
import React from 'react';
import Profile from '../pages/Profile';

// NR-65: modal wrapper for the self-service profile page — same
// overlay/panel/close-button shell as SessionsModal, reachable the same
// way (an icon button in the sidebar user area), not a full nav tab, since
// it's a personal setting rather than a data/feature area.
export default function ProfileModal({ auth, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.title}>My Profile</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <Profile auth={auth} />
      </div>
    </div>
  );
}

const s = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:    { background: '#fff', borderRadius: 12, padding: 24, width: 560, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 16, fontWeight: 700, color: '#1a202c' },
  closeBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#64748b' },
};
