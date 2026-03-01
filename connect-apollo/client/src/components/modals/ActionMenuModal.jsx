import React from 'react';
import Modal from '../common/Modal';
import { IconBug, IconShield } from '../common/Icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';

const ActionMenuModal = () => {
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const username = useAuthStore(s => s.username);
  const myRole = useChatStore(s => s.myRole);
  const globalRole = useChatStore(s => s.globalRole);
  const setAdminBugList = useSettingsStore(s => s.setAdminBugList);

  const fetchBugReports = async () => {
    try {
      const token = localStorage.getItem("apollo_token");
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/admin/bugs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAdminBugList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal title="NEW MESSAGE" onClose={() => setActiveModal(null)}>
      <div className="action-grid">
        <div className="action-card" onClick={() => setActiveModal("createGroup")}>
          <span style={{ fontSize: 12}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg></span>
          <div><div style={{ fontWeight: "bold" }}>Новая группа</div></div>
        </div>
        <div className="action-card" onClick={() => setActiveModal("searchGroup")}>
          <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M6 2h8v2H6V2zM4 6V4h2v2H4zm0 8H2V6h2v8zm2 2H4v-2h2v2zm8 0v2H6v-2h8zm2-2h-2v2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm0-8h2v8h-2V6zm0 0V4h-2v2h2z"/></svg></span>
          <div><div style={{ fontWeight: "bold" }}>Найти группу</div></div>
        </div>
        <div className="action-card" onClick={() => setActiveModal("addFriend")}>
          <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg></span>
          <div><div style={{ fontWeight: "bold" }}>Поиск людей</div></div>
        </div>
        <div className="action-card" onClick={() => setActiveModal("reportBug")}>
          <span style={{ fontSize: 24 }}><IconBug/></span>
          <div><div style={{ fontWeight: "bold" }}>Report Bug</div></div>
        </div>
        {(username === 'slide36' || myRole === 'admin' || globalRole === 'mod') && (
          <div className="action-card" onClick={() => { setActiveModal("adminBugs"); fetchBugReports(); }}>
            <span style={{ fontSize: 24 }}><IconShield/></span>
            <div><div style={{ fontWeight: "bold" }}>Admin Bugs</div></div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ActionMenuModal;