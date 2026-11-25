package com.ojaishowtimes.app.data

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.ojaishowtimes.app.R
import kotlinx.coroutines.CancellationException
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** A film from TMDB, as found by search or remembered in "Your requests". */
data class Film(val tmdbId: Int, val title: String, val year: String?, val posterUrl: String?) {
    fun toJson(): JSONObject = JSONObject()
        .put("tmdbId", tmdbId).put("title", title)
        .put("year", year ?: JSONObject.NULL).put("posterUrl", posterUrl ?: JSONObject.NULL)

    companion object {
        fun decode(json: JSONObject) = Film(json.getInt("tmdbId"), json.getString("title"), json.str("year"), json.str("posterUrl"))
    }
}

/**
 * Film Requests (see CONTEXT.md; ios/Playhouse/FilmRequests.swift): searching films and
 * requesting the ones someone would like the Playhouse to show. Only the Playhouse sees
 * what others asked for; this install remembers its own requests to show in "Your requests".
 */
class FilmRequests(private val context: Context) {
    private val prefs = context.getSharedPreferences("filmRequests", Context.MODE_PRIVATE)

    var results by mutableStateOf<List<Film>>(emptyList())
        private set
    var isSearching by mutableStateOf(false)
        private set
    /** This install's requests, most recent first. */
    var mine by mutableStateOf(loadMine())
        private set
    /** Films with a request or withdrawal on its way to the watcher. */
    var pending by mutableStateOf<Set<Int>>(emptySet())
        private set
    var message by mutableStateOf<String?>(null)

    /** When each of "Your requests" last came from TMDB, in epoch milliseconds. */
    private var fetchedAt: Map<Int, Long> = loadFetchedAt()

    /** Counts this install once per film; random, and not tied to the person. */
    private val installId: String = prefs.getString("installId", null)
        ?: UUID.randomUUID().toString().uppercase().also { prefs.edit().putString("installId", it).apply() }

    fun isRequested(film: Film) = mine.any { it.tmdbId == film.tmdbId }

    /**
     * Fetches "Your requests" again once they're five months old (or of unknown age), so this
     * install never keeps TMDB's data longer than the six months its terms allow.
     */
    suspend fun refreshMine() {
        val due = System.currentTimeMillis() - 150L * 86_400_000
        for (film in mine.toList()) {
            if ((fetchedAt[film.tmdbId] ?: 0L) >= due) continue
            val fresh = try {
                Film.decode(JSONObject(Http.get("$WATCHER/films/${film.tmdbId}")).getJSONObject("film"))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                continue // Try again next time.
            }
            mine = mine.map { if (it.tmdbId == fresh.tmdbId) fresh else it }
            fetchedAt = fetchedAt + (fresh.tmdbId to System.currentTimeMillis())
            save()
        }
    }

    suspend fun search(query: String) {
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            results = emptyList()
            return
        }
        isSearching = true
        try {
            val url = Uri.parse("$WATCHER/films/search").buildUpon().appendQueryParameter("q", trimmed).build().toString()
            results = JSONObject(Http.get(url)).getJSONArray("films").objects().map(Film::decode)
        } catch (e: CancellationException) {
            // A newer search replaced this one.
            throw e
        } catch (e: Exception) {
            message = context.getString(R.string.request_searchError)
        } finally {
            isSearching = false
        }
    }

    suspend fun request(film: Film) {
        if (isRequested(film) || film.tmdbId in pending) return
        pending = pending + film.tmdbId
        try {
            post("requests", film)
            mine = listOf(film) + mine
            fetchedAt = fetchedAt + (film.tmdbId to System.currentTimeMillis())
            save()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            message = context.getString(R.string.request_sendError)
        } finally {
            pending = pending - film.tmdbId
        }
    }

    suspend fun withdraw(film: Film) {
        pending = pending + film.tmdbId
        try {
            post("requests/withdraw", film)
            mine = mine.filterNot { it.tmdbId == film.tmdbId }
            fetchedAt = fetchedAt - film.tmdbId
            save()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            message = context.getString(R.string.request_withdrawError)
        } finally {
            pending = pending - film.tmdbId
        }
    }

    /** What a friend reads when someone shares a film they requested, above a link to ojaiplayhouse.com. */
    fun shareMessage(film: Film): String =
        context.getString(R.string.request_shareMessage, film.title, film.year?.let { " ($it)" } ?: "")

    private suspend fun post(path: String, film: Film) {
        Http.postJson("$WATCHER/$path", JSONObject().put("installId", installId).put("tmdbId", film.tmdbId).toString())
    }

    private fun loadMine(): List<Film> = runCatching {
        JSONArray(prefs.getString("mine", "[]")).objects().map(Film::decode)
    }.getOrDefault(emptyList())

    private fun loadFetchedAt(): Map<Int, Long> = runCatching {
        val json = JSONObject(prefs.getString("fetchedAt", "{}")!!)
        json.keys().asSequence().associate { it.toInt() to json.getLong(it) }
    }.getOrDefault(emptyMap())

    private fun save() {
        val fetched = JSONObject().apply { fetchedAt.forEach { (id, at) -> put(id.toString(), at) } }
        prefs.edit()
            .putString("mine", JSONArray(mine.map { it.toJson() }).toString())
            .putString("fetchedAt", fetched.toString())
            .apply()
    }

    companion object {
        const val WATCHER = "https://oph-showtimes-watcher.spiritapes.workers.dev"
        const val TMDB_URL = "https://www.themoviedb.org"
    }
}
