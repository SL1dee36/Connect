import React, { useRef, useCallback, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
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
  const hasMore = useChatStore(s => s.hasMore);
  
  const isEmojiPickerOpen = useUIStore(s => s.isEmojiPickerOpen);
  const showMenu = useUIStore(s => s.showMenu);
  const setShowMenu = useUIStore(s => s.setShowMenu);
  const setActiveModal = useUIStore(s => s.setActiveModal);
  const setImageModalSrc = useUIStore(s => s.setImageModalSrc);
  const showScrollBottomBtn = useUIStore(s => s.showScrollBottomBtn);
  const unreadScrollCount = useUIStore(s => s.unreadScrollCount);
  const setContextMenu = useUIStore(s => s.setContextMenu);

  const canWrite = myRole !== 'guest' || globalRole === 'mod';

  const virtuosoRef = useRef(null);
  const prevMessageCount = useRef(messageList.length);

  const leaveGroup = () => {
    if (window.confirm(myRole === "owner" ? "Удалить группу?" : "Выйти из группы?")) {
      socket.emit("leave_group", { room });
    }
  };

  const forceScrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollTo({ top: 9999999, behavior: 'smooth' });
    useUIStore.getState().setShowScrollBottomBtn(false);
    useUIStore.getState().setUnreadScrollCount(0);
  }, []);

  useEffect(() => {
    if (messageList.length > prevMessageCount.current) {
      const lastMsg = messageList[messageList.length - 1];
      const isMine = lastMsg?.author === username;

      if (isMine) {
        setTimeout(forceScrollToBottom, 50); 
      }
    }
    prevMessageCount.current = messageList.length;
  }, [messageList, username, forceScrollToBottom]);

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
              <div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: 10 }}>Загрузка истории...</div>
            ) : null
          }}
          itemContent={(index, msg) => (
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
              <MessageItem
                msg={msg}
                username={username}
                setImageModalSrc={setImageModalSrc}
                onContextMenu={onContextMenu}
                onReplyTrigger={(msg) => useChatStore.getState().setReplyingTo(msg)}
                onMentionClick={(user) => socket.emit("get_user_profile", user)}
                scrollToMessage={(id) => {
                  const msgIndex = messageList.findIndex(m => m.id === id);
                  if (msgIndex !== -1) {
                    virtuosoRef.current?.scrollToIndex({ index: msgIndex, align: 'center', behavior: 'smooth' });
                    setTimeout(() => {
                      const el = document.getElementById(`message-${id}`);
                      if (el) { el.classList.add('highlighted'); setTimeout(() => el.classList.remove('highlighted'), 1500); }
                    }, 300);
                  }
                }}
              />
            </div>
          )}
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