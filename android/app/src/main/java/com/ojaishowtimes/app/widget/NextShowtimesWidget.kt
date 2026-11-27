package com.ojaishowtimes.app.widget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.GlanceModifier
import androidx.glance.currentState
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.layout.ContentScale
import com.ojaishowtimes.app.MainActivity
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.Feed
import com.ojaishowtimes.app.data.FeedStore
import com.ojaishowtimes.app.data.ScheduledShowtime
import com.ojaishowtimes.app.data.Title
import com.ojaishowtimes.app.ui.AppColors
import com.ojaishowtimes.app.ui.Formats
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant

/** "Next at the Playhouse": the next upcoming Showtimes, whatever day they're on (ios/Widgets/NextShowtimesWidget.swift). */
class NextShowtimesWidget : GlanceAppWidget() {
    companion object {
        /** How many Showtimes the wide widget shows at most. */
        const val MOST_SHOWN = 3

        /** When WidgetUpdates last asked for a redraw; changing it makes a running widget draw again. */
        val DRAWN_AT = longPreferencesKey("drawnAt")
    }

    /** Drawn for each widget's real size, so the wide one can fit as many rows as it has room for. */
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        WidgetUpdates.scheduleNextChange(context, withContext(Dispatchers.IO) { FeedStore.readCache(context) })
        provideContent {
            // Read on every redraw, not once per session, so an update shows the latest schedule and
            // thumbnails. Glance composes off the main thread, and these are small local files.
            currentState(DRAWN_AT)
            val now = Instant.now()
            val feed = FeedStore.readCache(context)
            val upcoming = feed?.listed(now = now).orEmpty()
            val thumbnails = upcoming.map { it.title }.distinctBy { it.key }.take(MOST_SHOWN)
                .mapNotNull { title -> WidgetUpdates.thumbnail(context, title)?.let { title.key to it } }.toMap()
            NextShowtimesContent(feed, upcoming, thumbnails, now)
        }
    }
}

class NextShowtimesWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NextShowtimesWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetUpdates.schedulePeriodic(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        WidgetUpdates.cancel(context)
    }
}

/** The app's colors, light and dark, following the phone. */
private object WidgetColors {
    val background = pair { it.background }
    val label = pair { it.label }
    val secondary = pair { it.secondaryLabel }
    val accent = pair { it.accent }
    val placeholder = pair { it.fill3 }
    val soldOut = pair { it.red }
    val free = pair { it.softGreen }
    val onBadge = ColorProvider(day = Color.White, night = Color.White)

    private fun pair(color: (AppColors) -> Color) = ColorProvider(day = color(AppColors.Light), night = color(AppColors.Dark))
}

@Composable
private fun NextShowtimesContent(feed: Feed?, upcoming: List<ScheduledShowtime>, thumbnails: Map<String, Bitmap>, now: Instant) {
    val context = LocalContext.current
    val size = LocalSize.current
    val formats = feed?.let { Formats(context, it.zone) }
    val wide = size.width >= 250.dp
    val next = upcoming.firstOrNull()

    var modifier = GlanceModifier.fillMaxSize().appWidgetBackground().background(WidgetColors.background)
    if (Build.VERSION.SDK_INT >= 31) modifier = modifier.cornerRadius(android.R.dimen.system_app_widget_background_radius)
    // Tapping anywhere a Showtime isn't opens the schedule.
    modifier = modifier.clickable(openSchedule(context))

    Box(modifier.padding(14.dp)) {
        when {
            feed == null || formats == null || next == null -> Text(
                context.getString(if (feed == null) R.string.widget_empty else R.string.schedule_nothing),
                style = TextStyle(fontSize = 12.sp, color = WidgetColors.secondary),
            )
            wide -> {
                // Rows of about 40dp under the label, as many as fit, up to three.
                val fits = ((size.height.value - 28 - 18) / 40).toInt().coerceIn(1, NextShowtimesWidget.MOST_SHOWN)
                Wide(upcoming.take(fits), formats, thumbnails, now)
            }
            else -> Small(next, formats, thumbnails[next.title.key], now)
        }
    }
}

