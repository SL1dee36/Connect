package com.connect.app.ui.screens.profile

import android.widget.Toast
import com.connect.app.data.locale.LocalStrings
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.PersonRemove
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.connect.app.ConnectApplication
import com.connect.app.ui.components.UserAvatar
import com.connect.app.utils.VibratorHelper
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    targetUsername: String,
    onBack: () -> Unit,
    onStartChat: (room: String, title: String, isGroup: Boolean, avatarUrl: String?) -> Unit
) {
    val app = ConnectApplication.instance
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val strings = LocalStrings.current

    val profile by app.socketManager.selectedUserProfile.collectAsState()
    val avatarHistory by app.socketManager.avatarHistory.collectAsState()
    val myUsername = app.prefs.getCurrentUser()?.username 
        ?: app.prefs.getBiometricUser()?.username 
        ?: ""

    var showThreeDotsMenu by remember { mutableStateOf(false) }
    var showOverrideDialog by remember { mutableStateOf(false) }
    var overrideDisplayName by remember { mutableStateOf("") }
    var fullscreenMediaUrl by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()
    val expandProgress = remember { Animatable(0f) }
    val configuration = LocalConfiguration.current
    val screenHeight = configuration.screenHeightDp.dp
    val collapsedHeaderHeight = 360.dp
    val maxHeaderHeight = (screenHeight * 0.5f).coerceAtLeast(390.dp)
    val currentHeaderHeight = lerp(collapsedHeaderHeight, maxHeaderHeight, expandProgress.value)
    val progress = expandProgress.value

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (available.y < 0 && expandProgress.value > 0f) {
                    val delta = available.y / 500f
                    val newProgress = (expandProgress.value + delta).coerceIn(0f, 1f)
                    scope.launch { expandProgress.snapTo(newProgress) }
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                if (available.y > 0 && scrollState.value == 0) {
                    val delta = available.y / 500f
                    val newProgress = (expandProgress.value + delta).coerceIn(0f, 1f)
                    scope.launch { expandProgress.snapTo(newProgress) }
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override suspend fun onPreFling(available: Velocity): Velocity {
                if (expandProgress.value > 0f && expandProgress.value < 1f) {
                    val target = if (available.y > 200f || expandProgress.value > 0.4f) 1f else 0f
                    expandProgress.animateTo(target, spring(stiffness = Spring.StiffnessMediumLow))
                    return available
                }
                return Velocity.Zero
            }

            override suspend fun onPostFling(consumed: Velocity, available: Velocity): Velocity {
                if (available.y > 0 && scrollState.value == 0 && expandProgress.value < 1f) {
                    expandProgress.animateTo(1f, spring(stiffness = Spring.StiffnessMediumLow))
                }
                return super.onPostFling(consumed, available)
            }
        }
    }

    LaunchedEffect(targetUsername) {
        app.socketManager.getUserProfile(targetUsername)
        app.socketManager.getAvatarHistory(targetUsername)
    }

    BackHandler(onBack = onBack)

    if (profile == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    } else {
        val user = profile!!
        val effectiveName = user.bestName
        val preset = getProfilePreset(user.profileColor)

        val avatarList = remember(user.avatarUrl, avatarHistory) {
            val list = mutableListOf<String>()
            if (!user.avatarUrl.isNullOrBlank()) {
                list.add(user.avatarUrl)
            }
            avatarHistory.forEach { item ->
                if (item.avatarUrl.isNotBlank() && !list.contains(item.avatarUrl)) {
                    list.add(item.avatarUrl)
                }
            }
            list
        }

        val avatarPagerState = rememberPagerState(initialPage = 0, pageCount = { avatarList.size.coerceAtLeast(1) })
        val isDefaultPreset = user.profileColor == "default" || user.profileColor.isNullOrBlank()

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .nestedScroll(nestedScrollConnection)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(bottom = 32.dp)
            ) {
                var hasVibratedExpanded by remember { mutableStateOf(false) }

                val draggableState = rememberDraggableState { delta ->
                    val progressDelta = delta / 400f
                    val old = expandProgress.value
                    val newProgress = (old + progressDelta).coerceIn(0f, 1f)
                    if (old < 0.95f && newProgress >= 0.95f && !hasVibratedExpanded) {
                        hasVibratedExpanded = true
                        VibratorHelper.vibrateThreshold(context)
                    } else if (newProgress < 0.9f && hasVibratedExpanded) {
                        hasVibratedExpanded = false
                    }
                    scope.launch { expandProgress.snapTo(newProgress) }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(currentHeaderHeight)
                        .then(
                            if (isDefaultPreset) {
                                Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
                            } else {
                                Modifier.background(
                                    Brush.verticalGradient(
                                        listOf(preset.primaryColor, preset.secondaryColor)
                                    )
                                )
                            }
                        )
                        .draggable(
                            state = draggableState,
                            orientation = Orientation.Vertical,
                            onDragStopped = { velocity ->
                                scope.launch {
                                    val target = if (velocity > 300f) {
                                        1f
                                    } else if (velocity < -300f) {
                                        0f
                                    } else {
                                        if (expandProgress.value > 0.4f) 1f else 0f
                                    }
                                    if (target == 1f && expandProgress.value < 0.95f) {
                                        VibratorHelper.vibrateThreshold(context)
                                    }
                                    expandProgress.animateTo(target, spring(stiffness = Spring.StiffnessMediumLow))
                                }
                            }
                        )
                ) {
                    // 1. The Morphing Avatar Container (smoothly expands from 104.dp circle to full-bleed banner)
                    val screenWidthDp = configuration.screenWidthDp.dp
                    val avatarWidth = lerp(104.dp, screenWidthDp, progress)
                    val avatarHeight = lerp(104.dp, currentHeaderHeight, progress)
                    val avatarCornerRadius = lerp(52.dp, 0.dp, progress)
                    val avatarTopOffset = lerp(102.dp, 0.dp, progress)
                    val borderAlpha = (0.7f * (1f - progress * 1.5f)).coerceIn(0f, 0.7f)

                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .offset(y = avatarTopOffset)
                            .size(width = avatarWidth, height = avatarHeight)
                            .clip(RoundedCornerShape(avatarCornerRadius))
                            .then(
                                if (borderAlpha > 0.01f) {
                                    Modifier.border(2.5.dp, Color.White.copy(alpha = borderAlpha), RoundedCornerShape(avatarCornerRadius))
                                } else {
                                    Modifier
                                }
                            )
                    ) {
                        if (avatarList.isNotEmpty()) {
                            HorizontalPager(
                                state = avatarPagerState,
                                modifier = Modifier.fillMaxSize(),
                                userScrollEnabled = progress > 0.6f
                            ) { page ->
                                val photo = avatarList.getOrNull(page)
                                if (!photo.isNullOrBlank()) {
                                    val fullAvatarUrl = app.apiClient.getMediaUrl(photo)
                                    AsyncImage(
                                        model = fullAvatarUrl,
                                        contentDescription = "Avatar $page",
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    UserAvatar(
                                        name = effectiveName,
                                        avatarUrl = null,
                                        size = avatarHeight,
                                        shape = RoundedCornerShape(avatarCornerRadius)
                                    )
                                }
                            }
                        } else {
                            UserAvatar(
                                name = effectiveName,
                                avatarUrl = user.avatarUrl,
                                size = avatarHeight,
                                shape = RoundedCornerShape(avatarCornerRadius)
                            )
                        }
                    }

                    // 2. Subtle Bottom Gradient Scrim (for text readability when photo is expanded)
                    if (progress > 0.05f) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp)
                                .align(Alignment.BottomCenter)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Transparent,
                                            Color.Black.copy(alpha = 0.75f * progress)
                                        )
                                    )
                                )
                        )
                    }

                    // 3. Top Action Buttons (Back button on left, 3-dots menu on right)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopCenter)
                            .statusBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.35f))
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                                contentDescription = "Назад",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Box {
                            IconButton(
                                onClick = { showThreeDotsMenu = true },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.35f))
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.MoreVert,
                                    contentDescription = "Меню",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            DropdownMenu(
                                expanded = showThreeDotsMenu,
                                onDismissRequest = { showThreeDotsMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Задать имя (заметку)") },
                                    onClick = {
                                        showThreeDotsMenu = false
                                        overrideDisplayName = user.localOverrides?.localDisplayName ?: ""
                                        showOverrideDialog = true
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Rounded.Edit, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                    }
                                )

                                DropdownMenuItem(
                                    text = { Text("Копировать ссылку") },
                                    onClick = {
                                        showThreeDotsMenu = false
                                        clipboardManager.setText(AnnotatedString("https://connect.app/u/@$targetUsername"))
                                        Toast.makeText(context, "Ссылка скопирована", Toast.LENGTH_SHORT).show()
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Rounded.ContentCopy, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                                    }
                                )

                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                                DropdownMenuItem(
                                    text = { Text("Заблокировать") },
                                    onClick = {
                                        showThreeDotsMenu = false
                                        app.socketManager.blockUser(targetUsername)
                                        Toast.makeText(context, "Пользователь @$targetUsername заблокирован", Toast.LENGTH_SHORT).show()
                                        onBack()
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Rounded.Block, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                    }
                                )
                            }
                        }
                    }

                    // 4. Bottom Controls: Name, Status, Action Buttons
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Display name & Mod Badge
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = effectiveName,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (isDefaultPreset && progress < 0.2f) MaterialTheme.colorScheme.onSurface else Color.White,
                                fontSize = 22.sp
                            )
                            if (user.isGlobalMod) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Rounded.Verified,
                                    contentDescription = "Модератор",
                                    tint = Color(0xFF29B6F6),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(2.dp))

                        // Status: в сети
                        Text(
                            text = if (user.isOnline) "в сети" else "был(а) недавно",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isDefaultPreset && progress < 0.2f) MaterialTheme.colorScheme.onSurfaceVariant else Color.White.copy(alpha = 0.75f),
                            fontSize = 13.sp
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // 3 Action Pills
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            ProfileActionPill(
                                icon = Icons.AutoMirrored.Rounded.Chat,
                                label = "Сообщение",
                                onClick = {
                                    val dmRoom = listOf(myUsername, targetUsername).sorted().joinToString("_")
                                    onStartChat(dmRoom, effectiveName, false, user.avatarUrl)
                                },
                                modifier = Modifier.weight(1f)
                            )

                            ProfileActionPill(
                                icon = Icons.Rounded.Call,
                                label = "Позвонить",
                                onClick = {
                                    Toast.makeText(context, "Вызов пользователя @$targetUsername...", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f)
                            )

                            ProfileActionPill(
                                icon = if (user.isFriend) Icons.Rounded.PersonRemove else Icons.Rounded.PersonAdd,
                                label = if (user.isFriend) strings.delete else strings.addFriendButton,
                                onClick = {
                                    if (user.isFriend) {
                                        app.socketManager.removeFriend(targetUsername)
                                        Toast.makeText(context, "Пользователь удален из друзей", Toast.LENGTH_SHORT).show()
                                    } else {
                                        app.socketManager.sendFriendRequest(targetUsername)
                                        Toast.makeText(context, "Заявка в друзья отправлена", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // 2. PERSONAL CHANNEL CARD (If specified)
                val personalChannel = user.personalChannel
                if (!personalChannel.isNullOrBlank()) {
                    Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                        ProfileChannelCard(
                            channelName = personalChannel,
                            channelAvatarUrl = null,
                            subscribersCount = null,
                            lastPostText = null,
                            onClick = {
                                clipboardManager.setText(AnnotatedString(personalChannel))
                                Toast.makeText(context, "${strings.profileChannel}: $personalChannel", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // 3. PROFILE INFO CARD (Phone, Bio, Username, Birthday)
                Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                    ProfileInfoCard(
                        phone = user.phone,
                        bio = user.bio,
                        username = targetUsername,
                        birthday = user.birthday,
                        onCopy = { label, value ->
                            clipboardManager.setText(AnnotatedString(value))
                            Toast.makeText(context, "$label ${strings.copy.lowercase()}", Toast.LENGTH_SHORT).show()
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 4. PUBLICATIONS MEDIA GRID
                Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                    ProfileMediaGrid(
                        media = user.media,
                        isOwnProfile = false,
                        onUploadClick = {},
                        onMediaClick = { url -> fullscreenMediaUrl = url }
                    )
                }
            }
        }
    }

    // DIALOG: EDIT LOCAL OVERRIDE / NOTE
    if (showOverrideDialog) {
        AlertDialog(
            onDismissRequest = { showOverrideDialog = false },
            title = { Text("Локальное имя (заметка)", fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(
                    value = overrideDisplayName,
                    onValueChange = { overrideDisplayName = it },
                    label = { Text("Имя, которое видите только вы") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val token = app.prefs.getToken()
                        val auth = if (!token.isNullOrBlank()) "Bearer $token" else null
                        scope.launch {
                            try {
                                val friendPart = targetUsername.toRequestBody("text/plain".toMediaTypeOrNull())
                                val namePart = overrideDisplayName.trim().toRequestBody("text/plain".toMediaTypeOrNull())
                                val resp = app.apiClient.service.updateFriendOverride(auth, friendPart, namePart, null, null)
                                if (resp.isSuccessful) {
                                    app.socketManager.getUserProfile(targetUsername)
                                    Toast.makeText(context, "Имя сохранено", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                        showOverrideDialog = false
                    }
                ) {
                    Text("Сохранить")
                }
            },
            dismissButton = {
                TextButton(onClick = { showOverrideDialog = false }) {
                    Text("Отмена")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // FULLSCREEN MEDIA VIEWER
    fullscreenMediaUrl?.let { url ->
        val fullUrl = app.apiClient.getMediaUrl(url)
        Dialog(
            onDismissRequest = { fullscreenMediaUrl = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = fullUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )
                IconButton(
                    onClick = { fullscreenMediaUrl = null },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .statusBarsPadding()
                        .padding(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Close,
                        contentDescription = "Закрыть",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }
    }
}
