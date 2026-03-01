import { useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const useChatLogic = () => {
  // Рефы для записи
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const streamRef = useRef(null);
  const liveVideoRef = useRef(null);
  
  // Рефы для жестов
  const longPressTimeoutRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingToCancelRef = useRef(false);
  const lastTouchTimeRef = useRef(0);

  // Вспомогательная функция: создать фейковое видео, если камера недоступна
  const createFakeVideoStream = (audioStream) => {
    const canvas = document.createElement('canvas'); 
    canvas.width = 480; canvas.height = 480;
    const ctx = canvas.getContext('2d'); 
    const stream = canvas.captureStream(30);
    if (audioStream) audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    const draw = () => { 
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); 
      requestAnimationFrame(draw); 
    };
    draw(); 
    return stream;
  };

  // Отправка текста и файлов
  const onSendMessage = async () => {
    const chat = useChatStore.getState();
    const { username, socket } = useAuthStore.getState();

    if ((!chat.currentMessage.trim() && chat.attachedFiles.length === 0) || chat.isUploading) return;

    // Логика редактирования
    if (chat.editingMessage) {
      if (!chat.currentMessage.trim() || chat.isUploading) return;
      chat.setIsUploading(true);
      try {
        chat.setMessageList(prev => prev.map(msg => 
          msg.id === chat.editingMessage.id ? { ...msg, message: chat.currentMessage, is_edited: true } : msg
        ));
        socket.emit("edit_message", {
          messageId: chat.editingMessage.id,
          newText: chat.currentMessage,
          room: chat.room,
        });
        chat.setEditingMessage(null);
        chat.setCurrentMessage("");
        chat.setReplyingTo(null);
      } catch (error) { console.error("Error editing message:", error); } 
      finally { chat.setIsUploading(false); }
      return;
    }

    // Логика отправки нового сообщения
    chat.setIsUploading(true);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();
    const replyData = chat.replyingTo ? { id: chat.replyingTo.id, author: chat.replyingTo.author, message: chat.replyingTo.message } : null;

    try {
      if (chat.attachedFiles.length > 0) {
        const tempUrls = chat.attachedFiles.map(f => URL.createObjectURL(f));
        let msgType = tempUrls.length === 1 ? 'image' : 'gallery';
        let msgContent = tempUrls.length === 1 ? tempUrls[0] : JSON.stringify(tempUrls);
        const tempId = timestamp + Math.random();
        
        const optimisticMsg = { room: chat.room, author: username, message: msgContent, type: msgType, time, timestamp, status: 'uploading', tempId, id: tempId, replyTo: replyData };
        chat.setMessageList(prev => [...prev, optimisticMsg]);
        
        const formData = new FormData(); 
        chat.attachedFiles.forEach(file => formData.append('files', file));
        const response = await fetch(`${BACKEND_URL}/upload-multiple`, { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.urls && data.urls.length > 0) {
          let realContent = data.urls.length === 1 ? data.urls[0] : JSON.stringify(data.urls);
          const finalMsg = { ...optimisticMsg, message: realContent, status: 'pending' };
          socket.emit("send_message", finalMsg, (res) => { 
            if (res && res.status === 'ok') chat.setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent', message: realContent } : m)); 
          });
        }
        chat.setAttachedFiles([]);
      }

      if (chat.currentMessage.trim()) {
        const tempId = timestamp;
        const optimisticMsg = { room: chat.room, author: username, message: chat.currentMessage, type: 'text', time, timestamp, status: 'pending', tempId, id: tempId, replyTo: replyData };
        chat.setChatPreviews(prev => ({ ...prev, [chat.room]: { text: chat.currentMessage, sender: username, time, timestamp, type: 'text' } }));
        chat.setMessageList(prev => [...prev, optimisticMsg]); 
        chat.setCurrentMessage("");
        
        socket.emit("send_message", optimisticMsg, (res) => { 
          if (res && res.status === 'ok') chat.setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); 
        });
      }
      chat.setReplyingTo(null);
    } catch (e) { alert("Ошибка отправки"); } 
    finally { chat.setIsUploading(false); }
  };

  // Логика записи кружочков / голосовых
  const startRecordingProcess = useCallback(async () => {
    const chat = useChatStore.getState();
    try {
      const constraints = chat.inputMode === 'video' ? { audio: true, video: { facingMode: "user", aspectRatio: 1, width: 480, height: 480 } } : { audio: true };
      let stream;
      try { 
        stream = await navigator.mediaDevices.getUserMedia(constraints); 
      } catch (cameraError) {
        if (chat.inputMode === 'video') { 
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
          stream = createFakeVideoStream(audioStream); 
        } else throw cameraError;
      }
      streamRef.current = stream;
      const mimeType = chat.inputMode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType }); 
      mediaRecorderRef.current = recorder; 
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const currentChat = useChatStore.getState();
        if (!streamRef.current && !currentChat.recordedMedia) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType }); 
        const url = URL.createObjectURL(blob);
        chat.setRecordedMedia({ blob, url, type: currentChat.inputMode, duration: recordingTimeRef.current });
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      };

      recorder.start(); 
      chat.setIsRecording(true); 
      chat.setIsLocked(false); 
      chat.setRecordingTime(0); 
      recordingTimeRef.current = 0;
      
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => { 
        recordingTimeRef.current += 1; 
        useChatStore.getState().setRecordingTime(recordingTimeRef.current); 
      }, 1000);
    } catch (err) { alert("Ошибка доступа к микрофону/камере. Проверьте разрешения."); }
  }, []);

  const onCancelRecording = useCallback(() => {
    const chat = useChatStore.getState();
    chat.setIsRecording(false); 
    chat.setIsLocked(false); 
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    chat.setRecordedMedia(null);
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
  }, []);

  const onRecordStart = useCallback((e) => {
    const now = Date.now(); 
    if (e.type === 'mousedown' && now - lastTouchTimeRef.current < 500) return;
    if (e.type === 'touchstart') lastTouchTimeRef.current = now;
    
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX; 
    startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    isSwipingToCancelRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => { startRecordingProcess(); }, 250); 
  }, [startRecordingProcess]);

  const onRecordMove = useCallback((e) => {
    const chat = useChatStore.getState();
    if (!chat.isRecording || chat.isLocked || e.type === 'mousemove') return;
    
    const clientX = e.touches ? e.touches[0].clientX : 0; 
    const clientY = e.touches ? e.touches[0].clientY : 0;
    const diffY = startYRef.current - clientY; 
    const diffX = startXRef.current - clientX;
    
    if (diffY > 80 && !isSwipingToCancelRef.current) chat.setIsLocked(true);
    if (diffX > 100 && !chat.isLocked) { isSwipingToCancelRef.current = true; onCancelRecording(); }
  }, [onCancelRecording]);

  const onRecordEnd = useCallback((e) => {
    const chat = useChatStore.getState();
    const now = Date.now(); 
    if (e.type === 'mouseup' && now - lastTouchTimeRef.current < 500) return;
    
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current); 
      longPressTimeoutRef.current = null;
      if (!chat.isRecording) chat.setInputMode(prev => prev === 'audio' ? 'video' : 'audio');
    } else {
      if (chat.isRecording && !chat.isLocked) { 
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); 
        chat.setIsRecording(false); 
        chat.setIsLocked(false); 
        clearInterval(timerIntervalRef.current); 
      }
    }
  }, []);

  const onSendRecorded = useCallback(async () => {
    const chat = useChatStore.getState();
    const { username, socket } = useAuthStore.getState();

    if (!chat.recordedMedia || chat.isUploading) return;
    chat.setIsUploading(true); 
    
    const formData = new FormData();
    formData.append('file', chat.recordedMedia.blob, `msg_${Date.now()}.webm`);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
    const timestamp = Date.now();
    
    const mediaType = chat.recordedMedia.type;
    const shape = chat.videoShape;

    chat.setRecordedMedia(null); 
    chat.setIsLocked(false);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.url) {
        let finalMessage = mediaType === 'video' ? JSON.stringify({ url: data.url, shape: shape }) : data.url;
        const optimisticMsg = { room: chat.room, author: username, message: finalMessage, type: mediaType, time, timestamp, status: 'pending', tempId: timestamp, id: timestamp };
        
        chat.setMessageList(prev => [...prev, optimisticMsg]);
        socket.emit("send_message", optimisticMsg, (res) => { 
          if (res && res.status === 'ok') chat.setMessageList(prev => prev.map(m => m.tempId === timestamp ? { ...m, id: res.id, status: 'sent', message: finalMessage } : m)); 
        });
      }
    } catch (err) { console.error("Upload failed", err); } 
    finally { chat.setIsUploading(false); }
  }, []);

  const onTyping = () => {
    const { socket, username } = useAuthStore.getState();
    const { room } = useChatStore.getState();
    if (socket) socket.emit("typing", { room, username });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60); 
    const secs = seconds % 60; 
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return {
    liveVideoRef,
    onSendMessage,
    onRecordStart,
    onRecordMove,
    onRecordEnd,
    onCancelRecording,
    onSendRecorded,
    onTyping,
    formatTime
  };
};