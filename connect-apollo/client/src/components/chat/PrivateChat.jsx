import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import MessageItem from "../common/MessageItem";
import ChatInput from './ChatInput';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useProfileStore } from '../../stores/profileStore';
import { useCallLogic } from '../../hooks/useCallLogic';

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Личный чат';
  const date = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 2) return 'только что в сети';
  if (diffMins < 60) return `был(а) ${diffMins} мин. назад`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `был(а) ${h} ч. назад`;
  return `был(а) ${Math.floor(h / 24)} дн. назад`;
};

const PrivateChat = () => {
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  
  const room = useChatStore(s => s.room);
  const messageList = useChatStore(s => s.messageList);
  const isLoadingHistory = useChatStore(s => s.isLoadingHistory);
  const typingText = useChatStore(s => s.typingText);
  const hasMore = useChatStore(s => s.hasMore);
  
  const friends = useProfileStore(s => s.friends);
  const chatReads = useChatStore(s => s.chatReads);

  const isMobile = useUIStore(s => s.isMobile);
  const isEmojiPickerOpen = useUIStore(s => s.isEmojiPickerOpen);
  const showMenu = useUIStore(s => s.showMenu);
  const setShowMenu = useUIStore(s => s.setShowMenu);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const showScrollBottomBtn = useUIStore(s => s.showScrollBottomBtn);
  const unreadScrollCount = useUIStore(s => s.unreadScrollCount);
  const setContextMenu = useUIStore(s => s.setContextMenu);

  const { startCall } = useCallLogic();

  const partnerUsername = room.split('_').find(u => u !== username) || "???";
  const partnerFriend = friends.find(f => (f.username || f) === partnerUsername);
  const isPartnerOnline = partnerFriend?.is_online || false;
  const partnerLastSeen = partnerFriend?.last_seen;
  const partnerAvatarUrl = partnerFriend?.avatar_url;
  const partnerLastReadId = chatReads[room]?.[partnerUsername] || 0;

  const virtuosoRef = useRef(null);
  const prevMessageCount = useRef(messageList.length);
  const [animateMsgId, setAnimateMsgId] = useState(null);

  const forceScrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollTo({ top: 9999999, behavior: 'smooth' });
    useUIStore.getState().setShowScrollBottomBtn(false);
    useUIStore.getState().setUnreadScrollCount(0);
  }, []);

  useEffect(() => {
    if (messageList.length > prevMessageCount.current) {
      const lastMsg = messageList[messageList.length - 1];

      // Анимируем только новое сообщение (не при подгрузке истории сверху).
      // Прокрутку к низу делает followOutput="smooth" у Virtuoso — отдельный
      // ручной скролл здесь не нужен (иначе две прокрутки конфликтуют и дёргают).
      setAnimateMsgId(lastMsg?.id || lastMsg?.tempId);
      const t = setTimeout(() => setAnimateMsgId(null), 400);

      prevMessageCount.current = messageList.length;
      return () => clearTimeout(t);
    }
    prevMessageCount.current = messageList.length;
  }, [messageList, username]);

  const onContextMenu = (e, msg, x, y) => {
    setContextMenu({ x, y, msg });
  };

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoadingHistory && messageList.length > 0) {
      useChatStore.getState().setIsLoadingHistory(true);
      socket.emit("load_more_messages", { room, offset: messageList.length });
    }
  }, [hasMore, isLoadingHistory, messageList.length, room, socket]);

  return (
    <>
      <div className="chat-header">
        <div className="header-left">
          {isMobile && (
            <button className="back-btn" onClick={() => useUIStore.getState().setShowMobileChat(false)}>
              <BackIcon />
            </button>
          )}
          <div
            className="header-avatar"
            style={partnerAvatarUrl ? { backgroundImage: `url(${partnerAvatarUrl})` } : {}}
            onClick={() => socket.emit("get_user_profile", partnerUsername)}
          >
            {!partnerAvatarUrl && partnerUsername[0]?.toUpperCase()}
          </div>
          <div
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1 }}
            onClick={() => socket.emit("get_user_profile", partnerUsername)}
          >
            <h3 style={{ margin: 0 }}>{partnerUsername}</h3>
            <span style={{ fontSize: 12, color: isPartnerOnline ? 'var(--text-online)' : 'var(--text-2)' }}>
              {typingText || (isPartnerOnline ? 'в сети' : formatLastSeen(partnerLastSeen))}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="menu-btn" 
            onClick={() => startCall(true)} 
            title="Видеозвонок"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>

          <div style={{ position: "relative" }}>
            <button 
              className="menu-btn" 
              onClick={() => setShowMenu(!showMenu)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm16 5H4v2h16v-2z"/>
              </svg>
            </button>

            {showMenu && (
              <div className="dropdown-menu">
                <div 
                  className="menu-item" 
                  onClick={() => socket.emit("get_user_profile", partnerUsername)}
                >
                  Профиль
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`chat-body ${isEmojiPickerOpen ? 'emoji-open' : ''}`}>
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%', width: '100%' }}
          data={messageList}
          computeItemKey={(index, msg) => msg.id || msg.tempId}
          initialTopMostItemIndex={messageList.length - 1}
          alignToBottom={true}
          startReached={loadMoreMessages}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          atBottomStateChange={(atBottom) => {
            if (atBottom) {
              useUIStore.getState().setShowScrollBottomBtn(false);
              useUIStore.getState().setUnreadScrollCount(0);
            } else {
              useUIStore.getState().setShowScrollBottomBtn(true);
            }
          }}
          components={{
            Header: () => isLoadingHistory ? (
              <div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: 10 }}>
                Загрузка истории...
              </div>
            ) : null
          }}
          itemContent={(index, msg) => {
            const prev = messageList[index - 1];
            const next = messageList[index + 1];
            const isFirstInGroup = !prev || prev.author !== msg.author;
            const isLastInGroup = !next || next.author !== msg.author;
            return (
            <div className="msg-row">
              <MessageItem
                msg={msg}
                username={username}
                setImageModalSrc={setImageModalSrc}
                onContextMenu={onContextMenu}
                onReplyTrigger={(msg) => useChatStore.getState().setReplyingTo(msg)}
                onMentionClick={(user) => socket.emit("get_user_profile", user)}
                onReaction={(msgId, msgRoom, emoji) => socket.emit("toggle_reaction", { messageId: msgId, room: msgRoom, emoji })}
                partnerLastReadId={partnerLastReadId}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                animateIn={(msg.id || msg.tempId) === animateMsgId}
                scrollToMessage={(id) => {
                  const msgIndex = messageList.findIndex(m => m.id === id);
                  if (msgIndex !== -1) {
                    virtuosoRef.current?.scrollToIndex({
                      index: msgIndex,
                      align: 'center',
                      behavior: 'smooth'
                    });
                    setTimeout(() => {
                      const el = document.getElementById(`message-${id}`);
                      if (el) {
                        el.classList.add('highlighted');
                        setTimeout(() => el.classList.remove('highlighted'), 1500);
                      }
                    }, 300);
                  }
                }}
              />
            </div>
          );
          }}
        />
      </div>

      <div className="chat-input-background"></div>

      {showScrollBottomBtn && (
        <div className="scroll-bottom-btn" onClick={forceScrollToBottom}>
          {unreadScrollCount > 0 && <span className="unread-badge">{unreadScrollCount}</span>}
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      )}

      <ChatInput />
    </>
  );
};

export default PrivateChat;