@Composable
private fun Small(item: ScheduledShowtime, formats: Formats, thumbnail: Bitmap?, now: Instant) {
    val context = LocalContext.current
    Column(GlanceModifier.fillMaxSize().clickable(openTitle(context, item.title))) {
        Box(GlanceModifier.fillMaxWidth().defaultWeight()) {
            Thumbnail(thumbnail, GlanceModifier.fillMaxSize())
            Mark(item, filled = true, modifier = GlanceModifier.padding(5.dp))
        }
        Spacer(GlanceModifier.height(6.dp))
        Text(
            whenLabel(context, item, formats, now),
            style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WidgetColors.accent),
            maxLines = 1,
        )
        Text(
            item.title.name,
            style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold, color = WidgetColors.label),
            maxLines = 2,
        )
    }
}

@Composable
private fun Wide(items: List<ScheduledShowtime>, formats: Formats, thumbnails: Map<String, Bitmap>, now: Instant) {
    val context = LocalContext.current
    Column(GlanceModifier.fillMaxSize()) {
        Text(
            context.getString(R.string.android_widgetLabel),
            style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WidgetColors.secondary),
            maxLines = 1,
        )
        Spacer(GlanceModifier.height(4.dp))
        items.forEach { item ->
            Row(
                GlanceModifier.fillMaxWidth().height(40.dp).clickable(openTitle(context, item.title)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Thumbnail(thumbnails[item.title.key], GlanceModifier.size(48.dp, 32.dp))
                Spacer(GlanceModifier.width(10.dp))
                Column(GlanceModifier.defaultWeight()) {
                    Text(
                        item.title.name,
                        style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold, color = WidgetColors.label),
                        maxLines = 1,
                    )
                    Text(
                        whenLabel(context, item, formats, now),
                        style = TextStyle(fontSize = 12.sp, color = WidgetColors.secondary),
                        maxLines = 1,
                    )
                }
                Mark(item, filled = false, modifier = GlanceModifier.padding(start = 8.dp))
            }
        }
    }
}

/** A Title's thumbnail, or a grey stand-in until it's saved. */
@Composable
private fun Thumbnail(bitmap: Bitmap?, modifier: GlanceModifier) {
    val rounded = if (Build.VERSION.SDK_INT >= 31) modifier.cornerRadius(6.dp) else modifier
    if (bitmap != null) {
        Image(ImageProvider(bitmap), contentDescription = null, contentScale = ContentScale.Crop, modifier = rounded)
    } else {
        Box(rounded.background(WidgetColors.placeholder)) {}
    }
}

/**
 * Sold out or free, like the schedule's badges. [filled]: a solid pill, to sit on a thumbnail;
 * otherwise colored text at the end of a row.
 */
@Composable
private fun Mark(item: ScheduledShowtime, filled: Boolean, modifier: GlanceModifier = GlanceModifier) {
    val context = LocalContext.current
    val (text, color) = when {
        item.showtime.isSoldOut -> context.getString(R.string.badge_soldOut) to WidgetColors.soldOut
        item.showtime.booking?.free == true -> context.getString(
            if (item.title.kind == Title.Kind.Film) R.string.badge_freeFilm else R.string.badge_freeEvent,
        ) to WidgetColors.free
        else -> return
    }
    if (filled) {
        Box(modifier) {
            var pill = GlanceModifier.background(color).padding(horizontal = 7.dp, vertical = 2.dp)
            if (Build.VERSION.SDK_INT >= 31) pill = pill.cornerRadius(10.dp)
            Text(text, style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = WidgetColors.onBadge), maxLines = 1, modifier = pill)
        }
    } else {
        Text(text, style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color), maxLines = 1, modifier = modifier)
    }
}

/** "Today · 7:30 PM", "Thu, Nov 27 · 7:30 PM". */
private fun whenLabel(context: Context, item: ScheduledShowtime, formats: Formats, now: Instant): String {
    val day = item.showtime.startsAt.atZone(formats.zone).toLocalDate()
    return context.getString(R.string.android_widgetWhen, formats.dayLabel(day, now, short = true), formats.time(item.showtime.startsAt))
}

private fun openSchedule(context: Context): Action =
    actionStartActivity(appIntent(context).setAction(MainActivity.ACTION_SHOW_SCHEDULE))

private fun openTitle(context: Context, title: Title): Action =
    actionStartActivity(appIntent(context).setAction(Intent.ACTION_VIEW).setData(Uri.parse("ojaiplayhouse://title/${Uri.encode(title.slug)}")))

/** Into the app that's already open, if it is, rather than a second copy on top. */
private fun appIntent(context: Context) = Intent()
    .setComponent(ComponentName(context, MainActivity::class.java))
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
