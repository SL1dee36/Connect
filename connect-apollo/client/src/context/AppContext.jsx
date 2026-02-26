import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';

const AppContext = createContext();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const AppProvider = ({ children, socket, username, handleLogout }) => {
  // === USER DATA ===
  const [myProfile, setMyProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_profile")) || { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1, media:[] }; } catch { return { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1, media:[] }; } });
  const [friends, setFriends] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_friends")) || []; } catch { return[]; } });
  const [myChats, setMyChats] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_chats")) ||[]; } catch { return []; } });
  const[globalRole, setGlobalRole] = useState('member');
  const [totalNetworkUsers, setTotalNetworkUsers] = useState(0);
  
  // === CHAT DATA ===
  const [room, setRoom] = useState(() => localStorage.getItem("apollo_room") || "");
  const [messageList, setMessageList] = useState([]);
  const [chatPreviews, setChatPreviews] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_chat_previews")) || {}; } catch { return {}; } });
  const[hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const[typingText, setTypingText] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const[roomSettings, setRoomSettings] = useState({ is_private: 0, slow_mode: 0, avatar_url: '' });
  const [myRole, setMyRole] = useState("member");
  
  // === UI STATE ===
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const[activeModal, setActiveModal] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const[isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const[isSwiping, setIsSwiping] = useState(false);
  const[showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const[unreadScrollCount, setUnreadScrollCount] = useState(0);
  
  // === FOLDERS & ORDER ===
  const[folders, setFolders] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_folders")) ||[{id: 'all', name: 'All', chatIds: []}]; } catch { return[{id: 'all', name: 'All', chatIds: []}]; } });
  const[activeFolderId, setActiveFolderId] = useState('all');
  const [pinnedChats, setPinnedChats] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_pinned_chats")) ||[]; } catch { return []; } });
  const [customChatOrder, setCustomChatOrder] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_chat_order")) || []; } catch { return []; } });
  const[folderToEdit, setFolderToEdit] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newChatName, setNewChatName] = useState("");
  
  // === NOTIFICATIONS ===
  const [notifications, setNotifications] = useState([]);
  const[hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [inAppNotif, setInAppNotif] = useState({ visible: false, title: '', body: '', avatar: null, room: '' });
  const inAppNotifTimeoutRef = useRef(null);
  
  // === SEARCH ===
  const[searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchGroupResults, setSearchGroupResults] = useState([]);
  
  // === PROFILE & VIEW ===
  const [viewProfileData, setViewProfileData] = useState(null);
  const [avatarHistory, setAvatarHistory] = useState([]);
  const [avatarEditor, setAvatarEditor] = useState({ isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 } });
  const [profileForm, setProfileForm] = useState({ bio: "", phone: "", display_name: "", username: "", notifications_enabled: 1 });
  const[friendOverrideForm, setFriendOverrideForm] = useState({ local_display_name: '', local_avatar_file: null, preview_avatar: '' });
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  
  // === MESSAGE INPUT & RECORDING ===
  const [currentMessage, setCurrentMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const[replyingTo, setReplyingTo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [activeVideoState, setActiveVideoState] = useState(null);
  const [bugDescription, setBugDescription] = useState("");
  const [bugFiles, setBugFiles] = useState([]);
  const [adminBugList, setAdminBugList] = useState([]);
  const [inputMode, setInputMode] = useState('audio');
  const [isRecording, setIsRecording] = useState(false);
  const[isLocked, setIsLocked] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState(null);
  const [videoShape, setVideoShape] = useState('circle');
  const [isDragOverlayOpen, setIsDragOverlayOpen] = useState(false);
  const [dragFiles, setDragFiles] = useState([]);
  const[isMobileDragging, setIsMobileDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState(null);
  
  // === CALLS (WEBRTC) ===
  const[callStatus, setCallStatus] = useState('idle');
  const [callSignal, setCallSignal] = useState(null);
  const [caller, setCaller] = useState("");
  const [callerName, setCallerName] = useState("");
  const[isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // === REFS ===
  const myProfileRef = useRef(myProfile);
  const chatLongPressTimer = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const profileMediaInputRef = useRef(null);
  const friendAvatarInputRef = useRef(null);
  const textareaRef = useRef(null);
  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousScrollHeight = useRef(0);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const connectionRef = useRef();
  
  const liveVideoRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingToCancelRef = useRef(false);
  const streamRef = useRef(null);
  const lastTouchTimeRef = useRef(0);
  
  const dragItemRef = useRef(null);
  const dragOverItemRef = useRef(null);

  const servers = {
      iceServers:[
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
      ]
  };

  // === LOCALSTORAGE SYNC ===
  useEffect(() => { myProfileRef.current = myProfile; },[myProfile]);
  useEffect(() => { localStorage.setItem("apollo_pinned_chats", JSON.stringify(pinnedChats)); }, [pinnedChats]);
  useEffect(() => { localStorage.setItem("apollo_folders", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("apollo_chat_order", JSON.stringify(customChatOrder)); }, [customChatOrder]);
  useEffect(() => { localStorage.setItem("apollo_chat_previews", JSON.stringify(chatPreviews)); },[chatPreviews]);
  useEffect(() => { localStorage.setItem("apollo_my_chats", JSON.stringify(myChats)); }, [myChats]);
  useEffect(() => { localStorage.setItem("apollo_friends", JSON.stringify(friends)); }, [friends]);
  useEffect(() => { localStorage.setItem("apollo_my_profile", JSON.stringify(myProfile)); },[myProfile]);
  useEffect(() => { if (room) localStorage.setItem("apollo_room", room); },[room]);

  // === MOBILE DETECT ===
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  },[]);

  // === UNIFIED CHAT LIST ===
  const unifiedChatList = useMemo(() => {
    let all =[
        ...myChats.map(c => ({ id: c, originalId: c, type: 'group', name: c, avatar: null })),
        ...friends.map(f => {
            const friendUsername = f.username || f;
            const roomId = [username, friendUsername].sort().join("_");
            return { id: roomId, originalId: friendUsername, type: 'dm', name: f.display_name || friendUsername, avatar: f.avatar_url };
        })
    ];

    const unique =[];
    const seen = new Set();
    for (const chat of all) {
        if (!seen.has(chat.id)) { unique.push(chat); seen.add(chat.id); }
    }
    all = unique.map(chat => ({ ...chat, preview: chatPreviews[chat.id] || null }));
    
    if (activeFolderId !== 'all') {
        const currentFolder = folders.find(f => f.id === activeFolderId);
        if (currentFolder) all = all.filter(c => currentFolder.chatIds.includes(c.originalId));
    }

    all.sort((a, b) => {
        const isPinnedA = pinnedChats.includes(a.originalId);
        const isPinnedB = pinnedChats.includes(b.originalId);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;

        const idxA = customChatOrder.indexOf(a.originalId);
        const idxB = customChatOrder.indexOf(b.originalId);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        const timeA = a.preview?.timestamp || 0;
        const timeB = b.preview?.timestamp || 0;
        return timeB - timeA;
    });

    return all;
  },[myChats, friends, pinnedChats, activeFolderId, folders, customChatOrder, chatPreviews, username]);

  // === UI ACTIONS ===
  const switchChat = useCallback((targetName) => {
    if (isSelectionMode) return;
    if (targetName !== "" && (!targetName || typeof targetName !== 'string')) return;
    if (targetName !== room) { setRoom(targetName); localStorage.setItem("apollo_room", targetName); }
    if (isMobile) {
      setSwipeX(0);
      if (targetName !== "") { setShowMobileChat(true); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); } 
      else { setShowMobileChat(false); }
    }
  },[room, isMobile, isSelectionMode]);

  const handleCloseMobileChat = useCallback(() => {
    setShowMobileChat(false);
    setRoom("");
    localStorage.setItem("apollo_room", "");
  },[]);

  // === AUTO-SELECT CHAT ===
  useEffect(() => {
    if (unifiedChatList.length > 0) {
        const currentChatExists = unifiedChatList.find(c => c.id === room);
        if (room && !currentChatExists) switchChat(unifiedChatList[0].id);
        else if (!room && !isMobile) switchChat(unifiedChatList[0].id);
    } else if (room !== "") {
        setRoom("");
        localStorage.setItem("apollo_room", "");
        if (isMobile) setShowMobileChat(false);
    }
  }, [unifiedChatList, room, isMobile, switchChat]);

  const triggerInAppNotification = useCallback((title, body, avatar, roomName) => {
    if (inAppNotifTimeoutRef.current) clearTimeout(inAppNotifTimeoutRef.current);
    setInAppNotif({ visible: true, title, body, avatar, room: roomName });
    inAppNotifTimeoutRef.current = setTimeout(() => {
      setInAppNotif(prev => ({ ...prev, visible: false }));
    }, 3500);
  },[]);

  const handleInAppNotifClick = useCallback(() => {
    if (inAppNotif.room) switchChat(inAppNotif.room);
    setInAppNotif(prev => ({ ...prev, visible: false }));
  },[inAppNotif.room, switchChat]);

  const sendSystemNotification = useCallback((title, body, tag, roomName, avatarUrl) => {
    const currentProfile = myProfileRef.current;
    if (currentProfile.notifications_enabled === 0 || currentProfile.notifications_enabled === false) return; 
    
    triggerInAppNotification(title, body, avatarUrl, roomName);

    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, { body: body, icon: '/icon-192.png', tag: tag, vibrate:[200, 100, 200] });
                });
            } else {
                const notif = new Notification(title, { body, icon: '/icon-192.png', tag: tag });
                notif.onclick = function() { window.focus(); if(roomName) switchChat(roomName); notif.close(); };
            }
        } catch (e) { console.error(e); }
    }
  }, [triggerInAppNotification, switchChat]);

  const playNotificationSound = useCallback(() => {
    try { const audio = new Audio('/notification.mp3'); audio.volume = 0.5; audio.play().catch(() => {}); } catch (e) {}
  },[]);

  const endCallProcess = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (connectionRef.current) { connectionRef.current.getTracks().forEach(track => track.stop()); connectionRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallStatus('idle'); setCallSignal(null); setCaller(""); setIsMuted(false); setIsVideoOff(false);
  },[]);

  // === SOCKET INIT & EVENTS ===
  useEffect(() => {
    if (!socket) return;
    const handlers = {
      "global_role": (role) => setGlobalRole(role),
      "room_settings": (settings) => { setRoomSettings(settings); setMyRole(settings.myRole); },
      "room_settings_updated": (data) => { if(data.room === room) setRoomSettings(prev => ({...prev, ...data})); },
      "chat_previews_data": (data) => { if (typeof data === 'object' && data !== null) setChatPreviews(data); },
      "update_chat_preview": (data) => { setChatPreviews(prev => ({ ...prev,[data.room]: data.preview })); },
      "avatar_history_data": (data) => setAvatarHistory(data),
      "user_groups": (groups) => { if(Array.isArray(groups)) setMyChats(groups); },
      "friends_list": (list) => { if(Array.isArray(list)) setFriends(list); },
      "search_results": (results) => { setSearchResults(Array.isArray(results) ? results.filter(u => u.username !== username) :[]); setIsSearching(false); },
      "search_groups_results": (results) => { setSearchGroupResults(Array.isArray(results) ? results :[]); setIsSearching(false); },
      "group_created": (data) => { setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev); switchChat(data.room); setActiveModal(null); },
      "group_joined": (data) => { setMyChats(prev => !prev.includes(data.room) ?[...prev, data.room] : prev); switchChat(data.room); setActiveModal(null); },
      "left_group_success": (data) => { setMyChats(prev => prev.filter(c => c !== data.room)); if(room === data.room) switchChat(""); setActiveModal(null); },
      "group_deleted": (data) => { setMyChats(prev => prev.filter(c => c !== data.room)); if(room === data.room) { switchChat(""); alert("Группа была удалена владельцем"); } },
      "friend_added": (data) => { setFriends(prev =>[...prev, data.username]); alert(`${data.username} добавлен!`); },
      "friend_removed": (data) => { setFriends(prev => prev.filter(f => f.username !== data.username && f !== data.username)); const expectedRoomId = [username, data.username].sort().join("_"); if(room === expectedRoomId) switchChat(""); },
      "my_profile_data": (data) => { setMyProfile({ ...data, notifications_enabled: data.notifications_enabled === 1, media: data.media ||[] }); },
      "user_profile_data": (data) => { setViewProfileData({...data, media: data.media ||[]}); setActiveModal("userProfile"); socket.emit("get_avatar_history", data.username); },
      "notification_history": (history) => { setNotifications(history); setHasUnreadNotifs(history.some(n => !n.is_read)); },
      "new_notification": (notif) => { setNotifications(prev =>[notif, ...prev]); setHasUnreadNotifs(true); playNotificationSound(); sendSystemNotification("Новое уведомление", notif.content, 'system', notif.data, null); },
      "error_message": (d) => alert(d.msg),
      "total_users": (count) => setTotalNetworkUsers(count),
      "force_logout": (d) => { alert(d.msg); handleLogout(); },
      "group_info_data": (d) => { if(d.room === room) setGroupMembers(d.members); },
      "group_info_updated": (data) => { if(room === data.members?.[0]?.room) setGroupMembers(data.members); },
      "message_deleted": (data) => setMessageList(prev => prev.filter(msg => msg.id !== (data.id || data))),
      "display_typing": (d) => {
        if(d.room === room) { setTypingText(`${d.username} печатает...`); clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => setTypingText(""), 3000); }
      },
      "receive_message": (data) => {
        setChatPreviews(prev => ({ ...prev, [data.room]: { text: data.message, sender: data.author, time: data.time, timestamp: data.timestamp, type: data.type } }));
        if (data.room === room) {
          setMessageList(list => {
            if (data.author === username && data.tempId) { const exists = list.find(m => m.tempId === data.tempId); if (exists) return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m); }
            return[...list, data];
          });
          if (data.author !== username && document.hidden) { playNotificationSound(); sendSystemNotification(data.author, data.message, 'dm', data.room, null); }
        } else { if (data.author !== username) { playNotificationSound(); sendSystemNotification(data.author, data.message, 'dm', data.room, null); } }
      },
      "chat_history": (h) => { setMessageList(h.map(m => ({...m, status: 'sent'}))); setHasMore(h.length >= 30); setIsLoadingHistory(false); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50); },
      "more_messages_loaded": (h) => { setMessageList(p =>[...h.map(m => ({...m, status: 'sent'})), ...p]); setHasMore(h.length >= 30); setIsLoadingHistory(false); },
      "no_more_messages": () => { setHasMore(false); setIsLoadingHistory(false); },
      "callUser": (data) => { setCallStatus('receiving'); setCaller(data.from); setCallerName(data.name || data.from); setCallSignal(data.signal); },
      "callAccepted": (signal) => { setCallStatus('connected'); if(peerRef.current) peerRef.current.setRemoteDescription(new RTCSessionDescription(signal)); },
      "ice-candidate": (candidate) => { if (peerRef.current) peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e)); },
      "callEnded": endCallProcess,
      "call_failed": (d) => { alert(d.msg); endCallProcess(); }
    };
    
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  },[socket, username, room, switchChat, endCallProcess, playNotificationSound, sendSystemNotification, handleLogout]);

  useEffect(() => { 
    if (username && socket) { 
        socket.emit("get_initial_data"); 
        socket.emit("get_my_profile", username); 
    } 
  },[socket, username]);

  useEffect(() => {
    if (!room) return;
    socket.emit("join_room", { username, room });
    if (!room.includes("_")) socket.emit("get_group_info", room);
  },[room, socket, username]);

  // === PROFILE, SETTINGS & UPLOADS ===
  const openSettings = useCallback(() => {
    if (socket) { socket.emit("get_my_profile", username); socket.emit("get_avatar_history", username); }
    setProfileForm({ bio: myProfile.bio || "", phone: myProfile.phone || "", display_name: myProfile.display_name || username, username: username, notifications_enabled: myProfile.notifications_enabled });
    setActiveModal("settings");
  }, [username, myProfile, socket]);

  const saveProfile = useCallback(() => {
    if (profileForm.username !== username) {
         const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
         if (!usernameRegex.test(profileForm.username)) { alert("Nametag должен содержать только латинские буквы и цифры, минимум 3 символа."); return; }
    }
    socket.emit("update_profile", { username, bio: profileForm.bio, phone: profileForm.phone, display_name: profileForm.display_name, notifications_enabled: profileForm.notifications_enabled, newUsername: profileForm.username });
    setActiveModal(null);
  }, [profileForm, username, socket]);

  const requestNotificationPermission = async () => {
    socket.emit("update_profile", { ...myProfile, notifications_enabled: true });
    alert("Разрешения запрашиваются...");
    Notification.requestPermission();
  };

  const requestMediaPermissions = async (type) => {
    try {
        const constraints = type === 'video' ? { audio: true, video: { facingMode: "user" } } : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop());
        alert("Доступ получен!");
    } catch (err) { alert("Доступ отклонен."); }
  };

  const requestFilePermission = () => {
    const input = document.createElement('input'); input.type = 'file';
    input.onchange = () => alert("Доступ к файлам подтвержден!");
    input.click();
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => setAvatarEditor(prev => ({ ...prev, image: reader.result, isOpen: true })), false);
        reader.readAsDataURL(file);
        setActiveModal(null);
    }
  };

  const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image(); image.addEventListener('load', () => resolve(image)); image.addEventListener('error', (error) => reject(error)); image.setAttribute('crossOrigin', 'anonymous'); image.src = url;
  });

  const getCroppedImg = async (imageSrc, pixelCrop, filters) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas'); canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)`;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise((resolve) => { canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.8); });
  };

  const handleSaveAvatar = async () => {
    if (!avatarEditor.croppedAreaPixels) return;
    const croppedImageBlob = await getCroppedImg(avatarEditor.image, avatarEditor.croppedAreaPixels, avatarEditor.filters);
    const formData = new FormData(); formData.append('avatar', croppedImageBlob, 'avatar.webp'); formData.append('username', username);
    try {
        const res = await fetch(`${BACKEND_URL}/upload-avatar`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.profile) { setMyProfile(prev => ({...prev, ...data.profile})); socket.emit("get_avatar_history", username); }
    } catch (error) { console.error(error); } finally { setAvatarEditor({ isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 } }); }
  };

  const handleProfileMediaSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) uploadProfileMedia(e.target.files[0]);
  };

  const uploadProfileMedia = async (file) => {
    const formData = new FormData(); formData.append('file', file); formData.append('username', username);
    const localUrl = URL.createObjectURL(file);
    const tempMediaItem = { id: Date.now(), url: localUrl, type: file.type.startsWith('video') ? 'video' : 'image', temp: true };
    setMyProfile(prev => ({ ...prev, media: [...(prev.media || []), tempMediaItem] }));
    try {
        const res = await fetch(`${BACKEND_URL}/upload-profile-media`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) setMyProfile(prev => ({ ...prev, media: prev.media.map(m => m.id === tempMediaItem.id ? { ...m, url: data.url, temp: false } : m) }));
    } catch (e) { alert("Ошибка загрузки"); setMyProfile(prev => ({...prev, media: prev.media.filter(m => m.id !== tempMediaItem.id)})); }
  };

  const handleSaveFriendOverride = async (isReset = false) => {
    if (!viewProfileData) return;
    const formData = new FormData(); formData.append('friend_username', viewProfileData.username);
    if (isReset) formData.append('reset', 'true');
    else {
        formData.append('local_display_name', friendOverrideForm.local_display_name);
        if (friendOverrideForm.local_avatar_file) formData.append('local_avatar', friendOverrideForm.local_avatar_file);
        else formData.append('local_avatar_url', friendOverrideForm.preview_avatar);
    }
    try {
        const token = localStorage.getItem("apollo_token");
        const res = await fetch(`${BACKEND_URL}/update-friend-override`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        if (res.ok) { socket.emit("get_initial_data"); setActiveModal('userProfile'); socket.emit("get_user_profile", viewProfileData.username); } 
        else alert("Ошибка сохранения");
    } catch (e) { alert("Сетевая ошибка"); }
  };

  const fetchBugReports = useCallback(async () => {
    try { const res = await fetch(`${BACKEND_URL}/bug-reports`); const data = await res.json(); setAdminBugList(data); } catch (e) { console.error(e); }
  },[]);

  const resolveBug = useCallback(async (id) => {
    await fetch(`${BACKEND_URL}/resolve-bug`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
    fetchBugReports();
  }, [fetchBugReports]);

  // === VARIOUS ACTIONS ===
  const openGroupInfo = useCallback(() => {
    if (!socket) return;
    if (!myChats.includes(room)) { socket.emit("get_user_profile", room.replace(username, "").replace("_", "") || room); setShowMenu(false); } 
    else { socket.emit("get_group_info", room); setActiveModal("groupInfo"); setShowMenu(false); }
  },[room, myChats, username, socket]);
  
  const leaveGroup = useCallback(() => { if (window.confirm("Выйти из группы?") && socket) socket.emit("leave_group", { room }); },[room, socket]);
  const removeFriend = useCallback((t) => { if (window.confirm(`Удалить ${t}?`) && socket) { socket.emit("remove_friend", t); setActiveModal(null); } }, [socket]);
  const blockUser = useCallback((t) => { if (window.confirm(`Заблокировать ${t}?`) && socket) { socket.emit("block_user", t); setActiveModal(null); } },[socket]);
  const copyProfileLink = useCallback((targetUsername) => { navigator.clipboard.writeText(`${window.location.origin}?user=${targetUsername}`); alert("Ссылка скопирована!"); },[]);
  const createNewFolder = useCallback(() => { if (!newFolderName.trim()) return; const newFolder = { id: Date.now().toString(), name: newFolderName, chatIds: [] }; setFolders(prev =>[...prev, newFolder]); setNewFolderName(""); setActiveModal(null); },[newFolderName]);
  const removeFolder = useCallback((folderId) => { if(folderId === 'all') return; if(window.confirm("Удалить папку? Чаты не будут удалены.")) { setFolders(prev => prev.filter(f => f.id !== folderId)); if (activeFolderId === folderId) setActiveFolderId('all'); setActiveModal(null); } }, [activeFolderId]);
  
  const handleAddToFolder = useCallback((folderId) => {
    const updatedFolders = folders.map(f => {
      if (f.id === folderId) {
        const newChats =[...f.chatIds];
        const chatsToAdd = unifiedChatList.filter(c => selectedChats.includes(c.id));
        chatsToAdd.forEach(chat => { if (!newChats.includes(chat.originalId)) newChats.push(chat.originalId); });
        return { ...f, chatIds: newChats };
      }
      return f;
    });
    setFolders(updatedFolders); setIsSelectionMode(false); setSelectedChats([]); setActiveModal(null);
  },[folders, unifiedChatList, selectedChats]);
  
  const handlePinSelected = useCallback(() => {
    const newPinned = [...pinnedChats];
    const chatsToToggle = unifiedChatList.filter(c => selectedChats.includes(c.id));
    chatsToToggle.forEach(chat => {
        const idToStore = chat.originalId;
        if (newPinned.includes(idToStore)) newPinned.splice(newPinned.indexOf(idToStore), 1);
        else newPinned.unshift(idToStore);
    });
    setPinnedChats(newPinned); setIsSelectionMode(false); setSelectedChats([]);
  },[pinnedChats, unifiedChatList, selectedChats]);
  
  const handleDeleteSelected = useCallback(() => {
    if (!window.confirm(`Удалить выбранные чаты?`)) return;
    const chatsToDelete = unifiedChatList.filter(c => selectedChats.includes(c.id));
    chatsToDelete.forEach(chat => {
        if (chat.type === 'group') socket.emit("leave_group", { room: chat.originalId });
        else socket.emit("remove_friend", chat.originalId);
    });
    setIsSelectionMode(false); setSelectedChats([]);
  },[unifiedChatList, selectedChats, socket]);
  
  const handleChatClick = useCallback((chatId) => {
    if (isSelectionMode) {
      if (selectedChats.includes(chatId)) {
        const newSelection = selectedChats.filter(id => id !== chatId);
        setSelectedChats(newSelection);
        if (newSelection.length === 0) setIsSelectionMode(false);
      } else setSelectedChats(prev => [...prev, chatId]);
    } else switchChat(chatId);
  },[isSelectionMode, selectedChats, switchChat]);
  
  const handleChatLongPress = useCallback((chatId) => {
    if (isSelectionMode) return;
    setIsSelectionMode(true); setSelectedChats([chatId]);
  },[isSelectionMode]);

  // === WEBRTC ===
  const endCall = useCallback(() => {
    const target = callStatus === 'receiving' ? caller : callerName;
    socket.emit("endCall", { to: target }); endCallProcess();
  },[callStatus, caller, callerName, socket, endCallProcess]);

  const toggleMute = useCallback(() => {
    if(connectionRef.current) {
        const audioTracks = connectionRef.current.getAudioTracks();
        if (audioTracks.length > 0) { audioTracks[0].enabled = !audioTracks[0].enabled; setIsMuted(!audioTracks[0].enabled); }
    }
  },[]);

  const toggleVideo = useCallback(() => {
    if(connectionRef.current) {
         const videoTracks = connectionRef.current.getVideoTracks();
         if (videoTracks.length > 0) { videoTracks[0].enabled = !videoTracks[0].enabled; setIsVideoOff(!videoTracks[0].enabled); }
    }
  },[]);

  const startCall = useCallback(async (isVideo) => {
    if (!room.includes("_")) return alert("Звонки доступны только в личных сообщениях");
    const parts = room.split("_"); const userToCall = parts.find(u => u !== username); if(!userToCall) return;

    setCallStatus('calling'); setCallerName(userToCall);
    const localStream = new MediaStream(); const peer = new RTCPeerConnection(servers); peerRef.current = peer;

    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { alert("Микрофон недоступен. Вы будете только слышать собеседника."); }

    if (isVideo) {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
        } catch (err) { alert("Камера недоступна. Звонок продолжится без видео."); }
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    connectionRef.current = localStream;

    try {
        peer.onicecandidate = (event) => { if (event.candidate) socket.emit("ice-candidate", { to: userToCall, candidate: event.candidate }); };
        peer.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };

        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peer.setLocalDescription(offer);
        socket.emit("callUser", { userToCall, signalData: offer, from: username, name: myProfile.display_name || username });
    } catch (err) { alert("Ошибка соединения."); endCallProcess(); }
  },[room, username, socket, myProfile.display_name, endCallProcess, servers]);

  const answerCall = useCallback(async () => {
    setCallStatus('connected');
    const localStream = new MediaStream(); const peer = new RTCPeerConnection(servers); peerRef.current = peer;

    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { console.log("Audio denied", err); }

    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { console.log("Video denied", err); }

    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    connectionRef.current = localStream;

    try {
        peer.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
        peer.onicecandidate = (event) => { if (event.candidate) socket.emit("ice-candidate", { to: caller, candidate: event.candidate }); };

        await peer.setRemoteDescription(new RTCSessionDescription(callSignal));
        const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
        socket.emit("answerCall", { signal: answer, to: caller });
    } catch (err) { endCallProcess(); }
  },[callSignal, caller, socket, endCallProcess, servers]);

  // === MESSAGING FUNCTIONS ===
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },[]);

  const onTyping = useCallback(() => { if (socket) socket.emit("typing", { room, username }); },[socket, room, username]);

  const onSendMessage = useCallback(async () => {
    if ((!currentMessage.trim() && attachedFiles.length === 0) || isUploading) return;
    setIsUploading(true); previousScrollHeight.current = 0;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();
    const replyData = replyingTo ? { id: replyingTo.id, author: replyingTo.author, message: replyingTo.message } : null;

    try {
        if (attachedFiles.length > 0) {
            const tempUrls = attachedFiles.map(f => URL.createObjectURL(f));
            let msgType = tempUrls.length === 1 ? 'image' : 'gallery';
            let msgContent = tempUrls.length === 1 ? tempUrls[0] : JSON.stringify(tempUrls);
            const tempId = timestamp + Math.random();
            const optimisticMsg = { room, author: username, message: msgContent, type: msgType, time, timestamp, status: 'uploading', tempId, id: tempId, replyTo: replyData };
            
            setMessageList(prev => [...prev, optimisticMsg]);
            const formData = new FormData(); attachedFiles.forEach(file => formData.append('files', file));
            const response = await fetch(`${BACKEND_URL}/upload-multiple`, { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.urls && data.urls.length > 0) {
                 let realContent = data.urls.length === 1 ? data.urls[0] : JSON.stringify(data.urls);
                 const finalMsg = { ...optimisticMsg, message: realContent, status: 'pending' };
                 socket.emit("send_message", finalMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent', message: realContent } : m)); });
            }
            setAttachedFiles([]);
        }

        if (currentMessage.trim()) {
            const tempId = timestamp;
            const optimisticMsg = { room, author: username, message: currentMessage, type: 'text', time, timestamp, status: 'pending', tempId, id: tempId, replyTo: replyData };
            setChatPreviews(prev => ({ ...prev, [room]: { text: currentMessage, sender: username, time, timestamp, type: 'text' } }));
            setMessageList(prev => [...prev, optimisticMsg]); setCurrentMessage("");
            socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
        }
        setReplyingTo(null);
    } catch (e) { alert("Error sending message"); } finally { setIsUploading(false); }
  },[currentMessage, attachedFiles, isUploading, replyingTo, room, username, socket]);

  const onFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (attachedFiles.length + files.length > 10) return;
    setAttachedFiles(prev => [...prev, ...files]); e.target.value = "";
  },[attachedFiles.length]);

  const onRemoveAttachment = useCallback((index) => { setAttachedFiles(prev => prev.filter((_, i) => i !== index)); },[]);

  const onEmojiSelect = useCallback((emoji) => {
    const textarea = textareaRef.current; if (!textarea) return;
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    const text = currentMessage;
    setCurrentMessage(text.substring(0, start) + emoji + text.substring(end));
    const newCursorPos = start + emoji.length;
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursorPos, newCursorPos); }, 0);
  }, [currentMessage]);

  const onScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 150) {
      setShowScrollBottomBtn(true);
    } else {
      setShowScrollBottomBtn(false);
      setUnreadScrollCount(0);
    }

    if (scrollTop === 0 && hasMore && !isLoadingHistory && messageList.length > 0) {
        setIsLoadingHistory(true); 
        previousScrollHeight.current = scrollHeight;
        socket.emit("load_more_messages", { room, offset: messageList.length });
    }
  },[hasMore, isLoadingHistory, messageList.length, room, socket]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
    setUnreadScrollCount(0);
  },[]);

  const onContextMenu = useCallback((e, msg, x, y) => {
    let menuX = x; let menuY = y - 70; 
    if (menuX + 150 > window.innerWidth) menuX = window.innerWidth - 160;
    if (menuY < 50) menuY = y + 20; 
    if (menuY + 150 > window.innerHeight) menuY = window.innerHeight - 160;
    setContextMenu({ x: menuX, y: menuY, msg: msg });
  },[]);

  const onReply = useCallback((msg) => { setReplyingTo(msg); textareaRef.current?.focus(); setContextMenu(null); },[]);
  const onCopy = useCallback((text) => { navigator.clipboard.writeText(text); setContextMenu(null); },[]);
  const onDeleteMessageRequest = useCallback((id) => { setMessageToDelete(id); setActiveModal('deleteConfirm'); },[]);
  
  const scrollToMessage = useCallback((messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.classList.add('highlighted'); setTimeout(() => { element.classList.remove('highlighted'); }, 1500); }
  },[]);

  const onMentionClick = useCallback((mentionedUser) => { if (socket) socket.emit("get_user_profile", mentionedUser); }, [socket]);

  const canDeleteMessage = useCallback((msg) => {
    const isAuthor = msg.author === username; const canManage = (myRole === 'owner' || myRole === 'editor' || globalRole === 'mod');
    return isAuthor || (canManage && !msg.room.includes('_'));
  },[username, myRole, globalRole]);

  // === RECORDING LOGIC ===
  const createFakeVideoStream = (audioStream) => {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 480;
    const ctx = canvas.getContext('2d'); const stream = canvas.captureStream(30);
    if (audioStream) audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    const draw = () => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); requestAnimationFrame(draw); };
    draw(); return stream;
  };

  const startRecordingProcess = useCallback(async () => {
    try {
        const constraints = inputMode === 'video' ? { audio: true, video: { facingMode: "user", aspectRatio: 1, width: 480, height: 480 } } : { audio: true };
        let stream;
        try { stream = await navigator.mediaDevices.getUserMedia(constraints); } 
        catch (cameraError) {
            if (inputMode === 'video') { const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream = createFakeVideoStream(audioStream); } else throw cameraError;
        }
        streamRef.current = stream;
        const mimeType = inputMode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType }); mediaRecorderRef.current = recorder; audioChunksRef.current =[];

        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = () => {
            if (!streamRef.current && !recordedMedia) return;
            const blob = new Blob(audioChunksRef.current, { type: mimeType }); const url = URL.createObjectURL(blob);
            setRecordedMedia({ blob, url, type: inputMode, duration: recordingTimeRef.current });
            if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
            if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        };

        recorder.start(); setIsRecording(true); setIsLocked(false); setRecordingTime(0); recordingTimeRef.current = 0;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => { recordingTimeRef.current += 1; setRecordingTime(recordingTimeRef.current); }, 1000);
    } catch (err) { alert("Ошибка доступа к микрофону/камере. Проверьте разрешения."); }
  },[inputMode, recordedMedia]);

  const onCancelRecording = useCallback(() => {
    setIsRecording(false); setIsLocked(false); clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setRecordedMedia(null);
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
  },[]);

  const onRecordStart = useCallback((e) => {
    const now = Date.now(); if (e.type === 'mousedown' && now - lastTouchTimeRef.current < 500) return;
    if (e.type === 'touchstart') lastTouchTimeRef.current = now;
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX; startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    isSwipingToCancelRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => { startRecordingProcess(); }, 250); 
  }, [startRecordingProcess]);

  const onRecordMove = useCallback((e) => {
    if (!isRecording || isLocked || e.type === 'mousemove') return;
    const clientX = e.touches ? e.touches[0].clientX : 0; const clientY = e.touches ? e.touches[0].clientY : 0;
    const diffY = startYRef.current - clientY; const diffX = startXRef.current - clientX;
    if (diffY > 80 && !isSwipingToCancelRef.current) setIsLocked(true);
    if (diffX > 100 && !isLocked) { isSwipingToCancelRef.current = true; onCancelRecording(); }
  },[isRecording, isLocked, onCancelRecording]);

  const onRecordEnd = useCallback((e) => {
    const now = Date.now(); if (e.type === 'mouseup' && now - lastTouchTimeRef.current < 500) return;
    if (longPressTimeoutRef.current) {
         clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null;
         if (!isRecording) setInputMode(prev => prev === 'audio' ? 'video' : 'audio');
    } else {
         if (isRecording && !isLocked) { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); setIsRecording(false); setIsLocked(false); clearInterval(timerIntervalRef.current); }
    }
  },[isRecording, isLocked]);

  const onSendRecorded = useCallback(async () => {
    if (!recordedMedia || isUploading) return;
    setIsUploading(true); const formData = new FormData();
    formData.append('file', recordedMedia.blob, `msg_${Date.now()}.webm`);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); const timestamp = Date.now();
    setRecordedMedia(null); setIsLocked(false);

    try {
        const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.url) {
            let finalMessage = recordedMedia.type === 'video' ? JSON.stringify({ url: data.url, shape: videoShape }) : data.url;
            const optimisticMsg = { room, author: username, message: finalMessage, type: recordedMedia.type, time, timestamp, status: 'pending', tempId: timestamp, id: timestamp };
            setMessageList(prev =>[...prev, optimisticMsg]);
            socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === timestamp ? { ...m, id: res.id, status: 'sent', message: finalMessage } : m)); });
        }
    } catch (err) { console.error("Upload failed", err); } finally { setIsUploading(false); }
  }, [recordedMedia, isUploading, room, username, socket, videoShape]);

  const confirmDelete = useCallback((forEveryone) => {
    if (!messageToDelete) return;
    socket.emit("delete_message", { id: messageToDelete, forEveryone });
    setMessageList(prev => prev.filter(msg => msg.id !== messageToDelete));
    setActiveModal(null); setMessageToDelete(null); setContextMenu(null);
  },[messageToDelete, socket]);


  // === DRAG LOGIC ===
  const onDragStart = (e, index) => { if (isSelectionMode) { e.preventDefault(); return; } dragItemRef.current = index; };
  const onDragEnter = (e, index) => { if (isSelectionMode) return; dragOverItemRef.current = index; };
  const onDragEnd = () => {
    if (isSelectionMode) return;
    if (dragItemRef.current === null || dragOverItemRef.current === null) { dragItemRef.current = null; dragOverItemRef.current = null; return; }
    const _unified = [...unifiedChatList];
    if (!_unified[dragItemRef.current] || !_unified[dragOverItemRef.current]) return;
    const draggedId = _unified[dragItemRef.current].originalId;
    const droppedId = _unified[dragOverItemRef.current].originalId;
    const newOrder =[...customChatOrder];
    unifiedChatList.forEach(c => { if (!newOrder.includes(c.originalId)) newOrder.push(c.originalId); });
    const fromIndex = newOrder.indexOf(draggedId); const toIndex = newOrder.indexOf(droppedId);
    if (fromIndex !== -1 && toIndex !== -1) { newOrder.splice(fromIndex, 1); newOrder.splice(toIndex, 0, draggedId); setCustomChatOrder(newOrder); }
    dragItemRef.current = null; dragOverItemRef.current = null;
  };
  const onDragOver = (e) => e.preventDefault();
  
  const onTouchDragStart = (e, chat) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      chatLongPressTimer.current = setTimeout(() => {
           if (window.navigator.vibrate) window.navigator.vibrate(50);
           setIsMobileDragging(true); setDraggedItemId(chat.id);
           if (customChatOrder.length === 0) setCustomChatOrder(unifiedChatList.map(c => c.originalId));
      }, 200);
  };
  const onTouchDragMove = (e) => {
      if (!isMobileDragging) { if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current); return; }
      if (e.cancelable) e.preventDefault(); 
      const touch = e.touches[0]; const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
          const chatItem = element.closest('.chat-list-item');
          if (chatItem) {
              const targetId = chatItem.getAttribute('data-chat-id');
              const draggedChat = unifiedChatList.find(c => c.id === draggedItemId);
              const targetChat = unifiedChatList.find(c => c.id === targetId);
              if (draggedChat && targetChat && targetId !== draggedItemId) {
                  const newOrder =[...(customChatOrder.length ? customChatOrder : unifiedChatList.map(c => c.originalId))];
                  const fromIndex = newOrder.indexOf(draggedChat.originalId); const toIndex = newOrder.indexOf(targetChat.originalId);
                  if (fromIndex !== -1 && toIndex !== -1) { newOrder.splice(fromIndex, 1); newOrder.splice(toIndex, 0, draggedChat.originalId); setCustomChatOrder(newOrder); }
              }
          }
      }
  };
  const onTouchDragEnd = () => { if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current); setIsMobileDragging(false); setDraggedItemId(null); };

  useEffect(() => {
    setShowScrollBottomBtn(false);
    setUnreadScrollCount(0);
  }, [room]);

  useEffect(() => {
    if (!chatBodyRef.current || messageList.length === 0) return;

    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const lastMsg = messageList[messageList.length - 1];

    if (distanceFromBottom < 150 || lastMsg.author === username) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      setUnreadScrollCount(0);
      setShowScrollBottomBtn(false);
    } 
    else if (lastMsg.author !== username && lastMsg.status !== 'uploading') {
      setUnreadScrollCount(prev => prev + 1);
    }
  }, [messageList, username]);

  // === EXPORTING ===
  const value = {
    username, myProfile, setMyProfile, friends, setFriends, myChats, setMyChats, globalRole, setGlobalRole,
    totalNetworkUsers, setTotalNetworkUsers, room, setRoom, messageList, setMessageList,
    chatPreviews, setChatPreviews, hasMore, setHasMore, isLoadingHistory, setIsLoadingHistory,
    typingText, setTypingText, groupMembers, setGroupMembers, roomSettings, setRoomSettings,
    myRole, setMyRole, isMobile, setIsMobile, showMobileChat, setShowMobileChat,
    activeModal, setActiveModal, isSelectionMode, setIsSelectionMode, selectedChats, setSelectedChats,
    contextMenu, setContextMenu, imageModalSrc, setImageModalSrc, isEmojiPickerOpen, setIsEmojiPickerOpen,
    showMenu, setShowMenu, swipeX, setSwipeX, isSwiping, folders, setFolders, activeFolderId, setActiveFolderId,
    pinnedChats, setPinnedChats, customChatOrder, setCustomChatOrder, folderToEdit, setFolderToEdit,
    newFolderName, setNewFolderName, newChatName, setNewChatName, notifications, setNotifications, hasUnreadNotifs, setHasUnreadNotifs,
    inAppNotif, setInAppNotif, searchQuery, setSearchQuery, isSearching, setIsSearching, searchResults, setSearchResults,
    searchGroupResults, setSearchGroupResults, viewProfileData, setViewProfileData, avatarHistory, setAvatarHistory,
    avatarEditor, setAvatarEditor, profileForm, setProfileForm, friendOverrideForm, setFriendOverrideForm,
    isMediaExpanded, setIsMediaExpanded, bugDescription, setBugDescription, bugFiles, setBugFiles, adminBugList, setAdminBugList,
    currentMessage, setCurrentMessage, attachedFiles, setAttachedFiles, replyingTo, setReplyingTo, isUploading, setIsUploading,
    messageToDelete, setMessageToDelete, inputMode, setInputMode, isRecording, setIsRecording, isLocked, setIsLocked,
    recordingTime, setRecordingTime, recordedMedia, setRecordedMedia, videoShape, setVideoShape, activeVideoState, setActiveVideoState,
    
    callStatus, callSignal, caller, callerName, isMuted, isVideoOff, localVideoRef, remoteVideoRef,
    isDragOverlayOpen, setIsDragOverlayOpen, dragFiles, setDragFiles, isMobileDragging, setIsMobileDragging, draggedItemId, setDraggedItemId,
    unifiedChatList,
    
    myProfileRef, chatLongPressTimer, fileInputRef, avatarInputRef, profileMediaInputRef, friendAvatarInputRef,
    textareaRef, chatBodyRef, messagesEndRef, previousScrollHeight, liveVideoRef,
    
    socket, handleLogout, switchChat, handleCloseMobileChat, triggerInAppNotification, handleInAppNotifClick,
    startCall, answerCall, endCall, toggleMute, toggleVideo, confirmDelete,
    
    onTyping, onSendMessage, onFileSelect, onRemoveAttachment, onEmojiSelect, onScroll,
    onContextMenu, onReply, onCopy, onDeleteMessageRequest, scrollToMessage, onMentionClick, canDeleteMessage,
    onRecordStart, onRecordMove, onRecordEnd, onCancelRecording, onSendRecorded, formatTime,
    
    onDragStart, onDragEnter, onDragEnd, onDragOver, onTouchDragStart, onTouchDragMove, onTouchDragEnd,
    
    openSettings, saveProfile, requestNotificationPermission, requestMediaPermissions, requestFilePermission,
    onFileChange, handleSaveAvatar, handleProfileMediaSelect, uploadProfileMedia, handleSaveFriendOverride,
    fetchBugReports, resolveBug, copyProfileLink, leaveGroup, removeFriend, blockUser,
    createNewFolder, removeFolder, handleAddToFolder, handlePinSelected, handleDeleteSelected, handleChatClick, handleChatLongPress,
    showScrollBottomBtn, unreadScrollCount, scrollToBottom,
    
    onAddToGroup: () => setActiveModal("addToGroup"),
    onOpenGroupInfo: () => {
        if (!myChats.includes(room)) { socket.emit("get_user_profile", room.replace(username, "").replace("_", "") || room); setShowMenu(false); } 
        else { socket.emit("get_group_info", room); setActiveModal("groupInfo"); setShowMenu(false); }
    }
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default AppContext;