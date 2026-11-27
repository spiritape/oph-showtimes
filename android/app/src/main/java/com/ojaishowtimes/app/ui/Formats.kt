package com.ojaishowtimes.app.ui

import android.content.Context
import android.text.format.DateFormat
import com.ojaishowtimes.app.R
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Dates and times in the theater's time zone, wherever the phone is, in the phone's language. */
class Formats(private val context: Context, val zone: ZoneId) {
    private val locale: Locale = context.resources.configuration.locales[0]
    private val is24Hour = DateFormat.is24HourFormat(context)

    private fun formatter(skeleton: String) =
        DateTimeFormatter.ofPattern(DateFormat.getBestDateTimePattern(locale, skeleton), locale).withZone(zone)

    private val dayLong = formatter("EEEEMMMd")
    private val dayShort = formatter("EEEMMMd")
    private val time = formatter(if (is24Hour) "Hm" else "hm")
    private val weekdayShort = formatter("EEE")
    private val dayOfMonth = formatter("d")
    private val monthShort = formatter("MMM")

    /** "Today", "Yesterday", "Tomorrow", or e.g. "Thursday, Nov 27" ("Thu, Nov 27" when [short]). */
    fun dayLabel(day: LocalDate, now: Instant = Instant.now(), short: Boolean = false): String {
        val today = now.atZone(zone).toLocalDate()
        return when (day) {
            today -> context.getString(R.string.android_today)
            today.minusDays(1) -> context.getString(R.string.android_yesterday)
            today.plusDays(1) -> context.getString(R.string.android_tomorrow)
            else -> (if (short) dayShort else dayLong).format(day.atStartOfDay(zone))
        }
    }

    /** "7:30 PM". */
    fun time(instant: Instant): String = time.format(instant)

    /** "7:30" and "PM", sized apart on the schedule rows. */
    fun timeParts(instant: Instant): Pair<String, String> {
        val text = time(instant)
        val split = text.indexOfFirst { it.isWhitespace() }
        return if (split < 0) text to "" else text.substring(0, split) to text.substring(split + 1).trim()
    }

    fun weekdayShort(instant: Instant): String = weekdayShort.format(instant)
    fun dayOfMonth(instant: Instant): String = dayOfMonth.format(instant)
    fun monthShort(instant: Instant): String = monthShort.format(instant)

    /** "Thursday, Nov 27 at 7:30 PM", for invitations. */
    fun inviteWhen(instant: Instant): String =
        context.getString(R.string.android_dateAtTime, dayLong.format(instant), time(instant))
}
