import { useState, useRef, useEffect, useCallback } from 'react';

export const useChat = (socket, username, room, socketActions) => {
  const [messageList, setMessageList] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [roomSettings, setRoomSettings] = useState({ is_private: 0, slow_mode: 0, avatar_url: '' });
  const [myRole, setMyRole] = useState("member");
  const [currentMessage, setCurrentMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [inputMode, setInputMode] = useState('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState(null);
  const [videoShape, setVideoShape] = useState('circle');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const previousScrollHeight = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const streamRef = useRef(null);
  const liveVideoRef = useRef(null);

  // Загрузка истории чата
  useEffect(() => {
    if (!room || !socket) return;

    setMessageList([]);
    setHasMore(true);
    setTypingText("");
    setAttachedFiles([]);
    setCurrentMessage("");
    setReplyingTo(null);
    setIsLoadingHistory(true);
    setRoomSettings({ is_private: 0, slow_mode: 0, avatar_url: '' });

    socketActions.joinRoom({ username, room });

    if (!room.includes("_")) {
      socketActions.getGroupInfo(room);
    }

    const handleReceiveMessage = (data) => {
      if (data.room === room) {
        setMessageList((list) => {
          if (data.author === username && data.tempId) {
            const exists = list.find(m => m.tempId === data.tempId);
            if (exists) return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m);
          }
          return [...list, data];
        });
      }
    };

    const handleChatHistory = (h) => {
      setMessageList(h.map(m => ({ ...m, status: 'sent' })));
      setHasMore(h.length >= 30);
      setIsLoadingHistory(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
    };

    const handleMoreMessages = (h) => {
      setMessageList(p => [...h.map(m => ({ ...m, status: 'sent' })), ...p]);
      setHasMore(h.length >= 30);
      setIsLoadingHistory(false);
    };

    const handleNoMoreMessages = () => {
      setHasMore(false);
      setIsLoadingHistory(false);
    };

    const handleDisplayTyping = (d) => {
      if (d.room === room) {
        setTypingText(`${d.username} печатает...`);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingText(""), 3000);
      }
    };

    const handleGroupInfo = (d) => {
      if (d.room === room) setGroupMembers(d.members);
    };

    const handleGroupInfoUpdated = (data) => {
      if (room === data.members?.[0]?.room) setGroupMembers(data.members);
    };

    const handleMessageDeleted = (data) => {
      setMessageList((prev) => prev.filter((msg) => msg.id !== (data.id || data)));
    };

    const handleMessageEdited = (data) => {
      console.log('message_edited received:', data);
      setMessageList((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, message: data.message, is_edited: data.is_edited } : msg
        )
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("chat_history", handleChatHistory);
    socket.on("more_messages_loaded", handleMoreMessages);
    socket.on("no_more_messages", handleNoMoreMessages);
    socket.on("display_typing", handleDisplayTyping);
    socket.on("group_info_data", handleGroupInfo);
    socket.on("group_info_updated", handleGroupInfoUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_edited", handleMessageEdited);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("chat_history", handleChatHistory);
      socket.off("more_messages_loaded", handleMoreMessages);
      socket.off("no_more_messages", handleNoMoreMessages);
      socket.off("display_typing", handleDisplayTyping);
      socket.off("group_info_data", handleGroupInfo);
      socket.off("group_info_updated", handleGroupInfoUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_edited", handleMessageEdited);
    };
  }, [room, socket, username, socketActions]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (previousScrollHeight.current === 0 && messageList.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    if (previousScrollHeight.current > 0) {
      setTimeout(() => { previousScrollHeight.current = 0; }, 100);
    }
  }, [messageList]);

  // Сохранение позиции скролла при загрузке истории
  useEffect(() => {
    if (chatBodyRef.current && previousScrollHeight.current !== 0) {
      const diff = chatBodyRef.current.scrollHeight - previousScrollHeight.current;
      if (diff > 0) chatBodyRef.current.scrollTop = diff;
    }
  }, [messageList]);

  // Загрузка старых сообщений
  const handleScroll = useCallback((e) => {
    if (e.target.scrollTop === 0 && hasMore && !isLoadingHistory && messageList.length > 0) {
      setIsLoadingHistory(true);
      previousScrollHeight.current = e.target.scrollHeight;
      socketActions.loadMoreMessages({ room, offset: messageList.length });
    }
  }, [hasMore, isLoadingHistory, messageList.length, room, socketActions]);

  // Отправка сообщения
  const sendMessage = useCallback(async (BACKEND_URL) => {
    if ((!currentMessage.trim() && attachedFiles.length === 0) || isUploading) return;

    setIsUploading(true);
    previousScrollHeight.current = 0;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();
    const replyData = replyingTo ? { id: replyingTo.id, author: replyingTo.author, message: replyingTo.message } : null;

    try {
      if (attachedFiles.length > 0) {
        const tempUrls = attachedFiles.map(f => URL.createObjectURL(f));
        const msgType = tempUrls.length === 1 ? 'image' : 'gallery';
        const msgContent = tempUrls.length === 1 ? tempUrls[0] : JSON.stringify(tempUrls);
        const tempId = timestamp + Math.random();
        const optimisticMsg = { room, author: username, message: msgContent, type: msgType, time, timestamp, status: 'uploading', tempId, id: tempId, replyTo: replyData };
        setMessageList(prev => [...prev, optimisticMsg]);

        const formData = new FormData();
        attachedFiles.forEach(file => formData.append('files', file));
        const response = await fetch(`${BACKEND_URL}/upload-multiple`, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.urls && data.urls.length > 0) {
          const realContent = data.urls.length === 1 ? data.urls[0] : JSON.stringify(data.urls);
          const finalMsg = { ...optimisticMsg, message: realContent, status: 'pending' };
          socketActions.sendMessage(finalMsg, (res) => {
            if (res && res.status === 'ok') {
              setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent', message: realContent } : m));
            }
          });
        }
        setAttachedFiles([]);
      }

      if (currentMessage.trim()) {
        const tempId = timestamp;
        const optimisticMsg = { room, author: username, message: currentMessage, type: 'text', time, timestamp, status: 'pending', tempId, id: tempId, replyTo: replyData };
        setMessageList(prev => [...prev, optimisticMsg]);
        setCurrentMessage("");
        socketActions.sendMessage(optimisticMsg, (res) => {
          if (res && res.status === 'ok') {
            setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m));
          }
        });
      }
      setReplyingTo(null);
    } catch (e) {
      console.error("Error sending", e);
      alert("Error sending message");
    } finally {
      setIsUploading(false);
    }
  }, [currentMessage, attachedFiles, isUploading, room, username, replyingTo, socketActions]);

  // Контекстное меню
  const handleContextMenu = useCallback((e, msg, x, y) => {
    let menuX = x;
    let menuY = y - 70;
    if (menuX + 150 > window.innerWidth) menuX = window.innerWidth - 160;
    if (menuY < 50) menuY = y + 20;
    if (menuY + 150 > window.innerHeight) menuY = window.innerHeight - 160;
    setContextMenu({ x: menuX, y: menuY, msg });
  }, []);

  // Ответ на сообщение
  const handleReply = useCallback((msg) => {
    setReplyingTo(msg);
    textareaRef.current?.focus();
    setContextMenu(null);
  }, []);

  // Копирование сообщения
  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setContextMenu(null);
  }, []);

  // Удаление сообщения
  const handleDeleteMessageRequest = useCallback((id) => {
    setMessageToDelete(id);
  }, []);

  const confirmDelete = useCallback((forEveryone) => {
    if (!messageToDelete) return;
    socketActions.deleteMessage({ id: messageToDelete, forEveryone });
    setMessageList(prev => prev.filter(msg => msg.id !== messageToDelete));
    setMessageToDelete(null);
    setContextMenu(null);
  }, [messageToDelete, socketActions]);

  // Выбор файлов
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (attachedFiles.length + files.length > 10) return;
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = "";
  }, [attachedFiles.length]);

  const removeAttachment = useCallback((index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Эмодзи
  const handleEmojiSelect = useCallback((emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentMessage;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + emoji + after;
    setCurrentMessage(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }, [currentMessage]);

  // Запись аудио/видео
  const createFakeVideoStream = useCallback((audioStream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
    };
    draw();
    return stream;
  }, []);

  useEffect(() => {
    if (isRecording && inputMode === 'video' && liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.muted = true;
      liveVideoRef.current.play().catch(e => console.log("Preview play error:", e));
    }
  }, [isRecording, inputMode]);

  const startRecordingProcess = useCallback(async () => {
    try {
      const constraints = inputMode === 'video'
        ? { audio: true, video: { facingMode: "user", aspectRatio: 1, width: 480, height: 480 } }
        : { audio: true };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (cameraError) {
        if (inputMode === 'video') {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream = createFakeVideoStream(audioStream);
        } else {
          throw cameraError;
        }
      }
      streamRef.current = stream;
      const mimeType = inputMode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (!streamRef.current && !recordedMedia) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const finalDuration = recordingTimeRef.current;
        setRecordedMedia({ blob, url, type: inputMode, duration: finalDuration });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      };

      recorder.start();
      setIsRecording(true);
      setIsLocked(false);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Ошибка доступа к микрофону/камере. Проверьте разрешения.");
    }
  }, [inputMode, recordedMedia, createFakeVideoStream]);

  const stopRecordingProcess = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsLocked(false);
    clearInterval(timerIntervalRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    setIsLocked(false);
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordedMedia(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const sendRecordedContent = useCallback(async (BACKEND_URL) => {
    if (!recordedMedia || isUploading) return;
    setIsUploading(true);
    const formData = new FormData();
    const ext = recordedMedia.type === 'video' ? 'webm' : 'webm';
    const fileName = `msg_${Date.now()}.${ext}`;
    formData.append('file', recordedMedia.blob, fileName);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();
    const tempId = timestamp;
    setRecordedMedia(null);
    setIsLocked(false);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.url) {
        let finalMessage = data.url;
        if (recordedMedia.type === 'video') {
          finalMessage = JSON.stringify({ url: data.url, shape: videoShape });
        }
        const optimisticMsg = {
          room, author: username, message: finalMessage, type: recordedMedia.type,
          time, timestamp, status: 'pending', tempId, id: tempId
        };
        setMessageList(prev => [...prev, optimisticMsg]);
        socketActions.sendMessage(optimisticMsg, (res) => {
          if (res && res.status === 'ok') {
            setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent', message: finalMessage } : m));
          }
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  }, [recordedMedia, isUploading, videoShape, room, username, socketActions]);

  const canDeleteMessage = useCallback((msg) => {
    const isAuthor = msg.author === username;
    const canManage = (myRole === 'owner' || myRole === 'editor');
    return isAuthor || (canManage && !msg.room.includes('_'));
  }, [username, myRole]);

  return {
    // State
    messageList,
    hasMore,
    isLoadingHistory,
    typingText,
    groupMembers,
    roomSettings,
    myRole,
    currentMessage,
    setCurrentMessage,
    attachedFiles,
    setAttachedFiles,
    replyingTo,
    setReplyingTo,
    contextMenu,
    setContextMenu,
    isUploading,
    messageToDelete,
    setMessageToDelete,
    inputMode,
    setInputMode,
    isRecording,
    setIsRecording,
    isLocked,
    setIsLocked,
    recordingTime,
    recordedMedia,
    setRecordedMedia,
    videoShape,
    setVideoShape,
    isEmojiPickerOpen,
    setIsEmojiPickerOpen,

    // Refs
    chatBodyRef,
    messagesEndRef,
    fileInputRef,
    textareaRef,
    liveVideoRef,

    // Actions
    handleScroll,
    sendMessage,
    handleContextMenu,
    handleReply,
    handleCopy,
    handleDeleteMessageRequest,
    confirmDelete,
    handleFileSelect,
    removeAttachment,
    handleEmojiSelect,
    startRecordingProcess,
    stopRecordingProcess,
    cancelRecording,
    sendRecordedContent,
    canDeleteMessage,
    setGroupMembers,
    setRoomSettings,
    setMyRole
  };
};