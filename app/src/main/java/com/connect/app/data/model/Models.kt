package com.connect.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val username: String,
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val role: String? = "member"
) {
    val bestName: String get() = if (!displayName.isNullOrBlank()) displayName else username
}

data class UserProfile(
    val username: String,
    @SerializedName("display_name") val displayName: String? = null,
    val bio: String? = null,
    val phone: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("notifications_enabled") val notificationsEnabled: Int = 1,
    val isFriend: Boolean = false,
    val isGlobalMod: Boolean = false,
    val media: List<UserMediaItem> = emptyList(),
    val badges: List<UserBadge> = emptyList(),
    @SerializedName("local_overrides") val localOverrides: FriendOverrideData? = null,
    val birthday: String? = null,
    @SerializedName("personal_channel") val personalChannel: String? = null,
    @SerializedName("profile_color") val profileColor: String? = null,
    val isOnline: Boolean = false
) {
    val bestName: String get() = if (!displayName.isNullOrBlank()) displayName else username
}

data class FriendOverrideData(
    @SerializedName("local_display_name") val localDisplayName: String? = null,
    @SerializedName("local_avatar_url") val localAvatarUrl: String? = null
)

data class UserMediaItem(
    val id: Long,
    val url: String,
    val type: String,
    @SerializedName("created_at") val createdAt: String? = null
)

data class UpdateProfileRequest(
    @SerializedName("display_name") val displayName: String? = null,
    val bio: String? = null,
    val phone: String? = null,
    @SerializedName("notifications_enabled") val notificationsEnabled: Boolean = true,
    val birthday: String? = null,
    @SerializedName("personal_channel") val personalChannel: String? = null,
    @SerializedName("profile_color") val profileColor: String? = null
)

data class UpdateProfileResponse(
    val status: String? = null,
    val profile: UserProfile? = null
)


data class UserBadge(
    val id: Long? = null,
    val name: String,
    @SerializedName("svg_content") val svgContent: String? = null
)

data class AvatarHistoryItem(
    val id: Long,
    val username: String,
    @SerializedName("avatar_url") val avatarUrl: String,
    @SerializedName("created_at") val createdAt: String? = null
)

data class ChatMessage(
    val id: Long = 0,
    val room: String,
    val author: String,
    @SerializedName("author_display_name") val authorDisplayName: String? = null,
    val message: String,
    val type: String = "text",
    val time: String? = null,
    @SerializedName("reply_to_id") val replyToId: Long? = null,
    @SerializedName("reply_to_author") val replyToAuthor: String? = null,
    @SerializedName("reply_to_message") val replyToMessage: String? = null,
    @SerializedName("author_badges") val authorBadges: List<UserBadge> = emptyList(),
    val tempId: String? = null
) {
    val isSystem: Boolean get() = type == "system"
    val isImage: Boolean get() = type == "image"
    val isAudio: Boolean get() = type == "audio"
    val isVideo: Boolean get() = type == "video"
    val authorName: String get() = if (!authorDisplayName.isNullOrBlank()) authorDisplayName else author
}

data class FriendItem(
    val username: String,
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("local_display_name") val localDisplayName: String? = null,
    @SerializedName("local_avatar_url") val localAvatarUrl: String? = null
) {
    val effectiveName: String
        get() = when {
            !localDisplayName.isNullOrBlank() -> localDisplayName
            !displayName.isNullOrBlank() -> displayName
            else -> username
        }

    val effectiveAvatar: String?
        get() = localAvatarUrl?.takeIf { it.isNotBlank() } ?: avatarUrl
}

data class GroupSettings(
    val room: String,
    @SerializedName("is_private") val isPrivate: Int = 0,
    @SerializedName("slow_mode") val slowMode: Int = 0,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    val myRole: String? = "member"
)

data class GroupMember(
    val username: String,
    val role: String,
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    val badges: List<UserBadge> = emptyList()
)

data class NotificationItem(
    val id: Long,
    @SerializedName("user_to") val userTo: String,
    val type: String,
    val content: String,
    val data: String? = null,
    @SerializedName("is_read") val isRead: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
)

data class AuthRequest(
    val username: String,
    val password: String
)

data class AuthResponse(
    val token: String? = null,
    val user: User? = null,
    val username: String? = null,
    val role: String? = null,
    val message: String? = null,
    val error: String? = null
) {
    val effectiveUser: User?
        get() = user ?: username?.let { User(username = it, role = role ?: "member") }
}

data class UploadResponse(
    val url: String? = null,
    val urls: List<String>? = null,
    val message: String? = null
)

data class ProfileResponse(
    val profile: UserProfile? = null,
    val message: String? = null
)

data class AdminUser(
    val id: Long,
    val username: String,
    @SerializedName("global_role") val globalRole: String? = "member",
    @SerializedName("created_at") val createdAt: String? = null,
    val status: String? = null
)

data class AdminActionRequest(
    val action: String,
    val targetUsername: String,
    val payload: Map<String, Any?> = emptyMap()
)

data class AdminBadgeRequest(
    val name: String,
    val svg_content: String
)

data class AssignBadgeRequest(
    val username: String,
    val badgeId: Long,
    val action: String // "add" or "remove"
)

data class BugReport(
    val id: Long,
    val reporter: String,
    val description: String,
    val files: String? = null,
    val status: String? = "open",
    @SerializedName("created_at") val createdAt: String? = null
)

data class ChatItem(
    val room: String,
    val title: String,
    val isGroup: Boolean,
    val avatarUrl: String? = null,
    val lastMessage: String? = null,
    val lastTime: String? = null,
    val unreadCount: Int = 0,
    val isOnline: Boolean = false,
    val peerUsername: String? = null
)
