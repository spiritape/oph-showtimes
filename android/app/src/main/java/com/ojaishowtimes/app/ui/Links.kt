package com.ojaishowtimes.app.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.CalendarContract
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.ui.graphics.toArgb
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.ScheduledShowtime
import com.ojaishowtimes.app.data.Theater
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/** The Playhouse's own visitor information (ios/Playhouse/PlayhouseInfoView.swift). */
object PlayhouseInfo {
    const val WEBSITE = "https://www.ojaiplayhouse.com"
    const val PHONE_URL = "tel:8056461011"
    const val EMAIL_URL = "mailto:info@ojaiplayhouse.com"
    const val ADDRESS = "145 E Ojai Ave, Ojai, CA 93023"
    /** Directions in the Google Maps app when it's installed, otherwise on the web. */
    const val GOOGLE_DIRECTIONS_URL =
        "https://www.google.com/maps/dir/?api=1&destination=Ojai%20Playhouse,%20145%20E%20Ojai%20Ave,%20Ojai,%20CA%2093023"
    /** Any maps app the phone has: a search for the Playhouse's address. */
    val GEO_URL: String = "geo:0,0?q=" + Uri.encode("Ojai Playhouse, $ADDRESS")
}

object Links {
    /**
     * A ticket, RSVP or Playhouse page in a Chrome Custom Tab, so buying a ticket doesn't
     * send people out of the app (the iOS app uses Safari's in-app view).
     */
    fun openInApp(context: Context, url: String, colors: AppColors) {
        val params = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(colors.background.toArgb())
            .setNavigationBarColor(colors.background.toArgb())
            .build()
        val intent = CustomTabsIntent.Builder()
            .setColorScheme(if (colors.isDark) CustomTabsIntent.COLOR_SCHEME_DARK else CustomTabsIntent.COLOR_SCHEME_LIGHT)
            .setDefaultColorSchemeParams(params)
            .setShowTitle(true)
            .build()
        try {
            intent.launchUrl(context, Uri.parse(url))
        } catch (e: ActivityNotFoundException) {
            open(context, url)
        }
    }

    /** Hands a link to whichever app handles it (Google Maps, Google Calendar, the dialer…). */
    fun open(context: Context, url: String, @StringRes failure: Int = R.string.android_noBrowser) {
        start(context, Intent(Intent.ACTION_VIEW, Uri.parse(url)), failure)
    }

    /** A geo: link, offering every maps app the phone has. */
    fun chooseMapsApp(context: Context, geoUrl: String) {
        val view = Intent(Intent.ACTION_VIEW, Uri.parse(geoUrl))
        start(context, Intent.createChooser(view, null), R.string.android_noMaps)
    }

    /** The share sheet, with [text] for messages and [subject] for email. */
    fun share(context: Context, text: String, subject: String? = null) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            subject?.let { putExtra(Intent.EXTRA_SUBJECT, it) }
        }
        start(context, Intent.createChooser(send, subject), R.string.android_noBrowser)
    }

    /** The phone's own calendar app, on its "new event" screen prefilled with the Showtime. */
    fun addToCalendar(context: Context, item: ScheduledShowtime, theater: Theater?) {
        val intent = Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, item.title.name)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, item.showtime.startsAt.toEpochMilli())
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, item.showtime.endsAt.toEpochMilli())
            // Android's event has no link field, so the Title's page goes in the description.
            .putExtra(CalendarContract.Events.DESCRIPTION, CalendarNotes.lines(context, item, includePage = true).joinToString("\n"))
        theater?.let {
            intent.putExtra(CalendarContract.Events.EVENT_LOCATION, "${it.name}, ${it.address}")
            intent.putExtra(CalendarContract.Events.EVENT_TIMEZONE, it.timeZone)
        }
        start(context, intent, R.string.android_noCalendar)
    }

    private fun start(context: Context, intent: Intent, @StringRes failure: Int) {
        try {
            context.startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(context, failure, Toast.LENGTH_SHORT).show()
        }
    }
}

/**
 * Google Calendar's "new event" screen, prefilled with a Showtime, like the website's link
 * (src/showtime.ts googleCalendarUrl; ios/Playhouse/GoogleCalendar.swift). Opens the Google
 * Calendar app if it's installed, otherwise the web page.
 */
object GoogleCalendar {
    fun url(context: Context, item: ScheduledShowtime, theater: Theater): String {
        val details = CalendarNotes.lines(context, item, includePage = true).joinToString("\n")
        return Uri.parse("https://calendar.google.com/calendar/render").buildUpon()
            .appendQueryParameter("action", "TEMPLATE")
            .appendQueryParameter("text", item.title.name)
            .appendQueryParameter("dates", "${stamp(item.showtime.startsAt)}/${stamp(item.showtime.endsAt)}")
            .appendQueryParameter("location", "${theater.name}, ${theater.address}")
            .appendQueryParameter("details", details)
            .build().toString()
    }

    /** UTC in the compact form calendars use, e.g. 20260929T020000Z. The "Z" matters: without it Google reads the time in the viewer's own zone. */
    fun stamp(instant: Instant): String = STAMP.format(instant)

    private val STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC)
}

/** The event description both calendars get (ios/Playhouse/AddToCalendarSheet.swift). */
object CalendarNotes {
    fun lines(context: Context, item: ScheduledShowtime, includePage: Boolean): List<String> {
        val showtime = item.showtime
        return listOfNotNull(
            if (showtime.isSoldOut) context.getString(R.string.calendar_soldOut) else null,
            showtime.displayPrice,
            showtime.booking?.let { "${it.label}: ${it.url}" },
            if (includePage) item.title.url else null,
        )
    }
}
