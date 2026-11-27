package com.ojaishowtimes.app.data

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.widget.WidgetUpdates
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Loads the Feed, keeping the last good copy so the schedule still shows offline
 * (ios/Playhouse/FeedStore.swift).
 */
class FeedStore(private val context: Context) {
    private val cacheFile = cacheFile(context)

    var feed by mutableStateOf<Feed?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    /** Set when the latest refresh failed; the saved Feed (if any) still shows. */
    var error by mutableStateOf<String?>(null)
        private set

    /** Reads the saved Feed, if there is one. */
    suspend fun loadCache() {
        if (feed != null) return
        feed = withContext(Dispatchers.IO) {
            readCache(context)
        }
    }

    suspend fun refresh() {
        if (isLoading) return
        isLoading = true
        try {
            val text = Http.get(Feed.URL, noCache = true)
            val latest = withContext(Dispatchers.Default) { Feed.decode(text) }
            feed = latest
            error = null
            withContext(Dispatchers.IO) {
                // Written beside the old copy, then moved over it, so a crash never leaves half a file.
                val temp = File(cacheFile.parentFile, "schedule.json.tmp")
                temp.writeText(text)
                temp.renameTo(cacheFile)
            }
            WidgetUpdates.refresh(context)
        } catch (e: CancellationException) {
            // Cancelled, e.g. by leaving the app mid-refresh: not a failure.
            throw e
        } catch (e: Exception) {
            error = context.getString(if (feed == null) R.string.feed_loadError else R.string.feed_stale)
        } finally {
            isLoading = false
        }
    }

    companion object {
        fun cacheFile(context: Context) = File(context.filesDir, "schedule.json")

        /** The last good Feed, or null before the first load. The widget reads it too. */
        fun readCache(context: Context): Feed? =
            runCatching { Feed.decode(cacheFile(context).readText()) }.getOrNull()
    }
}
