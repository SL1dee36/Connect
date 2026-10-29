package com.connect.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.PeopleOutline
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PersonOutline
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.material3.Surface
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.connect.app.ConnectApplication
import com.connect.app.ui.screens.admin.AdminPanelScreen
import com.connect.app.ui.screens.chatdetail.ChatDetailScreen
import com.connect.app.ui.screens.chats.ChatsTab
import com.connect.app.ui.screens.contacts.ContactsTab
import com.connect.app.ui.screens.group.GroupSettingsScreen
import com.connect.app.ui.screens.profile.ProfileTab
import com.connect.app.ui.screens.profile.UserProfileScreen
import com.connect.app.ui.screens.settings.SettingsScreen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

sealed class ActiveScreen {
    data object Tabs : ActiveScreen()
    data class Chat(
        val room: String,
        val title: String,
        val isGroup: Boolean,
        val avatarUrl: String?
    ) : ActiveScreen()
    data object Settings : ActiveScreen()
    data object AdminPanel : ActiveScreen()
    data class GroupSettings(val room: String) : ActiveScreen()
    data class UserProfile(val username: String) : ActiveScreen()
}

@Composable
fun MainScreen(onLogout: () -> Unit) {
    val app = ConnectApplication.instance
    val scope = rememberCoroutineScope()
    var currentScreen by remember { mutableStateOf<ActiveScreen>(ActiveScreen.Tabs) }
    val snackbarHostState = remember { SnackbarHostState() }

    val notifications by app.socketManager.notifications.collectAsState()
    val unreadRequestsCount = notifications.count { it.type == "friend_request" && it.isRead == 0 }

    val pagerState = rememberPagerState(initialPage = 0, pageCount = { 4 })

    // Native Back Button Handler for proper Android back navigation
    BackHandler(enabled = currentScreen !is ActiveScreen.Tabs || pagerState.currentPage != 0) {
        when (val screen = currentScreen) {
            is ActiveScreen.GroupSettings -> {
                currentScreen = ActiveScreen.Chat(
                    room = screen.room,
                    title = screen.room,
                    isGroup = true,
                    avatarUrl = null
                )
            }
            is ActiveScreen.UserProfile -> {
                currentScreen = ActiveScreen.Tabs
            }
            is ActiveScreen.Chat,
            ActiveScreen.Settings,
            ActiveScreen.AdminPanel -> {
                currentScreen = ActiveScreen.Tabs
            }
            ActiveScreen.Tabs -> {
                if (pagerState.currentPage != 0) {
                    scope.launch { pagerState.animateScrollToPage(0) }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        app.socketManager.errorEvents.collectLatest { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    AnimatedContent(
        targetState = currentScreen,
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        label = "MainScreenRouting"
    ) { screen ->
        when (screen) {
            is ActiveScreen.Chat -> {
                ChatDetailScreen(
                    room = screen.room,
                    title = screen.title,
                    isGroup = screen.isGroup,
                    avatarUrl = screen.avatarUrl,
                    onBack = { currentScreen = ActiveScreen.Tabs },
                    onOpenGroupSettings = { grpRoom ->
                        currentScreen = ActiveScreen.GroupSettings(grpRoom)
                    },
                    onOpenUserProfile = { username ->
                        currentScreen = ActiveScreen.UserProfile(username)
                    }
                )
            }
            is ActiveScreen.Settings -> {
                SettingsScreen(onBack = { currentScreen = ActiveScreen.Tabs })
            }
            is ActiveScreen.AdminPanel -> {
                AdminPanelScreen(onBack = { currentScreen = ActiveScreen.Tabs })
            }
            is ActiveScreen.GroupSettings -> {
                GroupSettingsScreen(
                    room = screen.room,
                    onBack = {
                        val grpAvatar = app.prefs.getGroupAvatar(screen.room)
                        currentScreen = ActiveScreen.Chat(
                            room = screen.room,
                            title = screen.room,
                            isGroup = true,
                            avatarUrl = grpAvatar
                        )
                    }
                )
            }
            is ActiveScreen.UserProfile -> {
                UserProfileScreen(
                    targetUsername = screen.username,
                    onBack = { currentScreen = ActiveScreen.Tabs },
                    onStartChat = { room, title, isGroup, avatarUrl ->
                        currentScreen = ActiveScreen.Chat(room, title, isGroup, avatarUrl)
                    }
                )
            }
            ActiveScreen.Tabs -> {
                val currentUser = app.prefs.getCurrentUser() ?: app.prefs.getBiometricUser()
                val myProfile by app.socketManager.myProfile.collectAsState()
                val myAvatarUrl = myProfile?.avatarUrl?.takeIf { it.isNotBlank() }
                    ?: currentUser?.avatarUrl?.takeIf { it.isNotBlank() }
                    ?: app.prefs.getSavedAvatarUrl()
                val myDisplayName = myProfile?.displayName ?: currentUser?.displayName ?: "U"

                Scaffold(
                    bottomBar = {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surfaceContainer,
                            contentColor = MaterialTheme.colorScheme.onSurface,
                            tonalElevation = 8.dp
                        ) {
                            val strings = com.connect.app.data.locale.LocalStrings.current

                            NavigationBarItem(
                                selected = pagerState.currentPage == 0,
                                onClick = { scope.launch { pagerState.animateScrollToPage(0) } },
                                icon = {
                                    Icon(
                                        imageVector = if (pagerState.currentPage == 0) Icons.Rounded.ChatBubble else Icons.Rounded.ChatBubbleOutline,
                                        contentDescription = strings.tabChats
                                    )
                                },
                                label = { Text(strings.tabChats) }
                            )

                            NavigationBarItem(
                                selected = pagerState.currentPage == 1,
                                onClick = { scope.launch { pagerState.animateScrollToPage(1) } },
                                icon = {
                                    BadgedBox(
                                        badge = {
                                            if (unreadRequestsCount > 0) {
                                                Badge { Text(unreadRequestsCount.toString()) }
                                            }
                                        }
                                    ) {
                                        Icon(
                                            imageVector = if (pagerState.currentPage == 1) Icons.Rounded.People else Icons.Rounded.PeopleOutline,
                                            contentDescription = strings.tabContacts
                                        )
                                    }
                                },
                                label = { Text(strings.tabContacts) }
                            )

                            NavigationBarItem(
                                selected = pagerState.currentPage == 2,
                                onClick = { scope.launch { pagerState.animateScrollToPage(2) } },
                                icon = {
                                    Icon(
                                        imageVector = Icons.Rounded.Settings,
                                        contentDescription = strings.tabSettings
                                    )
                                },
                                label = { Text(strings.tabSettings) }
                            )

                            NavigationBarItem(
                                selected = pagerState.currentPage == 3,
                                onClick = { scope.launch { pagerState.animateScrollToPage(3) } },
                                icon = {
                                    Box(
                                        modifier = Modifier
                                            .size(26.dp)
                                            .clip(CircleShape)
                                            .then(
                                                if (pagerState.currentPage == 3) {
                                                    Modifier.border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                                                } else Modifier
                                            )
                                    ) {
                                        com.connect.app.ui.components.UserAvatar(
                                            name = myDisplayName,
                                            avatarUrl = myAvatarUrl,
                                            size = 26.dp,
                                            shape = CircleShape
                                        )
                                    }
                                },
                                label = { Text(strings.tabProfile) }
                            )
                        }
                    },
                    snackbarHost = {
                        SnackbarHost(
                            hostState = snackbarHostState,
                            modifier = Modifier.statusBarsPadding()
                        )
                    }
                ) { innerPadding ->
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = innerPadding.calculateBottomPadding())
                    ) { page ->
                        when (page) {
                            0 -> ChatsTab(
                                onOpenChat = { room, title, isGroup, avatarUrl ->
                                    currentScreen = ActiveScreen.Chat(room, title, isGroup, avatarUrl)
                                }
                            )
                            1 -> ContactsTab(
                                onStartChat = { room, title, isGroup, avatarUrl ->
                                    currentScreen = ActiveScreen.Chat(room, title, isGroup, avatarUrl)
                                }
                            )
                            2 -> SettingsScreen(
                                onBack = {
                                    scope.launch { pagerState.animateScrollToPage(0) }
                                }
                            )
                            3 -> ProfileTab(
                                onOpenSettings = {
                                    scope.launch { pagerState.animateScrollToPage(2) }
                                },
                                onOpenAdminPanel = {
                                    currentScreen = ActiveScreen.AdminPanel
                                },
                                onLogout = onLogout
                            )
                        }
                    }
                }
            }
        }
    }
}
