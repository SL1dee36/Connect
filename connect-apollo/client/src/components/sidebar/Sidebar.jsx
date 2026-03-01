import React from 'react';
import FolderTabs from './FolderTabs';
import ChatList from './ChatList'; // Его мы перепишем на следующем шаге
import { IconBell, IconShield, IconPin, IconFolder, IconTrash } from '../common/Icons';

// Импортируем наши сторы
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';

const Sidebar = () => {
  // Auth & Profile
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  const myProfile = useProfileStore(s => s.myProfile);

  // Ui State
  const isMobile = useUIStore(s => s.isMobile);
  const showMobileChat = useUIStore(s => s.showMobileChat);
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const isSelectionMode = useUIStore(s => s.isSelectionMode);
  const selectedChats = useUIStore(s => s.selectedChats);
  const setIsSelectionMode = useUIStore(s => s.setIsSelectionMode);
  const clearSelection = useUIStore(s => s.clearSelection);

  // Settings & Chat
  const globalRole = useChatStore(s => s.globalRole);
  const hasUnreadNotifs = useSettingsStore(s => s.hasUnreadNotifs);

  const openSettings = () => {
    if (socket) {
      socket.emit("get_my_profile", username);
      socket.emit("get_avatar_history", username);
    }
    useProfileStore.getState().setProfileForm({ 
      bio: myProfile.bio || "", 
      phone: myProfile.phone || "", 
      display_name: myProfile.display_name || username, 
      username: username, 
      notifications_enabled: myProfile.notifications_enabled 
    });
    setActiveModal("settings");
  };

  const handlePinSelected = () => {
    const { pinnedChats, setPinnedChats } = useSettingsStore.getState();
    const newPinned = [...pinnedChats];
    selectedChats.forEach(chatId => {
      const originalId = chatId.split('_').find(u => u !== username) || chatId;
      if (newPinned.includes(originalId)) newPinned.splice(newPinned.indexOf(originalId), 1);
      else newPinned.unshift(originalId);
    });
    setPinnedChats(newPinned);
    clearSelection();
  };

  const handleDeleteSelected = () => {
    if (!window.confirm(`Удалить выбранные чаты?`)) return;
    selectedChats.forEach(chatId => {
      const originalId = chatId.split('_').find(u => u !== username) || chatId;
      if (!chatId.includes('_')) socket.emit("leave_group", { room: originalId });
      else socket.emit("remove_friend", originalId);
    });
    clearSelection();
  };

  const getAvatarStyle = (imgUrl) => {
    return imgUrl 
      ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333', color: 'transparent' } 
      : { backgroundColor: '#333' };
  };

  return (
    <div className={`left-panel ${isMobile && showMobileChat ? "hidden" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-top">
        <div className="sidebar-header-content">
          <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={openSettings}>
            {!myProfile.avatar_url && username?.[0]?.toUpperCase()}
          </div>
          {isMobile && <div className="mobile-app-title">Connect</div>}
        </div>
        
        <div className="actMenu" style={{display: 'flex', gap: 15, alignItems: 'center'}}>
          <div onClick={() => setActiveModal("notifications")} title="Уведомления">
            <IconBell hasUnread={hasUnreadNotifs} />
          </div>
          {globalRole === 'mod' && (
            <button className="fab-btn" style={{backgroundColor: '#444', width: 40, height: 40}} onClick={() => setActiveModal("adminPanel")}>
              <IconShield />
            </button>
          )}
          <button className="fab-btn" onClick={() => setActiveModal("actionMenu")}>
            <svg id="plus-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
              <path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <div className="sidebar-selection-header">
          <button className="back-btn" onClick={clearSelection}>&times;</button>
          <span className="selection-title">Выбрано: {selectedChats.length}</span>
          <div className="selection-actions">
            <button className="tool-btn" onClick={handlePinSelected} title="Закрепить/Открепить"><IconPin /></button>
            <button className="tool-btn" onClick={() => setActiveModal("addToFolder")} title="В папку"><IconFolder /></button>
            <button className="tool-btn" style={{color: '#ff4d4d'}} onClick={handleDeleteSelected} title="Удалить"><IconTrash /></button>
          </div>
        </div>
      )}

      {/* Вывод папок и списка чатов */}
      <div className="friends-list">
        {!isSelectionMode && <FolderTabs />}
        <ChatList />
      </div>
    </div>
  );
};

export default Sidebar;