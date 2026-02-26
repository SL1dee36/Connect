import React from 'react';
import MessageItem from "../common/MessageItem"
import ChatInput from './ChatInput';

const PrivateChat = ({
  socket, username, room, messageList, isLoadingHistory, hasMore, typingText, chatBodyRef, messagesEndRef,
  onScroll, onContextMenu, onReply, scrollToMessage, onMentionClick, setImageModalSrc,
  currentMessage, setCurrentMessage, attachedFiles, setAttachedFiles, replyingTo, setReplyingTo,
  isRecording, isLocked, recordingTime, recordedMedia, videoShape, setVideoShape,
  isEmojiPickerOpen, setIsEmojiPickerOpen, isUploading, inputMode, textareaRef, fileInputRef,
  onSendMessage, onFileSelect, onRemoveAttachment, onEmojiSelect, onTyping, onRecordStart,
  onRecordMove, onRecordEnd, onCancelRecording, onSendRecorded, formatTime, onStartCall,
  showScrollBottomBtn, unreadScrollCount, scrollToBottom
}) => {
  const partnerUsername = room.split('_').find(u => u !== username);

  return (
    <>
      <div className="chat-header">
        <div className="header-left">
          <div onClick={() => {}} style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: 0 }}>{partnerUsername}</h3>
            <span style={{ fontSize: 12, color: "#777" }}>
              {typingText || "Личный чат"}
            </span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <button className="menu-btn" onClick={() => onStartCall(true)} title="Видеозвонок">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
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
    </>
  );
};

export default PrivateChat;