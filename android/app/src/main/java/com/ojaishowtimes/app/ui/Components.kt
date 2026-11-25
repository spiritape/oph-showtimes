package com.ojaishowtimes.app.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.ScheduleFilter
import com.ojaishowtimes.app.data.Showtime
import com.ojaishowtimes.app.data.Title

/**
 * The filter chips' look for the top bar's Request and Info buttons: footnote semibold on a
 * grey capsule exactly a chip's height (ios/Playhouse/ScheduleView.swift Chip).
 */
@Composable
fun BarChip(
    text: String,
    icon: @Composable () -> Unit,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier
            .clip(CircleShape)
            .clickable(onClickLabel = contentDescription, role = Role.Button, onClick = onClick)
            .background(colors.fill2, CircleShape)
            .heightIn(min = 28.dp.scaled())
            .padding(horizontal = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        icon()
        Text(text, style = AppType.footnote, fontWeight = FontWeight.SemiBold, color = colors.label, maxLines = 1)
    }
}

/** All / Movies / Live Shows / Free, pinned above the schedule. Scrolls sideways when the screen is too narrow. */
@Composable
fun FilterChips(selection: ScheduleFilter, onSelect: (ScheduleFilter) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val haptics = LocalHapticFeedback.current
    BoxWithConstraints(modifier.fillMaxWidth().background(colors.background).padding(vertical = 2.dp)) {
        Row(
            Modifier
                .align(Alignment.Center)
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            ScheduleFilter.entries.forEach { filter ->
                val selected = filter == selection
                val fill by animateColorAsState(if (selected) colors.softBlue else colors.fill2, label = "chip")
                Box(
                    Modifier
                        .selectable(selected = selected, role = Role.Tab) {
                            if (!selected) haptics.performHapticFeedback(HapticFeedbackType.SegmentTick)
                            onSelect(filter)
                        }
                        // A tap a little outside the chip still counts.
                        .padding(horizontal = 3.dp, vertical = 4.dp)
                        .background(fill, CircleShape)
                        .padding(horizontal = 13.dp, vertical = 7.dp),
                ) {
                    Text(
                        stringResource(filter.label),
                        style = AppType.footnote,
                        fontWeight = FontWeight.SemiBold,
                        color = if (selected) Color.White else colors.label,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

val ScheduleFilter.label: Int
    get() = when (this) {
        ScheduleFilter.Everything -> R.string.filter_all
        ScheduleFilter.Films -> R.string.filter_movies
        ScheduleFilter.LiveShows -> R.string.filter_live
        ScheduleFilter.Free -> R.string.filter_free
    }

/**
 * Shows at a glance whether a Showtime is sold out, free (an RSVP) or needs a ticket
 * (ios/Playhouse/BookingBadge.swift). [short]: for the schedule rows, no ticket icon, since
 * the row's Tickets pill says that.
 */
@Composable
fun BookingBadge(showtime: Showtime, kind: Title.Kind, short: Boolean = false) {
    val colors = AppTheme.colors
    val booking = showtime.booking
    when {
        showtime.isSoldOut -> Row(
            Modifier.background(colors.red.copy(alpha = 0.15f), CircleShape).padding(horizontal = 7.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Icon(Icons.Filled.ConfirmationNumber, null, tint = colors.red, modifier = Modifier.size(12.dp.scaled()))
            Text(stringResource(R.string.badge_soldOut), style = AppType.caption, fontWeight = FontWeight.SemiBold, color = colors.red, maxLines = 1)
        }
        booking != null && booking.free -> Text(
            stringResource(if (kind == Title.Kind.Film) R.string.badge_freeFilm else R.string.badge_freeEvent),
            style = AppType.caption,
            fontWeight = FontWeight.SemiBold,
            color = colors.softGreen,
            maxLines = 1,
            modifier = Modifier.background(colors.softGreen.copy(alpha = 0.18f), CircleShape).padding(horizontal = 7.dp, vertical = 2.dp),
        )
        booking != null && !short -> Icon(
            Icons.Filled.ConfirmationNumber,
            contentDescription = null,
            tint = colors.accent,
            modifier = Modifier.size(14.dp.scaled()),
        )
    }
}

/** The pill at the top right of a schedule row, so it's plain that a row opens its Title. Not a button itself: the whole row is. */
@Composable
fun OpenTitleLabel(text: String, quiet: Boolean, free: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val fill = when {
        quiet -> colors.fill3
        free -> colors.softGreen
        else -> colors.softBlue
    }
    Text(
        text,
        style = AppType.footnote,
        fontWeight = FontWeight.SemiBold,
        color = if (quiet) colors.secondaryLabel else Color.White,
        textAlign = TextAlign.Center,
        maxLines = 1,
        overflow = TextOverflow.Clip,
        modifier = modifier.fillMaxWidth().background(fill, CircleShape).padding(horizontal = 6.dp, vertical = 6.dp),
    )
}

/** The film's TMDB poster in the schedule list, or the Playhouse's image cropped to the same shape. */
@Composable
fun RowPoster(title: Title, width: Dp) {
    Box(
        Modifier
            .width(width)
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(4.dp))
            .background(AppTheme.colors.fill3),
    ) {
        AsyncImage(
            model = title.posterUrl ?: title.thumbnailUrl ?: title.imageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
    }
}

/** A grouped list section, like iOS's inset grouped Form: rows on a rounded card, with an optional header and footer. */
@Composable
fun GroupedSection(
    modifier: Modifier = Modifier,
    header: (@Composable () -> Unit)? = null,
    footer: (@Composable () -> Unit)? = null,
    rows: List<@Composable () -> Unit>,
) {
    val colors = AppTheme.colors
    Column(modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        if (header != null) {
            Box(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 6.dp)) { header() }
        }
        if (rows.isNotEmpty()) {
            Column(Modifier.clip(RoundedCornerShape(12.dp)).background(colors.groupedSurface)) {
                rows.forEachIndexed { index, row ->
                    if (index > 0) HorizontalDivider(Modifier.padding(start = 16.dp), thickness = 0.5.dp, color = colors.separator)
                    row()
                }
            }
        }
        if (footer != null) {
            Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 6.dp)) { footer() }
        }
        Spacer(Modifier.padding(bottom = 22.dp))
    }
}

/** A row of a grouped section: padding and a minimum height like iOS's. */
@Composable
fun GroupedRow(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    onClickLabel: String? = null,
    padding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 11.dp),
    content: @Composable () -> Unit,
) {
    Box(
        modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClickLabel = onClickLabel, role = Role.Button, onClick = onClick) else Modifier)
            .heightIn(min = 44.dp)
            .padding(padding),
        contentAlignment = Alignment.CenterStart,
    ) { content() }
}

/** Footnote text in grey, for section footers. */
@Composable
fun FooterText(text: String) {
    Text(text, style = AppType.footnote, color = AppTheme.colors.secondaryLabel)
}
