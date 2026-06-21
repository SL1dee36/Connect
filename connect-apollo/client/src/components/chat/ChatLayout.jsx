import React, { useState } from 'react';
import PrivateChat from './PrivateChat';
import GroupChat from './GroupChat';
import ContextMenu from './ContextMenu';
import EmojiPickerPanel from '../common/EmojiPickerPanel';
import GlobalVideoPlayer from '../common/GlobalVideoPlayer';
import { IconMessage } from '../common/Icons';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useProfileStore } from '../../stores/profileStore';
import { useUnifiedChatList } from '../../hooks/useUnifiedChatList';

const ChatLayout = () => {
  // Сторы
  const username = useAuthStore(s => s.username);
  
  const isMobile = useUIStore(s => s.isMobile);
  const showMobileChat = useUIStore(s => s.showMobileChat);
  const swipeX = useUIStore(s => s.swipeX);
  const isSwiping = useUIStore(s => s.isSwiping);
  const contextMenu = useUIStore(s => s.contextMenu);
  const setContextMenu = useUIStore(s => s.setContextMenu);
  const isEmojiPickerOpen = useUIStore(s => s.isEmojiPickerOpen);
  const setIsEmojiPickerOpen = useUIStore(s => s.setIsEmojiPickerOpen);
  const setActiveModal = useUIStore(s => s.setActiveModal);

  const room = useChatStore(s => s.room);
  const activeVideoState = useChatStore(s => s.activeVideoState);
  const setActiveVideoState = useChatStore(s => s.setActiveVideoState);
  const setEditingMessage = useChatStore(s => s.setEditingMessage);
  const setCurrentMessage = useChatStore(s => s.setCurrentMessage);
  const setReplyingTo = useChatStore(s => s.setReplyingTo);
  const setMessageToDelete = useChatStore(s => s.setMessageToDelete);
  const myRole = useChatStore(s => s.myRole);
  const globalRole = useChatStore(s => s.globalRole);
  const forwardingMessage = useChatStore(s => s.forwardingMessage);
  const setForwardingMessage = useChatStore(s => s.setForwardingMessage);

  const socket = useAuthStore(s => s.socket);

  const [forwardSearch, setForwardSearch] = useState('');
  const allChats = useUnifiedChatList();

  const isPrivateChat = room?.includes('_');

  // Логика контекстного меню
  const canDeleteMessage = (msg) => {
    const isAuthor = msg.author === username;
    const canManage = (myRole === 'owner' || myRole === 'editor' || globalRole === 'mod');
    return isAuthor || (canManage && !msg.room.includes('_'));
  };

  const handleReply = () => {
    setReplyingTo(contextMenu.msg);
    setContextMenu(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contextMenu.msg.message);
    setContextMenu(null);
  };

  const handleDeleteRequest = () => {
    setMessageToDelete(contextMenu.msg.id);
    setActiveModal('deleteConfirm');
    setContextMenu(null);
  };

  const handleEditRequest = () => {
    setEditingMessage(contextMenu.msg);
    setCurrentMessage(contextMenu.msg.message);
    setReplyingTo(null);
    setContextMenu(null);
  };

  const handleEmojiSelect = (emoji) => {
    setCurrentMessage(useChatStore.getState().currentMessage + emoji);
  };

  const handleReact = (emoji) => {
    if (!contextMenu?.msg || !socket) return;
    socket.emit("toggle_reaction", { messageId: contextMenu.msg.id, room: contextMenu.msg.room, emoji });
    setContextMenu(null);
  };

  const handleForwardRequest = () => {
    setForwardingMessage(contextMenu.msg);
    setContextMenu(null);
    setForwardSearch('');
  };

  const handleForwardTo = (targetRoom) => {
    if (!socket || !forwardingMessage) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    socket.emit("send_message", {
      room: targetRoom,
      message: forwardingMessage.message,
      type: forwardingMessage.type || 'text',
      time,
      forwardedFrom: forwardingMessage.author,
      tempId: Date.now() + Math.random(),
    });
    setForwardingMessage(null);
  };

  return (
    <div
      className={`right-panel ${isMobile && !showMobileChat ? "hidden" : ""}`}
      style={{
        transform: isMobile ? (showMobileChat ? `translateX(${swipeX}px)` : `translateX(100%)`) : 'none',
        transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, width: '100%', height: '100%', zIndex: 100
      }}
    >
      <div className="glass-chat">
        {!room ? (
          <div className="no-chat-selected">
            <div className="no-chat-icon"><IconMessage /></div>
            <p>Выберите чат из списка или создайте новый, чтобы начать общение</p>
          </div>
        ) : (
          <>
            {activeVideoState && (
              <GlobalVideoPlayer
                activeVideo={activeVideoState}
                onTogglePlay={() => window.dispatchEvent(new CustomEvent('video-toggle-play'))}
                onClose={() => {
                  setActiveVideoState(null);
                  window.dispatchEvent(new CustomEvent('video-close-focus'));
                }}
                onSeek={(val) => window.dispatchEvent(new CustomEvent('video-seek', { detail: val }))}
                onSpeedChange={() => window.dispatchEvent(new CustomEvent('video-change-speed'))}
              />
            )}

            {contextMenu && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                msg={contextMenu.msg}
                onClose={() => setContextMenu(null)}
                onReply={handleReply}
                onCopy={handleCopy}
                onDeleteRequest={handleDeleteRequest}
                canDelete={canDeleteMessage(contextMenu.msg)}
                canEdit={contextMenu.msg.author === username && contextMenu.msg.type === 'text'}
                onEditRequest={handleEditRequest}
                onReact={handleReact}
                onForward={handleForwardRequest}
              />
            )}

            {forwardingMessage && (
              <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setForwardingMessage(null)}
              >
                <div
                  style={{ background: '#1e1e1e', borderRadius: 16, padding: 20, width: 340, maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 12 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Переслать в...</span>
                    <button onClick={() => setForwardingMessage(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 20 }}>✕</button>
                  </div>
                  <input
                    autoFocus
                    value={forwardSearch}
                    onChange={e => setForwardSearch(e.target.value)}
                    placeholder="Поиск чата..."
                    style={{ background: '#2a2a2a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', outline: 'none', fontSize: 14 }}
                  />
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {allChats
                      .filter(c => c.name.toLowerCase().includes(forwardSearch.toLowerCase()))
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleForwardTo(c.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#333', backgroundImage: c.avatar ? `url(${c.avatar})` : 'none', backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                            {!c.avatar && c.name[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14 }}>{c.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {isPrivateChat ? <PrivateChat /> : <GroupChat />}

            <EmojiPickerPanel
              isOpen={isEmojiPickerOpen}
              onClose={() => setIsEmojiPickerOpen(false)}
              onEmojiSelect={handleEmojiSelect}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;