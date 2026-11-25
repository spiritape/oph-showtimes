package com.ojaishowtimes.app

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.ojaishowtimes.app.data.Appearance
import com.ojaishowtimes.app.data.FeedStore
import com.ojaishowtimes.app.data.FilmRequests
import com.ojaishowtimes.app.data.Settings
import com.ojaishowtimes.app.data.Title
import com.ojaishowtimes.app.ui.InfoScreen
import com.ojaishowtimes.app.ui.PlayhouseTheme
import com.ojaishowtimes.app.ui.RequestScreen
import com.ojaishowtimes.app.ui.ScheduleScreen
import com.ojaishowtimes.app.ui.TitleScreen
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val store by lazy { FeedStore(applicationContext) }
    private val requests by lazy { FilmRequests(applicationContext) }
    private val settings by lazy { Settings(applicationContext) }
    /** A Title a link asked for (ojaiplayhouse://title/<slug>), opened once the schedule has it. */
    private var linkedSlug by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        linkedSlug = slug(intent)

        lifecycleScope.launch {
            store.loadCache()
            // Fresh whenever the app comes to the front, as on iOS.
            repeatOnLifecycle(Lifecycle.State.STARTED) { store.refresh() }
        }

        setContent {
            val dark = when (settings.appearance) {
                Appearance.Dark -> true
                Appearance.Light -> false
                Appearance.System -> isSystemInDarkTheme()
            }
            LaunchedEffect(dark) {
                val style = if (dark) SystemBarStyle.dark(Color.TRANSPARENT) else SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
            }
            PlayhouseTheme(dark = dark, textSize = settings.textSize) {
                App(store, requests, settings, linkedSlug, onLinkHandled = { linkedSlug = null })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        linkedSlug = slug(intent)
    }

    private fun slug(intent: Intent?): String? {
        val data = intent?.data ?: return null
        return if (data.scheme == "ojaiplayhouse" && data.host == "title") data.pathSegments.firstOrNull() else null
    }
}

@Composable
private fun App(
    store: FeedStore,
    requests: FilmRequests,
    settings: Settings,
    linkedSlug: String?,
    onLinkHandled: () -> Unit,
) {
    /** Titles opened from the schedule, the top one showing. */
    val path = remember { mutableStateListOf<Title>() }
    var showsRequests by remember { mutableStateOf(false) }
    var showsInfo by remember { mutableStateOf(false) }

    LaunchedEffect(linkedSlug, store.feed) {
        val slug = linkedSlug ?: return@LaunchedEffect
        val title = store.feed?.titles?.firstOrNull { it.slug == slug } ?: return@LaunchedEffect
        onLinkHandled()
        path.clear()
        path.add(title)
    }

    Box(Modifier.fillMaxSize()) {
        // The schedule stays underneath, so coming back from a Title keeps the place in the list.
        ScheduleScreen(
            store = store,
            onOpenTitle = { path.add(it) },
            onRequest = { showsRequests = true },
            onInfo = { showsInfo = true },
        )
        path.forEachIndexed { index, title ->
            key(title.key, index) {
                val visible = remember { androidx.compose.animation.core.MutableTransitionState(false) }.apply { targetState = true }
                AnimatedVisibility(
                    visibleState = visible,
                    enter = slideInHorizontally { it },
                    exit = slideOutHorizontally { it },
                ) {
                    // The latest copy of the Title, so a refresh updates an open page.
                    val current = store.feed?.titles?.firstOrNull { it.key == title.key }?.takeIf { title.showtimes.isNotEmpty() } ?: title
                    TitleScreen(current, store.feed, onBack = { path.removeAt(path.lastIndex) })
                }
            }
        }
        BackHandler(enabled = path.isNotEmpty()) { path.removeAt(path.lastIndex) }
    }

    if (showsRequests) RequestScreen(requests, onDismiss = { showsRequests = false })
    if (showsInfo) InfoScreen(settings, onDismiss = { showsInfo = false })
}
