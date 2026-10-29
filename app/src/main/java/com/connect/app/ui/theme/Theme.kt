package com.connect.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.connect.app.data.prefs.AccentPalette
import com.connect.app.data.prefs.ThemeMode

@Composable
fun ConnectTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    accentPalette: AccentPalette = AccentPalette.DYNAMIC,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val systemInDark = isSystemInDarkTheme()

    val isDark = when (themeMode) {
        ThemeMode.SYSTEM -> systemInDark
        ThemeMode.LIGHT -> false
        ThemeMode.DARK, ThemeMode.AMOLED_DARK -> true
    }

    val isAmoled = themeMode == ThemeMode.AMOLED_DARK

    val (lightPreset, darkPreset, amoledPreset) = getPaletteColorSchemes(accentPalette)

    val colorScheme: ColorScheme = when {
        // Dynamic Monet support on Android 12+
        accentPalette == AccentPalette.DYNAMIC && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (isDark) {
                val dyn = dynamicDarkColorScheme(context)
                if (isAmoled) {
                    dyn.copy(
                        background = AmoledBackground,
                        surface = AmoledSurface,
                        surfaceContainer = AmoledSurfaceContainer,
                        surfaceContainerLow = AmoledSurfaceContainerLow,
                        surfaceContainerHigh = AmoledSurfaceContainerHigh,
                        surfaceContainerHighest = AmoledSurfaceContainerHighest
                    )
                } else {
                    dyn
                }
            } else {
                dynamicLightColorScheme(context)
            }
        }
        isAmoled -> amoledPreset
        isDark -> darkPreset
        else -> lightPreset
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = !isDark
            insetsController.isAppearanceLightNavigationBars = !isDark
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ExpressiveTypography,
        shapes = ExpressiveShapes,
        content = content
    )
}
