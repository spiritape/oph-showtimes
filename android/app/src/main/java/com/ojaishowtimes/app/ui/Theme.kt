package com.ojaishowtimes.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import com.ojaishowtimes.app.data.TextSize

/**
 * The app's colors (ios/Playhouse/Theme.swift). Dark is the violet-tinted near-black of the
 * Film Requests page, with cards a shade lighter; light mode uses white and iOS's system greys.
 */
@Immutable
data class AppColors(
    val isDark: Boolean,
    /** Behind the schedule and Title pages. */
    val background: Color,
    /** Behind grouped lists (Settings, Request a Movie). */
    val groupedBackground: Color,
    /** Showtime cards on a Title page. */
    val surface: Color,
    /** Rows of grouped lists. */
    val groupedSurface: Color,
    /** The Playhouse's blue: #0032E4 in light mode, lifted to #4A66FF in dark. */
    val accent: Color,
    val label: Color,
    val secondaryLabel: Color,
    /** iOS's secondary, tertiary and quaternary system fills. */
    val fill2: Color,
    val fill3: Color,
    val fill4: Color,
    val separator: Color,
) {
    /** The Ojai Playhouse's blue lifted to a softer shade, for Tickets buttons, pills and the selected filter. */
    val softBlue: Color get() = SoftBlue
    /** Free RSVPs: the RSVP buttons and pills, and the Free Screening badge. */
    val softGreen: Color get() = SoftGreen
    val red: Color get() = if (isDark) Color(0xFFFF453A) else Color(0xFFFF3B30)

    companion object {
        val SoftBlue = Color(0xFF4A66FF)
        val SoftGreen = Color(0xFF2F9A55)

        val Dark = AppColors(
            isDark = true,
            background = Color(0xFF111018),
            groupedBackground = Color(0xFF111018),
            surface = Color(0xFF1D1B28),
            groupedSurface = Color(0xFF1D1B28),
            accent = Color(0xFF4A66FF),
            label = Color.White,
            secondaryLabel = Color(0x99EBEBF5),
            fill2 = Color(0x52787880),
            fill3 = Color(0x3D767680),
            fill4 = Color(0x2E767680),
            separator = Color(0x99545458),
        )

        val Light = AppColors(
            isDark = false,
            background = Color.White,
            groupedBackground = Color(0xFFF2F2F7),
            surface = Color(0xFFF2F2F7),
            groupedSurface = Color.White,
            accent = Color(0xFF0032E4),
            label = Color.Black,
            secondaryLabel = Color(0x993C3C43),
            fill2 = Color(0x29787880),
            fill3 = Color(0x1F767680),
            fill4 = Color(0x14747480),
            separator = Color(0x4A3C3C43),
        )
    }
}

/** iOS's text styles at its Default size; the chosen text size scales them all. */
@Immutable
object AppType {
    val largeTitle = style(34f, 41f)
    val title = style(28f, 34f)
    val title2 = style(22f, 28f)
    val title3 = style(20f, 25f)
    val headline = style(17f, 22f, FontWeight.SemiBold)
    val body = style(17f, 22f)
    val callout = style(16f, 21f)
    val subheadline = style(15f, 20f)
    val footnote = style(13f, 18f)
    val caption = style(12f, 16f)
    val caption2 = style(11f, 13f)

    private fun style(size: Float, line: Float, weight: FontWeight = FontWeight.Normal) =
        TextStyle(fontSize = size.sp, lineHeight = line.sp, fontWeight = weight)
}

val LocalAppColors = staticCompositionLocalOf { AppColors.Dark }

object AppTheme {
    val colors: AppColors
        @Composable @ReadOnlyComposable get() = LocalAppColors.current
}

/** A size that grows with the text size, like SwiftUI's @ScaledMetric. */
@Composable
@ReadOnlyComposable
fun Dp.scaled(): Dp = this * LocalDensity.current.fontScale

@Composable
fun PlayhouseTheme(dark: Boolean, textSize: TextSize, content: @Composable () -> Unit) {
    val colors = if (dark) AppColors.Dark else AppColors.Light
    val scheme = if (dark) {
        darkColorScheme(
            primary = colors.accent,
            onPrimary = Color.White,
            secondary = colors.softGreen,
            background = colors.background,
            onBackground = colors.label,
            surface = colors.background,
            onSurface = colors.label,
            onSurfaceVariant = colors.secondaryLabel,
            surfaceContainer = colors.surface,
            surfaceContainerLow = colors.groupedBackground,
            surfaceContainerHigh = colors.surface,
            surfaceContainerHighest = Color(0xFF2A2838),
            surfaceVariant = colors.surface,
            outline = colors.separator,
            outlineVariant = colors.separator,
            error = colors.red,
        )
    } else {
        lightColorScheme(
            primary = colors.accent,
            onPrimary = Color.White,
            secondary = colors.softGreen,
            background = colors.background,
            onBackground = colors.label,
            surface = colors.background,
            onSurface = colors.label,
            onSurfaceVariant = colors.secondaryLabel,
            surfaceContainer = Color.White,
            surfaceContainerLow = colors.groupedBackground,
            surfaceContainerHigh = Color.White,
            surfaceContainerHighest = Color(0xFFE5E5EA),
            surfaceVariant = colors.surface,
            outline = colors.separator,
            outlineVariant = colors.separator,
            error = colors.red,
        )
    }
    val density = LocalDensity.current
    val systemScale = LocalConfiguration.current.fontScale
    // A fixed size ignores the phone's own font size, as on iOS; Match Phone Setting follows it.
    val fontScale = if (textSize == TextSize.System) systemScale else textSize.scale
    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalDensity provides Density(density.density, fontScale),
    ) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
