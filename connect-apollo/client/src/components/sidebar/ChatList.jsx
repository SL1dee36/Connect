import React, { useRef } from 'react';
import { IconPin, IconCheckCircle, IconDrag } from '../common/Icons';

import { useUnifiedChatList } from '../../hooks/useUnifiedChatList';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';

const ChatList = () => {
  // Сторы
  const username = useAuthStore(s => s.username);
  
  const room = useChatStore(s => s.room);
  const setRoom = useChatStore(s => s.setRoom);
  
  const isSelectionMode = useUIStore(s => s.isSelectionMode);
  const setIsSelectionMode = useUIStore(s => s.setIsSelectionMode);
  const selectedChats = useUIStore(s => s.selectedChats);
  const toggleChatSelection = useUIStore(s => s.toggleChatSelection);
  const isMobile = useUIStore(s => s.isMobile);
  const setSwipeX = useUIStore(s => s.setSwipeX);
  const setShowMobileChat = useUIStore(s => s.setShowMobileChat);
  
  const isMobileDragging = useUIStore(s => s.isMobileDragging);
  const setIsMobileDragging = useUIStore(s => s.setIsMobileDragging);
  const draggedItemId = useUIStore(s => s.draggedItemId);
  const setDraggedItemId = useUIStore(s => s.setDraggedItemId);

  const pinnedChats = useSettingsStore(s => s.pinnedChats);
  const customChatOrder = useSettingsStore(s => s.customChatOrder);
  const setCustomChatOrder = useSettingsStore(s => s.setCustomChatOrder);

  const unifiedChatList = useUnifiedChatList();

  // Рефы для drag & drop и долгого нажатия
  const dragItemRef = useRef(null);
  const dragOverItemRef = useRef(null);
  const chatLongPressTimer = useRef(null);

  // Логика кликов
  const switchChat = (targetName) => {
    if (isSelectionMode) return;
    if (targetName !== room) setRoom(targetName);
    
    if (isMobile) {
      setSwipeX(0);
      setShowMobileChat(true);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  };

  const handleChatClick = (chatId) => {
    if (isSelectionMode) {
      toggleChatSelection(chatId);
    } else {
      switchChat(chatId);
    }
  };

  const handleChatLongPress = (chatId) => {
    if (isSelectionMode) return;
    setIsSelectionMode(true);
    toggleChatSelection(chatId);
  };

  // Drag & Drop
  const onDragStart = (e, index) => {
    if (isSelectionMode) { e.preventDefault(); return; }
    dragItemRef.current = index;
  };
  
  const onDragEnter = (e, index) => {
    if (isSelectionMode) return;
    dragOverItemRef.current = index;
  };
  
  const onDragEnd = () => {
    if (isSelectionMode) return;
    if (dragItemRef.current === null || dragOverItemRef.current === null) return;
    
    const draggedId = unifiedChatList[dragItemRef.current]?.originalId;
    const droppedId = unifiedChatList[dragOverItemRef.current]?.originalId;
    
    if (!draggedId || !droppedId) return;

    const newOrder = [...customChatOrder];
    unifiedChatList.forEach(c => {
      if (!newOrder.includes(c.originalId)) newOrder.push(c.originalId);
    });
    
    const fromIndex = newOrder.indexOf(draggedId);
    const toIndex = newOrder.indexOf(droppedId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedId);
      setCustomChatOrder(newOrder);
    }
    
    dragItemRef.current = null;
    dragOverItemRef.current = null;
  };

  // DRAG & DROP (Мобилки)
  const onTouchDragStart = (e, chat) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    chatLongPressTimer.current = setTimeout(() => {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      setIsMobileDragging(true);
      setDraggedItemId(chat.id);
      if (customChatOrder.length === 0) {
        setCustomChatOrder(unifiedChatList.map(c => c.originalId));
      }
    }, 200);
  };

  const onTouchDragMove = (e) => {
    if (!isMobileDragging) {
      if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
      return;
    }
    if (e.cancelable) e.preventDefault();
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const chatItem = element.closest('.chat-list-item');
      if (chatItem) {
        const targetId = chatItem.getAttribute('data-chat-id');
        const draggedChat = unifiedChatList.find(c => c.id === draggedItemId);
        const targetChat = unifiedChatList.find(c => c.id === targetId);
        
        if (draggedChat && targetChat && targetId !== draggedItemId) {
          const newOrder = [...(customChatOrder.length ? customChatOrder : unifiedChatList.map(c => c.originalId))];
          const fromIndex = newOrder.indexOf(draggedChat.originalId);
          const toIndex = newOrder.indexOf(targetChat.originalId);
          
          if (fromIndex !== -1 && toIndex !== -1) {
            newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, draggedChat.originalId);
            setCustomChatOrder(newOrder);
          }
        }
      }
    }
  };

  const onTouchDragEnd = () => {
    if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
    setIsMobileDragging(false);
    setDraggedItemId(null);
  };

  // Рендер превью
  const renderPreview = (chat) => {
    if (!chat.preview) return "Нет сообщений";
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
    return <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>Нет чатов в этой папке</div>;
  }

  return (
    <div 
      className="chat-list-scroll-container"
      onTouchMove={onTouchDragMove}
      onTouchEnd={onTouchDragEnd}
    >
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
            onClick={() => handleChatClick(chat.id)}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              handleChatLongPress(chat.id); 
            }}
            onTouchStart={(e) => {
              if (!e.target.closest('.drag-handle')) {
                chatLongPressTimer.current = setTimeout(() => {
                  handleChatLongPress(chat.id);
                }, 600);
              }
            }}
            onTouchEnd={() => { if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current); }}
            onTouchMove={() => { if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current); }}
            draggable={!isSelectionMode}
            onDragStart={(e) => onDragStart(e, idx)}
            onDragEnter={(e) => onDragEnter(e, idx)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            {isSelected && (
              <div className="check-icon-container"><IconCheckCircle /></div>
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