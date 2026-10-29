package com.connect.app.ui.screens.profile

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.connect.app.ConnectApplication
import com.connect.app.utils.PhoneUtils
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Единый компонент BottomSheet для редактирования данных аккаунта.
 * Используется как во вкладке «Профиль», так и в «Настройки -> Аккаунт».
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditAccountSheet(
    onDismiss: () -> Unit,
    showLogoutAction: Boolean = false,
    onLogout: (() -> Unit)? = null
) {
    val app = ConnectApplication.instance
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val currentUser = app.prefs.getCurrentUser() ?: app.prefs.getBiometricUser()
    val myProfile by app.socketManager.myProfile.collectAsState()
    val userGroups by app.socketManager.userGroups.collectAsState()
    val savedColorPreference by app.prefs.profileColorFlow.collectAsState()
    val effectiveColorId = myProfile?.profileColor?.takeIf { it.isNotBlank() } ?: savedColorPreference

    val currentUsername = myProfile?.username?.takeIf { it.isNotBlank() }
        ?: currentUser?.username?.takeIf { it.isNotBlank() }
        ?: ""

    // State fields
    var firstNameInput by remember { mutableStateOf("") }
    var lastNameInput by remember { mutableStateOf("") }
    var bioInput by remember { mutableStateOf("") }
    var phoneInput by remember { mutableStateOf("") }
    var nametagInput by remember { mutableStateOf("") }
    var birthdayInput by remember { mutableStateOf("") }
    var channelInput by remember { mutableStateOf("") }
    var editErrorMessage by remember { mutableStateOf<String?>(null) }

    var showDatePickerDialog by remember { mutableStateOf(false) }
    var isChannelDropdownExpanded by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    // Инициализация при открытии / смене профиля
    LaunchedEffect(myProfile, currentUsername) {
        val fullDisp = myProfile?.displayName ?: currentUser?.displayName ?: ""
        val parts = fullDisp.split(" ")
        firstNameInput = parts.firstOrNull() ?: ""
        lastNameInput = parts.drop(1).joinToString(" ")
        bioInput = myProfile?.bio ?: ""
        phoneInput = myProfile?.phone ?: ""
        nametagInput = currentUsername
        birthdayInput = myProfile?.birthday ?: ""
        channelInput = myProfile?.personalChannel ?: ""
        editErrorMessage = null
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Данные аккаунта",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Rounded.Close,
                        contentDescription = "Закрыть",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Имя и Фамилия
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = firstNameInput,
                    onValueChange = { firstNameInput = it },
                    label = { Text("Имя") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = lastNameInput,
                    onValueChange = { lastNameInput = it },
                    label = { Text("Фамилия") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // О себе (Bio)
            OutlinedTextField(
                value = bioInput,
                onValueChange = { bioInput = it },
                label = { Text("О себе") },
                maxLines = 3,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Номер телефона (с форматированием)
            OutlinedTextField(
                value = phoneInput,
                onValueChange = { input ->
                    phoneInput = input.filter { it.isDigit() || it == '+' }.take(16)
                },
                label = { Text("Номер телефона") },
                placeholder = { Text("+7 (999) 000-00-00") },
                visualTransformation = PhoneUtils.RuPhoneVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Тег / Nametag (@username)
            OutlinedTextField(
                value = nametagInput,
                onValueChange = {
                    nametagInput = it
                    editErrorMessage = null
                },
                label = { Text("Тег (@username)") },
                prefix = { Text("@", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // День рождения (с кнопкой вызова DatePicker)
            OutlinedTextField(
                value = birthdayInput,
                onValueChange = { birthdayInput = it },
                label = { Text("День рождения (ДД.ММ.ГГГГ)") },
                placeholder = { Text("15.08.2000") },
                singleLine = true,
                trailingIcon = {
                    IconButton(onClick = { showDatePickerDialog = true }) {
                        Icon(
                            imageVector = Icons.Rounded.CalendarMonth,
                            contentDescription = "Выбрать дату",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Личный канал с выпадающим списком каналов/групп
            ExposedDropdownMenuBox(
                expanded = isChannelDropdownExpanded,
                onExpandedChange = { isChannelDropdownExpanded = it }
            ) {
                OutlinedTextField(
                    value = channelInput,
                    onValueChange = {
                        channelInput = it
                        isChannelDropdownExpanded = false
                    },
                    label = { Text("Личный канал (@channel или название)") },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = isChannelDropdownExpanded)
                    },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryEditable, enabled = true)
                )

                ExposedDropdownMenu(
                    expanded = isChannelDropdownExpanded,
                    onDismissRequest = { isChannelDropdownExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Без канала (Очистить)", color = MaterialTheme.colorScheme.error) },
                        onClick = {
                            channelInput = ""
                            isChannelDropdownExpanded = false
                        }
                    )
                    HorizontalDivider()

                    if (userGroups.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Нет созданных каналов/групп", style = MaterialTheme.typography.bodySmall) },
                            onClick = {},
                            enabled = false
                        )
                    } else {
                        userGroups.forEach { grp ->
                            val cleanGroup = grp.removePrefix("#").removePrefix("@")
                            DropdownMenuItem(
                                text = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Rounded.Campaign,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("@$cleanGroup", fontWeight = FontWeight.Medium)
                                    }
                                },
                                onClick = {
                                    channelInput = "@$cleanGroup"
                                    isChannelDropdownExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            if (editErrorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = editErrorMessage ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Кнопка сохранения
            Button(
                onClick = {
                    val cleanNametag = nametagInput.trim().removePrefix("@")
                    val newName = cleanNametag.takeIf { it.isNotBlank() && it != currentUsername }

                    if (newName != null && !newName.matches(Regex("^[a-zA-Z0-9_]{3,}$"))) {
                        editErrorMessage = "Тег должен содержать только латиницу, цифры или _ (мин. 3 символа)"
                        return@Button
                    }

                    val combinedDisplayName = listOf(firstNameInput.trim(), lastNameInput.trim())
                        .filter { it.isNotBlank() }
                        .joinToString(" ")

                    val formattedPhone = phoneInput.trim()

                    app.socketManager.updateProfile(
                        displayName = combinedDisplayName,
                        bio = bioInput.trim(),
                        phone = formattedPhone,
                        notificationsEnabled = (myProfile?.notificationsEnabled ?: 1) == 1,
                        newUsername = newName,
                        birthday = birthdayInput.trim(),
                        personalChannel = channelInput.trim(),
                        profileColor = effectiveColorId
                    )

                    onDismiss()
                    Toast.makeText(context, "Данные аккаунта обновлены", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "Сохранить изменения",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }

            if (showLogoutAction && onLogout != null) {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = { showLogoutConfirm = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.Logout,
                        contentDescription = "Выйти",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Выйти из аккаунта",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Material 3 Date Picker Dialog
    if (showDatePickerDialog) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePickerDialog = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val sdf = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault())
                            sdf.timeZone = TimeZone.getTimeZone("UTC")
                            birthdayInput = sdf.format(Date(millis))
                        }
                        showDatePickerDialog = false
                    }
                ) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePickerDialog = false }) {
                    Text("Отмена")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // Диалог подтверждения выхода
    if (showLogoutConfirm && onLogout != null) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Выход из аккаунта", fontWeight = FontWeight.Bold) },
            text = { Text("Вы уверены, что хотите выйти из аккаунта? Вам потребуется снова ввести пароль.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        onDismiss()
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Выйти", color = MaterialTheme.colorScheme.onError)
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
}
