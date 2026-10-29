package com.connect.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AddPhotoAlternate
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.connect.app.ConnectApplication
import com.connect.app.data.locale.LocalStrings
import com.connect.app.data.model.UserMediaItem
import com.connect.app.ui.components.UserAvatar

data class ProfileColorPreset(
    val id: String,
    val name: String,
    val primaryColor: Color,
    val secondaryColor: Color
)

val profileColorPresets = listOf(
    ProfileColorPreset("default", "По умолчанию", Color(0xFF24272C), Color(0xFF2E3238)),
    ProfileColorPreset("emerald", "Изумруд", Color(0xFF1B5E20), Color(0xFF2E7D32)),
    ProfileColorPreset("ocean_blue", "Классика", Color(0xFF1565C0), Color(0xFF1E88E5)),
    ProfileColorPreset("violet_flame", "Неон", Color(0xFF6A1B9A), Color(0xFF8E24AA)),
    ProfileColorPreset("ocean_breeze", "Океан", Color(0xFF00695C), Color(0xFF00897B)),
    ProfileColorPreset("sunset_gold", "Закат", Color(0xFFD84315), Color(0xFFF4511E)),
    ProfileColorPreset("cyber_pink", "Киберпанк", Color(0xFFAD1457), Color(0xFFD81B60)),
    ProfileColorPreset("midnight_dark", "Полночь", Color(0xFF212121), Color(0xFF37474F)),
    ProfileColorPreset("amber_glow", "Янтарь", Color(0xFFEF6C00), Color(0xFFFFA000)),
    ProfileColorPreset("deep_indigo", "Индиго", Color(0xFF283593), Color(0xFF3949AB))
)

fun getProfilePreset(colorId: String?): ProfileColorPreset {
    val normalized = when (colorId) {
        "telegram_green" -> "emerald"
        "telegram_blue" -> "ocean_blue"
        else -> colorId
    }
    return profileColorPresets.find { it.id == normalized } ?: profileColorPresets[0]
}

/**
 * Native, proportional action button pill on the profile header (e.g. [Photo], [Edit], [Settings]).
 */
@Composable
fun ProfileActionPill(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.95f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        modifier = modifier.height(48.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun TelegramActionPill(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) = ProfileActionPill(icon, label, onClick, modifier)

/**
 * Personal Channel Card.
 */
@Composable
fun ProfileChannelCard(
    channelName: String,
    channelAvatarUrl: String? = null,
    subscribersCount: String? = null,
    lastPostText: String? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val strings = LocalStrings.current
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = strings.profileChannel,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF29B6F6)
                )
                Text(
                    text = subscribersCount ?: "27 ${strings.subscribersText}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                UserAvatar(
                    name = channelName,
                    avatarUrl = channelAvatarUrl,
                    size = 44.dp,
                    shape = CircleShape
                )

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = channelName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Rounded.PlayArrow,
                            contentDescription = null,
                            tint = Color(0xFF29B6F6),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = lastPostText ?: "Видеосообщение",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Check,
                        contentDescription = null,
                        tint = Color(0xFF29B6F6),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "ПН",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * Profile Info Card: Phone, Bio, Username (@tag), Birthday.
 */
@Composable
fun ProfileInfoCard(
    phone: String?,
    bio: String?,
    username: String,
    birthday: String?,
    onCopy: (label: String, value: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val strings = LocalStrings.current
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(vertical = 6.dp)) {
            val formattedPhone = phone?.let { com.connect.app.utils.PhoneUtils.formatPhoneNumber(it) }
            ProfileInfoItem(
                value = formattedPhone.takeIf { !it.isNullOrBlank() } ?: strings.notSpecified,
                label = strings.profilePhone,
                onClick = {
                    if (!phone.isNullOrBlank()) onCopy(strings.profilePhone, formattedPhone ?: phone)
                }
            )

            ProfileInfoItem(
                value = bio.takeIf { !it.isNullOrBlank() } ?: strings.bioNotSpecified,
                label = strings.profileBio,
                onClick = {
                    if (!bio.isNullOrBlank()) onCopy(strings.profileBio, bio)
                }
            )

            ProfileInfoItem(
                value = "@$username",
                label = strings.profileUsername,
                onClick = {
                    onCopy(strings.profileUsername, "@$username")
                }
            )

            if (!birthday.isNullOrBlank()) {
                ProfileInfoItem(
                    value = birthday,
                    label = strings.profileBirthday,
                    onClick = {
                        onCopy(strings.profileBirthday, birthday)
                    }
                )
            }
        }
    }
}

@Composable
fun TelegramInfoCard(
    phone: String?,
    bio: String?,
    username: String,
    birthday: String?,
    onCopy: (label: String, value: String) -> Unit,
    modifier: Modifier = Modifier
) = ProfileInfoCard(phone, bio, username, birthday, onCopy, modifier)

@Composable
private fun ProfileInfoItem(
    value: String,
    label: String,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun TelegramInfoItem(
    value: String,
    label: String,
    onClick: () -> Unit
) = ProfileInfoItem(value, label, onClick)

/**
 * 3-Column Media Grid for Profile Publications.
 */
@Composable
fun ProfileMediaGrid(
    media: List<UserMediaItem>,
    isOwnProfile: Boolean,
    onUploadClick: () -> Unit,
    onMediaClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val strings = LocalStrings.current
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = strings.profilePosts,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            if (isOwnProfile) {
                Text(
                    text = "+ ${strings.profileAddPost}",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable(onClick = onUploadClick)
                )
            }
        }

        if (media.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = strings.profileNoPosts,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (isOwnProfile) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        onClick = onUploadClick,
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Rounded.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(strings.profileAddPost, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            val rows = media.chunked(3)
            rows.forEach { rowItems ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 3.dp),
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    rowItems.forEach { item ->
                        val mediaUrl = ConnectApplication.instance.apiClient.getMediaUrl(item.url)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(120.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.surfaceContainer)
                                .clickable { onMediaClick(item.url) },
                            contentAlignment = Alignment.Center
                        ) {
                            AsyncImage(
                                model = mediaUrl,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            if (item.type == "video") {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.5f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.PlayArrow,
                                        contentDescription = "Video",
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                    if (rowItems.size < 3) {
                        repeat(3 - rowItems.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TelegramMediaGrid(
    media: List<UserMediaItem>,
    isOwnProfile: Boolean,
    onUploadClick: () -> Unit,
    onMediaClick: (String) -> Unit,
    modifier: Modifier = Modifier
) = ProfileMediaGrid(media, isOwnProfile, onUploadClick, onMediaClick, modifier)
