import { useEffect, useRef, useCallback } from 'react';

export const useSocket = (socket, username, room, setters) => {
  const {
    setGlobalRole,
    setRoomSettings,
    setMyRole,
    setChatPreviews,
    setAvatarHistory,
    setMyChats,
    setFriends,
    setSearchResults,
    setSearchGroupResults,
    setGroupMembers,
    setMessageList,
    setTypingText,
    setViewProfileData,
    setNotifications,
    setHasUnreadNotifs,
    setTotalNetworkUsers,
    setActiveModal,
    switchChat
  } = setters;

  const typingTimeoutRef = useRef(null);
  const { playNotificationSound, sendSystemNotification, handleLogout } = setters;

  // Подписка на события сокета
  useEffect(() => {
    if (!socket) return;

    const handleGlobalRole = (role) => setGlobalRole(role);
    const handleRoomSettings = (settings) => {
      setRoomSettings(settings);
      setMyRole(settings.myRole);
    };
    const handleRoomSettingsUpdated = (data) => {
      if (data.room === room) {
        setRoomSettings(prev => ({ ...prev, ...data }));
      }
    };
    const handleChatPreviews = (data) => {
      if (typeof data === 'object' && data !== null) setChatPreviews(data);
    };
    const handleUpdateChatPreview = (data) => {
      setChatPreviews(prev => ({ ...prev, [data.room]: data.preview }));
    };
    const handleAvatarHistory = (data) => setAvatarHistory(data);
    const handleUserGroups = (groups) => {
      if (Array.isArray(groups)) setMyChats(groups);
    };
    const handleFriendsList = (list) => {
      if (Array.isArray(list)) setFriends(list);
    };
    const handleSearchResults = (results) => {
      if (Array.isArray(results)) {
        setSearchResults(results.filter(u => u.username !== username));
      } else {
        setSearchResults([]);
      }
    };
    const handleSearchGroupResults = (results) => {
      setSearchGroupResults(Array.isArray(results) ? results : []);
    };
    const handleGroupCreated = (data) => {
      setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev);
      switchChat(data.room);
      setActiveModal(null);
    };
    const handleGroupJoined = (data) => {
      setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev);
      switchChat(data.room);
      setActiveModal(null);
    };
    const handleLeftGroup = (data) => {
      setMyChats(prev => prev.filter(c => c !== data.room));
      if (room === data.room) switchChat("");
      setActiveModal(null);
    };
    const handleGroupDeleted = (data) => {
      setMyChats(prev => prev.filter(c => c !== data.room));
      if (room === data.room) {
        switchChat("");
        alert("Группа была удалена владельцем");
      }
    };
    const handleFriendAdded = (data) => {
      setFriends(prev => [...prev, data.username]);
      alert(`${data.username} добавлен!`);
    };
    const handleFriendRemoved = (data) => {
      setFriends(prev => prev.filter(f => f.username !== data.username && f !== data.username));
      const expectedRoomId = [username, data.username].sort().join("_");
      if (room === expectedRoomId) switchChat("");
    };
    const handleMyProfile = (data) => {
      setters.setMyProfile({
        ...data,
        notifications_enabled: data.notifications_enabled === 1,
        media: data.media || []
      });
    };
    const handleUserProfile = (data) => {
      setViewProfileData({ ...data, media: data.media || [] });
      setActiveModal("userProfile");
      socket.emit("get_avatar_history", data.username);
    };
    const handleNotificationHistory = (history) => {
      setNotifications(history);
      setHasUnreadNotifs(history.some(n => !n.is_read));
    };
    const handleNewNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setHasUnreadNotifs(true);
      playNotificationSound();
      let title = "Новое уведомление";
      let body = notif.content;
      if (notif.type === 'friend_request') body = `Заявка в друзья от ${notif.content}`;
      if (notif.type === 'mention') {
        title = "Вас упомянули";
        body = notif.content;
      }
      sendSystemNotification(title, body, 'system', notif.data, null);
    };
    const handleErrorMessage = (d) => alert(d.msg);
    const handleTotalUsers = (count) => setTotalNetworkUsers(count);
    const handleForceLogout = (d) => {
      alert(d.msg);
      handleLogout();
    };

    socket.on("global_role", handleGlobalRole);
    socket.on("room_settings", handleRoomSettings);
    socket.on("room_settings_updated", handleRoomSettingsUpdated);
    socket.on("chat_previews_data", handleChatPreviews);
    socket.on("update_chat_preview", handleUpdateChatPreview);
    socket.on("avatar_history_data", handleAvatarHistory);
    socket.on("user_groups", handleUserGroups);
    socket.on("friends_list", handleFriendsList);
    socket.on("search_results", handleSearchResults);
    socket.on("search_groups_results", handleSearchGroupResults);
    socket.on("group_created", handleGroupCreated);
    socket.on("group_joined", handleGroupJoined);
    socket.on("left_group_success", handleLeftGroup);
    socket.on("group_deleted", handleGroupDeleted);
    socket.on("friend_added", handleFriendAdded);
    socket.on("friend_removed", handleFriendRemoved);
    socket.on("my_profile_data", handleMyProfile);
    socket.on("user_profile_data", handleUserProfile);
    socket.on("notification_history", handleNotificationHistory);
    socket.on("new_notification", handleNewNotification);
    socket.on("error_message", handleErrorMessage);
    socket.on("total_users", handleTotalUsers);
    socket.on("force_logout", handleForceLogout);

    return () => {
      socket.off("global_role", handleGlobalRole);
      socket.off("room_settings", handleRoomSettings);
      socket.off("room_settings_updated", handleRoomSettingsUpdated);
      socket.off("chat_previews_data", handleChatPreviews);
      socket.off("update_chat_preview", handleUpdateChatPreview);
      socket.off("avatar_history_data", handleAvatarHistory);
      socket.off("user_groups", handleUserGroups);
      socket.off("friends_list", handleFriendsList);
      socket.off("search_results", handleSearchResults);
      socket.off("search_groups_results", handleSearchGroupResults);
      socket.off("group_created", handleGroupCreated);
      socket.off("group_joined", handleGroupJoined);
      socket.off("left_group_success", handleLeftGroup);
      socket.off("group_deleted", handleGroupDeleted);
      socket.off("friend_added", handleFriendAdded);
      socket.off("friend_removed", handleFriendRemoved);
      socket.off("my_profile_data", handleMyProfile);
      socket.off("user_profile_data", handleUserProfile);
      socket.off("notification_history", handleNotificationHistory);
      socket.off("new_notification", handleNewNotification);
      socket.off("error_message", handleErrorMessage);
      socket.off("total_users", handleTotalUsers);
      socket.off("force_logout", handleForceLogout);
    };
  }, [socket, username, room, setters]);

  // Инициализация данных при подключении
  useEffect(() => {
    if (username && socket) {
      socket.emit("get_initial_data");
      socket.emit("get_my_profile", username);
    }
  }, [socket, username]);

  // Эмиттеры событий
  const emitEvent = useCallback((event, data) => {
    if (socket) socket.emit(event, data);
  }, [socket]);

  return {
    emitEvent,
    joinRoom: (roomData) => emitEvent("join_room", roomData),
    leaveRoom: (roomData) => emitEvent("leave_group", roomData),
    sendMessage: (data, callback) => emitEvent("send_message", data, callback),
    loadMoreMessages: (data) => emitEvent("load_more_messages", data),
    typing: (data) => emitEvent("typing", data),
    deleteMessage: (data) => emitEvent("delete_message", data),
    getGroupInfo: (room) => emitEvent("get_group_info", room),
    getUserProfile: (username) => emitEvent("get_user_profile", username),
    getMyProfile: (username) => emitEvent("get_my_profile", username),
    updateProfile: (data) => emitEvent("update_profile", data),
    createGroup: (data) => emitEvent("create_group", data),
    joinGroup: (data) => emitEvent("join_existing_group", data),
    addGroupMember: (data) => emitEvent("add_group_member", data),
    removeGroupMember: (data) => emitEvent("remove_group_member", data),
    updateGroupSettings: (data) => emitEvent("update_group_settings", data),
    assignChatRole: (data) => emitEvent("assign_chat_role", data),
    searchUsers: (query) => emitEvent("search_users", query),
    searchGroups: (query) => emitEvent("search_groups", query),
    sendFriendRequest: (data) => emitEvent("send_friend_request_by_name", data),
    removeFriend: (username) => emitEvent("remove_friend", username),
    blockUser: (username) => emitEvent("block_user", username),
    acceptFriendRequest: (data) => emitEvent("accept_friend_request", data),
    declineFriendRequest: (data) => emitEvent("decline_friend_request", data),
    markNotificationRead: (data) => emitEvent("mark_notification_read", data),
    deleteNotification: (data) => emitEvent("delete_notification", data),
    getAvatarHistory: (username) => emitEvent("get_avatar_history", username),
    deleteAvatar: (data) => emitEvent("delete_avatar", data),
    callUser: (data) => emitEvent("callUser", data),
    answerCall: (data) => emitEvent("answerCall", data),
    endCall: (data) => emitEvent("endCall", data),
    iceCandidate: (data) => emitEvent("ice-candidate", data)
  };
};