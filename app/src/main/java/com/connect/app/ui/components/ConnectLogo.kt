package com.connect.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * ConnectLogo
 * 
 * Recreates the official Connect logo with pixel-perfect precision from the SVG geometry:
 * - ViewBox: 415 x 415
 * - Adapts to app background and accent color.
 * - Supports opening animation where each individual concentric element revolves and locks into place.
 */
@Composable
fun ConnectLogo(
    modifier: Modifier = Modifier.size(96.dp),
    baseColor: Color = MaterialTheme.colorScheme.background,
    crescentColor: Color = MaterialTheme.colorScheme.primary,
    animateOnLaunch: Boolean = false,
    animationDurationMs: Int = 1350,
    onAnimationEnd: (() -> Unit)? = null
) {
    val animProgress = remember { Animatable(if (animateOnLaunch) 0f else 1f) }

    LaunchedEffect(animateOnLaunch) {
        if (animateOnLaunch) {
            animProgress.snapTo(0f)
            animProgress.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = animationDurationMs,
                    easing = CubicBezierEasing(0.16f, 1f, 0.3f, 1f) // Smooth ease-out with settle
                )
            )
            onAnimationEnd?.invoke()
        }
    }

    val progress = animProgress.value

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.matchParentSize()) {
            val canvasSize = min(size.width, size.height)
            val scale = canvasSize / 415f
            val center = Offset(size.width / 2f, size.height / 2f)

            // Dynamic rotation angles for each individual layer during entrance:
            // Element 1: scales 0.75 -> 1.0, subtle spin -30° -> 0°
            // Element 2: rotates +360° -> 0° (clockwise orbit)
            // Element 3: rotates -360° -> 0° (counter-clockwise orbit)
            // Element 4: rotates +540° -> 0° (1.5 turns clockwise orbit)
            // Element 5: rotates -540° -> 0° (1.5 turns counter-clockwise orbit)
            val remaining = 1f - progress
            val scale1 = 0.75f + 0.25f * progress

            val rot1Deg = remaining * -30f
            val rot2Deg = remaining * 360f
            val rot3Deg = remaining * -360f
            val rot4Deg = remaining * 540f
            val rot5Deg = remaining * -540f

            // --- Layer 1: Outer Base Circle (black in SVG) ---
            val center1 = rotatePoint(center, 0f, 0f, rot1Deg, scale)
            drawCircle(
                color = baseColor,
                radius = 207.5f * scale * scale1,
                center = center1
            )

            // --- Layer 2: Outer Crescent Disk (white in SVG, resting dx = -3f, dy = 0f) ---
            val center2 = rotatePoint(center, -3.0f, 0.0f, rot2Deg, scale)
            drawCircle(
                color = crescentColor,
                radius = 137.5f * scale * scale1,
                center = center2
            )

            // --- Layer 3: Middle Cutout Disk (black in SVG, resting dx = +31.5f, dy = +0.5f) ---
            val center3 = rotatePoint(center, 31.5f, 0.5f, rot3Deg, scale)
            drawCircle(
                color = baseColor,
                radius = 110.0f * scale * scale1,
                center = center3
            )

            // --- Layer 4: Inner Crescent Disk (white in SVG, resting dx = +31.0f, dy = 0f) ---
            val center4 = rotatePoint(center, 31.0f, 0.0f, rot4Deg, scale)
            drawCircle(
                color = crescentColor,
                radius = 104.5f * scale * scale1,
                center = center4
            )

            // --- Layer 5: Center Core Cutout Disk (black in SVG, resting dx = +23.0f, dy = -19.5f) ---
            val center5 = rotatePoint(center, 23.0f, -19.5f, rot5Deg, scale)
            drawCircle(
                color = baseColor,
                radius = 85.0f * scale * scale1,
                center = center5
            )
        }
    }
}

/**
 * Calculates the rotated offset of a point around (center.x, center.y) given resting dx/dy and angle in degrees.
 */
private fun rotatePoint(
    origin: Offset,
    restingDx: Float,
    restingDy: Float,
    angleDegrees: Float,
    scale: Float
): Offset {
    val rad = Math.toRadians(angleDegrees.toDouble())
    val cosVal = cos(rad).toFloat()
    val sinVal = sin(rad).toFloat()

    val rotatedDx = (restingDx * cosVal - restingDy * sinVal) * scale
    val rotatedDy = (restingDx * sinVal + restingDy * cosVal) * scale

    return Offset(origin.x + rotatedDx, origin.y + rotatedDy)
}
