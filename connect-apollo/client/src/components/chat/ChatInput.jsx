import React, { useRef, useState } from 'react';
import { IconPaperclip, IconMic, IconCamera, IconTrash } from '../common/Icons';
import CustomAudioPlayer from '../common/CustomAudioPlayer';
import CustomVideoPlayer from '../common/CustomVideoPlayer';

const ChatInput = ({
  currentMessage = '',
  setCurrentMessage,
  attachedFiles = [],
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
  onKeyDown,
  formatTime,
  editingMessage,
  setEditingMessage
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleEmojiButtonClick = (e) => {
    e.stopPropagation();
    if (isEmojiPickerOpen) {
      setIsEmojiPickerOpen(false);
    } else {
      textareaRef.current?.blur();
      setIsEmojiPickerOpen(true);
    }
  };

  return (
    <div className={`chat-input-wrapper ${isEmojiPickerOpen ? 'emoji-open' : ''}`}>
      {recordedMedia ? (
        <div className="media-preview-bar" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10}}>
          <button className="tool-btn" onClick={onCancelRecording} style={{color: '#ff4d4d', background: 'transparent'}}>
            <IconTrash />
          </button>
          <div style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
            {recordedMedia.type === 'audio' ? (
              <div style={{width: '100%', maxWidth: '300px'}}>
                <CustomAudioPlayer src={recordedMedia.url} />
              </div>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
                <CustomVideoPlayer
                  src={recordedMedia.url}
                  shape={videoShape}
                  width="240px"
                  align="right"
                  author="Вы"
                  time="Сейчас"
                />
                <div className="shape-selector" style={{display: 'flex', flexDirection:'column', gap: 8, background: '#222', padding: 8, borderRadius: 20}}>
                  {['circle', 'heart', 'triangle', 'square'].map(s => (
                    <div
                      key={s}
                      onClick={() => setVideoShape(s)}
                      style={{
                        width: 24, height: 24, background: '#555', cursor: 'pointer',
                        border: videoShape === s ? '2px solid #2b95ff' : '2px solid transparent',
                        borderRadius: s === 'circle' ? '50%' : (s === 'square' ? '4px' : '0'),
                        clipPath: s === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                        transition: '0.2s'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="send-pill-btn" onClick={onSendRecorded} disabled={isUploading} style={{borderRadius: '50%', width: 45, height: 45, padding: 0, justifyContent: 'center'}}>
            {isUploading ? <div className="spinner"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
          </button>
        </div>
      ) : (
        <>
          {replyingTo && (
            <div className="reply-bar">
              <div>
                <div style={{ color: "#8774e1", fontSize: 13, fontWeight: "bold" }}>В ответ {replyingTo.author}</div>
                <div style={{ fontSize: 14, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}>{replyingTo.message}</div>
              </div>
              <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 24 }}>&times;</button>
            </div>
          )}

          {editingMessage && (
              <div className="edit-preview-banner" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#2a2a2a', borderLeft: '3px solid #4CAF50' }}>
                  <div>
                      <div style={{ color: '#4CAF50', fontSize: '13px', fontWeight: 'bold' }}>Редактирование сообщения</div>
                      <div style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                          {editingMessage.message}
                      </div>
                  </div>
                  <button onClick={() => { setEditingMessage(null); setCurrentMessage(''); }} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>✕</button>
              </div>
          )}
          
          {attachedFiles.length > 0 && (
            <div className="attachments-preview">
              {attachedFiles.map((f, i) => (
                <div key={i} className="attachment-thumb">
                  <img src={URL.createObjectURL(f)} alt="preview" />
                  <button onClick={() => onRemoveAttachment(i)}>&times;</button>
                </div>
              ))}
            </div>
          )}
          
          {!isRecording ? (
            <textarea
              ref={textareaRef}
              value={currentMessage}
              placeholder="Написать сообщение..."
              className="chat-textarea"
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                onTyping();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isUploading}
              onFocus={() => setIsEmojiPickerOpen(false)}
            />
          ) : (
            <div className="recording-status" style={{flex: 1, display: 'flex', alignItems: 'center', color: '#ff4d4d', fontWeight: 'bold', fontSize: 16, paddingLeft: 10}}>
              <span style={{marginRight: 10, animation: 'pulse 1s infinite'}}>●</span>
              {formatTime(recordingTime)}
            </div>
          )}
          
          <div className="input-toolbar">
            <div className="toolbar-left" style={{opacity: isRecording ? 0 : 1, pointerEvents: isRecording ? 'none' : 'auto', transition: '0.2s'}}>
              <input type="file" className="hidden-input" multiple ref={fileInputRef} onChange={onFileSelect} accept="image/*" />
              <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="Прикрепить фото">
                <IconPaperclip />
              </button>
              <button
                className="tool-btn"
                onMouseDown={handleEmojiButtonClick}
                title="Эмодзи"
                style={{background: isEmojiPickerOpen ? '#444' : '#33333390'}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#aaa" d="M5 3h14v2H5V3zm0 16H3V5h2v14zm14 0v2H5v-2h14zm0 0h2V5h-2v14zM10 8H8v2h2V8zm4 0h2v2h-2V8zm-5 6v-2H7v2h2zm6 0v2H9v-2h6zm0 0h2v-2h-2v2z"/></svg>
              </button>
            </div>
            <div className="toolbar-right">
              {(currentMessage.trim() || attachedFiles.length > 0) && !isRecording ? (
                <button className="send-pill-btn" onClick={onSendMessage} disabled={isUploading}>
                  {isUploading ? <div className="spinner"></div> : 'Отправить ↵'}
                </button>
              ) : (
                <div
                  className={`record-btn-container ${isRecording ? 'recording-active' : ''}`}
                  onMouseDown={onRecordStart}
                  onMouseMove={onRecordMove}
                  onMouseUp={onRecordEnd}
                  onMouseLeave={onRecordEnd}
                  onTouchStart={onRecordStart}
                  onTouchMove={onRecordMove}
                  onTouchEnd={onRecordEnd}
                  onTouchCancel={onRecordEnd}
                  style={{position: 'relative', touchAction: 'none', cursor: 'pointer', padding: 5}}
                >
                  {isLocked ? (
                    <button className="send-pill-btn" onClick={onRecordEnd} style={{borderRadius: '50%', width: 50, height: 50, padding: 0, justifyContent: 'center'}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                    </button>
                  ) : (
                    <button className={`mic-btn ${isRecording ? "recording" : ""}`} style={{
                      transform: isRecording ? 'scale(1.8)' : 'scale(1)',
                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      pointerEvents: 'none'
                    }}>
                      {inputMode === 'audio' ? <IconMic /> : <IconCamera />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInput;