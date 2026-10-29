package com.connect.app.ui.screens.settings

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import android.os.Build
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import com.connect.app.ui.components.ThickStepSlider
import com.connect.app.ui.components.ConnectLogo
import com.connect.app.ui.screens.profile.EditAccountSheet
import com.connect.app.data.locale.AppLanguage
import com.connect.app.data.locale.LocalStrings
import com.connect.app.utils.VibratorHelper
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.FormatSize
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.PhoneAndroid
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.RoundedCorner
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.connect.app.BuildConfig
import com.connect.app.ConnectApplication
import com.connect.app.data.prefs.AccentPalette
import com.connect.app.data.prefs.ThemeMode
import com.connect.app.ui.components.UserAvatar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

sealed class SettingsCategorySheet {
    data object None : SettingsCategorySheet()
    data object Account : SettingsCategorySheet()
    data object ChatSettings : SettingsCategorySheet()
    data object Privacy : SettingsCategorySheet()
    data object Notifications : SettingsCategorySheet()
    data object DataAndStorage : SettingsCategorySheet()
    data object Language : SettingsCategorySheet()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val app = ConnectApplication.instance
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val currentUser = app.prefs.getCurrentUser() ?: app.prefs.getBiometricUser()
    val myProfile by app.socketManager.myProfile.collectAsState()
    val isSocketConnected by app.socketManager.isConnected.collectAsState()

    val currentThemeMode by app.prefs.themeModeFlow.collectAsState()
    val currentAccent by app.prefs.accentFlow.collectAsState()
    val bubbleRadius by app.prefs.bubbleRadiusFlow.collectAsState()
    val fontSize by app.prefs.fontSizeFlow.collectAsState()
    val currentWallpaper by app.prefs.chatWallpaperFlow.collectAsState()
    val currentAppLanguage by app.localizationManager.languageFlow.collectAsState()
    val strings = LocalStrings.current

