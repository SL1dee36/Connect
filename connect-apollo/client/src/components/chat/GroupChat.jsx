import React, { useEffect, useState } from 'react';
import MessageItem from "../common/MessageItem"
import ChatInput from './ChatInput';
import { IconMore } from '../common/Icons';

const GroupChat = ({
  socket,
  username,
  room,
  messageList = [],
  isLoadingHistory,
  hasMore,
  typingText,
  groupMembers,
  roomSettings,
  myRole,
  globalRole,
  chatBodyRef,
  messagesEndRef,
  onScroll,
  onContextMenu,
  onReply,
  scrollToMessage,
  onMentionClick,
  setImageModalSrc,
  onOpenGroupInfo,
  onAddToGroup,
  showMenu,
  setShowMenu,
  currentMessage,
  setCurrentMessage,
  attachedFiles,
  setAttachedFiles,
  replyingTo,
  setReplyingTo,
  isRecording,
  isLocked,
  recordingTime,
  recordedMedia,
  videoShape,
  setVideoShape,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  isUploading,
  inputMode,
  textareaRef,
  fileInputRef,
  onSendMessage,
  onFileSelect,
  onRemoveAttachment,
  onEmojiSelect,
  onTyping,
  onRecordStart,
  onRecordMove,
  onRecordEnd,
  onCancelRecording,
  onSendRecorded,
  formatTime,
  showScrollBottomBtn, 
  unreadScrollCount, 
  scrollToBottom
}) => {
  const canWrite = myRole !== 'guest' || globalRole === 'mod';

  return (
    <>
      <div className="chat-header">
        <div className="header-left">
          <div onClick={onOpenGroupInfo} style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}>
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
                <div className="menu-item" onClick={onOpenGroupInfo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M6 3h14v2h2v6h-2v8h-2V5H6V3zm8 14v-2H6V5H4v10H2v4h2v2h14v-2h-2v-2h-2zm0 0v2H4v-2h10zM8 7h8v2H8V7zm8 4H8v2h8v-2z"/></svg>
                  Информация
                </div>
                <div className="menu-item" onClick={onAddToGroup}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg>
                  Добавить в группу
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`chat-body ${isEmojiPickerOpen ? 'emoji-open' : ''}`} ref={chatBodyRef} onScroll={onScroll}>
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
            onReplyTrigger={onReply}
            scrollToMessage={scrollToMessage}
            onMentionClick={onMentionClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-background"></div>

      {showScrollBottomBtn && (
        <div className="scroll-bottom-btn" onClick={scrollToBottom}>
          {unreadScrollCount > 0 && (
            <span className="unread-badge">{unreadScrollCount}</span>
          )}
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
      )}

      {canWrite ? (
        <ChatInput
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          attachedFiles={attachedFiles}
          setAttachedFiles={setAttachedFiles}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          isRecording={isRecording}
          isLocked={isLocked}
          recordingTime={recordingTime}
          recordedMedia={recordedMedia}
          videoShape={videoShape}
          setVideoShape={setVideoShape}
          isEmojiPickerOpen={isEmojiPickerOpen}
          setIsEmojiPickerOpen={setIsEmojiPickerOpen}
          isUploading={isUploading}
          inputMode={inputMode}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          onSendMessage={onSendMessage}
          onFileSelect={onFileSelect}
          onRemoveAttachment={onRemoveAttachment}
          onEmojiSelect={onEmojiSelect}
          onTyping={onTyping}
          onRecordStart={onRecordStart}
          onRecordMove={onRecordMove}
          onRecordEnd={onRecordEnd}
          onCancelRecording={onCancelRecording}
          onSendRecorded={onSendRecorded}
          formatTime={formatTime}
        />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
          У вас нет прав писать в этот чат.
        </div>
      )}
    </>
  );
};

export default GroupChat;