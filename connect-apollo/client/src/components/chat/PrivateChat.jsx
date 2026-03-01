import React, { useRef, useEffect } from 'react';
import MessageItem from "../common/MessageItem";
import ChatInput from './ChatInput';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';
import { useCallLogic } from '../../hooks/useCallLogic';

const PrivateChat = () => {
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  
  const room = useChatStore(s => s.room);
  const messageList = useChatStore(s => s.messageList);
  const isLoadingHistory = useChatStore(s => s.isLoadingHistory);
  const typingText = useChatStore(s => s.typingText);
  
  const isEmojiPickerOpen = useUIStore(s => s.isEmojiPickerOpen);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const setContextMenu = useUIStore(s => s.setContextMenu);
  const showScrollBottomBtn = useUIStore(s => s.showScrollBottomBtn);
  const unreadScrollCount = useUIStore(s => s.unreadScrollCount);

  const { startCall } = useCallLogic();

  const partnerUsername = room.split('_').find(u => u !== username);

  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const isInitialLoad = useRef(true);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    isInitialLoad.current = true;
    prevMessageCount.current = 0;
    prevScrollHeight.current = 0;
  }, [room]);

  useEffect(() => {
    const scrollElem = chatBodyRef.current;
    if (!scrollElem || !messagesEndRef.current) return;

    if (prevScrollHeight.current > 0) {
      const diff = scrollElem.scrollHeight - prevScrollHeight.current;
      if (diff > 0) {
        scrollElem.scrollTop = diff; 
      }
      prevScrollHeight.current = 0;
      prevMessageCount.current = messageList.length;
      return; 
    }

    if (isInitialLoad.current && messageList.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      isInitialLoad.current = false;
      prevMessageCount.current = messageList.length;
      return;
    }

    if (messageList.length > prevMessageCount.current && !isLoadingHistory) {
      const lastMsg = messageList[messageList.length - 1];
      const isMine = lastMsg?.author === username;
      const distanceFromBottom = scrollElem.scrollHeight - scrollElem.scrollTop - scrollElem.clientHeight;
      const isNearBottom = distanceFromBottom < 300;

      if (isNearBottom || isMine) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        useUIStore.getState().setShowScrollBottomBtn(false);
        useUIStore.getState().setUnreadScrollCount(0);
      } else if (!isMine) {
        useUIStore.getState().setUnreadScrollCount(useUIStore.getState().unreadScrollCount + 1);
        useUIStore.getState().setShowScrollBottomBtn(true);
      }
    }

    prevMessageCount.current = messageList.length;
  }, [messageList, isLoadingHistory, username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useUIStore.getState().setShowScrollBottomBtn(false);
    useUIStore.getState().setUnreadScrollCount(0);
  };

  const onContextMenu = (e, msg, x, y) => {
    setContextMenu({ x, y, msg });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 150) {
      useUIStore.getState().setShowScrollBottomBtn(true);
    } else {
      useUIStore.getState().setShowScrollBottomBtn(false);
      useUIStore.getState().setUnreadScrollCount(0);
    }

    const { hasMore } = useChatStore.getState();
    if (scrollTop === 0 && hasMore && !isLoadingHistory && messageList.length > 0) {
      useChatStore.getState().setIsLoadingHistory(true);
      prevScrollHeight.current = scrollHeight; // Запоминаем высоту ДО подгрузки
      socket.emit("load_more_messages", { room, offset: messageList.length });
    }
  };

  return (
    <>
      <div className="chat-header">
        <div className="header-left">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: 0 }}>{partnerUsername}</h3>
            <span style={{ fontSize: 12, color: "#777" }}>
              {typingText || "Личный чат"}
            </span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <button className="menu-btn" onClick={() => startCall(true)} title="Видеозвонок">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
        </div>
      </div>

      <div className={`chat-body ${isEmojiPickerOpen ? 'emoji-open' : ''}`} ref={chatBodyRef} onScroll={handleScroll}>
        {isLoadingHistory && (
          <div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: 10 }}>Загрузка истории...</div>
        )}
        
        {messageList.map((msg, index) => (
          <MessageItem
            key={msg.id || index}
            msg={msg}
            username={username}
            setImageModalSrc={setImageModalSrc}
            onContextMenu={onContextMenu}
            onReplyTrigger={(msg) => useChatStore.getState().setReplyingTo(msg)}
            onMentionClick={(user) => socket.emit("get_user_profile", user)}
            scrollToMessage={(id) => {
               const el = document.getElementById(`message-${id}`);
               if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.classList.add('highlighted'); setTimeout(() => el.classList.remove('highlighted'), 1500); }
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-background"></div>

      {showScrollBottomBtn && (
        <div className="scroll-bottom-btn" onClick={scrollToBottom}>
          {unreadScrollCount > 0 && <span className="unread-badge">{unreadScrollCount}</span>}
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div>
      )}

      <ChatInput />
    </>
  );
};

export default PrivateChat;