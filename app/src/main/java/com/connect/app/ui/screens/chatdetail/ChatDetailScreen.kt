package com.connect.app.ui.screens.chatdetail

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Reply
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.AttachFile
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.Info
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.InsertDriveFile
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import com.connect.app.ui.components.VoiceMessageBubble
import com.connect.app.ui.components.VideoNoteBubble
import com.connect.app.ui.components.RoundCameraRecordOverlay
import com.connect.app.utils.AudioRecorder
import kotlinx.coroutines.delay
import java.io.File
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.connect.app.ConnectApplication
import com.connect.app.data.model.ChatMessage
import com.connect.app.ui.components.UserAvatar
import com.connect.app.utils.FileUtils
import com.connect.app.utils.VibratorHelper
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatDetailScreen(
    room: String,
    title: String,
    isGroup: Boolean,
    avatarUrl: String?,
    onBack: () -> Unit,
    onOpenGroupSettings: (room: String) -> Unit,
    onOpenUserProfile: (username: String) -> Unit
) {
    val app = ConnectApplication.instance
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current

    val currentUser = app.prefs.getCurrentUser() ?: app.prefs.getBiometricUser()
    val myUsername = currentUser?.username ?: ""

    val messages by app.socketManager.currentRoomMessages.collectAsState()
    val typingMap by app.socketManager.typingUsers.collectAsState()
    val groupAvatars by app.socketManager.groupAvatars.collectAsState()
    val friendsList by app.socketManager.friendsList.collectAsState()
    val currentRoomSettings by app.socketManager.currentRoomSettings.collectAsState()
    val bubbleRadius by app.prefs.bubbleRadiusFlow.collectAsState()
    val fontSize by app.prefs.fontSizeFlow.collectAsState()
    val wallpaper by app.prefs.chatWallpaperFlow.collectAsState()

    val peerUsername = if (!isGroup && room.contains("_")) {
        val parts = room.split("_")
        parts.firstOrNull { it != myUsername } ?: title
    } else title

    val effectiveHeaderAvatar = if (isGroup) {
        groupAvatars[room]
            ?: currentRoomSettings?.takeIf { it.room == room }?.avatarUrl
            ?: app.prefs.getGroupAvatar(room)
            ?: avatarUrl
    } else {
        friendsList.firstOrNull { it.username.equals(peerUsername, ignoreCase = true) }?.effectiveAvatar
            ?: avatarUrl
    }

    var inputText by remember { mutableStateOf("") }
    var replyingToMessage by remember { mutableStateOf<ChatMessage?>(null) }
    var selectedMessageForOptions by remember { mutableStateOf<ChatMessage?>(null) }
    var fullscreenImageUrl by remember { mutableStateOf<String?>(null) }

    val listState = rememberLazyListState()

    // Native attachment handling state
    var showAttachmentSheet by remember { mutableStateOf(false) }
    var isUploading by remember { mutableStateOf(false) }
    var uploadStatusText by remember { mutableStateOf("") }

    // Voice and Round Video Note State
    val audioRecorder = remember { AudioRecorder(context) }
    var isRecordingAudio by remember { mutableStateOf(false) }
    var audioRecordDuration by remember { mutableStateOf(0) }
    var showRoundCameraOverlay by remember { mutableStateOf(false) }
    var isInputModeMic by remember { mutableStateOf(true) } // true: voice mic, false: video note camera
    var isRecordingLocked by remember { mutableStateOf(false) }
    var pendingVoicePreviewFile by remember { mutableStateOf<File?>(null) }
    var pendingVideoPreviewFile by remember { mutableStateOf<File?>(null) }
    var voicePreviewDuration by remember { mutableStateOf(0) }
    var isPreviewPlaying by remember { mutableStateOf(false) }
    var previewPlayer by remember { mutableStateOf<android.media.MediaPlayer?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            try {
                previewPlayer?.release()
                previewPlayer = null
            } catch (_: Exception) {}
        }
    }

    val audioPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            if (audioRecorder.start()) {
                isRecordingAudio = true
                audioRecordDuration = 0
            }
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.CAMERA] == true &&
            permissions[Manifest.permission.RECORD_AUDIO] == true
        ) {
            showRoundCameraOverlay = true
        }
    }

    LaunchedEffect(isRecordingAudio) {
        while (isRecordingAudio) {
            delay(1000)
            audioRecordDuration++
        }
    }

    fun sendVoiceMessage(audioFile: File) {
        scope.launch {
            isUploading = true
            uploadStatusText = "Отправка голосового..."
            try {
                val part = FileUtils.fileToMultipartPart(audioFile, "file")
                if (part != null) {
                    val token = app.prefs.getToken()
                    val authHeader = if (!token.isNullOrBlank()) "Bearer $token" else null
                    val response = app.apiClient.service.uploadFile(authHeader, part)
                    if (response.isSuccessful && response.body()?.url != null) {
                        app.socketManager.sendMessage(
                            room = room,
                            messageText = response.body()!!.url!!,
                            type = "audio",
                            replyTo = replyingToMessage
                        )
                        replyingToMessage = null
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isUploading = false
                audioFile.delete()
                pendingVoicePreviewFile = null
            }
        }
    }

    fun sendVideoNote(videoFile: File) {
        showRoundCameraOverlay = false
        scope.launch {
            isUploading = true
            uploadStatusText = "Отправка кружка..."
            try {
                val part = FileUtils.fileToMultipartPart(videoFile, "file")
                if (part != null) {
                    val token = app.prefs.getToken()
                    val authHeader = if (!token.isNullOrBlank()) "Bearer $token" else null
                    val response = app.apiClient.service.uploadFile(authHeader, part)
                    if (response.isSuccessful && response.body()?.url != null) {
                        app.socketManager.sendMessage(
                            room = room,
                            messageText = response.body()!!.url!!,
                            type = "video",
                            replyTo = replyingToMessage
                        )
                        replyingToMessage = null
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isUploading = false
                videoFile.delete()
                pendingVideoPreviewFile = null
            }
        }
    }

    // Native Pickers (Gallery & Files)
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                isUploading = true
                uploadStatusText = "Загрузка фото..."
                try {
                    val part = FileUtils.uriToMultipartPart(context, uri, "file")
                    if (part != null) {
                        val token = app.prefs.getToken()
                        val authHeader = if (!token.isNullOrBlank()) "Bearer $token" else null
                        val response = app.apiClient.service.uploadFile(authHeader, part)
                        if (response.isSuccessful && response.body()?.url != null) {
                            val uploadedUrl = response.body()!!.url!!
                            app.socketManager.sendMessage(
                                room = room,
                                messageText = uploadedUrl,
                                type = "image",
                                replyTo = replyingToMessage
                            )
                            replyingToMessage = null
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    isUploading = false
                }
            }
        }
    }

    val fileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                isUploading = true
                uploadStatusText = "Загрузка документа..."
                try {
                    val part = FileUtils.uriToMultipartPart(context, uri, "file")
                    if (part != null) {
                        val token = app.prefs.getToken()
                        val authHeader = if (!token.isNullOrBlank()) "Bearer $token" else null
                        val response = app.apiClient.service.uploadFile(authHeader, part)
                        if (response.isSuccessful && response.body()?.url != null) {
                            val uploadedUrl = response.body()!!.url!!
                            val mime = context.contentResolver.getType(uri) ?: ""
                            val msgType = if (mime.startsWith("image/")) "image" else "file"
                            app.socketManager.sendMessage(
                                room = room,
                                messageText = uploadedUrl,
                                type = msgType,
                                replyTo = replyingToMessage
                            )
                            replyingToMessage = null
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    isUploading = false
                }
            }
        }
    }

    DisposableEffect(room, isGroup) {
        app.socketManager.joinRoom(room, isGroup)
        if (isGroup) {
            app.socketManager.getGroupInfo(room)
        }
        onDispose {
            app.socketManager.leaveCurrentRoom(clearSettings = false)
        }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    fun handleSend() {
        val text = inputText.trim()
        if (text.isBlank()) return
        app.socketManager.sendMessage(
            room = room,
            messageText = text,
            type = "text",
            replyTo = replyingToMessage
        )
        inputText = ""
        replyingToMessage = null
    }

    val isOtherTyping = typingMap[room] != null
    val typingPerson = typingMap[room]

    // Wallpaper background color
    val backgroundColor = when (wallpaper) {
        "amoled" -> Color(0xFF000000)
        "slate" -> Color(0xFF16191E)
        "midnight" -> Color(0xFF0B101B)
        else -> MaterialTheme.colorScheme.background
    }

    // Dynamic bubble shapes based on customizable corner radius
    val outgoingBubbleShape = RoundedCornerShape(
        topStart = CornerSize(bubbleRadius.dp),
        topEnd = CornerSize(bubbleRadius.dp),
        bottomStart = CornerSize(bubbleRadius.dp),
        bottomEnd = CornerSize(4.dp)
    )

    val incomingBubbleShape = RoundedCornerShape(
        topStart = CornerSize(bubbleRadius.dp),
        topEnd = CornerSize(bubbleRadius.dp),
        bottomStart = CornerSize(4.dp),
        bottomEnd = CornerSize(bubbleRadius.dp)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor)
            // Notice: No statusBarsPadding here! TopAppBar automatically handles status bar window insets!
    ) {
        // TOP APP BAR
        TopAppBar(
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        if (isGroup) {
                            onOpenGroupSettings(room)
                        } else {
                            val peer = if (room.contains("_")) {
                                val parts = room.split("_")
                                parts.firstOrNull { it != myUsername } ?: title
                            } else title
                            onOpenUserProfile(peer)
                        }
                    }
                ) {
                    UserAvatar(
                        name = title,
                        avatarUrl = effectiveHeaderAvatar,
                        size = 40.dp,
                        isGroup = isGroup
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = when {
                                isOtherTyping -> "${typingPerson ?: "Кто-то"} печатает..."
                                isGroup -> "группа"
                                else -> "в сети"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isOtherTyping) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            },
            actions = {
                if (isGroup) {
                    IconButton(onClick = { onOpenGroupSettings(room) }) {
                        Icon(
                            imageVector = Icons.Rounded.Info,
                            contentDescription = "Group Settings",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer
            )
        )

        // UPLOAD PROGRESS BAR
        AnimatedVisibility(visible = isUploading) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = uploadStatusText,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        // MESSAGES LIST
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .weight(1f)
                .padding(horizontal = 10.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(messages, key = { it.id.takeIf { id -> id != 0L } ?: it.tempId ?: it.hashCode() }) { msg ->
                val isMe = msg.author.equals(myUsername, ignoreCase = true)

                if (msg.isSystem) {
                    // System Message Chip
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                                .padding(horizontal = 12.dp, vertical = 5.dp)
                        ) {
                            Text(
                                text = msg.message,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    // SWIPE-TO-REPLY MESSAGE ROW
                    val offsetX = remember { Animatable(0f) }
                    val thresholdPx = with(LocalDensity.current) { 68.dp.toPx() }
                    var hasVibratedOnThreshold by remember { mutableStateOf(false) }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pointerInput(msg.id) {
                                detectHorizontalDragGestures(
                                    onDragEnd = {
                                        scope.launch {
                                            if (kotlin.math.abs(offsetX.value) >= thresholdPx) {
                                                VibratorHelper.vibrateClick(context)
                                                replyingToMessage = msg
                                            }
                                            hasVibratedOnThreshold = false
                                            offsetX.animateTo(0f, spring(stiffness = 500f))
                                        }
                                    },
                                    onDragCancel = {
                                        hasVibratedOnThreshold = false
                                        scope.launch { offsetX.animateTo(0f) }
                                    },
                                    onHorizontalDrag = { _, dragAmount ->
                                        scope.launch {
                                            val current = offsetX.value
                                            val newOffset = (current + dragAmount * 0.6f).coerceIn(-thresholdPx * 1.5f, thresholdPx * 1.5f)
                                            offsetX.snapTo(newOffset)
                                            val crossed = kotlin.math.abs(newOffset) >= thresholdPx
                                            if (crossed && !hasVibratedOnThreshold) {
                                                hasVibratedOnThreshold = true
                                                VibratorHelper.vibrateTick(context)
                                            } else if (!crossed && hasVibratedOnThreshold) {
                                                hasVibratedOnThreshold = false
                                            }
                                        }
                                    }
                                )
                            }
                    ) {
                        // Reply indicator behind
                        if (offsetX.value != 0f) {
                            val isSwipeLeft = offsetX.value < 0
                            Box(
                                modifier = Modifier
                                    .align(if (isSwipeLeft) Alignment.CenterEnd else Alignment.CenterStart)
                                    .padding(horizontal = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Rounded.Reply,
                                    contentDescription = "Reply",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        // Message bubble container sliding with offset
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset { IntOffset(offsetX.value.roundToInt(), 0) },
                            horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                        ) {
                            Column(
                                modifier = Modifier
                                    .widthIn(min = 80.dp, max = 310.dp)
                                    .clip(if (isMe) outgoingBubbleShape else incomingBubbleShape)
                                    .background(
                                        if (msg.isVideo || msg.type == "video") Color.Transparent
                                        else if (isMe) MaterialTheme.colorScheme.primaryContainer
                                        else MaterialTheme.colorScheme.surfaceContainerHigh
                                    )
                                    .combinedClickable(
                                        onClick = {
                                            if (msg.isImage) {
                                                fullscreenImageUrl = ConnectApplication.instance.apiClient.getMediaUrl(msg.message)
                                            } else {
                                                selectedMessageForOptions = msg
                                            }
                                        },
                                        onLongClick = {
                                            VibratorHelper.vibrateLongPress(context)
                                            selectedMessageForOptions = msg
                                        }
                                    )
                                    .padding(
                                        start = if (msg.isVideo || msg.type == "video") 0.dp else 12.dp,
                                        end = if (msg.isVideo || msg.type == "video") 0.dp else 12.dp,
                                        top = if (msg.isVideo || msg.type == "video") 0.dp else 8.dp,
                                        bottom = if (msg.isVideo || msg.type == "video") 0.dp else 6.dp
                                    )
                            ) {
                                // Author name in group for other members
                                if (isGroup && !isMe) {
                                    Text(
                                        text = msg.authorName,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.clickable { onOpenUserProfile(msg.author) }
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                }

                                // Reply quote bar
                                if (!msg.replyToMessage.isNullOrBlank()) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(
                                                if (isMe) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.08f)
                                                else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                            )
                                            .padding(horizontal = 8.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .width(3.dp)
                                                .height(26.dp)
                                                .background(
                                                    if (isMe) MaterialTheme.colorScheme.primary
                                                    else MaterialTheme.colorScheme.secondary,
                                                    RoundedCornerShape(2.dp)
                                                )
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Column {
                                            Text(
                                                text = msg.replyToAuthor ?: "Ответ",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                text = msg.replyToMessage,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                }

                                // Message content: Image / File / Audio / Video / Text
                                when {
                                    msg.isImage -> {
                                        val fullMediaUrl = app.apiClient.getMediaUrl(msg.message)
                                        AsyncImage(
                                            model = fullMediaUrl,
                                            contentDescription = "Attachment Image",
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .heightIn(max = 260.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .clickable { fullscreenImageUrl = fullMediaUrl },
                                            contentScale = ContentScale.Crop
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                    }
                                    msg.isAudio || msg.type == "audio" -> {
                                        VoiceMessageBubble(
                                            audioUrl = msg.message,
                                            isMe = isMe
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                    }
                                    msg.isVideo || msg.type == "video" -> {
                                        VideoNoteBubble(
                                            videoUrl = msg.message,
                                            isMe = isMe,
                                            time = msg.time
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                    }
                                    msg.type == "file" -> {
                                        // Document / File bubble
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(
                                                    if (isMe) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.1f)
                                                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                                )
                                                .padding(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(36.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primary),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.InsertDriveFile,
                                                    contentDescription = "File",
                                                    tint = MaterialTheme.colorScheme.onPrimary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                val fileName = msg.message.substringAfterLast("/")
                                                Text(
                                                    text = fileName,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.Medium,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                                )
                                                Text(
                                                    text = "Документ",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f) else MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(4.dp))
                                    }
                                    else -> {
                                        Text(
                                            text = msg.message,
                                            style = MaterialTheme.typography.bodyLarge.copy(fontSize = fontSize.sp),
                                            color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }

                                // Inline timestamp & status at bottom-right (suppressed for video notes which have own floating badge)
                                if (!msg.isVideo && msg.type != "video") {
                                    Row(
                                        modifier = Modifier.align(Alignment.End),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = msg.time ?: "",
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                                            color = if (isMe) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                            else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                                        )
                                        if (isMe) {
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Icon(
                                                imageVector = Icons.Rounded.DoneAll,
                                                contentDescription = "Delivered",
                                                modifier = Modifier.size(13.dp),
                                                tint = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // REPLY PREVIEW BANNER
        AnimatedVisibility(visible = replyingToMessage != null) {
            replyingToMessage?.let { replyTarget ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceContainer)
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.Reply,
                        contentDescription = "Replying",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Ответ для ${replyTarget.authorName}",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = replyTarget.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(
                        onClick = { replyingToMessage = null },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Cancel reply",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // INPUT BAR
        // Exactly positioned with navigationBarsPadding() and imePadding()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceContainer)
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            when {
                // 1. Pending Voice Preview Mode
                pendingVoicePreviewFile != null -> {
                    IconButton(
                        onClick = {
                            previewPlayer?.release()
                            previewPlayer = null
                            pendingVoicePreviewFile?.delete()
                            pendingVoicePreviewFile = null
                            isPreviewPlaying = false
                        },
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Delete,
                            contentDescription = "Удалить запись",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = {
                                val file = pendingVoicePreviewFile ?: return@IconButton
                                if (isPreviewPlaying) {
                                    previewPlayer?.pause()
                                    isPreviewPlaying = false
                                } else {
                                    if (previewPlayer == null) {
                                        previewPlayer = android.media.MediaPlayer().apply {
                                            setDataSource(file.absolutePath)
                                            prepare()
                                            setOnCompletionListener {
                                                isPreviewPlaying = false
                                            }
                                        }
                                    }
                                    previewPlayer?.start()
                                    isPreviewPlaying = true
                                }
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = if (isPreviewPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                                contentDescription = if (isPreviewPlaying) "Пауза" else "Слушать",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Text(
                            text = "0:%02d".format(voicePreviewDuration),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.width(8.dp))

                        Text(
                            text = if (isPreviewPlaying) "Воспроизведение..." else "Предпросмотр голосового",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    IconButton(
                        onClick = {
                            previewPlayer?.release()
                            previewPlayer = null
                            pendingVoicePreviewFile?.let { sendVoiceMessage(it) }
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.Send,
                            contentDescription = "Отправить",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // 2. Pending Video Note Preview Mode
                pendingVideoPreviewFile != null -> {
                    IconButton(
                        onClick = {
                            pendingVideoPreviewFile?.delete()
                            pendingVideoPreviewFile = null
                        },
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Delete,
                            contentDescription = "Удалить кружок",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Videocam,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Text(
                            text = "Кружок записан",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "(предпросмотр)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    IconButton(
                        onClick = {
                            pendingVideoPreviewFile?.let { sendVideoNote(it) }
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.Send,
                            contentDescription = "Отправить",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // 3. Active Audio Recording (Hold or Locked)
                isRecordingAudio -> {
                    IconButton(
                        onClick = {
                            audioRecorder.cancel()
                            isRecordingAudio = false
                            isRecordingLocked = false
                            audioRecordDuration = 0
                        },
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Delete,
                            contentDescription = "Отменить запись",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(androidx.compose.ui.graphics.Color.Red)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "0:%02d".format(audioRecordDuration),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isRecordingLocked) "Запись зафиксирована" else "↑ вверх для фиксации",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    if (isRecordingLocked) {
                        // Stop button in locked mode -> transitions to preview!
                        IconButton(
                            onClick = {
                                val file = audioRecorder.stop()
                                isRecordingAudio = false
                                isRecordingLocked = false
                                if (file != null && file.exists()) {
                                    pendingVoicePreviewFile = file
                                    voicePreviewDuration = audioRecordDuration
                                }
                                audioRecordDuration = 0
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Stop,
                                contentDescription = "Завершить запись",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }

                // 4. Default Input State
                else -> {
                    // Single Paperclip attachment button (not duplicated)
                    IconButton(
                        onClick = { showAttachmentSheet = true },
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.AttachFile,
                            contentDescription = "Attach file",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    // Capsule text field
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 42.dp, max = 120.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (inputText.isEmpty()) {
                            Text(
                                text = "Сообщение...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                            )
                        }

                        BasicTextField(
                            value = inputText,
                            onValueChange = {
                                inputText = it
                                if (it.isNotEmpty()) {
                                    app.socketManager.emitTyping(room)
                                }
                            },
                            textStyle = MaterialTheme.typography.bodyMedium.copy(
                                color = MaterialTheme.colorScheme.onSurface
                            ),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    if (inputText.isNotBlank()) {
                        // Send text button
                        IconButton(
                            onClick = { handleSend() },
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.Send,
                                contentDescription = "Send",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else {
                        // SINGLE RECORD BUTTON: Tap toggles Mic<->Camera, Hold records, Drag up locks, Release previews!
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                                .pointerInput(isInputModeMic) {
                                    awaitEachGesture {
                                        val down = awaitFirstDown(requireUnconsumed = false)
                                        val startTime = System.currentTimeMillis()
                                        var hasTriggeredRecord = false
                                        var isLocked = false

                                        while (true) {
                                            val event = awaitPointerEvent(PointerEventPass.Main)
                                            val current = event.changes.firstOrNull { it.id == down.id }
                                            if (current == null || !current.pressed) {
                                                // Pointer released
                                                val duration = System.currentTimeMillis() - startTime
                                                if (!hasTriggeredRecord && duration < 350) {
                                                    // Quick single tap -> toggle Mic <-> Camera mode
                                                    isInputModeMic = !isInputModeMic
                                                } else if (hasTriggeredRecord && !isLocked) {
                                                    // Released without locking -> Stop audio and go to preview!
                                                    if (isInputModeMic) {
                                                        val file = audioRecorder.stop()
                                                        isRecordingAudio = false
                                                        if (file != null && file.exists()) {
                                                            pendingVoicePreviewFile = file
                                                            voicePreviewDuration = audioRecordDuration
                                                        }
                                                        audioRecordDuration = 0
                                                    }
                                                }
                                                break
                                            }

                                            val elapsed = System.currentTimeMillis() - startTime
                                            if (elapsed >= 350 && !hasTriggeredRecord) {
                                                hasTriggeredRecord = true
                                                if (isInputModeMic) {
                                                    val hasMicPermission = ContextCompat.checkSelfPermission(
                                                        context,
                                                        Manifest.permission.RECORD_AUDIO
                                                    ) == PackageManager.PERMISSION_GRANTED
                                                    if (hasMicPermission) {
                                                        if (audioRecorder.start()) {
                                                            isRecordingAudio = true
                                                            audioRecordDuration = 0
                                                        }
                                                    } else {
                                                        audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                                    }
                                                } else {
                                                    val hasCamPermission = ContextCompat.checkSelfPermission(
                                                        context,
                                                        Manifest.permission.CAMERA
                                                    ) == PackageManager.PERMISSION_GRANTED
                                                    val hasMicPermission = ContextCompat.checkSelfPermission(
                                                        context,
                                                        Manifest.permission.RECORD_AUDIO
                                                    ) == PackageManager.PERMISSION_GRANTED
                                                    if (hasCamPermission && hasMicPermission) {
                                                        showRoundCameraOverlay = true
                                                    } else {
                                                        cameraPermissionLauncher.launch(
                                                            arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
                                                        )
                                                    }
                                                }
                                            }

                                            if (hasTriggeredRecord) {
                                                val dragY = current.position.y - down.position.y
                                                if (dragY < -80f && !isLocked) {
                                                    isLocked = true
                                                    isRecordingLocked = true
                                                }
                                            }
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isInputModeMic) Icons.Rounded.Mic else Icons.Rounded.Videocam,
                                contentDescription = if (isInputModeMic) "Voice Mode" else "Video Mode",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    // ATTACHMENT BOTTOM SHEET
    if (showAttachmentSheet) {
        val sheetState = rememberModalBottomSheetState()
        ModalBottomSheet(
            onDismissRequest = { showAttachmentSheet = false },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "Прикрепить",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable {
                            showAttachmentSheet = false
                            galleryLauncher.launch("image/*")
                        }
                        .padding(vertical = 12.dp, horizontal = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Image,
                            contentDescription = "Gallery",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Фото или видео",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Отправить изображение из галереи",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable {
                            showAttachmentSheet = false
                            fileLauncher.launch("*/*")
                        }
                        .padding(vertical = 12.dp, horizontal = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.secondaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.InsertDriveFile,
                            contentDescription = "File",
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Файл или документ",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "PDF, архив, музыка или любой файл",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    // FULLSCREEN IMAGE PREVIEW DIALOG
    fullscreenImageUrl?.let { imgUrl ->
        Dialog(
            onDismissRequest = { fullscreenImageUrl = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.95f))
            ) {
                AsyncImage(
                    model = imgUrl,
                    contentDescription = "Preview",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )

                IconButton(
                    onClick = { fullscreenImageUrl = null },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .statusBarsPadding()
                        .padding(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Close,
                        contentDescription = "Close",
                        tint = Color.White
                    )
                }
            }
        }
    }

    // Context dialog on message tap
    selectedMessageForOptions?.let { msg ->
        val isMe = msg.author == myUsername
        AlertDialog(
            onDismissRequest = { selectedMessageForOptions = null },
            title = {
                Text(
                    text = "Действия",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                VibratorHelper.vibrateClick(context)
                                replyingToMessage = msg
                                selectedMessageForOptions = null
                            }
                            .padding(vertical = 10.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.AutoMirrored.Rounded.Reply, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Ответить", style = MaterialTheme.typography.bodyLarge)
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                VibratorHelper.vibrateClick(context)
                                clipboardManager.setText(AnnotatedString(msg.message))
                                selectedMessageForOptions = null
                            }
                            .padding(vertical = 10.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Rounded.ContentCopy, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Копировать", style = MaterialTheme.typography.bodyLarge)
                    }

                    if (isMe) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    VibratorHelper.vibrateClick(context)
                                    app.socketManager.deleteMessage(msg.id, forEveryone = true)
                                    selectedMessageForOptions = null
                                }
                                .padding(vertical = 10.dp, horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(imageVector = Icons.Rounded.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Удалить для всех", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { selectedMessageForOptions = null }) {
                    Text("Закрыть")
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        )
    }

    if (showRoundCameraOverlay) {
        RoundCameraRecordOverlay(
            onDismiss = { showRoundCameraOverlay = false },
            onVideoRecorded = { videoFile ->
                showRoundCameraOverlay = false
                pendingVideoPreviewFile = videoFile
            }
        )
    }
}

