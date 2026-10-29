package com.connect.app.data.socket

import android.util.Log
import com.connect.app.data.model.AvatarHistoryItem
import com.connect.app.data.model.ChatMessage
import com.connect.app.data.model.FriendItem
import com.connect.app.data.model.GroupMember
import com.connect.app.data.model.GroupSettings
import com.connect.app.data.model.NotificationItem
import com.connect.app.data.model.User
import com.connect.app.data.model.UserProfile
import com.connect.app.data.prefs.PreferencesManager
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SocketManager(private val prefs: PreferencesManager) {
    private val tag = "SocketManager"
    private var socket: Socket? = null
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.Main)

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _globalRole = MutableStateFlow(prefs.getGlobalRole())
    val globalRole: StateFlow<String> = _globalRole.asStateFlow()

    private val _friendsList = MutableStateFlow<List<FriendItem>>(emptyList())
    val friendsList: StateFlow<List<FriendItem>> = _friendsList.asStateFlow()

    private val _userGroups = MutableStateFlow<List<String>>(emptyList())
    val userGroups: StateFlow<List<String>> = _userGroups.asStateFlow()

    private val _currentRoomMessages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val currentRoomMessages: StateFlow<List<ChatMessage>> = _currentRoomMessages.asStateFlow()

    private val _currentRoom = MutableStateFlow<String?>(null)
    val currentRoom: StateFlow<String?> = _currentRoom.asStateFlow()

    private val _currentRoomSettings = MutableStateFlow<GroupSettings?>(null)
    val currentRoomSettings: StateFlow<GroupSettings?> = _currentRoomSettings.asStateFlow()

    private val _groupAvatars = MutableStateFlow<Map<String, String>>(emptyMap())
    val groupAvatars: StateFlow<Map<String, String>> = _groupAvatars.asStateFlow()

    private val _currentGroupMembers = MutableStateFlow<List<GroupMember>>(emptyList())
    val currentGroupMembers: StateFlow<List<GroupMember>> = _currentGroupMembers.asStateFlow()

    private val _typingUsers = MutableStateFlow<Map<String, String>>(emptyMap()) // room -> username
    val typingUsers: StateFlow<Map<String, String>> = _typingUsers.asStateFlow()

    private val _searchResults = MutableStateFlow<List<User>>(emptyList())
    val searchResults: StateFlow<List<User>> = _searchResults.asStateFlow()

    private val _searchGroupResults = MutableStateFlow<List<String>>(emptyList())
    val searchGroupResults: StateFlow<List<String>> = _searchGroupResults.asStateFlow()

    private val _myProfile = MutableStateFlow<UserProfile?>(null)
    val myProfile: StateFlow<UserProfile?> = _myProfile.asStateFlow()

    private val _selectedUserProfile = MutableStateFlow<UserProfile?>(null)
    val selectedUserProfile: StateFlow<UserProfile?> = _selectedUserProfile.asStateFlow()

    private val _avatarHistory = MutableStateFlow<List<AvatarHistoryItem>>(emptyList())
    val avatarHistory: StateFlow<List<AvatarHistoryItem>> = _avatarHistory.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationItem>>(emptyList())
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _errorEvents = MutableSharedFlow<String>()
    val errorEvents: SharedFlow<String> = _errorEvents.asSharedFlow()

    private val _groupCreatedEvents = MutableSharedFlow<String>()
    val groupCreatedEvents: SharedFlow<String> = _groupCreatedEvents.asSharedFlow()

    private val _incomingCallEvents = MutableSharedFlow<Map<String, Any>>()
    val incomingCallEvents: SharedFlow<Map<String, Any>> = _incomingCallEvents.asSharedFlow()

    fun connect() {
        val token = prefs.getToken()
        if (token.isNullOrBlank()) {
            disconnect()
            return
        }

        val serverUrl = prefs.getServerUrl()
        try {
            if (socket?.connected() == true) return

            disconnect()

            val opts = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 1000
                reconnectionDelayMax = 5000
            }

            socket = IO.socket(URI.create(serverUrl), opts)
            setupListeners()
            socket?.connect()
        } catch (e: Exception) {
            Log.e(tag, "Socket connection error", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _isConnected.value = false
        _currentRoomMessages.value = emptyList()
        _currentRoom.value = null
    }

    private fun setupListeners() {
        val s = socket ?: return

        s.on(Socket.EVENT_CONNECT) {
            Log.d(tag, "Socket connected: ${s.id()}")
            _isConnected.value = true
            s.emit("get_initial_data")
            val username = prefs.getCurrentUser()?.username
            if (!username.isNullOrBlank()) {
                s.emit("get_my_profile", username)
                s.emit("get_avatar_history", username)
            }
        }

        s.on(Socket.EVENT_DISCONNECT) {
            Log.d(tag, "Socket disconnected")
            _isConnected.value = false
        }

        s.on(Socket.EVENT_CONNECT_ERROR) { args ->
            Log.w(tag, "Socket connect error: ${args.getOrNull(0)}")
            _isConnected.value = false
        }

        s.on("global_role") { args ->
            val role = args.getOrNull(0)?.toString() ?: "member"
            _globalRole.value = role
            prefs.setGlobalRole(role)
        }

        s.on("friends_list") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<FriendItem>>() {}.type
                val list: List<FriendItem> = gson.fromJson(data.toString(), listType)
                _friendsList.value = list
            } catch (e: Exception) {
                Log.e(tag, "Error parsing friends_list", e)
            }
        }

        s.on("user_groups") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<String>>() {}.type
                val list: List<String> = gson.fromJson(data.toString(), listType)
                _userGroups.value = list

                val map = _groupAvatars.value.toMutableMap()
                list.forEach { grp ->
                    val cached = prefs.getGroupAvatar(grp)
                    if (!cached.isNullOrBlank()) {
                        map[grp] = cached
                    } else if (!map.containsKey(grp)) {
                        getGroupInfo(grp)
                    }
                }
                _groupAvatars.value = map
            } catch (e: Exception) {
                Log.e(tag, "Error parsing user_groups", e)
            }
        }

        s.on("groups_metadata") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val jsonArray = when (data) {
                    is JSONArray -> data
                    is String -> JSONArray(data)
                    else -> JSONArray(data.toString())
                }
                val map = _groupAvatars.value.toMutableMap()
                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.optJSONObject(i) ?: continue
                    val room = item.optString("room", "")
                    val avatarUrl = item.optString("avatar_url", item.optString("avatarUrl", ""))
                    if (room.isNotBlank() && avatarUrl.isNotBlank()) {
                        map[room] = avatarUrl
                        prefs.setGroupAvatar(room, avatarUrl)
                    }
                }
                _groupAvatars.value = map
            } catch (e: Exception) {
                Log.e(tag, "Error parsing groups_metadata", e)
            }
        }

        s.on("chat_history") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<ChatMessage>>() {}.type
                val list: List<ChatMessage> = gson.fromJson(data.toString(), listType)
                _currentRoomMessages.value = list
            } catch (e: Exception) {
                Log.e(tag, "Error parsing chat_history", e)
            }
        }

        s.on("more_messages_loaded") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<ChatMessage>>() {}.type
                val olderList: List<ChatMessage> = gson.fromJson(data.toString(), listType)
                _currentRoomMessages.value = olderList + _currentRoomMessages.value
            } catch (e: Exception) {
                Log.e(tag, "Error parsing more_messages_loaded", e)
            }
        }

        s.on("receive_message") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val msg = gson.fromJson(data.toString(), ChatMessage::class.java)
                if (msg.room == _currentRoom.value) {
                    val current = _currentRoomMessages.value.toMutableList()
                    val index = current.indexOfFirst { it.tempId != null && it.tempId == msg.tempId }
                    if (index >= 0) {
                        current[index] = msg
                    } else if (current.none { it.id == msg.id }) {
                        current.add(msg)
                    }
                    _currentRoomMessages.value = current
                }
            } catch (e: Exception) {
                Log.e(tag, "Error parsing receive_message", e)
            }
        }

        s.on("message_deleted") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            val id = data.optLong("id")
            if (id > 0) {
                _currentRoomMessages.value = _currentRoomMessages.value.filter { it.id != id }
            }
        }

        s.on("display_typing") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            val username = data.optString("username")
            val room = data.optString("room")
            if (username.isNotBlank() && room.isNotBlank()) {
                val current = _typingUsers.value.toMutableMap()
                current[room] = username
                _typingUsers.value = current
                scope.launch {
                    kotlinx.coroutines.delay(3000)
                    val updated = _typingUsers.value.toMutableMap()
                    if (updated[room] == username) {
                        updated.remove(room)
                        _typingUsers.value = updated
                    }
                }
            }
        }

        s.on("room_settings") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val settings = gson.fromJson(data.toString(), GroupSettings::class.java)
                _currentRoomSettings.value = settings
                val room = settings.room
                val avatar = settings.avatarUrl
                if (!room.isNullOrBlank() && !avatar.isNullOrBlank()) {
                    val map = _groupAvatars.value.toMutableMap()
                    map[room] = avatar
                    _groupAvatars.value = map
                    prefs.setGroupAvatar(room, avatar)
                }
            } catch (e: Exception) {
                Log.e(tag, "Error parsing room_settings", e)
            }
        }

        s.on("room_settings_updated") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val obj = when (data) {
                    is JSONObject -> data
                    is String -> JSONObject(data)
                    else -> JSONObject(data.toString())
                }
                val room = obj.optString("room", "")
                val avatarUrl = obj.optString("avatar_url", obj.optString("avatarUrl", ""))
                if (room.isNotBlank()) {
                    if (avatarUrl.isNotBlank()) {
                        val map = _groupAvatars.value.toMutableMap()
                        map[room] = avatarUrl
                        _groupAvatars.value = map
                        prefs.setGroupAvatar(room, avatarUrl)
                    }
                    val cur = _currentRoomSettings.value
                    if (cur != null && cur.room == room) {
                        _currentRoomSettings.value = cur.copy(
                            isPrivate = if (obj.has("is_private")) obj.optInt("is_private") else (if (obj.has("isPrivate") && obj.optBoolean("isPrivate")) 1 else cur.isPrivate),
                            slowMode = if (obj.has("slow_mode")) obj.optInt("slow_mode") else (if (obj.has("slowMode")) obj.optInt("slowMode") else cur.slowMode),
                            avatarUrl = if (avatarUrl.isNotBlank()) avatarUrl else cur.avatarUrl
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Error parsing room_settings_updated", e)
            }
        }

        s.on("group_info_data") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            try {
                val membersArray = data.optJSONArray("members")
                if (membersArray != null) {
                    val listType = object : TypeToken<List<GroupMember>>() {}.type
                    val list: List<GroupMember> = gson.fromJson(membersArray.toString(), listType)
                    _currentGroupMembers.value = list
                }
                val myRole = data.optString("myRole", "")
                val curSettings = _currentRoomSettings.value
                if (myRole.isNotBlank()) {
                    if (curSettings != null) {
                        if (curSettings.myRole != myRole) {
                            _currentRoomSettings.value = curSettings.copy(myRole = myRole)
                        }
                    } else {
                        val room = data.optString("room", "")
                        _currentRoomSettings.value = GroupSettings(room = room, myRole = myRole)
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Error parsing group_info_data", e)
            }
        }

        s.on("avatar_history_data") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<AvatarHistoryItem>>() {}.type
                val list: List<AvatarHistoryItem> = gson.fromJson(data.toString(), listType)
                _avatarHistory.value = list
            } catch (e: Exception) {
                Log.e(tag, "Error parsing avatar_history_data", e)
            }
        }

        s.on("search_results") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<User>>() {}.type
                val list: List<User> = gson.fromJson(data.toString(), listType)
                _searchResults.value = list
            } catch (e: Exception) {
                Log.e(tag, "Error parsing search_results", e)
            }
        }

        s.on("search_groups_results") { args ->
            val data = args.getOrNull(0) as? JSONArray ?: return@on
            val list = mutableListOf<String>()
            for (i in 0 until data.length()) {
                val obj = data.optJSONObject(i)
                val room = obj?.optString("room")
                if (!room.isNullOrBlank()) list.add(room)
            }
            _searchGroupResults.value = list
        }

        s.on("my_profile_data") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val p = gson.fromJson(data.toString(), UserProfile::class.java)
                val effectiveColor = if (!p.profileColor.isNullOrBlank()) {
                    prefs.setProfileColor(p.profileColor)
                    p.profileColor
                } else {
                    prefs.getProfileColor()
                }
                if (!p.avatarUrl.isNullOrBlank()) {
                    prefs.setSavedAvatarUrl(p.avatarUrl)
                }
                val curUser = prefs.getCurrentUser()
                if (curUser != null) {
                    val updatedUser = curUser.copy(
                        displayName = p.displayName ?: curUser.displayName,
                        avatarUrl = p.avatarUrl ?: curUser.avatarUrl
                    )
                    prefs.setCurrentUser(updatedUser)
                }
                val safeMedia = p.media ?: emptyList()
                val safeBadges = p.badges ?: emptyList()
                _myProfile.value = p.copy(
                    media = safeMedia,
                    badges = safeBadges,
                    profileColor = effectiveColor
                )
            } catch (e: Exception) {
                Log.e(tag, "Error parsing my_profile_data", e)
            }
        }

        s.on("user_profile_data") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val p = gson.fromJson(data.toString(), UserProfile::class.java)
                val safeMedia = p.media ?: emptyList()
                val safeBadges = p.badges ?: emptyList()
                _selectedUserProfile.value = p.copy(
                    media = safeMedia,
                    badges = safeBadges
                )
            } catch (e: Exception) {
                Log.e(tag, "Error parsing user_profile_data", e)
            }
        }

        s.on("notification_history") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val listType = object : TypeToken<List<NotificationItem>>() {}.type
                val list: List<NotificationItem> = gson.fromJson(data.toString(), listType)
                _notifications.value = list
            } catch (e: Exception) {
                Log.e(tag, "Error parsing notification_history", e)
            }
        }

        s.on("new_notification") { args ->
            val data = args.getOrNull(0) ?: return@on
            try {
                val item = gson.fromJson(data.toString(), NotificationItem::class.java)
                _notifications.value = listOf(item) + _notifications.value
            } catch (e: Exception) {
                Log.e(tag, "Error parsing new_notification", e)
            }
        }

        s.on("incoming_call") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            val map = mutableMapOf<String, Any>()
            val keys = data.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = data.get(k)
            }
            scope.launch { _incomingCallEvents.emit(map) }
        }

        s.on("error_message") { args ->
            val data = args.getOrNull(0) as? JSONObject
            val msg = data?.optString("msg") ?: "Неизвестная ошибка"
            scope.launch { _errorEvents.emit(msg) }
        }

        s.on("group_created") { args ->
            val data = args.getOrNull(0) as? JSONObject
            val room = data?.optString("room") ?: ""
            if (room.isNotBlank()) {
                scope.launch { _groupCreatedEvents.emit(room) }
            }
        }
    }

    fun fetchMyProfile() {
        val username = prefs.getCurrentUser()?.username ?: prefs.getBiometricUser()?.username
        if (!username.isNullOrBlank()) {
            socket?.emit("get_my_profile", username)
            socket?.emit("get_avatar_history", username)
        }
    }

    fun joinRoom(room: String, isGroup: Boolean = false) {
        _currentRoom.value = room
        _currentRoomMessages.value = emptyList()
        val json = JSONObject().apply {
            put("room", room)
            put("isGroup", isGroup)
        }
        socket?.emit("join_room", json)
    }

    fun leaveCurrentRoom(clearSettings: Boolean = false) {
        _currentRoom.value = null
        _currentRoomMessages.value = emptyList()
        if (clearSettings) {
            _currentRoomSettings.value = null
            _currentGroupMembers.value = emptyList()
        }
    }

    fun sendMessage(room: String, messageText: String, type: String = "text", replyTo: ChatMessage? = null) {
        val s = socket ?: return
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val timeStr = timeFormat.format(Date())
        val tempId = "temp_${System.currentTimeMillis()}"

        val json = JSONObject().apply {
            put("room", room)
            put("message", messageText)
            put("type", type)
            put("time", timeStr)
            put("tempId", tempId)
            if (replyTo != null) {
                val rObj = JSONObject().apply {
                    put("id", replyTo.id)
                    put("author", replyTo.author)
                    put("message", replyTo.message)
                }
                put("replyTo", rObj)
            }
        }

        s.emit("send_message", json)
    }

    fun loadMoreMessages(room: String, offset: Int) {
        val json = JSONObject().apply {
            put("room", room)
            put("offset", offset)
        }
        socket?.emit("load_more_messages", json)
    }

    fun deleteMessage(id: Long, forEveryone: Boolean = true) {
        val json = JSONObject().apply {
            put("id", id)
            put("forEveryone", forEveryone)
        }
        socket?.emit("delete_message", json)
    }

    fun emitTyping(room: String) {
        val json = JSONObject().apply { put("room", room) }
        socket?.emit("typing", json)
    }

    fun searchUsers(query: String) {
        socket?.emit("search_users", query)
    }

    fun searchGroups(query: String) {
        socket?.emit("search_groups", query)
    }

    fun createGroup(roomName: String) {
        val json = JSONObject().apply { put("room", roomName) }
        socket?.emit("create_group", json)
    }

    fun joinExistingGroup(roomName: String) {
        val json = JSONObject().apply { put("room", roomName) }
        socket?.emit("join_existing_group", json)
    }

    fun leaveGroup(roomName: String) {
        val json = JSONObject().apply { put("room", roomName) }
        socket?.emit("leave_group", json)
    }

    fun getGroupInfo(room: String) {
        socket?.emit("get_group_info", room)
    }

    fun updateGroupSettings(room: String, isPrivate: Boolean, slowMode: Int, avatarUrl: String) {
        val json = JSONObject().apply {
            put("room", room)
            put("is_private", if (isPrivate) 1 else 0)
            put("slow_mode", slowMode)
            put("avatar_url", avatarUrl)
        }
        socket?.emit("update_group_settings", json)
    }

    fun assignChatRole(room: String, targetUsername: String, newRole: String) {
        val json = JSONObject().apply {
            put("room", room)
            put("targetUsername", targetUsername)
            put("newRole", newRole)
        }
        socket?.emit("assign_chat_role", json)
    }

    fun addGroupMember(room: String, targetUsername: String) {
        val json = JSONObject().apply {
            put("room", room)
            put("username", targetUsername)
        }
        socket?.emit("add_group_member", json)
    }

    fun removeGroupMember(room: String, targetUsername: String) {
        val json = JSONObject().apply {
            put("room", room)
            put("username", targetUsername)
        }
        socket?.emit("remove_group_member", json)
    }

    fun sendFriendRequest(toUsername: String) {
        val json = JSONObject().apply { put("toUsername", toUsername) }
        socket?.emit("send_friend_request_by_name", json)
    }

    fun acceptFriendRequest(notifId: Long?, fromUsername: String) {
        val json = JSONObject().apply {
            if (notifId != null) put("notifId", notifId)
            put("fromUsername", fromUsername)
        }
        socket?.emit("accept_friend_request", json)
    }

    fun declineFriendRequest(notifId: Long?) {
        val json = JSONObject().apply {
            if (notifId != null) put("notifId", notifId)
        }
        socket?.emit("decline_friend_request", json)
    }

    fun removeFriend(username: String) {
        socket?.emit("remove_friend", username)
    }

    fun blockUser(username: String) {
        socket?.emit("block_user", username)
    }

    fun getUserProfile(username: String) {
        socket?.emit("get_user_profile", username)
    }

    fun getAvatarHistory(username: String) {
        socket?.emit("get_avatar_history", username)
    }

    fun deleteAvatar(avatarId: Long) {
        val json = JSONObject().apply { put("avatarId", avatarId) }
        socket?.emit("delete_avatar", json)
    }

    fun addMediaToMyProfile(item: com.connect.app.data.model.UserMediaItem) {
        val cur = _myProfile.value ?: return
        val currentList = cur.media.toMutableList()
        currentList.removeAll { it.id == item.id || it.url == item.url }
        currentList.add(0, item)
        _myProfile.value = cur.copy(media = currentList)
    }

    fun updateProfile(
        displayName: String,
        bio: String,
        phone: String,
        notificationsEnabled: Boolean = true,
        newUsername: String? = null,
        birthday: String? = null,
        personalChannel: String? = null,
        profileColor: String? = null
    ) {
        // Optimistic local update
        val cur = _myProfile.value
        val updatedProfile = (cur ?: UserProfile(username = prefs.getCurrentUser()?.username ?: "")).copy(
            displayName = displayName,
            bio = bio,
            phone = phone,
            notificationsEnabled = if (notificationsEnabled) 1 else 0,
            birthday = birthday ?: cur?.birthday,
            personalChannel = personalChannel ?: cur?.personalChannel,
            profileColor = profileColor ?: cur?.profileColor
        )
        _myProfile.value = updatedProfile

        val curUser = prefs.getCurrentUser()
        if (curUser != null) {
            prefs.setCurrentUser(curUser.copy(displayName = displayName))
        }

        val json = JSONObject().apply {
            put("display_name", displayName)
            put("bio", bio)
            put("phone", phone)
            put("notifications_enabled", notificationsEnabled)
            if (!newUsername.isNullOrBlank()) {
                put("newUsername", newUsername)
            }
            if (birthday != null) put("birthday", birthday)
            if (personalChannel != null) put("personal_channel", personalChannel)
            if (profileColor != null) put("profile_color", profileColor)
        }
        socket?.emit("update_profile", json)

        // Dual reliability: Also call HTTP endpoint in background
        scope.launch(Dispatchers.IO) {
            try {
                val token = prefs.getToken()
                if (!token.isNullOrBlank()) {
                    val auth = "Bearer $token"
                    val app = com.connect.app.ConnectApplication.instance
                    val req = com.connect.app.data.model.UpdateProfileRequest(
                        displayName = displayName,
                        bio = bio,
                        phone = phone,
                        notificationsEnabled = notificationsEnabled,
                        birthday = birthday,
                        personalChannel = personalChannel,
                        profileColor = profileColor
                    )
                    val resp = app.apiClient.service.updateProfile(auth, req)
                    if (resp.isSuccessful) {
                        val serverProf = resp.body()?.profile
                        if (serverProf != null) {
                            scope.launch(Dispatchers.Main) {
                                val cur = _myProfile.value
                                _myProfile.value = serverProf.copy(
                                    media = if (serverProf.media.isNullOrEmpty()) cur?.media ?: emptyList() else serverProf.media,
                                    badges = if (serverProf.badges.isNullOrEmpty()) cur?.badges ?: emptyList() else serverProf.badges
                                )
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(tag, "HTTP updateProfile fallback error: ${e.message}")
            }
        }
    }

    fun updateProfileColor(colorId: String) {
        prefs.setProfileColor(colorId)
        val cur = _myProfile.value
        _myProfile.value = cur?.copy(profileColor = colorId)
        updateProfile(
            displayName = cur?.displayName ?: "",
            bio = cur?.bio ?: "",
            phone = cur?.phone ?: "",
            notificationsEnabled = (cur?.notificationsEnabled ?: 1) == 1,
            birthday = cur?.birthday,
            personalChannel = cur?.personalChannel,
            profileColor = colorId
        )
    }
}
