import React, { useRef, useEffect } from 'react';
import MessageItem from "../common/MessageItem";
import ChatInput from './ChatInput';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatStore } from '../../stores/chatStore';

const GroupChat = () => {
  const username = useAuthStore(s => s.username);
  const socket = useAuthStore(s => s.socket);
  
  const room = useChatStore(s => s.room);
  const messageList = useChatStore(s => s.messageList);
  const isLoadingHistory = useChatStore(s => s.isLoadingHistory);
  const typingText = useChatStore(s => s.typingText);
  const groupMembers = useChatStore(s => s.groupMembers);
  const roomSettings = useChatStore(s => s.roomSettings);
  const myRole = useChatStore(s => s.myRole);
  const globalRole = useChatStore(s => s.globalRole);
  
  const isEmojiPickerOpen = useUIStore(s => s.isEmojiPickerOpen);
  const showMenu = useUIStore(s => s.showMenu);
  const setShowMenu = useUIStore(s => s.setShowMenu);
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const showScrollBottomBtn = useUIStore(s => s.showScrollBottomBtn);
  const unreadScrollCount = useUIStore(s => s.unreadScrollCount);
  const setContextMenu = useUIStore(s => s.setContextMenu);

  const canWrite = myRole !== 'guest' || globalRole === 'mod';

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

  const leaveGroup = () => {
    if (window.confirm(myRole === "owner" ? "Удалить группу?" : "Выйти из группы?")) {
      socket.emit("leave_group", { room });
    }
  };

  return (
    <>
      <div className="chat-header">
        <div className="header-left">
          <div onClick={() => setActiveModal("groupInfo")} style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: 0 }}>{room}</h3>
            <span style={{ fontSize: 12, color: "#777" }}>
              {typingText || `${groupMembers?.length} участников`}
            </span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <div style={{ position: "relative" }}>
            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm16 5H4v2h16v-2z"/></svg>
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <div className="menu-item" onClick={() => setActiveModal("groupInfo")}>
                  Информация
                </div>
                <div className="menu-item" onClick={() => setActiveModal("addToGroup")}>
                  Добавить в группу
                </div>
              </div>
            )}
          </div>
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
            onMentionClick={(user) => {
               socket.emit("get_user_profile", user);
            }}
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
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      )}

      {canWrite ? (
        <ChatInput />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
          У вас нет прав писать в этот чат.
        </div>
      )}
    </>
  );
};

export default GroupChat;