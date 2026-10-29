package com.connect.app.ui.theme

import androidx.compose.foundation.shape.CornerSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// Expressive M3 shapes: generous corner radii, smooth curves, organic squircle feel
val ExpressiveShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp)
)

val PillShape = RoundedCornerShape(percent = 50)

// Asymmetric message bubble shapes for clean expressive chat
val OutgoingMessageShape = RoundedCornerShape(
    topStart = CornerSize(20.dp),
    topEnd = CornerSize(20.dp),
    bottomStart = CornerSize(20.dp),
    bottomEnd = CornerSize(4.dp)
)

val IncomingMessageShape = RoundedCornerShape(
    topStart = CornerSize(20.dp),
    topEnd = CornerSize(20.dp),
    bottomStart = CornerSize(4.dp),
    bottomEnd = CornerSize(20.dp)
)

val InputFieldShape = RoundedCornerShape(28.dp)
