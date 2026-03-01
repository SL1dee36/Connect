import React from 'react';
import PrivateChat from './PrivateChat';
import GroupChat from './GroupChat';
import ContextMenu from './ContextMenu';
import EmojiPickerPanel from '../common/EmojiPickerPanel';
import GlobalVideoPlayer from '../common/GlobalVideoPlayer';
import { IconMessage } from '../common/Icons';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';

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
              />
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