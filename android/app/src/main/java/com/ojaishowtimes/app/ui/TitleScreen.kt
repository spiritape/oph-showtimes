package com.ojaishowtimes.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.PersonAddAlt
import androidx.compose.material.icons.outlined.Podcasts
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.Feed
import com.ojaishowtimes.app.data.ScheduledShowtime
import com.ojaishowtimes.app.data.Showtime
import com.ojaishowtimes.app.data.Title

/** A Film or Live Show (ios/Playhouse/TitleView.swift): the still, the facts, the Showtimes with tickets, then About. */
@Composable
fun TitleScreen(title: Title, feed: Feed?, onBack: () -> Unit) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val formats = rememberFormats(feed)

    Column(Modifier.fillMaxSize().background(colors.background)) {
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().height(56.dp).padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.android_back), tint = colors.accent)
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { Links.share(context, title.url, title.name) }) {
                Icon(Icons.Outlined.Share, stringResource(R.string.android_share), tint = colors.accent)
            }
        }
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Showtimes come straight after the name, so tickets are close to the top; the write-up follows.
            TitleHeader(title)
            Showtimes(title, feed, formats)
            title.livestreamUrl?.let { url ->
                OutlinedButton(onClick = { Links.openInApp(context, url, colors) }) {
                    Icon(Icons.Outlined.Podcasts, null, tint = colors.accent, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.title_livestream), style = AppType.callout, color = colors.accent)
                }
            }
            About(title)
            Spacer(Modifier.height(12.dp))
            Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }
}

/** The Playhouse's still, then the name and details, centered. */
@Composable
private fun TitleHeader(title: Title) {
    val colors = AppTheme.colors
    Column(
        Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        title.imageUrl?.let { url ->
            AsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.FillWidth,
                modifier = Modifier
                    .widthIn(max = 560.dp)
                    .fillMaxWidth()
                    .padding(bottom = 6.dp)
                    .shadow(12.dp, RoundedCornerShape(4.dp), ambientColor = Color.Black.copy(alpha = 0.25f), spotColor = Color.Black.copy(alpha = 0.25f))
                    .clip(RoundedCornerShape(4.dp))
                    .background(colors.fill4),
            )
        }
        Text(title.name, style = AppType.title, fontWeight = FontWeight.Bold, color = colors.label, textAlign = TextAlign.Center)
        title.subtitle?.let { Text(it, style = AppType.title3, color = colors.secondaryLabel, textAlign = TextAlign.Center) }
        val facts = listOfNotNull(
            title.year,
            title.director?.let { stringResource(R.string.android_dirPrefix, it) },
            title.runtime,
            title.rating,
        ).joinToString(" · ")
        if (facts.isNotEmpty()) Text(facts, style = AppType.subheadline, color = colors.secondaryLabel, textAlign = TextAlign.Center)
        title.starring?.let {
            Text(stringResource(R.string.title_starring, it), style = AppType.subheadline, color = colors.secondaryLabel, textAlign = TextAlign.Center)
        }
        // What the Playhouse set in bold: special guests, introductions, notices.
        if (title.highlights.isNotEmpty()) {
            Column(
                Modifier.padding(top = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                title.highlights.forEach {
                    Text(it, style = AppType.callout, fontWeight = FontWeight.SemiBold, color = colors.label, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
private fun Showtimes(title: Title, feed: Feed?, formats: Formats) {
    val colors = AppTheme.colors
    Column(Modifier.widthIn(max = 560.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.title_showtimes), style = AppType.title2, fontWeight = FontWeight.Bold, color = colors.label)
        if (title.showtimes.isEmpty()) {
            Text(stringResource(R.string.title_nothing), style = AppType.body, color = colors.secondaryLabel)
        }
        title.showtimes.forEach { ShowtimeCard(title, it, feed, formats) }
    }
}

/** A date block, the time and price, Add to Calendar, and a full-width Tickets/RSVP button with Invite a friend. */
@Composable
private fun ShowtimeCard(title: Title, showtime: Showtime, feed: Feed?, formats: Formats) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val item = ScheduledShowtime(title, showtime)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(colors.surface).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(
                Modifier
                    .width(56.dp.scaled())
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.fill3)
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(formats.weekdayShort(showtime.startsAt).uppercase(), style = AppType.caption2, fontWeight = FontWeight.Bold, color = colors.accent)
                Text(formats.dayOfMonth(showtime.startsAt), style = AppType.title2, fontWeight = FontWeight.Bold, color = colors.label)
                Text(formats.monthShort(showtime.startsAt).uppercase(), style = AppType.caption2, fontWeight = FontWeight.SemiBold, color = colors.secondaryLabel)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(formats.time(showtime.startsAt), style = AppType.headline, color = colors.label, maxLines = 1)
                    BookingBadge(showtime, title.kind)
                }
                showtime.displayPrice?.let { Text(it, style = AppType.subheadline, color = colors.secondaryLabel) }
            }
            CalendarMenu(item, feed)
        }
        val invites = !showtime.hasPlayed() && !showtime.isSoldOut
        val booking = showtime.booking
        if (booking != null || invites) {
            // Side by side; stacked when the text is too large to fit.
            val stacked = androidx.compose.ui.platform.LocalDensity.current.fontScale > 1.15f
            val buttons: @Composable (Modifier, Modifier) -> Unit = { bookingModifier, inviteModifier ->
                if (booking != null) {
                    val label = when {
                        showtime.isSoldOut -> stringResource(R.string.title_soldOut)
                        booking.free -> stringResource(R.string.title_rsvpFree)
                        else -> booking.label
                    }
                    // Sold out: still opens the ticket page, in case seats come back.
                    Button(
                        onClick = { Links.openInApp(context, booking.url, colors) },
                        modifier = bookingModifier,
                        shape = CircleShape,
                        colors = if (showtime.isSoldOut) {
                            ButtonDefaults.buttonColors(containerColor = colors.fill2, contentColor = colors.secondaryLabel)
                        } else {
                            ButtonDefaults.buttonColors(containerColor = if (booking.free) colors.softGreen else colors.softBlue, contentColor = Color.White)
                        },
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    ) {
                        Text(label, style = AppType.headline, maxLines = 1)
                    }
                }
                if (invites) {
                    InviteButton(title, showtime, formats, inviteModifier)
                }
            }
            if (stacked) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    buttons(Modifier.fillMaxWidth(), Modifier.fillMaxWidth())
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    buttons(Modifier.weight(1f), if (booking == null) Modifier.weight(1f) else Modifier)
                }
            }
        }
    }
}

