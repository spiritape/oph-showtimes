package com.ojaishowtimes.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.CacheControl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/** The one HTTP client the app uses, for the Feed, Film Requests and posters. */
object Http {
    val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    /** The body of a 200 response, or an IOException. */
    suspend fun get(url: String, noCache: Boolean = false): String = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url).apply { if (noCache) cacheControl(CacheControl.FORCE_NETWORK) }.build()
        client.newCall(request).execute().use { response ->
            if (response.code != 200) throw IOException("HTTP ${response.code}")
            response.body.string()
        }
    }

    /** POSTs JSON, throwing unless the response is a 200. */
    suspend fun postJson(url: String, json: String): String = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url).post(json.toRequestBody("application/json".toMediaType())).build()
        client.newCall(request).execute().use { response ->
            if (response.code != 200) throw IOException("HTTP ${response.code}")
            response.body.string()
        }
    }
}
