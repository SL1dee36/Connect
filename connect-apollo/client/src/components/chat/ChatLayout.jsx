import React, { useState } from 'react';
import PrivateChat from './PrivateChat';
import GroupChat from './GroupChat';
import { useApp } from '../../context/AppContext';
import ContextMenu from './ContextMenu';
import EmojiPickerPanel from '../common/EmojiPickerPanel';
import GlobalVideoPlayer from '../common/GlobalVideoPlayer';
import { IconMessage } from '../common/Icons';

const ChatLayout = ({
  isMobile,
  showMobileChat,
  swipeX,
  isSwiping,
  setIsSwiping,
  room,
  username,
  socket,
  // Message list
  messageList,
  isLoadingHistory,
  hasMore,
  chatBodyRef,
  messagesEndRef,
  onScroll,
  // Context menu
  contextMenu,
  setContextMenu,
  canDeleteMessage,
  onReply,
  onCopy,
  onDeleteMessageRequest,
  // Other
  setImageModalSrc,
  onMentionClick,
  scrollToMessage,
  onContextMenu,
  typingText,
  // Group specific
  groupMembers,
  roomSettings,
  myRole,
  globalRole,
  showMenu,
  setShowMenu,
  onOpenGroupInfo,
  onAddToGroup,
  // Call
  onStartCall,
  // ChatInput
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
  activeVideoState,
  setActiveVideoState,
  showScrollBottomBtn,
  unreadScrollCount,
  scrollToBottom,
}) => {
  const isPrivateChat = room?.includes('_');
  const { startCall } = useApp();

  const chatProps = {
    socket,
    username,
    room,
    messageList,
    isLoadingHistory,
    hasMore,
    typingText,
    chatBodyRef,
    messagesEndRef,
    onScroll,
    onContextMenu,
    onReply,
    scrollToMessage,
    onMentionClick,
    setImageModalSrc,
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
    scrollToBottom,
  };

  return (
    <div
      className={`right-panel ${isMobile && !showMobileChat ? "hidden" : ""}`}
      style={{
        transform: isMobile
          ? (showMobileChat ? `translateX(${swipeX}px)` : `translateX(100%)`)
          : 'none',
        transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 100
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
                onReply={() => onReply(contextMenu.msg)}
                onCopy={() => onCopy(contextMenu.msg.message)}
                onDeleteRequest={() => onDeleteMessageRequest(contextMenu.msg.id)}
                canDelete={canDeleteMessage(contextMenu.msg)}
              />
            )}

            {isPrivateChat ? (
              <PrivateChat
                {...chatProps}
                onStartCall={startCall}
              />
            ) : (
              <GroupChat
                {...chatProps}
                groupMembers={groupMembers}
                roomSettings={roomSettings}
                myRole={myRole}
                globalRole={globalRole}
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                onOpenGroupInfo={onOpenGroupInfo}
                onAddToGroup={onAddToGroup}
              />
            )}

            <EmojiPickerPanel
              isOpen={isEmojiPickerOpen}
              onClose={() => setIsEmojiPickerOpen(false)}
              onEmojiSelect={onEmojiSelect}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;