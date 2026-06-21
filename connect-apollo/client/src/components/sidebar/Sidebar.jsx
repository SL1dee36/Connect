import React, { useState, useEffect, useRef } from 'react';
import FolderTabs from './FolderTabs';
import ChatList from './ChatList';
import { IconPin, IconFolder, IconTrash } from '../common/Icons';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';

const IconBellInline = ({ dot }) => (
  <div style={{ position: 'relative', display: 'flex' }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
    {dot && <span style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, background: '#ff4d4d', borderRadius: '50%', border: '1.5px solid var(--bg-1)' }} />}
  </div>
);

const IconCompose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const IconNewGroup = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const Sidebar = () => {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  const myProfile = useProfileStore(s => s.myProfile);
  const searchResults = useProfileStore(s => s.searchResults);
  const isSearching = useProfileStore(s => s.isSearching);
  const friends = useProfileStore(s => s.friends);

  const isMobile = useUIStore(s => s.isMobile);
  const showMobileChat = useUIStore(s => s.showMobileChat);
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const isSelectionMode = useUIStore(s => s.isSelectionMode);
  const selectedChats = useUIStore(s => s.selectedChats);
  const clearSelection = useUIStore(s => s.clearSelection);

  const globalRole = useChatStore(s => s.globalRole);
  const hasUnreadNotifs = useSettingsStore(s => s.hasUnreadNotifs);
  const notifications = useSettingsStore(s => s.notifications);
  const setNotifications = useSettingsStore(s => s.setNotifications);

  const pendingRequests = notifications.filter(n => n.type === 'friend_request');

  const isSearchActive = search.trim().length >= 2;

  // Дебоунс поиска пользователей
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      useProfileStore.getState().setSearchResults([]);
      useProfileStore.getState().setIsSearching(false);
      return;
    }
    useProfileStore.getState().setIsSearching(true);
    const timer = setTimeout(() => {
      socket?.emit("search_users", trimmed);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, socket]);

  const clearSearch = () => {
    setSearch('');
    useProfileStore.getState().setSearchResults([]);
    useProfileStore.getState().setIsSearching(false);
  };

  const handleOpenProfile = (user) => {
    socket?.emit("get_user_profile", user.username);
    clearSearch();
  };

  const isFriend = (uname) => friends.some(f => (f.username || f) === uname);

  const openSettings = () => {
    if (socket) {
      socket.emit("get_my_profile", username);
      socket.emit("get_avatar_history", username);
    }
    useProfileStore.getState().setProfileForm({
      bio: myProfile.bio || "",
      phone: myProfile.phone || "",
      display_name: myProfile.display_name || username,
      username,
      notifications_enabled: myProfile.notifications_enabled,
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
    if (!window.confirm('Удалить выбранные чаты?')) return;
    selectedChats.forEach(chatId => {
      const originalId = chatId.split('_').find(u => u !== username) || chatId;
      if (!chatId.includes('_')) socket.emit("leave_group", { room: originalId });
      else socket.emit("remove_friend", originalId);
    });
    clearSelection();
  };

  const getAvatarStyle = (imgUrl) => imgUrl
    ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333', color: 'transparent' }
    : { backgroundColor: '#333' };

  return (
    <div className={`left-panel ${isMobile && showMobileChat ? "hidden" : ""}`}>

      {/* ── Header ── */}
      <div className="sidebar-top">
        <div className="sidebar-header-content">
          <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={openSettings}>
            {!myProfile.avatar_url && username?.[0]?.toUpperCase()}
          </div>
          {isMobile && <span className="mobile-app-title">Connect</span>}
        </div>

        <div className="actMenu">
          <button className="sidebar-icon-btn" onClick={() => setActiveModal("notifications")} title="Уведомления">
            <IconBellInline dot={hasUnreadNotifs} />
          </button>
          {globalRole === 'mod' && (
            <button className="sidebar-icon-btn" onClick={() => setActiveModal("adminPanel")} title="Модератор">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </button>
          )}
          <button className="sidebar-icon-btn" onClick={() => setActiveModal("createGroup")} title="Создать группу">
            <IconNewGroup />
          </button>
          <button
            className="sidebar-icon-btn sidebar-icon-btn--accent"
            onClick={() => searchInputRef.current?.focus()}
            title="Написать"
          >
            <IconCompose />
          </button>
        </div>
      </div>

      {/* ── Selection Mode ── */}
      {isSelectionMode && (
        <div className="sidebar-selection-header">
          <button
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
          <span className="selection-title">Выбрано: {selectedChats.length}</span>
          <div className="selection-actions">
            <button className="tool-btn" onClick={handlePinSelected} title="Закрепить"><IconPin /></button>
            <button className="tool-btn" onClick={() => setActiveModal("addToFolder")} title="В папку"><IconFolder /></button>
            <button className="tool-btn" style={{ color: '#ff4d4d' }} onClick={handleDeleteSelected} title="Удалить"><IconTrash /></button>
          </div>
        </div>
      )}

      {/* ── Search + Results ── */}
      <div className="friends-list">
        {!isSelectionMode && (
          <div className="sidebar-search">
            <div className="sidebar-search-wrap">
              <span className="sidebar-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </span>
              <input
                ref={searchInputRef}
                className="sidebar-search-input"
                type="text"
                placeholder="Поиск чатов и людей..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="sidebar-search-clear" onClick={clearSearch} title="Очистить">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Плашка входящих заявок в друзья */}
        {!isSelectionMode && pendingRequests.length > 0 && (
          <div className="friend-requests-banner">
            <div className="friend-requests-banner-text">
              {pendingRequests.length === 1
                ? <><b>{pendingRequests[0].content}</b> хочет добавить вас в друзья</>
                : <><b>{pendingRequests.length}</b> входящих заявки в друзья</>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {pendingRequests.length === 1 ? (
                <>
                  <button
                    className="frb-btn frb-btn--accept"
                    onClick={() => {
                      socket?.emit("accept_friend_request", { notifId: pendingRequests[0].id, fromUsername: pendingRequests[0].content });
                      setNotifications(prev => prev.filter(n => n.id !== pendingRequests[0].id));
                    }}
                  >Принять</button>
                  <button
                    className="frb-btn frb-btn--decline"
                    onClick={() => {
                      socket?.emit("decline_friend_request", { notifId: pendingRequests[0].id });
                      setNotifications(prev => prev.filter(n => n.id !== pendingRequests[0].id));
                    }}
                  >✕</button>
                </>
              ) : (
                <button className="frb-btn frb-btn--accept" onClick={() => setActiveModal("notifications")}>
                  Посмотреть
                </button>
              )}
            </div>
          </div>
        )}

        {/* Folder tabs — скрываем при поиске */}
        {!isSelectionMode && !isSearchActive && <FolderTabs />}

        {/* Секция "Чаты" */}
        {isSearchActive && (
          <div className="divider" style={{ margin: '10px 14px 2px' }}>Чаты</div>
        )}
        <ChatList search={search} />

        {/* Секция "Люди" — только при активном поиске */}
        {isSearchActive && (
          <div className="people-search-section">
            <div className="divider">Люди</div>

            {isSearching && (
              <div className="people-search-loading">
                <span className="spinner" style={{ width: 14, height: 14, marginRight: 8, flexShrink: 0 }} />
                Поиск пользователей...
              </div>
            )}

            {!isSearching && searchResults.length === 0 && (
              <div className="people-search-empty">Пользователи не найдены</div>
            )}

            {searchResults.map(user => (
              <div
                key={user.username}
                className="user-search-item"
                onClick={() => handleOpenProfile(user)}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    className="friend-avatar"
                    style={user.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : {}}
                  >
                    {!user.avatar_url && (user.display_name || user.username)[0]?.toUpperCase()}
                  </div>
                  {user.isOnline && <span className="online-dot" />}
                </div>
                <div className="user-search-info">
                  <span className="user-search-name">{user.display_name || user.username}</span>
                  <span className="user-search-username">@{user.username}</span>
                </div>
                <div className="user-search-badge">
                  {isFriend(user.username)
                    ? <span className="user-friend-tag">Друг</span>
                    : (
                      <button
                        className="user-add-btn"
                        title="Добавить в друзья"
                        onClick={e => {
                          e.stopPropagation();
                          socket?.emit("send_friend_request_by_name", { toUsername: user.username });
                          e.currentTarget.textContent = '✓';
                          e.currentTarget.disabled = true;
                          e.currentTarget.style.color = 'var(--accent)';
                        }}
                      >+</button>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