/**
 * Shares the Title's own ojaiplayhouse.com page by text, email or any app, with a line naming
 * this Showtime. Outlined in the text color, so Tickets stays the one colored button.
 */
@Composable
private fun InviteButton(title: Title, showtime: Showtime, formats: Formats, modifier: Modifier) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val message = stringResource(R.string.title_inviteMessage, title.name, formats.inviteWhen(showtime.startsAt))
    val link = title.sourceUrl ?: title.url
    Button(
        onClick = { Links.share(context, "$message\n$link", title.name) },
        modifier = modifier,
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(containerColor = colors.fill2, contentColor = colors.label),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Icon(Icons.Outlined.PersonAddAlt, null, modifier = Modifier.size(18.dp.scaled()))
        Spacer(Modifier.width(6.dp))
        Text(stringResource(R.string.title_invite), style = AppType.headline, maxLines = 1)
    }
}

/** Add to Calendar: the phone's calendar app or Google Calendar. A blue calendar with a green plus. */
@Composable
private fun CalendarMenu(item: ScheduledShowtime, feed: Feed?) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) {
            Box(Modifier.size(28.dp.scaled())) {
                Icon(
                    Icons.Outlined.CalendarMonth,
                    contentDescription = stringResource(R.string.android_addToCalendar),
                    tint = colors.softBlue,
                    modifier = Modifier.size(26.dp.scaled()),
                )
                Box(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .offset(x = 3.dp, y = 3.dp)
                        .size(14.dp.scaled())
                        .background(colors.surface, CircleShape)
                        .padding(1.5.dp)
                        .background(colors.softGreen, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Add, null, tint = Color.White, modifier = Modifier.size(10.dp.scaled()))
                }
            }
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.title_appleCal), style = AppType.body) },
                leadingIcon = { Icon(Icons.Outlined.CalendarMonth, null) },
                onClick = {
                    open = false
                    Links.addToCalendar(context, item, feed?.theater)
                },
            )
            feed?.theater?.let { theater ->
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.title_googleCal), style = AppType.body) },
                    leadingIcon = { Icon(Icons.Outlined.Language, null) },
                    onClick = {
                        open = false
                        Links.open(context, GoogleCalendar.url(context, item, theater))
                    },
                )
            }
        }
    }
}

/** The rest of what the Playhouse wrote, in its order, then a link to its own page. */
@Composable
private fun About(title: Title) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val paragraphs = title.writeUp
    if (paragraphs.isEmpty() && title.sourceUrl == null) return
    Column(Modifier.widthIn(max = 560.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (paragraphs.isNotEmpty()) {
            Text(stringResource(R.string.title_about), style = AppType.title2, fontWeight = FontWeight.Bold, color = colors.label)
        }
        paragraphs.forEach {
            Text(it, style = AppType.body.copy(lineHeight = AppType.body.lineHeight * 1.15f), color = colors.label)
        }
        title.sourceUrl?.let { url ->
            TextButton(onClick = { Links.openInApp(context, url, colors) }, contentPadding = PaddingValues(0.dp)) {
                Icon(Icons.Outlined.Language, null, tint = colors.accent, modifier = Modifier.size(18.dp.scaled()))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.title_more), style = AppType.subheadline, color = colors.accent)
            }
        }
    }
}
