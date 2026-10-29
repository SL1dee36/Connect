package com.connect.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.connect.app.data.prefs.AccentPalette

// AMOLED pure dark base surfaces
val AmoledBackground = Color(0xFF000000)
val AmoledSurface = Color(0xFF000000)
val AmoledSurfaceContainer = Color(0xFF121418)
val AmoledSurfaceContainerLow = Color(0xFF090A0D)
val AmoledSurfaceContainerHigh = Color(0xFF1C1F26)
val AmoledSurfaceContainerHighest = Color(0xFF262A33)

// --- Violet Accent ---
val VioletPrimaryLight = Color(0xFF6750A4)
val VioletOnPrimaryLight = Color(0xFFFFFFFF)
val VioletPrimaryContainerLight = Color(0xFFEADDFF)
val VioletOnPrimaryContainerLight = Color(0xFF21005D)
val VioletPrimaryDark = Color(0xFFD0BCFF)
val VioletOnPrimaryDark = Color(0xFF381E72)
val VioletPrimaryContainerDark = Color(0xFF4F378B)
val VioletOnPrimaryContainerDark = Color(0xFFEADDFF)

// --- Blue Accent ---
val BluePrimaryLight = Color(0xFF00639B)
val BlueOnPrimaryLight = Color(0xFFFFFFFF)
val BluePrimaryContainerLight = Color(0xFFCEE5FF)
val BlueOnPrimaryContainerLight = Color(0xFF001D33)
val BluePrimaryDark = Color(0xFF96CCFF)
val BlueOnPrimaryDark = Color(0xFF003353)
val BluePrimaryContainerDark = Color(0xFF004A76)
val BlueOnPrimaryContainerDark = Color(0xFFCEE5FF)

// --- Emerald Accent ---
val EmeraldPrimaryLight = Color(0xFF006C4C)
val EmeraldOnPrimaryLight = Color(0xFFFFFFFF)
val EmeraldPrimaryContainerLight = Color(0xFF89F8C6)
val EmeraldOnPrimaryContainerLight = Color(0xFF002114)
val EmeraldPrimaryDark = Color(0xFF6CDBAC)
val EmeraldOnPrimaryDark = Color(0xFF003825)
val EmeraldPrimaryContainerDark = Color(0xFF005138)
val EmeraldOnPrimaryContainerDark = Color(0xFF89F8C6)

// --- Coral Accent ---
val CoralPrimaryLight = Color(0xFF984061)
val CoralOnPrimaryLight = Color(0xFFFFFFFF)
val CoralPrimaryContainerLight = Color(0xFFFFD9E2)
val CoralOnPrimaryContainerLight = Color(0xFF3E001D)
val CoralPrimaryDark = Color(0xFFFFB0C8)
val CoralOnPrimaryDark = Color(0xFF5E1133)
val CoralPrimaryContainerDark = Color(0xFF7B2949)
val CoralOnPrimaryContainerDark = Color(0xFFFFD9E2)

// --- Amber Accent ---
val AmberPrimaryLight = Color(0xFF825500)
val AmberOnPrimaryLight = Color(0xFFFFFFFF)
val AmberPrimaryContainerLight = Color(0xFFFFDDB3)
val AmberOnPrimaryContainerLight = Color(0xFF291800)
val AmberPrimaryDark = Color(0xFFFFB951)
val AmberOnPrimaryDark = Color(0xFF452B00)
val AmberPrimaryContainerDark = Color(0xFF633F00)
val AmberOnPrimaryContainerDark = Color(0xFFFFDDB3)

// --- Rose Accent ---
val RosePrimaryLight = Color(0xFFA83250)
val RoseOnPrimaryLight = Color(0xFFFFFFFF)
val RosePrimaryContainerLight = Color(0xFFFFD9DF)
val RoseOnPrimaryContainerLight = Color(0xFF3F0015)
val RosePrimaryDark = Color(0xFFFFB2BF)
val RoseOnPrimaryDark = Color(0xFF660025)
val RosePrimaryContainerDark = Color(0xFF88193A)
val RoseOnPrimaryContainerDark = Color(0xFFFFD9DF)

