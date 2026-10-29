package com.connect.app.data.prefs

import android.content.Context
import android.content.SharedPreferences
import com.connect.app.data.model.User
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemeMode(val title: String) {
    SYSTEM("Системная"),
    LIGHT("Светлая"),
    DARK("Тёмная"),
    AMOLED_DARK("AMOLED")
}

enum class AccentPalette(val title: String, val hexCode: Long) {
    DYNAMIC("Системный (Monet)", 0xFF4361EE),
    VIOLET("Фиолетовый", 0xFF6750A4),
    BLUE("Океан", 0xFF00639B),
    EMERALD("Изумруд", 0xFF006C4C),
    CORAL("Коралл", 0xFF984061),
    AMBER("Янтарь", 0xFF855300),
    ROSE("Роза", 0xFFA83250)
}

class PreferencesManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("connect_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_TOKEN = "token"
        private const val KEY_USER = "user"
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_ACCENT = "accent_palette"
        private const val KEY_BUBBLE_RADIUS = "bubble_radius"
        private const val KEY_FONT_SIZE = "font_size"
        private const val KEY_CHAT_WALLPAPER = "chat_wallpaper"
        private const val KEY_PROFILE_COLOR = "profile_color"
        private const val KEY_SAVED_AVATAR = "saved_avatar_url"
        private const val KEY_GLOBAL_ROLE = "global_role"
        private const val KEY_BIOMETRIC_TOKEN = "biometric_token"
        private const val KEY_BIOMETRIC_USER = "biometric_user"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val KEY_APP_LANGUAGE = "app_language"
        const val DEFAULT_SERVER_URL = "http://72.56.22.5:3001"
    }

    private val _themeModeFlow = MutableStateFlow(getThemeMode())
    val themeModeFlow: StateFlow<ThemeMode> = _themeModeFlow.asStateFlow()

    private val _accentFlow = MutableStateFlow(getAccentPalette())
    val accentFlow: StateFlow<AccentPalette> = _accentFlow.asStateFlow()

    private val _serverUrlFlow = MutableStateFlow(getServerUrl())
    val serverUrlFlow: StateFlow<String> = _serverUrlFlow.asStateFlow()

    private val _bubbleRadiusFlow = MutableStateFlow(getBubbleRadius())
    val bubbleRadiusFlow: StateFlow<Float> = _bubbleRadiusFlow.asStateFlow()

    private val _fontSizeFlow = MutableStateFlow(getFontSize())
    val fontSizeFlow: StateFlow<Float> = _fontSizeFlow.asStateFlow()

    private val _chatWallpaperFlow = MutableStateFlow(getChatWallpaper())
    val chatWallpaperFlow: StateFlow<String> = _chatWallpaperFlow.asStateFlow()

    private val _profileColorFlow = MutableStateFlow(getProfileColor())
    val profileColorFlow: StateFlow<String> = _profileColorFlow.asStateFlow()

    private val _globalRoleFlow = MutableStateFlow(getGlobalRole())
    val globalRoleFlow: StateFlow<String> = _globalRoleFlow.asStateFlow()

    fun getProfileColor(): String {
        return prefs.getString(KEY_PROFILE_COLOR, "default") ?: "default"
    }

    fun setProfileColor(colorId: String) {
        prefs.edit().putString(KEY_PROFILE_COLOR, colorId).apply()
        _profileColorFlow.value = colorId
    }

    fun getSavedAvatarUrl(): String? {
        return prefs.getString(KEY_SAVED_AVATAR, null)
    }

    fun setSavedAvatarUrl(url: String?) {
        if (url == null) {
            prefs.edit().remove(KEY_SAVED_AVATAR).apply()
        } else {
            prefs.edit().putString(KEY_SAVED_AVATAR, url).apply()
        }
    }

    fun getServerUrl(): String {
        return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
    }

    fun setServerUrl(url: String) {
        val cleanUrl = url.trim().trimEnd('/')
        prefs.edit().putString(KEY_SERVER_URL, cleanUrl).apply()
        _serverUrlFlow.value = cleanUrl
    }

    fun getToken(): String? {
        return prefs.getString(KEY_TOKEN, null)
    }

    fun setToken(token: String?) {
        if (token == null) {
            prefs.edit().remove(KEY_TOKEN).apply()
        } else {
            prefs.edit().putString(KEY_TOKEN, token).apply()
        }
    }

    fun getCurrentUser(): User? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun setCurrentUser(user: User?) {
        if (user == null) {
            prefs.edit().remove(KEY_USER).apply()
        } else {
            prefs.edit().putString(KEY_USER, gson.toJson(user)).apply()
        }
    }

    fun getThemeMode(): ThemeMode {
        val name = prefs.getString(KEY_THEME_MODE, ThemeMode.SYSTEM.name)
        return try {
            ThemeMode.valueOf(name ?: ThemeMode.SYSTEM.name)
        } catch (_: Exception) {
            ThemeMode.SYSTEM
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME_MODE, mode.name).apply()
        _themeModeFlow.value = mode
    }

    fun getAccentPalette(): AccentPalette {
        val name = prefs.getString(KEY_ACCENT, AccentPalette.DYNAMIC.name)
        return try {
            AccentPalette.valueOf(name ?: AccentPalette.DYNAMIC.name)
        } catch (_: Exception) {
            AccentPalette.DYNAMIC
        }
    }

    fun setAccentPalette(accent: AccentPalette) {
        prefs.edit().putString(KEY_ACCENT, accent.name).apply()
        _accentFlow.value = accent
    }

    fun getBubbleRadius(): Float {
        return prefs.getFloat(KEY_BUBBLE_RADIUS, 20f)
    }

    fun setBubbleRadius(radius: Float) {
        prefs.edit().putFloat(KEY_BUBBLE_RADIUS, radius).apply()
        _bubbleRadiusFlow.value = radius
    }

    fun getFontSize(): Float {
        return prefs.getFloat(KEY_FONT_SIZE, 15f)
    }

    fun setFontSize(size: Float) {
        prefs.edit().putFloat(KEY_FONT_SIZE, size).apply()
        _fontSizeFlow.value = size
    }

    fun getChatWallpaper(): String {
        return prefs.getString(KEY_CHAT_WALLPAPER, "default") ?: "default"
    }

    fun setChatWallpaper(wallpaper: String) {
        prefs.edit().putString(KEY_CHAT_WALLPAPER, wallpaper).apply()
        _chatWallpaperFlow.value = wallpaper
    }

    fun getGlobalRole(): String {
        return prefs.getString(KEY_GLOBAL_ROLE, "member") ?: "member"
    }

    fun setGlobalRole(role: String) {
        prefs.edit().putString(KEY_GLOBAL_ROLE, role).apply()
        _globalRoleFlow.value = role
    }

    fun isBiometricAvailable(): Boolean {
        return !getBiometricToken().isNullOrBlank() && prefs.getBoolean(KEY_BIOMETRIC_ENABLED, true)
    }

    fun getBiometricToken(): String? {
        return prefs.getString(KEY_BIOMETRIC_TOKEN, null)
    }

    fun getBiometricUser(): User? {
        val json = prefs.getString(KEY_BIOMETRIC_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun saveBiometricCredentials(token: String, user: User?) {
        val editor = prefs.edit()
            .putString(KEY_BIOMETRIC_TOKEN, token)
            .putBoolean(KEY_BIOMETRIC_ENABLED, true)
        if (user != null) {
            editor.putString(KEY_BIOMETRIC_USER, gson.toJson(user))
        }
        editor.apply()
    }

    fun clearBiometric() {
        prefs.edit()
            .remove(KEY_BIOMETRIC_TOKEN)
            .remove(KEY_BIOMETRIC_USER)
            .remove(KEY_BIOMETRIC_ENABLED)
            .apply()
    }

    fun clearAuth() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USER).remove(KEY_GLOBAL_ROLE).apply()
    }

    fun getGroupAvatar(room: String): String? {
        return prefs.getString("grp_avatar_$room", null)
    }

    fun setGroupAvatar(room: String, avatarUrl: String?) {
        prefs.edit().apply {
            if (avatarUrl.isNullOrBlank()) {
                remove("grp_avatar_$room")
            } else {
                putString("grp_avatar_$room", avatarUrl)
            }
        }.apply()
    }

    fun getAppLanguage(): com.connect.app.data.locale.AppLanguage {
        val code = prefs.getString(KEY_APP_LANGUAGE, null)
        return com.connect.app.data.locale.AppLanguage.fromCode(code)
    }

    fun setAppLanguage(language: com.connect.app.data.locale.AppLanguage) {
        prefs.edit().putString(KEY_APP_LANGUAGE, language.code).apply()
    }
}
