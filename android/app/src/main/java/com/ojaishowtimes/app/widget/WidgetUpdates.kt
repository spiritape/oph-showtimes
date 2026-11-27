package com.ojaishowtimes.app.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.ojaishowtimes.app.data.Feed
import com.ojaishowtimes.app.data.FeedStore
import com.ojaishowtimes.app.data.Http
import com.ojaishowtimes.app.data.Showtime
import com.ojaishowtimes.app.data.Title
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * Keeps the widget current. It draws from the app's saved schedule (never fetching one of its own),
 * so it's redrawn when the app saves a new schedule, when a Showtime drops off or the day changes,
 * and every few hours as a fallback.
 */
object WidgetUpdates {
    private const val TAG = "widget"
    private const val REFRESH = "widget-refresh"
    private const val PERIODIC = "widget-periodic"

    /** How many Showtimes get a thumbnail ahead of time: the most the widget shows, plus a couple for drop-offs. */
    private const val THUMBNAILS = NextShowtimesWidget.MOST_SHOWN + 2

    /** Redraws the widget soon, e.g. after the app saved a new schedule. */
    fun refresh(context: Context) {
        val request = OneTimeWorkRequestBuilder<WidgetUpdateWorker>().addTag(TAG).build()
        // Queued behind one that's already running, so a newer schedule is never dropped or cut short.
        WorkManager.getInstance(context).enqueueUniqueWork(REFRESH, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    /** The fallback redraw a few times a day, from when the first widget is placed. */
    fun schedulePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(6, TimeUnit.HOURS).addTag(TAG).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    /** Stops everything once the last widget is removed. */
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(TAG)
    }

    /**
     * Asks for a redraw when the list next changes: a Showtime dropping off 30 minutes after it starts,
     * or midnight at the theater turning "Tomorrow" into "Today". One request per moment, so drawing
     * the widget again (or drawing several widgets) never stacks duplicates.
     */
    fun scheduleNextChange(context: Context, feed: Feed?, now: Instant = Instant.now()) {
        val next = nextChange(feed, now) ?: return
        val delay = Duration.between(now, next).plusSeconds(5)
        val request = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
            .setInitialDelay(delay.toMillis(), TimeUnit.MILLISECONDS)
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("widget-at-${next.epochSecond / 60}", ExistingWorkPolicy.KEEP, request)
    }

    /** ios/Shared/Feed.swift listChanges(after:within:), taking only the first. */
    internal fun nextChange(feed: Feed?, now: Instant): Instant? {
        feed ?: return null
        val dropOffs = feed.listed(now = now).map { it.showtime.startsAt.plusSeconds(Showtime.LISTED_AFTER_START_SECONDS) }
        val midnight = now.atZone(feed.zone).toLocalDate().plusDays(1).atStartOfDay(feed.zone).toInstant()
        return (dropOffs + midnight).filter { it.isAfter(now) }.minOrNull()
    }

    /** Saved thumbnails, by URL, for the Titles the widget is about to show. */
    private fun thumbnailDir(context: Context) = File(context.filesDir, "widget-thumbnails")

    private fun thumbnailUrl(title: Title) = title.thumbnailUrl ?: title.imageUrl

    private fun thumbnailFile(context: Context, url: String): File {
        val hash = MessageDigest.getInstance("SHA-256").digest(url.toByteArray()).take(12).joinToString("") { "%02x".format(it) }
        return File(thumbnailDir(context), "$hash.png")
    }

    /** The thumbnail saved for [title], if it has one. */
    fun thumbnail(context: Context, title: Title): Bitmap? {
        val url = thumbnailUrl(title) ?: return null
        val file = thumbnailFile(context, url)
        return if (file.exists()) BitmapFactory.decodeFile(file.path) else null
    }

    /**
     * Downloads thumbnails for the next few Titles (a widget can't load images itself), small enough
     * for a home screen, and deletes the ones no longer needed.
     */
    suspend fun saveThumbnails(context: Context, feed: Feed, now: Instant = Instant.now()) = withContext(Dispatchers.IO) {
        val dir = thumbnailDir(context).apply { mkdirs() }
        val urls = feed.listed(now = now).map { it.title }.distinctBy { it.key }.take(THUMBNAILS).mapNotNull(::thumbnailUrl)
        val files = urls.map { thumbnailFile(context, it) }
        coroutineScope {
            urls.zip(files).filter { !it.second.exists() }.map { (url, file) ->
                async { runCatching { save(Http.bytes(url), file) } }
            }.awaitAll()
        }
        dir.listFiles()?.filter { it !in files }?.forEach { it.delete() }
    }

    private fun save(bytes: ByteArray, file: File) {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        // Sized down to about 320 pixels across: plenty for a widget, and small enough for its memory limit.
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= 320) sample *= 2
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return
        val scaled = if (bitmap.width > 320) Bitmap.createScaledBitmap(bitmap, 320, bitmap.height * 320 / bitmap.width, true) else bitmap
        val temp = File(file.parentFile, file.name + ".tmp")
        temp.outputStream().use { scaled.compress(Bitmap.CompressFormat.PNG, 100, it) }
        temp.renameTo(file)
    }
}

/** Saves thumbnails and redraws every placed widget. */
class WidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val context = applicationContext
        val ids = GlanceAppWidgetManager(context).getGlanceIds(NextShowtimesWidget::class.java)
        if (ids.isEmpty()) return Result.success()
        val feed = withContext(Dispatchers.IO) { FeedStore.readCache(context) }
        if (feed != null) WidgetUpdates.saveThumbnails(context, feed)
        val widget = NextShowtimesWidget()
        ids.forEach { id ->
            // A new stamp in the widget's state, so a widget that's already showing draws itself again.
            updateAppWidgetState(context, id) { it[NextShowtimesWidget.DRAWN_AT] = System.currentTimeMillis() }
            widget.update(context, id)
        }
        WidgetUpdates.scheduleNextChange(context, feed)
        return Result.success()
    }
}
