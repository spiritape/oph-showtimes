package com.ojaishowtimes.app.data

import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * The schedule as published by the site's build at `api/v1/schedule.json`
 * (src/feed.ts; ios/Shared/Feed.swift). New fields may appear; existing ones won't change.
 */
data class Feed(
    val version: Int,
    val generatedAt: Instant,
    val theater: Theater,
    /** Titles with at least one upcoming Showtime, soonest first. */
    val titles: List<Title>,
    /** Titles that played in the last 60 days, each with only its played Showtimes. */
    val past: List<Title>,
) {
    val zone: ZoneId = runCatching { ZoneId.of(theater.timeZone) }.getOrDefault(ZoneId.systemDefault())

    /** Every Showtime still listed at [now], soonest first. Like the site, a Showtime stays listed until 30 minutes after it starts. */
    fun listed(filter: ScheduleFilter = ScheduleFilter.Everything, now: Instant = Instant.now()): List<ScheduledShowtime> =
        titles.flatMap { title -> title.showtimes.map { ScheduledShowtime(title, it) } }
            .filter { !it.showtime.hasPlayed(now) && filter.includes(it) }
            .sortedBy { it.showtime.startsAt }

    /** Showtimes, already in order, grouped by day in the theater's time zone. */
    fun grouped(items: List<ScheduledShowtime>): List<ScheduleDay> {
        val days = mutableListOf<ScheduleDay>()
        for (item in items) {
            val day = item.showtime.startsAt.atZone(zone).toLocalDate()
            if (days.lastOrNull()?.day == day) {
                days[days.size - 1] = days.last().copy(showtimes = days.last().showtimes + item)
            } else {
                days += ScheduleDay(day, listOf(item))
            }
        }
        return days
    }

    /**
     * The whole schedule, oldest first: what played in the last 60 days, then what's coming
     * up, grouped by day in the theater's time zone.
     */
    fun timeline(filter: ScheduleFilter): List<ScheduleDay> {
        val current = titles.flatMap { title -> title.showtimes.map { ScheduledShowtime(title, it) } }
        val published = past.flatMap { title -> title.showtimes.map { ScheduledShowtime(title, it) } }
        val seen = HashSet<String>()
        val items = (current + published)
            .filter { seen.add(it.id) && filter.includes(it) }
            .sortedBy { it.showtime.startsAt }
        return grouped(items)
    }

    /** The Title to open from a past Showtime: the current one if it's still on the schedule, otherwise without its played Showtimes. */
    fun titleToOpen(title: Title): Title = titles.firstOrNull { it.key == title.key } ?: title.copy(showtimes = emptyList())

    fun title(key: String): Title? = titles.firstOrNull { it.key == key } ?: past.firstOrNull { it.key == key }

    companion object {
        const val URL = "https://ojaishowtimes.com/api/v1/schedule.json"

        fun decode(text: String): Feed {
            val json = JSONObject(text)
            val theater = json.getJSONObject("theater").let {
                Theater(it.getString("name"), it.getString("address"), it.getString("phone"), it.getString("timeZone"))
            }
            return Feed(
                version = json.getInt("version"),
                generatedAt = parseInstant(json.getString("generatedAt")),
                theater = theater,
                titles = json.getJSONArray("titles").objects().map(Title::decode),
                past = json.optJSONArray("past")?.objects()?.map(Title::decode).orEmpty(),
            )
        }
    }
}

data class Theater(val name: String, val address: String, val phone: String, val timeZone: String)

/** A Film or Live Show: anything that has Showtimes. */
data class Title(
    val key: String,
    val slug: String,
    val name: String,
    val subtitle: String?,
    val kind: Kind,
    val categoryLabel: String,
    val year: String?,
    val director: String?,
    val runtime: String?,
    val rating: String?,
    val starring: String?,
    val synopsis: String?,
    val about: List<AboutParagraph>,
    val imageUrl: String?,
    val thumbnailUrl: String?,
    val posterUrl: String?,
    val livestreamUrl: String?,
    /** The Title's page on the site, for sharing. */
    val url: String,
    /** The Title's page on ojaiplayhouse.com. */
    val sourceUrl: String?,
    /** Upcoming only, sorted by start time. */
    val showtimes: List<Showtime>,
) {
    enum class Kind { Film, LiveShow }

    /** The write-up to show: the full one, or just the synopsis from an older Feed. */
    val aboutParagraphs: List<AboutParagraph>
        get() = about.ifEmpty { listOfNotNull(synopsis?.let { AboutParagraph(it, false) }) }

    /** What the Playhouse set in bold (special guests, introductions, notices), shown up top under the name. */
    val highlights: List<String> get() = aboutParagraphs.filter { it.highlight }.map { it.text }

    /** The rest of the write-up, for the About section. */
    val writeUp: List<String> get() = aboutParagraphs.filterNot { it.highlight }.map { it.text }

    /** Whether a search matches: every word must appear in its name, subtitle, category or director, ignoring case and accents. */
    fun matches(query: String): Boolean {
        val words = query.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (words.isEmpty()) return true
        val haystack = fold(listOfNotNull(name, subtitle, categoryLabel, director).joinToString(" "))
        return words.all { haystack.contains(fold(it)) }
    }

    companion object {
        fun decode(json: JSONObject) = Title(
            key = json.getString("key"),
            slug = json.getString("slug"),
            name = json.getString("name"),
            subtitle = json.str("subtitle"),
            kind = if (json.getString("kind") == "liveShow") Kind.LiveShow else Kind.Film,
            categoryLabel = json.getString("categoryLabel"),
            year = json.str("year"),
            director = json.str("director"),
            runtime = json.str("runtime"),
            rating = json.str("rating"),
            starring = json.str("starring"),
            synopsis = json.str("synopsis"),
            about = json.optJSONArray("about")?.objects()?.map {
                AboutParagraph(it.getString("text"), it.optBoolean("highlight"))
            }.orEmpty(),
            imageUrl = json.str("imageUrl"),
            thumbnailUrl = json.str("thumbnailUrl"),
            posterUrl = json.str("posterUrl"),
            livestreamUrl = json.str("livestreamUrl"),
            url = json.getString("url"),
            sourceUrl = json.str("sourceUrl"),
            showtimes = json.getJSONArray("showtimes").objects().map(Showtime::decode),
        )
    }
}

