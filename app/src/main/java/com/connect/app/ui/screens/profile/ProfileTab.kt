package com.connect.app.ui.screens.profile

import android.net.Uri
import android.widget.Toast
import com.connect.app.data.locale.LocalStrings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.AddPhotoAlternate
import androidx.compose.material.icons.rounded.AlternateEmail
import androidx.compose.material.icons.rounded.BugReport
import androidx.compose.material.icons.rounded.Cake
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ColorLens
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.DateRange
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.QrCode
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.connect.app.ConnectApplication
import com.connect.app.ui.components.UserAvatar
import com.connect.app.ui.screens.bugreport.BugReportDialog
import com.connect.app.utils.FileUtils
import com.connect.app.utils.VibratorHelper
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileTab(
    onOpenSettings: () -> Unit,
    onOpenAdminPanel: () -> Unit,
    onLogout: () -> Unit
) {
    val app = ConnectApplication.instance
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val strings = LocalStrings.current

    val currentUser = app.prefs.getCurrentUser()
    val myProfile by app.socketManager.myProfile.collectAsState()
    val globalRole by app.socketManager.globalRole.collectAsState()
    val userGroups by app.socketManager.userGroups.collectAsState()
    val savedColorPreference by app.prefs.profileColorFlow.collectAsState()

    var showThreeDotsMenu by remember { mutableStateOf(false) }
    var showColorPaletteDialog by remember { mutableStateOf(false) }
    var showChangeNameDialog by remember { mutableStateOf(false) }
    var showEditAccountSheet by remember { mutableStateOf(false) }
    var showAvatarHistoryDialog by remember { mutableStateOf(false) }
    var showBugReportDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var fullscreenMediaUrl by remember { mutableStateOf<String?>(null) }
    var isAvatarExpanded by remember { mutableStateOf(false) }

    var quickDisplayNameInput by remember { mutableStateOf("") }
    var isAvatarUploading by remember { mutableStateOf(false) }
    var isMediaUploading by remember { mutableStateOf(false) }

    val currentSavedUser = currentUser ?: app.prefs.getBiometricUser()
    val usernameToShow = myProfile?.username?.takeIf { it.isNotBlank() }
        ?: currentSavedUser?.username?.takeIf { it.isNotBlank() }
        ?: ""

    val nameToShow = myProfile?.displayName?.takeIf { it.isNotBlank() }
        ?: currentSavedUser?.displayName?.takeIf { it.isNotBlank() }
        ?: usernameToShow.takeIf { it.isNotBlank() }
        ?: "Пользователь"

    val isMod = globalRole == "mod" || currentSavedUser?.role == "mod"
    val isNotificationsOn = (myProfile?.notificationsEnabled ?: 1) == 1

    // Effective profile background color preset
    val effectiveColorId = myProfile?.profileColor?.takeIf { it.isNotBlank() } ?: savedColorPreference
    val currentPreset = getProfilePreset(effectiveColorId)

    val avatarHistory by app.socketManager.avatarHistory.collectAsState()

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

    LaunchedEffect(usernameToShow) {
        if (usernameToShow.isNotBlank()) {
            app.socketManager.fetchMyProfile()
            app.socketManager.getAvatarHistory(usernameToShow)
        }
    }

    // Native Avatar Picker
    val avatarPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                isAvatarUploading = true
                try {
                    val part = FileUtils.uriToMultipartPart(context, uri, "avatar")
                    if (part != null) {
                        val token = app.prefs.getToken()
                        val auth = if (!token.isNullOrBlank()) "Bearer $token" else null
                        val userPart = usernameToShow.toRequestBody("text/plain".toMediaTypeOrNull())
                        val resp = app.apiClient.service.uploadAvatar(auth, part, userPart)
                        if (resp.isSuccessful) {
                            val newAvatar = resp.body()?.profile?.avatarUrl
                            if (!newAvatar.isNullOrBlank()) {
                                app.prefs.setSavedAvatarUrl(newAvatar)
                                val curUser = app.prefs.getCurrentUser()
                                if (curUser != null) {
                                    app.prefs.setCurrentUser(curUser.copy(avatarUrl = newAvatar))
                                }
                            }
                            app.socketManager.fetchMyProfile()
                            if (usernameToShow.isNotBlank()) {
                                app.socketManager.getUserProfile(usernameToShow)
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    isAvatarUploading = false
                }
            }
        }
    }

    // Native Media Gallery Picker
    val mediaPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                isMediaUploading = true
                try {
                    val part = FileUtils.uriToMultipartPart(context, uri, "file")
                    if (part != null) {
                        val token = app.prefs.getToken()
                        val auth = if (!token.isNullOrBlank()) "Bearer $token" else null
                        val userPart = usernameToShow.toRequestBody("text/plain".toMediaTypeOrNull())
                        val resp = app.apiClient.service.uploadProfileMedia(auth, part, userPart)
                        if (resp.isSuccessful) {
                            val body = resp.body()
                            val uploadedUrl = body?.get("url") as? String
                            val uploadedType = (body?.get("type") as? String) ?: "image"
                            if (!uploadedUrl.isNullOrBlank()) {
                                app.socketManager.addMediaToMyProfile(
                                    com.connect.app.data.model.UserMediaItem(
                                        id = System.currentTimeMillis(),
                                        url = uploadedUrl,
                                        type = uploadedType
                                    )
                                )
                            }
                            app.socketManager.fetchMyProfile()
                            Toast.makeText(context, "Публикация успешно добавлена", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Не удалось опубликовать (${resp.code()})", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(context, "Не удалось прочитать выбранный файл", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(context, "Ошибка при загрузке: ${e.localizedMessage ?: "попробуйте позже"}", Toast.LENGTH_SHORT).show()
                } finally {
                    isMediaUploading = false
                }
            }
        }
    }


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
                .padding(bottom = 110.dp)
        ) {
            // 1. PROFILE HEADER (With expandable banner avatar & smooth drag)
            val avatarUrl = myProfile?.avatarUrl?.takeIf { it.isNotBlank() }
                ?: currentUser?.avatarUrl?.takeIf { it.isNotBlank() }
                ?: app.prefs.getSavedAvatarUrl()

            val avatarList = remember(avatarUrl, avatarHistory) {
                val list = mutableListOf<String>()
                if (!avatarUrl.isNullOrBlank()) {
                    list.add(avatarUrl)
                }
                avatarHistory.forEach { item ->
                    if (item.avatarUrl.isNotBlank() && !list.contains(item.avatarUrl)) {
                        list.add(item.avatarUrl)
                    }
                }
                list
            }

            val avatarPagerState = rememberPagerState(initialPage = 0, pageCount = { avatarList.size.coerceAtLeast(1) })
            val isDefaultPreset = effectiveColorId == "default" || effectiveColorId.isNullOrBlank()
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
                                    listOf(currentPreset.primaryColor, currentPreset.secondaryColor)
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
                                val fullPhotoUrl = app.apiClient.getMediaUrl(photo)
                                AsyncImage(
                                    model = fullPhotoUrl,
                                    contentDescription = "Avatar $page",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                UserAvatar(
                                    name = nameToShow,
                                    avatarUrl = null,
                                    size = avatarHeight,
                                    shape = RoundedCornerShape(avatarCornerRadius)
                                )
                            }
                        }
                    } else {
                        UserAvatar(
                            name = nameToShow,
                            avatarUrl = avatarUrl,
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

                // 3. Top Action Buttons (QR code, 3-dots menu)
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
                        onClick = {
                            clipboardManager.setText(AnnotatedString("https://connect.app/u/@$usernameToShow"))
                            Toast.makeText(context, "Ссылка на профиль скопирована", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.35f))
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.QrCode,
                            contentDescription = "QR / Ссылка",
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
                                text = { Text("Изменить цвет профиля") },
                                onClick = {
                                    showThreeDotsMenu = false
                                    showColorPaletteDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Rounded.ColorLens, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                }
                            )

                            DropdownMenuItem(
                                text = { Text("Изменить имя") },
                                onClick = {
                                    showThreeDotsMenu = false
                                    quickDisplayNameInput = nameToShow
                                    showChangeNameDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Rounded.Edit, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                                }
                            )

                            DropdownMenuItem(
                                text = { Text("Копировать ссылку") },
                                onClick = {
                                    showThreeDotsMenu = false
                                    clipboardManager.setText(AnnotatedString("https://connect.app/u/@$usernameToShow"))
                                    Toast.makeText(context, "Ссылка на профиль скопирована", Toast.LENGTH_SHORT).show()
                                },
                                leadingIcon = {
                                    Icon(Icons.Rounded.ContentCopy, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                                }
                            )

                            DropdownMenuItem(
                                text = { Text("История аватаров") },
                                onClick = {
                                    showThreeDotsMenu = false
                                    app.socketManager.getAvatarHistory(usernameToShow)
                                    showAvatarHistoryDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Rounded.History, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                                }
                            )

                            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                            DropdownMenuItem(
                                text = { Text("Изменить данные аккаунта") },
                                onClick = {
                                    showThreeDotsMenu = false
                                    showEditAccountSheet = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Rounded.AccountCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                }
                            )

                            if (isMod) {
                                DropdownMenuItem(
                                    text = { Text("Админ-панель") },
                                    onClick = {
                                        showThreeDotsMenu = false
                                        onOpenAdminPanel()
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Rounded.Security, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                                    }
                                )
                            }
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
                    // Name + Verified Badge
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = nameToShow,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (isDefaultPreset && progress < 0.2f) MaterialTheme.colorScheme.onSurface else Color.White,
                            fontSize = 22.sp
                        )
                        if (isMod) {
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

                    // Status: В сети
                    Text(
                        text = "в сети",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isDefaultPreset && progress < 0.2f) MaterialTheme.colorScheme.onSurfaceVariant else Color.White.copy(alpha = 0.75f),
                        fontSize = 13.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // 3 Action Pills: [Photo], [Edit], [Settings]
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ProfileActionPill(
                            icon = Icons.Rounded.AddPhotoAlternate,
                            label = strings.selectPhotoAction,
                            onClick = { avatarPickerLauncher.launch("image/*") },
                            modifier = Modifier.weight(1f)
                        )

                        ProfileActionPill(
                            icon = Icons.Rounded.Edit,
                            label = strings.editAction,
                            onClick = {
                                showEditAccountSheet = true
                            },
                            modifier = Modifier.weight(1f)
                        )

                        ProfileActionPill(
                            icon = Icons.Rounded.Settings,
                            label = strings.settingsAction,
                            onClick = onOpenSettings,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 2. PERSONAL CHANNEL CARD (If user has one or group)
            val personalChannel = myProfile?.personalChannel
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
                    phone = myProfile?.phone,
                    bio = myProfile?.bio,
                    username = usernameToShow,
                    birthday = myProfile?.birthday,
                    onCopy = { label, value ->
                        clipboardManager.setText(AnnotatedString(value))
                        Toast.makeText(context, "$label ${strings.copy.lowercase()}", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 4. PUBLICATIONS MEDIA GRID
            Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                Column {
                    if (isMediaUploading) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "Публикация фотографии...",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    ProfileMediaGrid(
                        media = myProfile?.media ?: emptyList(),
                        isOwnProfile = true,
                        onUploadClick = { mediaPickerLauncher.launch("image/*") },
                        onMediaClick = { url -> fullscreenMediaUrl = url }
                    )
                }
            }
        }
    }

    // DIALOG: COLOR PALETTE SELECTION
    if (showColorPaletteDialog) {
        AlertDialog(
            onDismissRequest = { showColorPaletteDialog = false },
            title = {
                Text(
                    text = "Цвет и тема профиля",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Выберите цветной задник для профиля:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        profileColorPresets.chunked(2).forEach { rowPresets ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                rowPresets.forEach { preset ->
                                    val isSelected = preset.id == effectiveColorId
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(56.dp)
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(Brush.linearGradient(listOf(preset.primaryColor, preset.secondaryColor)))
                                            .border(
                                                width = if (isSelected) 3.dp else 1.dp,
                                                color = if (isSelected) Color.White else Color.Transparent,
                                                shape = RoundedCornerShape(14.dp)
                                            )
                                            .clickable {
                                                app.socketManager.updateProfileColor(preset.id)
                                                showColorPaletteDialog = false
                                                Toast.makeText(context, "Фон профиля изменён на «${preset.name}»", Toast.LENGTH_SHORT).show()
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = preset.name,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                style = MaterialTheme.typography.labelMedium
                                            )
                                            if (isSelected) {
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showColorPaletteDialog = false }) {
                    Text("Закрыть")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // DIALOG: QUICK CHANGE NAME
    if (showChangeNameDialog) {
        AlertDialog(
            onDismissRequest = { showChangeNameDialog = false },
            title = {
                Text("Изменить имя", fontWeight = FontWeight.Bold)
            },
            text = {
                OutlinedTextField(
                    value = quickDisplayNameInput,
                    onValueChange = { quickDisplayNameInput = it },
                    label = { Text("Ваше имя") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmed = quickDisplayNameInput.trim()
                        if (trimmed.isNotBlank()) {
                            app.socketManager.updateProfile(
                                displayName = trimmed,
                                bio = myProfile?.bio ?: "",
                                phone = myProfile?.phone ?: "",
                                notificationsEnabled = isNotificationsOn,
                                birthday = myProfile?.birthday,
                                personalChannel = myProfile?.personalChannel,
                                profileColor = effectiveColorId
                            )
                        }
                        showChangeNameDialog = false
                    }
                ) {
                    Text("Сохранить")
                }
            },
            dismissButton = {
                TextButton(onClick = { showChangeNameDialog = false }) {
                    Text("Отмена")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // BOTTOM SHEET: EDIT ACCOUNT DETAILS
    if (showEditAccountSheet) {
        EditAccountSheet(
            onDismiss = { showEditAccountSheet = false },
            showLogoutAction = true,
            onLogout = onLogout
        )
    }

    // DIALOG: AVATAR HISTORY
    if (showAvatarHistoryDialog) {
        val avatarHistory by app.socketManager.avatarHistory.collectAsState()
        AlertDialog(
            onDismissRequest = { showAvatarHistoryDialog = false },
            title = {
                Text(
                    text = "История аватаров",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                if (avatarHistory.isEmpty()) {
                    Text("У вас пока нет сохранённых прошлых аватаров.")
                } else {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        items(avatarHistory) { item ->
                            val url = app.apiClient.getMediaUrl(item.avatarUrl)
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .clickable {
                                        fullscreenMediaUrl = item.avatarUrl
                                    }
                            ) {
                                AsyncImage(
                                    model = url,
                                    contentDescription = null,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showAvatarHistoryDialog = false }) {
                    Text("Закрыть")
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

    // CONFIRM LOGOUT DIALOG
    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Выход из аккаунта") },
            text = { Text("Вы уверены, что хотите выйти из мессенджера?") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        app.socketManager.disconnect()
                        app.prefs.clearAuth()
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Выйти")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text("Отмена")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    if (showBugReportDialog) {
        BugReportDialog(onDismiss = { showBugReportDialog = false })
    }
}
