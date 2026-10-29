package com.connect.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.connect.app.utils.VibratorHelper
import kotlin.math.roundToInt

/**
 * Утолщённый слайдер (10 dp) со скруглением, выразительными круглыми точками-засечками шагов
 * и тактильным откликом при переключении между делениями.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThickStepSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    valueRange: ClosedFloatingPointRange<Float>,
    steps: Int,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val totalIntervals = steps + 1
    val stepSize = (valueRange.endInclusive - valueRange.start) / totalIntervals

    val activeColor = MaterialTheme.colorScheme.primary
    val inactiveColor = MaterialTheme.colorScheme.surfaceContainerHighest
    val dotActiveColor = MaterialTheme.colorScheme.surface
    val dotInactiveColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)

    Slider(
        value = value,
        onValueChange = { newVal ->
            val stepIdx = ((newVal - valueRange.start) / stepSize).roundToInt()
            val snapped = (valueRange.start + stepIdx * stepSize).coerceIn(valueRange.start, valueRange.endInclusive)
            if (snapped != value) {
                VibratorHelper.vibrateClick(context)
                onValueChange(snapped)
            }
        },
        valueRange = valueRange,
        steps = steps,
        track = { sliderState ->
            val fraction = ((sliderState.value - sliderState.valueRange.start) /
                    (sliderState.valueRange.endInclusive - sliderState.valueRange.start)).coerceIn(0f, 1f)

            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
            ) {
                val cornerRadius = CornerRadius(size.height / 2, size.height / 2)
                
                // Inactive track
                drawRoundRect(
                    color = inactiveColor,
                    size = size,
                    cornerRadius = cornerRadius
                )
                
                // Active track
                val activeWidth = size.width * fraction
                if (activeWidth > 0f) {
                    drawRoundRect(
                        color = activeColor,
                        size = Size(activeWidth, size.height),
                        cornerRadius = cornerRadius
                    )
                }

                // Step dots
                val totalDots = steps + 2
                val dotRadius = 2.8.dp.toPx()
                for (i in 0 until totalDots) {
                    val dotFraction = i.toFloat() / (totalDots - 1)
                    val cx = (size.width - dotRadius * 2) * dotFraction + dotRadius
                    val cy = size.height / 2
                    val isDotFilled = dotFraction <= fraction
                    drawCircle(
                        color = if (isDotFilled) dotActiveColor else dotInactiveColor,
                        radius = dotRadius,
                        center = Offset(cx, cy)
                    )
                }
            }
        },
        thumb = {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .border(3.dp, MaterialTheme.colorScheme.surface, CircleShape)
            )
        },
        modifier = modifier.fillMaxWidth()
    )
}
