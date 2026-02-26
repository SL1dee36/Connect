import React from 'react';
import { IconPin, IconCheckCircle, IconDrag } from '../common/Icons';

const ChatList = ({
  unifiedChatList,
  room,
  selectedChats,
  pinnedChats,
  isMobileDragging,
  draggedItemId,
  isSelectionMode,
  username,
  chatPreviews,
  onChatClick,
  onChatLongPress,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
  onTouchDragStart,
  chatLongPressTimer
}) => {
  const renderPreview = (chat) => {
    if (!chat.preview) {
      return "Нет сообщений";
    }
    const sender = chat.preview.sender === username ? "Вы: " : (chat.type === 'dm' ? "" : `${chat.preview.sender}: `);
    let text = chat.preview.text;
    if (chat.preview.type === 'image' || chat.preview.type === 'gallery') text = "📷 Изображение";
    if (chat.preview.type === 'audio') text = "🎤 Голосовое сообщение";
    if (chat.preview.type === 'video') text = "📹 Видео сообщение";
    return (
      <>
        <span className="preview-sender">{sender}</span>
        <span className="preview-text">{text}</span>
      </>
    );
  };

  if (unifiedChatList.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
        Нет чатов в этой папке
      </div>
    );
  }

  return (
    <div className="chat-list-scroll-container">
      {unifiedChatList.map((chat, idx) => {
        const isActive = chat.id === room;
        const isSelected = selectedChats.includes(chat.id);
        const isPinned = pinnedChats.includes(chat.originalId);
        const isBeingDragged = isMobileDragging && draggedItemId === chat.id;

        return (
          <div
            key={chat.id}
            data-chat-id={chat.id}
            className={`chat-list-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isPinned ? 'pinned' : ''} ${isBeingDragged ? 'dragging' : ''}`}
            onClick={() => onChatClick(chat.id)}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              onChatLongPress(chat.id); 
            }}
            onTouchStart={(e) => {
              if (!e.target.closest('.drag-handle')) {
                chatLongPressTimer.current = setTimeout(() => {
                  onChatLongPress(chat.id);
                }, 600);
              }
            }}
            onTouchEnd={() => {
              if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
            }}
            onTouchMove={() => {
              if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
            }}
            draggable={!isSelectionMode}
            onDragStart={(e) => onDragStart(e, idx)}
            onDragEnter={(e) => onDragEnter(e, idx)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            {isSelected && (
              <div className="check-icon-container">
                <IconCheckCircle />
              </div>
            )}
            <div className="friend-avatar" style={{
              backgroundImage: chat.avatar ? `url(${chat.avatar})` : 'none',
              backgroundColor: '#333'
            }}>
              {!chat.avatar && (chat.name[0] ? chat.name[0].toUpperCase() : "?")}
            </div>
            <div className="chat-info-mobile">
              <div className="chat-name chat-name-row">
                <span className="chat-name-text">{chat.name}</span>
                {isPinned && <IconPin />}
                <span className="preview-time">{chat.preview?.time}</span>
              </div>
              <div className="chat-preview">
                {renderPreview(chat)}
              </div>
            </div>
            <div
              className="drag-handle"
              onTouchStart={(e) => onTouchDragStart(e, chat)}
            >
              <IconDrag />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;