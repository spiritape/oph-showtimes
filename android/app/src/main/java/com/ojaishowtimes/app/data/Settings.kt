package com.ojaishowtimes.app.data

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.ojaishowtimes.app.R

/** How the app looks. Dark unless the person chooses otherwise. */
enum class Appearance(@StringRes val label: Int) {
    Dark(R.string.android_appearanceDark),
    Light(R.string.android_appearanceLight),
    System(R.string.android_appearanceSystem),
}

/**
 * The app's text size: the phone's own setting, or one chosen in Settings
 * (ios/Playhouse/TextSize.swift). [scale] is relative to the iOS Default size.
 */
enum class TextSize(@StringRes val label: Int, val scale: Float) {
    System(R.string.android_matchingPhone, 1f),
    Small(R.string.android_sizeSmall, 15f / 17f),
    Standard(R.string.android_sizeDefault, 1f),
    Large(R.string.android_sizeLarge, 19f / 17f),
    Larger(R.string.android_sizeLarger, 21f / 17f),
    Largest(R.string.android_sizeLargest, 23f / 17f);

    companion object {
        /** Until someone chooses: the smallest size, which suits the dense schedule. */
        val default = Small
        /** The sizes the Settings slider steps through, smallest first. */
        val steps = listOf(Small, Standard, Large, Larger, Largest)
    }
}

/** Appearance and text size, saved on the device. */
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var appearance by mutableStateOf(
        prefs.getString("appearance", null)?.let { runCatching { Appearance.valueOf(it) }.getOrNull() } ?: Appearance.Dark
    )
        private set

    var textSize by mutableStateOf(
        prefs.getString("textSize", null)?.let { runCatching { TextSize.valueOf(it) }.getOrNull() } ?: TextSize.default
    )
        private set

    fun updateAppearance(value: Appearance) {
        appearance = value
        prefs.edit().putString("appearance", value.name).apply()
    }

    fun updateTextSize(value: TextSize) {
        textSize = value
        prefs.edit().putString("textSize", value.name).apply()
    }
}
