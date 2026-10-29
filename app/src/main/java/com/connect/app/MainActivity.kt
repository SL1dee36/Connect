package com.connect.app

import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.connect.app.data.locale.ProvideLocalizedStrings
import com.connect.app.ui.screens.MainScreen
import com.connect.app.ui.screens.auth.AuthScreen
import com.connect.app.ui.theme.ConnectTheme

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val app = ConnectApplication.instance
            val prefs = app.prefs
            val themeMode by prefs.themeModeFlow.collectAsState()
            val accentPalette by prefs.accentFlow.collectAsState()

            var isLoggedIn by remember {
                mutableStateOf(!prefs.getToken().isNullOrBlank())
            }
            var isSplashing by remember { mutableStateOf(true) }

            ProvideLocalizedStrings(app.localizationManager) {
                ConnectTheme(
                    themeMode = themeMode,
                    accentPalette = accentPalette
                ) {
                    AnimatedContent(
                        targetState = isSplashing,
                        transitionSpec = { androidx.compose.animation.core.tween<Float>(350).let { fadeIn(it) togetherWith fadeOut(it) } },
                        label = "SplashNavTransition"
                    ) { splashing ->
                        if (splashing) {
                            com.connect.app.ui.screens.splash.SplashScreen(
                                onFinish = { isSplashing = false }
                            )
                        } else {
                            AnimatedContent(
                                targetState = isLoggedIn,
                                transitionSpec = { fadeIn() togetherWith fadeOut() },
                                label = "AuthNavTransition"
                            ) { loggedIn ->
                                if (loggedIn) {
                                    MainScreen(
                                        onLogout = {
                                            isLoggedIn = false
                                        }
                                    )
                                } else {
                                    AuthScreen(
                                        onLoginSuccess = {
                                            isLoggedIn = true
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        val prefs = ConnectApplication.instance.prefs
        if (!prefs.getToken().isNullOrBlank()) {
            ConnectApplication.instance.socketManager.connect()
        }
    }
}
