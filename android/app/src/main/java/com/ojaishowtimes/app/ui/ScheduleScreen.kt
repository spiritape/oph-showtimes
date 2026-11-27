package com.ojaishowtimes.app.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.Feed
import com.ojaishowtimes.app.data.FeedStore
import com.ojaishowtimes.app.data.ScheduleDay
import com.ojaishowtimes.app.data.ScheduleFilter
import com.ojaishowtimes.app.data.ScheduledShowtime
import com.ojaishowtimes.app.data.matching
import kotlinx.coroutines.launch
import java.time.Instant

/** The schedule (ios/Playhouse/ScheduleView.swift): logo header with Request and Info chips, filters, the list and search. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    store: FeedStore,
    onOpenTitle: (com.ojaishowtimes.app.data.Title) -> Unit,
    onRequest: () -> Unit,
    onInfo: () -> Unit,
) {
    val colors = AppTheme.colors
    var filter by rememberSaveable { mutableStateOf(ScheduleFilter.Everything) }
    var query by rememberSaveable { mutableStateOf("") }
    /** Bumped by tapping the logo: scrolls the schedule back to today. */
    var backToToday by remember { mutableIntStateOf(0) }
    var pulling by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val feed = store.feed

    Box(Modifier.fillMaxSize().background(colors.background)) {
        Column(Modifier.fillMaxSize()) {
            Header(onLogo = { backToToday++ }, onRequest = onRequest, onInfo = onInfo)
            // Pinned, so the filters are in reach wherever the list is scrolled.
            if (feed != null) FilterChips(filter, { filter = it })
            PullToRefreshBox(
                isRefreshing = pulling,
                onRefresh = {
                    scope.launch {
                        pulling = true
                        store.refresh()
                        pulling = false
                    }
                },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) {
                when {
                    feed != null -> {
                        val now = remember(feed, filter, query) { Instant.now() }
                        val days = remember(feed, filter, query) { feed.timeline(filter).matching(query) }
                        val searching = query.isNotBlank()
                        // A fresh list for each filter, as on iOS.
                        key(filter) {
                            ScheduleList(
                                feed = feed,
                                days = days,
                                now = now,
                                error = store.error,
                                emptyText = if (searching) stringResource(R.string.schedule_noResults, query) else stringResource(R.string.schedule_nothing),
                                query = query,
                                backToToday = backToToday,
                                onOpenTitle = onOpenTitle,
                            )
                        }
                    }
                    store.error != null -> NoSchedule(store.error!!) { scope.launch { store.refresh() } }
                    else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = colors.accent)
                    }
                }
            }
        }
        if (feed != null) {
            SearchField(
                query = query,
                onQueryChange = { query = it },
                modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().imePadding(),
            )
        }
    }
}

/** The Playhouse's stacked logo in the middle, as tall as the bar allows, with Request and Info drawn like the filter chips. */
@Composable
private fun Header(onLogo: () -> Unit, onRequest: () -> Unit, onInfo: () -> Unit) {
    val colors = AppTheme.colors
    Box(
        Modifier
            .fillMaxWidth()
            .background(colors.background)
            .statusBarsPadding()
            .height(56.dp)
            .padding(horizontal = 16.dp),
    ) {
        BarChip(
            text = stringResource(R.string.schedule_request),
            icon = { Icon(painterResource(R.drawable.ic_popcorn), null, tint = colors.label, modifier = Modifier.size(16.dp.scaled())) },
            contentDescription = stringResource(R.string.android_requestDescription),
            onClick = onRequest,
            modifier = Modifier.align(Alignment.CenterStart),
        )
        val logoDescription = stringResource(R.string.android_logoDescription)
        Image(
            painter = painterResource(R.drawable.logo),
            contentDescription = null,
            colorFilter = ColorFilter.tint(colors.accent),
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .align(Alignment.Center)
                .height(44.dp)
                .clickable(role = Role.Button, onClick = onLogo)
                .semantics { contentDescription = logoDescription },
        )
        BarChip(
            text = stringResource(R.string.schedule_info),
            icon = { Icon(Icons.Outlined.Info, null, tint = colors.label, modifier = Modifier.size(16.dp.scaled())) },
            contentDescription = stringResource(R.string.android_infoDescription),
            onClick = onInfo,
            modifier = Modifier.align(Alignment.CenterEnd),
        )
    }
}

