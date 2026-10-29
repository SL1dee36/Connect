package com.connect.app.data.locale

enum class AppLanguage(
    val code: String,
    val nativeName: String,
    val englishName: String,
    val flag: String
) {
    SYSTEM("system", "Системный (По умолчанию)", "System Default", "🌐"),
    RU("ru", "Русский", "Russian", "🇷🇺"),
    EN("en", "English", "English", "🇬🇧"),
    DE("de", "Deutsch", "German", "🇩🇪"),
    ES("es", "Español", "Spanish", "🇪🇸"),
    BE("be", "Беларуская", "Belarusian", "🇧🇾");

    companion object {
        fun fromCode(code: String?): AppLanguage {
            return entries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: SYSTEM
        }
    }
}