/** One paragraph of the Playhouse's write-up. [highlight]: the Playhouse set it in bold. */
data class AboutParagraph(val text: String, val highlight: Boolean)

/** One scheduled occurrence of a Title. */
data class Showtime(
    val id: String,
    val startsAt: Instant,
    /** Estimated from the running time. */
    val endsAt: Instant,
    val price: String?,
    val booking: Booking?,
    /** Missing from Feeds published before it was added. */
    val soldOut: Boolean?,
) {
    data class Booking(val label: String, val url: String, val free: Boolean)

    /** Sold out, going by the feed, or by the price text for older saved Feeds. */
    val isSoldOut: Boolean
        get() = soldOut ?: (price?.let { SOLD_OUT_ANYWHERE.containsMatchIn(it) } == true)

    /** The price as written, without the sold-out note (shown as a badge instead). */
    val displayPrice: String?
        get() = (price ?: "").split("\n").map { it.trim() }
            .filter { it.isNotEmpty() && !SOLD_OUT_LINE.matches(it) }
            .takeIf { it.isNotEmpty() }?.joinToString(" · ")

    /** Over, as far as the schedule is concerned: 30 minutes after it starts. */
    fun hasPlayed(now: Instant = Instant.now()): Boolean = !startsAt.isAfter(now.minusSeconds(LISTED_AFTER_START_SECONDS))

    companion object {
        /** How long a Showtime stays listed after it starts, like the site. */
        const val LISTED_AFTER_START_SECONDS = 30L * 60
        private val SOLD_OUT_ANYWHERE = Regex("\\bsold[\\s-]*out\\b", RegexOption.IGNORE_CASE)
        private val SOLD_OUT_LINE = Regex("^sold[\\s-]*out\\W*$", RegexOption.IGNORE_CASE)

        fun decode(json: JSONObject) = Showtime(
            id = json.getString("id"),
            startsAt = parseInstant(json.getString("startsAt")),
            endsAt = parseInstant(json.getString("endsAt")),
            price = json.str("price"),
            booking = json.optJSONObject("booking")?.let {
                Booking(it.getString("label"), it.getString("url"), it.optBoolean("free"))
            },
            soldOut = if (json.has("soldOut") && !json.isNull("soldOut")) json.getBoolean("soldOut") else null,
        )
    }
}

/** A Showtime together with the Title it belongs to. */
data class ScheduledShowtime(val title: Title, val showtime: Showtime) {
    val id: String get() = showtime.id
}

/** The Showtimes of one day, in the theater's time zone. */
data class ScheduleDay(val day: LocalDate, val showtimes: List<ScheduledShowtime>) {
    val id: String get() = day.toString()
}

/** Which Titles the schedule shows, matching the site's filters. */
enum class ScheduleFilter {
    Everything, Films, LiveShows, Free;

    fun includes(item: ScheduledShowtime): Boolean = when (this) {
        Everything -> true
        Films -> item.title.kind == Title.Kind.Film
        LiveShows -> item.title.kind == Title.Kind.LiveShow
        Free -> item.showtime.booking?.free == true
    }
}

/** Only the Showtimes whose Title matches the search, dropping days left empty. */
fun List<ScheduleDay>.matching(query: String): List<ScheduleDay> {
    if (query.isBlank()) return this
    return mapNotNull { day ->
        day.copy(showtimes = day.showtimes.filter { it.title.matches(query) }).takeIf { it.showtimes.isNotEmpty() }
    }
}

/** Lowercased with accents removed, for searching. */
private fun fold(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "").lowercase()

/** A string field, or null when missing or JSON null (org.json's optString would give "null"). */
internal fun JSONObject.str(key: String): String? = if (has(key) && !isNull(key)) getString(key) else null

internal fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }

/** An ISO date, with "Z" or an offset. */
internal fun parseInstant(text: String): Instant =
    runCatching { Instant.parse(text) }.getOrElse { java.time.OffsetDateTime.parse(text).toInstant() }