/** One line of the schedule list. */
private sealed interface Entry {
    data class Message(val text: String) : Entry
    data class Header(val day: ScheduleDay, val played: Boolean) : Entry
    data class Row(val item: ScheduledShowtime, val played: Boolean, val last: Boolean) : Entry
}

/**
 * The schedule, oldest first, opening at today (or the next day with Showtimes) so earlier
 * days are a scroll up. Stays hidden until it's in place, so it never shows the wrong part first.
 */
@Composable
private fun ScheduleList(
    feed: Feed,
    days: List<ScheduleDay>,
    now: Instant,
    error: String?,
    emptyText: String,
    query: String,
    backToToday: Int,
    onOpenTitle: (com.ojaishowtimes.app.data.Title) -> Unit,
) {
    val colors = AppTheme.colors
    val formats = rememberFormats(feed)
    val entries = remember(days, error, emptyText, now) {
        buildList {
            if (error != null) add(Entry.Message(error))
            if (days.isEmpty()) add(Entry.Message(emptyText))
            for (day in days) {
                add(Entry.Header(day, day.showtimes.all { it.showtime.hasPlayed(now) }))
                day.showtimes.forEachIndexed { i, item ->
                    add(Entry.Row(item, item.showtime.hasPlayed(now), i == day.showtimes.lastIndex))
                }
            }
        }
    }
    val firstUpcoming = entries.indexOfFirst { it is Entry.Header && !it.played }.takeIf { it >= 0 }
    val listState = rememberLazyListState()
    var positioned by rememberSaveable { mutableStateOf(false) }
    val alpha by animateFloatAsState(if (positioned) 1f else 0f, tween(150), label = "positioned")

    LaunchedEffect(Unit) {
        // Only the first time: coming back from a Title keeps the place in the list.
        if (!positioned) {
            firstUpcoming?.let { listState.scrollToItem(it) }
            positioned = true
        }
    }
    var lastQuery by remember { mutableStateOf(query) }
    LaunchedEffect(query) {
        if (query != lastQuery) {
            lastQuery = query
            firstUpcoming?.let { listState.scrollToItem(it) } ?: listState.scrollToItem(0)
        }
    }
    var lastBackToToday by remember { mutableIntStateOf(backToToday) }
    LaunchedEffect(backToToday) {
        if (backToToday != lastBackToToday) {
            lastBackToToday = backToToday
            firstUpcoming?.let { listState.animateScrollToItem(it) }
        }
    }

    val posterWidth = 52.dp.scaled()
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize().alpha(alpha),
        contentPadding = PaddingValues(bottom = 76.dp),
    ) {
        for (entry in entries) {
            when (entry) {
                is Entry.Message -> item {
                    Text(
                        entry.text,
                        style = AppType.footnote,
                        color = colors.secondaryLabel,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    )
                }
                is Entry.Header -> stickyHeader(key = entry.day.id) {
                    Text(
                        formats.dayLabel(entry.day.day, now),
                        style = AppType.subheadline,
                        fontWeight = FontWeight.Bold,
                        color = if (entry.played) colors.secondaryLabel else colors.softBlue,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.background)
                            .padding(horizontal = 20.dp, vertical = 6.dp)
                            .semantics { heading() },
                    )
                }
                is Entry.Row -> item(key = entry.item.id) {
                    Column {
                        ShowtimeRow(
                            item = entry.item,
                            formats = formats,
                            played = entry.played,
                            posterWidth = posterWidth,
                            onClick = { onOpenTitle(if (entry.played) feed.titleToOpen(entry.item.title) else entry.item.title) },
                        )
                        if (!entry.last) {
                            HorizontalDivider(
                                Modifier.padding(start = 20.dp + posterWidth + 12.dp),
                                thickness = 0.5.dp,
                                color = colors.separator,
                            )
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars)) }
    }
}

@Composable
fun rememberFormats(feed: Feed?): Formats {
    val context = LocalContext.current
    val zone = feed?.zone ?: java.time.ZoneId.systemDefault()
    return remember(context, zone) { Formats(context, zone) }
}