fun getPaletteColorSchemes(accent: AccentPalette): Triple<ColorScheme, ColorScheme, ColorScheme> {
    return when (accent) {
        AccentPalette.VIOLET -> Triple(
            createLightScheme(VioletPrimaryLight, VioletOnPrimaryLight, VioletPrimaryContainerLight, VioletOnPrimaryContainerLight),
            createDarkScheme(VioletPrimaryDark, VioletOnPrimaryDark, VioletPrimaryContainerDark, VioletOnPrimaryContainerDark),
            createAmoledScheme(VioletPrimaryDark, VioletOnPrimaryDark, VioletPrimaryContainerDark, VioletOnPrimaryContainerDark)
        )
        AccentPalette.BLUE -> Triple(
            createLightScheme(BluePrimaryLight, BlueOnPrimaryLight, BluePrimaryContainerLight, BlueOnPrimaryContainerLight),
            createDarkScheme(BluePrimaryDark, BlueOnPrimaryDark, BluePrimaryContainerDark, BlueOnPrimaryContainerDark),
            createAmoledScheme(BluePrimaryDark, BlueOnPrimaryDark, BluePrimaryContainerDark, BlueOnPrimaryContainerDark)
        )
        AccentPalette.EMERALD -> Triple(
            createLightScheme(EmeraldPrimaryLight, EmeraldOnPrimaryLight, EmeraldPrimaryContainerLight, EmeraldOnPrimaryContainerLight),
            createDarkScheme(EmeraldPrimaryDark, EmeraldOnPrimaryDark, EmeraldPrimaryContainerDark, EmeraldOnPrimaryContainerDark),
            createAmoledScheme(EmeraldPrimaryDark, EmeraldOnPrimaryDark, EmeraldPrimaryContainerDark, EmeraldOnPrimaryContainerDark)
        )
        AccentPalette.CORAL -> Triple(
            createLightScheme(CoralPrimaryLight, CoralOnPrimaryLight, CoralPrimaryContainerLight, CoralOnPrimaryContainerLight),
            createDarkScheme(CoralPrimaryDark, CoralOnPrimaryDark, CoralPrimaryContainerDark, CoralOnPrimaryContainerDark),
            createAmoledScheme(CoralPrimaryDark, CoralOnPrimaryDark, CoralPrimaryContainerDark, CoralOnPrimaryContainerDark)
        )
        AccentPalette.AMBER -> Triple(
            createLightScheme(AmberPrimaryLight, AmberOnPrimaryLight, AmberPrimaryContainerLight, AmberOnPrimaryContainerLight),
            createDarkScheme(AmberPrimaryDark, AmberOnPrimaryDark, AmberPrimaryContainerDark, AmberOnPrimaryContainerDark),
            createAmoledScheme(AmberPrimaryDark, AmberOnPrimaryDark, AmberPrimaryContainerDark, AmberOnPrimaryContainerDark)
        )
        AccentPalette.ROSE -> Triple(
            createLightScheme(RosePrimaryLight, RoseOnPrimaryLight, RosePrimaryContainerLight, RoseOnPrimaryContainerLight),
            createDarkScheme(RosePrimaryDark, RoseOnPrimaryDark, RosePrimaryContainerDark, RoseOnPrimaryContainerDark),
            createAmoledScheme(RosePrimaryDark, RoseOnPrimaryDark, RosePrimaryContainerDark, RoseOnPrimaryContainerDark)
        )
        AccentPalette.DYNAMIC -> Triple(
            createLightScheme(BluePrimaryLight, BlueOnPrimaryLight, BluePrimaryContainerLight, BlueOnPrimaryContainerLight),
            createDarkScheme(BluePrimaryDark, BlueOnPrimaryDark, BluePrimaryContainerDark, BlueOnPrimaryContainerDark),
            createAmoledScheme(BluePrimaryDark, BlueOnPrimaryDark, BluePrimaryContainerDark, BlueOnPrimaryContainerDark)
        )
    }
}

private fun createLightScheme(primary: Color, onPrimary: Color, container: Color, onContainer: Color): ColorScheme {
    return lightColorScheme(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = container,
        onPrimaryContainer = onContainer,
        surface = Color(0xFFF9F9FC),
        onSurface = Color(0xFF1A1C1E),
        surfaceVariant = Color(0xFFE1E2EC),
        onSurfaceVariant = Color(0xFF44474E),
        background = Color(0xFFF9F9FC),
        onBackground = Color(0xFF1A1C1E),
        surfaceContainer = Color(0xFFF0F1F6),
        surfaceContainerLow = Color(0xFFF5F6FA),
        surfaceContainerHigh = Color(0xFFE9EAEF),
        surfaceContainerHighest = Color(0xFFE2E3E8),
        outline = Color(0xFF74777F),
        outlineVariant = Color(0xFFC4C6D0)
    )
}

private fun createDarkScheme(primary: Color, onPrimary: Color, container: Color, onContainer: Color): ColorScheme {
    return darkColorScheme(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = container,
        onPrimaryContainer = onContainer,
        surface = Color(0xFF121316),
        onSurface = Color(0xFFE2E2E6),
        surfaceVariant = Color(0xFF44474E),
        onSurfaceVariant = Color(0xFFC4C6D0),
        background = Color(0xFF121316),
        onBackground = Color(0xFFE2E2E6),
        surfaceContainer = Color(0xFF1D2024),
        surfaceContainerLow = Color(0xFF181A1E),
        surfaceContainerHigh = Color(0xFF272A2F),
        surfaceContainerHighest = Color(0xFF32353A),
        outline = Color(0xFF8E9099),
        outlineVariant = Color(0xFF44474E)
    )
}

private fun createAmoledScheme(primary: Color, onPrimary: Color, container: Color, onContainer: Color): ColorScheme {
    return darkColorScheme(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = container,
        onPrimaryContainer = onContainer,
        surface = AmoledSurface,
        onSurface = Color(0xFFF0F0F4),
        surfaceVariant = Color(0xFF262A33),
        onSurfaceVariant = Color(0xFFC4C6D0),
        background = AmoledBackground,
        onBackground = Color(0xFFF0F0F4),
        surfaceContainer = AmoledSurfaceContainer,
        surfaceContainerLow = AmoledSurfaceContainerLow,
        surfaceContainerHigh = AmoledSurfaceContainerHigh,
        surfaceContainerHighest = AmoledSurfaceContainerHighest,
        outline = Color(0xFF383C46),
        outlineVariant = Color(0xFF22252C)
    )
}
