import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useProfileStore } from '../stores/profileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { useCallStore } from '../stores/callStore';

const SocketManager = () => {
  const socket = useAuthStore(s => s.socket);
  const username = useAuthStore(s => s.username);
  const handleLogout = useAuthStore(s => s.handleLogout);

  // Вспомогательные функции
  const switchChat = useCallback((targetName) => {
    const { isSelectionMode, isMobile, setSwipeX, setShowMobileChat } = useUIStore.getState();
    const { room, setRoom } = useChatStore.getState();

    if (isSelectionMode) return;
    if (targetName !== room) setRoom(targetName);
    if (isMobile) {
      setSwipeX(0);
      setShowMobileChat(!!targetName);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try { const audio = new Audio('/notification.mp3'); audio.volume = 0.5; audio.play().catch(() => {}); } catch (e) {}
  }, []);

  const sendSystemNotification = useCallback((title, body, tag, roomName, avatarUrl) => {
    const currentProfile = useProfileStore.getState().myProfile;
    if (currentProfile.notifications_enabled === 0 || currentProfile.notifications_enabled === false) return; 
    
    useUIStore.getState().triggerInAppNotif(title, body, avatarUrl, roomName);

    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, { body, icon: '/icon-192.png', tag, vibrate: [200, 100, 200] });
                });
            } else {
                const notif = new Notification(title, { body, icon: '/icon-192.png', tag });
                notif.onclick = () => { window.focus(); if(roomName) switchChat(roomName); notif.close(); };
            }
        } catch (e) { console.error(e); }
    }
  }, [switchChat]);

  // Главный слушатель сокетов
  useEffect(() => {
    if (!socket || !username) return;

    socket.emit("get_initial_data"); 
    socket.emit("get_my_profile", username); 

    const handlers = {
      // Роли и настройки 
      "global_role": (role) => useChatStore.getState().setGlobalRole(role),
      "room_settings": (sets) => { 
        useChatStore.getState().setRoomSettings(sets); 
        useChatStore.getState().setMyRole(sets.myRole); 
      },
      "room_settings_updated": (data) => { 
        if(data.room === useChatStore.getState().room) {
          useChatStore.getState().setRoomSettings(prev => ({...prev, ...data})); 
        }
      },
      
      // Превью чатов и аватарки
      "chat_previews_data": (data) => { if (typeof data === 'object') useChatStore.getState().setChatPreviews(data); },
      "update_chat_preview": (data) => { useChatStore.getState().setChatPreviews(prev => ({ ...prev, [data.room]: data.preview })); },
      "avatar_history_data": (data) => useProfileStore.getState().setAvatarHistory(data),
      
      // Списки и поиск
      "user_groups": (groups) => { if(Array.isArray(groups)) useProfileStore.getState().setMyChats(groups); },
      "friends_list": (list) => { if(Array.isArray(list)) useProfileStore.getState().setFriends(list); },
      "search_results": (results) => { 
        useProfileStore.getState().setSearchResults(Array.isArray(results) ? results.filter(u => u.username !== username) : []); 
        useProfileStore.getState().setIsSearching(false); 
      },
      "search_groups_results": (results) => { 
        useProfileStore.getState().setSearchGroupResults(Array.isArray(results) ? results : []); 
        useProfileStore.getState().setIsSearching(false); 
      },
      
      // Управление группами и друзьями
      "group_created": (data) => { 
        useProfileStore.getState().setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev); 
        switchChat(data.room); 
        useUIStore.getState().setActiveModal(null); 
      },
      "group_joined": (data) => { 
        useProfileStore.getState().setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev); 
        switchChat(data.room); 
        useUIStore.getState().setActiveModal(null); 
      },
      "left_group_success": (data) => { 
        useProfileStore.getState().setMyChats(prev => prev.filter(c => c !== data.room)); 
        if(useChatStore.getState().room === data.room) switchChat(""); 
        useUIStore.getState().setActiveModal(null); 
      },
      "group_deleted": (data) => { 
        useProfileStore.getState().setMyChats(prev => prev.filter(c => c !== data.room)); 
        if(useChatStore.getState().room === data.room) { switchChat(""); alert("Группа была удалена владельцем"); } 
      },
      "friend_added": (data) => { 
        useProfileStore.getState().setFriends(prev => [...prev, data.username]); 
        alert(`${data.username} добавлен!`); 
      },
      "friend_removed": (data) => { 
        useProfileStore.getState().setFriends(prev => prev.filter(f => f.username !== data.username && f !== data.username)); 
        const expectedRoomId = [username, data.username].sort().join("_"); 
        if(useChatStore.getState().room === expectedRoomId) switchChat(""); 
      },
      
      // Профили 
      "my_profile_data": (data) => { 
        useProfileStore.getState().setMyProfile({ ...data, notifications_enabled: data.notifications_enabled === 1, media: data.media || [] }); 
      },
      "user_profile_data": (data) => { 
        useProfileStore.getState().setViewProfileData({...data, media: data.media || []}); 
        useUIStore.getState().setActiveModal("userProfile"); 
        socket.emit("get_avatar_history", data.username); 
      },
      
      // Уведомления и ошибки
      "notification_history": (history) => { 
        useSettingsStore.getState().setNotifications(history); 
        useSettingsStore.getState().setHasUnreadNotifs(history.some(n => !n.is_read)); 
      },
      "new_notification": (notif) => { 
        useSettingsStore.getState().setNotifications(prev => [notif, ...prev]); 
        useSettingsStore.getState().setHasUnreadNotifs(true); 
        playNotificationSound(); 
        sendSystemNotification("Новое уведомление", notif.content, 'system', notif.data, null); 
      },
      "error_message": (d) => alert(d.msg),
      "total_users": (count) => useSettingsStore.getState().setTotalNetworkUsers(count),
      "force_logout": (d) => { alert(d.msg); handleLogout(); },
      
      // Сообщения
      "group_info_data": (d) => { if(d.room === useChatStore.getState().room) useChatStore.getState().setGroupMembers(d.members); },
      "group_info_updated": (data) => { if(useChatStore.getState().room === data.members?.[0]?.room) useChatStore.getState().setGroupMembers(data.members); },
      "message_deleted": (data) => useChatStore.getState().setMessageList(prev => prev.filter(msg => msg.id !== (data.id || data))),
      "message_edited": ({ messageId, newText }) => {
        useChatStore.getState().setMessageList(prev => prev.map(msg => msg.id === messageId ? { ...msg, message: newText, is_edited: true } : msg));
      },
      "display_typing": (d) => {
        const { room, setTypingText } = useChatStore.getState();
        if(d.room === room) { 
          setTypingText(`${d.username} печатает...`); 
          clearTimeout(window.typingTimeout); 
          window.typingTimeout = setTimeout(() => setTypingText(""), 3000); 
        }
      },
      "receive_message": (data) => {
        const chatStore = useChatStore.getState();
        chatStore.setChatPreviews(prev => ({ ...prev, [data.room]: { text: data.message, sender: data.author, time: data.time, timestamp: data.timestamp, type: data.type } }));
        if (data.room === chatStore.room) {
          chatStore.setMessageList(list => {
            if (data.author === username && data.tempId) { 
              const exists = list.find(m => m.tempId === data.tempId); 
              if (exists) return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m); 
            }
            return [...list, data];
          });
          if (data.author !== username && document.hidden) { playNotificationSound(); sendSystemNotification(data.author, data.message, 'dm', data.room, null); }
        } else { 
          if (data.author !== username) { playNotificationSound(); sendSystemNotification(data.author, data.message, 'dm', data.room, null); } 
        }
      },
      "chat_history": (h) => { 
        const formatted = h.map(m => ({...m, status: 'sent'}));
        useChatStore.getState().setMessageList(formatted); 
        useChatStore.getState().setHasMore(h.length >= 30); 
        useChatStore.getState().setIsLoadingHistory(false); 
      },
      "more_messages_loaded": (h) => { 
        useChatStore.getState().setMessageList(p => [...h.map(m => ({...m, status: 'sent'})), ...p]); 
        useChatStore.getState().setHasMore(h.length >= 30); 
        useChatStore.getState().setIsLoadingHistory(false); 
      },
      "no_more_messages": () => { 
        useChatStore.getState().setHasMore(false); 
        useChatStore.getState().setIsLoadingHistory(false); 
      },
      
      "callUser": (data) => { 
        const { setCallStatus, setCaller, setCallerName, setCallSignal } = useCallStore.getState();
        setCallStatus('receiving'); setCaller(data.from); setCallerName(data.name || data.from); setCallSignal(data.signal); 
      },
      "callAccepted": (signal) => { 
        useCallStore.getState().setCallStatus('connected'); 
        const peer = useCallStore.getState().peerConnection;
        if(peer) peer.setRemoteDescription(new RTCSessionDescription(signal)); 
      },
      "ice-candidate": (candidate) => { 
        const peer = useCallStore.getState().peerConnection;
        if (peer) peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e)); 
      },
      "callEnded": () => useCallStore.getState().clearCall(),
      "call_failed": (d) => { alert(d.msg); useCallStore.getState().clearCall(); }
    };
    
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  }, [socket, username, switchChat, playNotificationSound, sendSystemNotification, handleLogout]);

  useEffect(() => {
    const room = useChatStore.getState().room;
    if (!room || !socket) return;
    socket.emit("join_room", { username, room });
    if (!room.includes("_")) socket.emit("get_group_info", room);
  }, [useChatStore(s => s.room), socket, username]);

  return null;
};

export default SocketManager;