/** The poster, the name, director and year, and on the right the time over the Tickets / RSVP / Details pill. */
@Composable
private fun ShowtimeRow(
    item: ScheduledShowtime,
    formats: Formats,
    played: Boolean,
    posterWidth: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit,
) {
    val colors = AppTheme.colors
    val title = item.title
    val showtime = item.showtime
    val booking = showtime.booking
    val soldOut = showtime.isSoldOut
    val ticketed = !played && !soldOut && booking != null && !booking.free
    val freeRsvp = !played && !soldOut && booking?.free == true
    val openLabel = when {
        played || soldOut || booking == null -> stringResource(R.string.row_details)
        booking.free -> stringResource(R.string.row_rsvp)
        else -> stringResource(R.string.row_tickets)
    }
    val description = listOfNotNull(
        title.name,
        title.categoryLabel,
        if (ticketed) stringResource(R.string.android_ticketed) else null,
        if (freeRsvp) stringResource(R.string.android_freeRsvp) else null,
        formats.time(showtime.startsAt),
    ).joinToString(", ")

    Row(
        Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onClick)
            .alpha(if (played) 0.45f else 1f)
            .padding(horizontal = 20.dp, vertical = 10.dp)
            .semantics(mergeDescendants = true) { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        RowPoster(title, posterWidth)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title.name, style = AppType.headline, color = colors.label)
            title.subtitle?.let { Text(it, style = AppType.subheadline, color = colors.secondaryLabel) }
            title.director?.let { Text(it, style = AppType.caption, color = colors.secondaryLabel, maxLines = 2) }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                title.year?.let { Text(it, style = AppType.caption.copy(fontFeatureSettings = "tnum"), color = colors.secondaryLabel) }
                BookingBadge(showtime, title.kind, short = true)
            }
        }
        Column(
            Modifier.width(84.dp.scaled()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            val (digits, period) = formats.timeParts(showtime.startsAt)
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    digits,
                    style = AppType.title3.copy(fontFeatureSettings = "tnum"),
                    fontWeight = FontWeight.Bold,
                    color = colors.label,
                    maxLines = 1,
                    modifier = Modifier.alignByBaseline(),
                )
                if (period.isNotEmpty()) {
                    Text(
                        period,
                        style = AppType.caption,
                        fontWeight = FontWeight.Bold,
                        color = colors.secondaryLabel,
                        maxLines = 1,
                        modifier = Modifier.alignByBaseline(),
                    )
                }
            }
            OpenTitleLabel(openLabel, quiet = played || soldOut, free = booking?.free == true)
        }
    }
}

/** The search field, at the bottom of the screen within thumb's reach, as on iOS. */
@Composable
private fun SearchField(query: String, onQueryChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val focus = LocalFocusManager.current
    Surface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        shape = CircleShape,
        color = if (colors.isDark) colors.surface else androidx.compose.ui.graphics.Color.White,
        shadowElevation = 6.dp,
        tonalElevation = 0.dp,
    ) {
        Row(
            Modifier.heightIn(min = 48.dp).padding(start = 16.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.Search, null, tint = colors.secondaryLabel, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) {
                if (query.isEmpty()) {
                    Text(stringResource(R.string.schedule_search), style = AppType.body, color = colors.secondaryLabel, maxLines = 1)
                }
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    singleLine = true,
                    textStyle = AppType.body.copy(color = colors.label),
                    cursorBrush = SolidColor(colors.accent),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search, autoCorrectEnabled = false),
                    keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange(""); focus.clearFocus() }) {
                    Icon(Icons.Filled.Cancel, stringResource(R.string.android_clearSearch), tint = colors.secondaryLabel, modifier = Modifier.size(20.dp))
                }
            } else {
                Spacer(Modifier.size(12.dp))
            }
        }
    }
}

/** Nothing saved and the schedule couldn't load. */
@Composable
private fun NoSchedule(error: String, onRetry: () -> Unit) {
    val colors = AppTheme.colors
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Outlined.WifiOff, null, tint = colors.secondaryLabel, modifier = Modifier.size(44.dp))
        Spacer(Modifier.height(12.dp))
        Text(stringResource(R.string.schedule_offline), style = AppType.title2, fontWeight = FontWeight.Bold, color = colors.label)
        Spacer(Modifier.height(6.dp))
        Text(error, style = AppType.callout, color = colors.secondaryLabel, textAlign = TextAlign.Center)
        TextButton(onClick = onRetry) {
            Text(stringResource(R.string.schedule_retry), style = AppType.callout, fontWeight = FontWeight.SemiBold, color = colors.accent)
        }
    }
}
