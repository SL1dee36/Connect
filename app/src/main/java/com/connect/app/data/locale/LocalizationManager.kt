package com.connect.app.data.locale

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import com.connect.app.data.prefs.PreferencesManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

class LocalizationManager(private val prefs: PreferencesManager) {

    private val _languageFlow = MutableStateFlow(prefs.getAppLanguage())
    val languageFlow: StateFlow<AppLanguage> = _languageFlow.asStateFlow()

    private val _stringsFlow = MutableStateFlow(resolveStrings(_languageFlow.value))
    val stringsFlow: StateFlow<AppStrings> = _stringsFlow.asStateFlow()

    fun setLanguage(language: AppLanguage) {
        prefs.setAppLanguage(language)
        _languageFlow.value = language
        _stringsFlow.value = resolveStrings(language)
    }

    fun getCurrentStrings(): AppStrings = _stringsFlow.value

    private fun resolveStrings(language: AppLanguage): AppStrings {
        return LocalizationManifest.getStrings(language, Locale.getDefault())
    }
}

val LocalStrings = staticCompositionLocalOf<AppStrings> { RussianStrings }

@Composable
fun ProvideLocalizedStrings(
    localizationManager: LocalizationManager,
    content: @Composable () -> Unit
) {
    val currentStrings by localizationManager.stringsFlow.collectAsState()
    CompositionLocalProvider(LocalStrings provides currentStrings) {
        content()
    }
}