    var activeSheet by remember { mutableStateOf<SettingsCategorySheet>(SettingsCategorySheet.None) }
    var showServerDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf(app.prefs.getServerUrl()) }

    var sliderRadius by remember(bubbleRadius) { mutableFloatStateOf(bubbleRadius) }
    var sliderFontSize by remember(fontSize) { mutableFloatStateOf(fontSize) }

    // Notification toggles state
    var notificationsSoundEnabled by remember { mutableStateOf(true) }
    var notificationsVibrationEnabled by remember { mutableStateOf(true) }
    var notificationsPreviewEnabled by remember { mutableStateOf(true) }

    // Biometric toggle
    var biometricEnabled by remember { mutableStateOf(app.prefs.isBiometricAvailable()) }

    // Dynamic App Version & Build
    val (versionName, versionCode) = remember(context) {
        try {
            val pInfo = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, android.content.pm.PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            val vName = pInfo.versionName ?: BuildConfig.VERSION_NAME
            val vCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            vName to vCode
        } catch (e: Exception) {
            BuildConfig.VERSION_NAME to BuildConfig.VERSION_CODE.toLong()
        }
    }

    // GitHub Update checker state
    var isCheckingUpdates by remember { mutableStateOf(false) }
    var updateResultDialogData by remember { mutableStateOf<UpdateCheckResult?>(null) }

    val usernameToShow = myProfile?.username ?: currentUser?.username ?: ""
    val nameToShow = myProfile?.displayName ?: currentUser?.displayName ?: usernameToShow.ifEmpty { "Пользователь" }
    val avatarUrl = myProfile?.avatarUrl?.takeIf { it.isNotBlank() }
        ?: currentUser?.avatarUrl?.takeIf { it.isNotBlank() }
        ?: app.prefs.getSavedAvatarUrl()

    BackHandler(onBack = onBack)

    fun checkForGitHubUpdates() {
        if (isCheckingUpdates) return
        isCheckingUpdates = true
        scope.launch {
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(6, TimeUnit.SECONDS)
                    .readTimeout(8, TimeUnit.SECONDS)
                    .build()
                val request = Request.Builder()
                    .url("https://api.github.com/repos/sl1dee36/connect/releases/latest")
                    .header("User-Agent", "Connect-Android-Client")
                    .build()

                val result = withContext(Dispatchers.IO) {
                    val currentTag = "v$versionName"
                    try {
                        val response = client.newCall(request).execute()
                        if (response.isSuccessful) {
                            val bodyStr = response.body?.string().orEmpty()
                            val json = JSONObject(bodyStr)
                            val tagName = json.optString("tag_name", currentTag)
                            val releaseName = json.optString("name", "Релиз $tagName")
                            val releaseBody = json.optString("body", "Новые функции и исправления ошибок.")
                            val htmlUrl = json.optString("html_url", "https://github.com/sl1dee36/connect/releases")
                            val isAvailable = tagName.isNotBlank() &&
                                !tagName.equals(currentTag, ignoreCase = true) &&
                                !tagName.equals(versionName, ignoreCase = true)
                            UpdateCheckResult(
                                isAvailable = isAvailable,
                                tagName = tagName,
                                releaseName = releaseName,
                                releaseNotes = releaseBody,
                                releaseUrl = htmlUrl
                            )
                        } else {
                            UpdateCheckResult(
                                isAvailable = false,
                                tagName = currentTag,
                                releaseName = "Актуальная версия",
                                releaseNotes = "Релизы публикуются на GitHub: github.com/sl1dee36/connect/releases. У вас установлена актуальная сборка Connect v$versionName (Сборка $versionCode).",
                                releaseUrl = "https://github.com/sl1dee36/connect/releases"
                            )
                        }
                    } catch (e: Exception) {
                        UpdateCheckResult(
                            isAvailable = false,
                            tagName = currentTag,
                            releaseName = "Проверка обновлений",
                            releaseNotes = "Установлена версия Connect v$versionName (Сборка $versionCode). При необходимости вы можете открыть репозиторий на GitHub.",
                            releaseUrl = "https://github.com/sl1dee36/connect/releases"
                        )
                    }
                }
                updateResultDialogData = result
            } finally {
                isCheckingUpdates = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // TopAppBar
        TopAppBar(
            title = {
                Text(
                    text = "Настройки",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "Назад",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // User Header Profile Card
            Surface(
                onClick = { activeSheet = SettingsCategorySheet.Account },
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    UserAvatar(
                        name = nameToShow,
                        avatarUrl = avatarUrl,
                        size = 58.dp,
                        shape = CircleShape
                    )

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = nameToShow,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (usernameToShow.isNotBlank()) "@$usernameToShow" else "Профиль",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1
                        )
                        val phone = myProfile?.phone
                        if (!phone.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = phone,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 6 Categorized Settings Cards
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    // 1. Аккаунт
                    SettingsCategoryRow(
                        icon = Icons.Rounded.AccountCircle,
                        iconTint = Color(0xFF29B6F6),
                        title = "Аккаунт",
                        subtitle = "Имя, имя пользователя, био, телефон",
                        onClick = { activeSheet = SettingsCategorySheet.Account }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh)

                    // 2. Настройки чатов
                    SettingsCategoryRow(
                        icon = Icons.Rounded.Palette,
                        iconTint = Color(0xFFAB47BC),
                        title = "Настройки чатов",
                        subtitle = "Темы, акценты, размер шрифта, скругление, обои",
                        onClick = { activeSheet = SettingsCategorySheet.ChatSettings }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh)

                    // 3. Конфиденциальность
                    SettingsCategoryRow(
                        icon = Icons.Rounded.Lock,
                        iconTint = Color(0xFF66BB6A),
                        title = "Конфиденциальность",
                        subtitle = "Биометрия, код блокировки, безопасность",
                        onClick = { activeSheet = SettingsCategorySheet.Privacy }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh)

                    // 4. Уведомления
                    SettingsCategoryRow(
                        icon = Icons.Rounded.Notifications,
                        iconTint = Color(0xFFFFA726),
                        title = "Уведомления",
                        subtitle = "Личные чаты, группы, звуки, вибрация",
                        onClick = { activeSheet = SettingsCategorySheet.Notifications }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh)

                    // 5. Данные и память
                    SettingsCategoryRow(
                        icon = Icons.Rounded.Storage,
                        iconTint = Color(0xFF26A69A),
                        title = "Данные и память",
                        subtitle = "URL сервера, кэш приложения, статус сети",
                        onClick = { activeSheet = SettingsCategorySheet.DataAndStorage }
                    )

                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh)

                    // 6. Язык
                    SettingsCategoryRow(
                        icon = Icons.Rounded.Language,
                        iconTint = Color(0xFF42A5F5),
                        title = strings.languageLabel,
                        subtitle = currentAppLanguage.nativeName,
                        onClick = { activeSheet = SettingsCategorySheet.Language }
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // App Version, Build info and GitHub Update Check Button
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Версия $versionName (Сборка $versionCode)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = { checkForGitHubUpdates() },
                    enabled = !isCheckingUpdates
                ) {
                    if (isCheckingUpdates) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(14.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = if (isCheckingUpdates) "Проверка..." else "Проверить наличие обновлений",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }

    // BOTTOM SHEETS FOR EACH CATEGORY

    // 1. SHEET: АККАУНТ
    if (activeSheet is SettingsCategorySheet.Account) {
        EditAccountSheet(
            onDismiss = { activeSheet = SettingsCategorySheet.None },
            showLogoutAction = false
        )
    }

    // 2. SHEET: НАСТРОЙКИ ЧАТОВ
    if (activeSheet is SettingsCategorySheet.ChatSettings) {
        ModalBottomSheet(
            onDismissRequest = { activeSheet = SettingsCategorySheet.None },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Text(
                    text = "Настройки чатов",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                // Theme Mode
                Text("Тема оформления", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ThemeMode.entries.forEach { mode ->
                        val isSelected = currentThemeMode == mode
                        Surface(
                            onClick = {
                                app.prefs.setThemeMode(mode)
                                VibratorHelper.vibrateClick(context)
                            },
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                            border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = when (mode) {
                                        ThemeMode.SYSTEM -> Icons.Rounded.PhoneAndroid
                                        ThemeMode.LIGHT -> Icons.Rounded.LightMode
                                        ThemeMode.DARK -> Icons.Rounded.DarkMode
                                        ThemeMode.AMOLED_DARK -> Icons.Rounded.Security
                                    },
                                    contentDescription = null,
                                    tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = mode.title,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }

                // Accent Palette
                Text("Цветовой акцент", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AccentPalette.entries.forEach { accent ->
                        val isSelected = currentAccent == accent
                        val swatchColor = if (accent == AccentPalette.DYNAMIC) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                val dyn = if (currentThemeMode == ThemeMode.LIGHT) {
                                    dynamicLightColorScheme(context)
                                } else {
                                    dynamicDarkColorScheme(context)
                                }
                                dyn.primary
                            } else {
                                MaterialTheme.colorScheme.primary
                            }
                        } else {
                            Color(accent.hexCode)
                        }

                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(swatchColor)
                                .border(
                                    width = if (isSelected) 3.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                    shape = CircleShape
                                )
                                .clickable {
                                    app.prefs.setAccentPalette(accent)
                                    VibratorHelper.vibrateClick(context)
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) {
                                Icon(
                                    Icons.Rounded.Check,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            } else if (accent == AccentPalette.DYNAMIC) {
                                Icon(
                                    Icons.Rounded.Palette,
                                    contentDescription = null,
                                    tint = Color.White.copy(alpha = 0.85f),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }

                // Bubble Radius Slider
                Text("Скругление сообщений: ${sliderRadius.toInt()} dp", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                ThickStepSlider(
                    value = sliderRadius,
                    onValueChange = {
                        sliderRadius = it
                        app.prefs.setBubbleRadius(it)
                    },
                    valueRange = 4f..24f,
                    steps = 4
                )

                // Font Size Slider
                Text("Размер шрифта: ${sliderFontSize.toInt()} sp", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                ThickStepSlider(
                    value = sliderFontSize,
                    onValueChange = {
                        sliderFontSize = it
                        app.prefs.setFontSize(it)
                    },
                    valueRange = 12f..22f,
                    steps = 4
                )

                // Wallpapers
                Text("Обои чатов", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val wallpapers = listOf(
                        "default" to "Стандарт",
                        "night" to "Ночь",
                        "neon" to "Неон",
                        "mono" to "Монохром"
                    )
                    wallpapers.forEach { (id, title) ->
                        val isSel = currentWallpaper == id
                        Surface(
                            onClick = { app.prefs.setChatWallpaper(id) },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSel) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = title,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 10.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // 3. SHEET: КОНФИДЕНЦИАЛЬНОСТЬ
    if (activeSheet is SettingsCategorySheet.Privacy) {
        ModalBottomSheet(
            onDismissRequest = { activeSheet = SettingsCategorySheet.None },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Конфиденциальность",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Вход по биометрии / отпечатку", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Использовать биометрический датчик при входе", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = biometricEnabled,
                        onCheckedChange = {
                            biometricEnabled = it
                            if (!it) {
                                app.prefs.clearBiometric()
                                Toast.makeText(context, "Биометрия отключена", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Включено. Авторизуйтесь с отпечатком при следующем входе", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }

                HorizontalDivider()

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            Toast.makeText(context, "Список заблокированных пользователей пуст", Toast.LENGTH_SHORT).show()
                        }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Заблокированные пользователи", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Управление чёрным списком контактов", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // 4. SHEET: УВЕДОМЛЕНИЯ
    if (activeSheet is SettingsCategorySheet.Notifications) {
        ModalBottomSheet(
            onDismissRequest = { activeSheet = SettingsCategorySheet.None },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Уведомления",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Звук входящих сообщений", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Воспроизводить системный звук при получении", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = notificationsSoundEnabled,
                        onCheckedChange = { notificationsSoundEnabled = it }
                    )
                }

                HorizontalDivider()

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Вибрация", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Вибросигнал при входящих сообщениях", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = notificationsVibrationEnabled,
                        onCheckedChange = { notificationsVibrationEnabled = it }
                    )
                }

                HorizontalDivider()

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Показывать предпросмотр текста", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Отображать текст сообщения в системных пушах", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = notificationsPreviewEnabled,
                        onCheckedChange = { notificationsPreviewEnabled = it }
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // 5. SHEET: ДАННЫЕ И ПАМЯТЬ
    if (activeSheet is SettingsCategorySheet.DataAndStorage) {
        ModalBottomSheet(
            onDismissRequest = { activeSheet = SettingsCategorySheet.None },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Данные и память",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                // Server URL
                Surface(
                    onClick = {
                        serverUrlInput = app.prefs.getServerUrl()
                        showServerDialog = true
                    },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("URL сервера Connect", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(app.prefs.getServerUrl(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        }
                        Text("Изменить", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }

                // Socket connection status
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(if (isSocketConnected) Color(0xFF22C55E) else Color(0xFFEF4444))
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = if (isSocketConnected) "Соединение активно (В сети)" else "Нет подключения к серверу",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Clear Cache Button
                Button(
                    onClick = {
                        try {
                            context.cacheDir.deleteRecursively()
                            Toast.makeText(context, "Кэш приложения успешно очищен", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) {
                            Toast.makeText(context, "Не удалось очистить кэш", Toast.LENGTH_SHORT).show()
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Очистить кэш изображений и медиа", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // 6. SHEET: ЯЗЫК
    if (activeSheet is SettingsCategorySheet.Language) {
        ModalBottomSheet(
            onDismissRequest = { activeSheet = SettingsCategorySheet.None },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = strings.languageLabel,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                val languages = listOf(
                    AppLanguage.SYSTEM,
                    AppLanguage.RU,
                    AppLanguage.EN,
                    AppLanguage.DE,
                    AppLanguage.ES,
                    AppLanguage.BE
                )
                languages.forEach { lang ->
                    val isSelected = currentAppLanguage == lang
                    Surface(
                        onClick = {
                            app.localizationManager.setLanguage(lang)
                            VibratorHelper.vibrateClick(context)
                            activeSheet = SettingsCategorySheet.None
                        },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = lang.nativeName,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                                if (lang != AppLanguage.SYSTEM) {
                                    Text(
                                        text = lang.englishName,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Rounded.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    // DIALOG: CHANGE SERVER URL
    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = {
                Text(
                    text = "Адрес сервера Connect",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    Text(
                        text = "Введите адрес сервера (по умолчанию: http://72.56.22.5:3001):",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = serverUrlInput,
                        onValueChange = { serverUrlInput = it },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val clean = serverUrlInput.trim()
                        if (clean.isNotBlank()) {
                            app.prefs.setServerUrl(clean)
                            app.socketManager.disconnect()
                            app.socketManager.connect()
                        }
                        showServerDialog = false
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Сохранить")
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) {
                    Text("Отмена")
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        )
    }

    // DIALOG: GITHUB UPDATE CHECK RESULT
    updateResultDialogData?.let { res ->
        AlertDialog(
            onDismissRequest = { updateResultDialogData = null },
            icon = {
                Icon(
                    imageVector = if (res.isAvailable) Icons.Rounded.SystemUpdate else Icons.Rounded.Check,
                    contentDescription = null,
                    tint = if (res.isAvailable) MaterialTheme.colorScheme.primary else Color(0xFF22C55E),
                    modifier = Modifier.size(32.dp)
                )
            },
            title = {
                Text(
                    text = if (res.isAvailable) "Доступно обновление!" else "Обновлений не найдено",
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = res.releaseName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = res.releaseNotes,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "GitHub: github.com/sl1dee36/connect",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(res.releaseUrl))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Не удалось открыть браузер", Toast.LENGTH_SHORT).show()
                        }
                        updateResultDialogData = null
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (res.isAvailable) "Скачать с GitHub" else "Открыть GitHub")
                }
            },
            dismissButton = {
                TextButton(onClick = { updateResultDialogData = null }) {
                    Text("Закрыть")
                }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        )
    }
}

@Composable
private fun SettingsCategoryRow(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(iconTint.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(22.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        Icon(
            imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
    }
}

private data class UpdateCheckResult(
    val isAvailable: Boolean,
    val tagName: String,
    val releaseName: String,
    val releaseNotes: String,
    val releaseUrl: String
)
