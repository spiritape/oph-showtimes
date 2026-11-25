package com.ojaishowtimes.app.ui

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.Film
import com.ojaishowtimes.app.data.FilmRequests
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * "Request a Movie" (ios/Playhouse/RequestFilmView.swift): search for a film and request it.
 * Shows this install's own requests when the search is empty, each with a button to share it
 * by text; nobody sees anyone else's.
 */
@Composable
fun RequestScreen(requests: FilmRequests, onDismiss: () -> Unit) {
    AppSheet(title = stringResource(R.string.request_title), onDismiss = onDismiss) {
        RequestContent(requests)
    }
}

@Composable
private fun RequestContent(requests: FilmRequests) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var searchFocused by remember { mutableStateOf(false) }
    /** A film whose checkmark was tapped, waiting for "Withdraw" to be confirmed. */
    var confirmingWithdraw by remember { mutableStateOf<Film?>(null) }
    var editing by remember { mutableStateOf(false) }

    // Keeps "Your requests" within TMDB's six months.
    LaunchedEffect(Unit) { requests.refreshMine() }
    LaunchedEffect(query) {
        // Wait for a pause in typing before searching.
        delay(350)
        requests.search(query)
    }
    // Leave Edit when there's nothing left to edit.
    LaunchedEffect(requests.mine.isEmpty()) { if (requests.mine.isEmpty()) editing = false }

    // Scrolling the list puts the keyboard away, as on iOS.
    val dismissKeyboard = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && available.y != 0f) focus.clearFocus()
                return Offset.Zero
            }
        }
    }

    val searching = query.trim().length >= 2
    LazyColumn(
        state = rememberLazyListState(),
        modifier = Modifier.fillMaxSize().imePadding().nestedScroll(dismissKeyboard),
        contentPadding = PaddingValues(top = 12.dp),
    ) {
        // Out of the way while searching, so results show above the keyboard.
        if (!searchFocused && query.isEmpty()) {
            item(key = "intro") {
                GroupedSection(rows = listOf {
                    Column(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(painterResource(R.drawable.ic_popcorn), null, tint = colors.accent, modifier = Modifier.size(36.dp.scaled()))
                        Text(stringResource(R.string.request_heading), style = AppType.headline, color = colors.label, textAlign = TextAlign.Center)
                        Text(stringResource(R.string.request_intro), style = AppType.subheadline, color = colors.secondaryLabel, textAlign = TextAlign.Center)
                    }
                })
            }
        }
        item(key = "search") {
            GroupedSection(rows = listOf {
                GroupedRow(padding = PaddingValues(start = 16.dp, end = 4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Search, null, tint = colors.secondaryLabel, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Box(Modifier.weight(1f).padding(vertical = 12.dp)) {
                            if (query.isEmpty()) Text(stringResource(R.string.request_search), style = AppType.body, color = colors.secondaryLabel)
                            BasicTextField(
                                value = query,
                                onValueChange = { query = it },
                                singleLine = true,
                                textStyle = AppType.body.copy(color = colors.label),
                                cursorBrush = SolidColor(colors.accent),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search, autoCorrectEnabled = false),
                                keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
                                modifier = Modifier.fillMaxWidth().onFocusChanged { searchFocused = it.isFocused },
                            )
                        }
                        if (query.isNotEmpty()) {
                            IconButton(onClick = { query = "" }) {
                                Icon(Icons.Filled.Cancel, stringResource(R.string.android_clearSearch), tint = colors.secondaryLabel, modifier = Modifier.size(20.dp))
                            }
                        } else {
                            Spacer(Modifier.size(12.dp))
                        }
                    }
                }
            })
        }
        when {
            !searching -> if (requests.mine.isNotEmpty()) {
                item(key = "mine") {
                    GroupedSection(
                        header = {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    stringResource(R.string.request_mine).uppercase(),
                                    style = AppType.footnote,
                                    color = colors.secondaryLabel,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    stringResource(if (editing) R.string.android_done else R.string.android_edit),
                                    style = AppType.subheadline,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.accent,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .clickable(role = Role.Button) { editing = !editing }
                                        .padding(horizontal = 4.dp, vertical = 2.dp),
                                )
                            }
                        },
                        rows = requests.mine.map { film ->
                            {
                                CompactFilmRow(
                                    film = film,
                                    editing = editing,
                                    pending = film.tmdbId in requests.pending,
                                    onShare = { Links.share(context, "${requests.shareMessage(film)}\n${PlayhouseInfo.WEBSITE}", film.title) },
                                    onWithdraw = { confirmingWithdraw = film },
                                    onRemove = { scope.launch { requests.withdraw(film) } },
                                )
                            }
                        },
                    )
                }
            }
            requests.results.isEmpty() -> item(key = "none") {
                GroupedSection(rows = listOf {
                    GroupedRow {
                        if (requests.isSearching) {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                            }
                        } else {
                            Text(stringResource(R.string.request_none), style = AppType.body, color = colors.secondaryLabel)
                        }
                    }
                })
            }
            else -> item(key = "results") {
                GroupedSection(rows = requests.results.map { film ->
                    {
                        FilmRow(film) {
                            when {
                                requests.isRequested(film) -> IconButton(onClick = { confirmingWithdraw = film }) {
                                    Icon(Icons.Filled.CheckCircle, stringResource(R.string.android_requested), tint = colors.accent, modifier = Modifier.size(28.dp.scaled()))
                                }
                                film.tmdbId in requests.pending -> CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                                else -> Button(
                                    onClick = { scope.launch { requests.request(film) } },
                                    shape = CircleShape,
                                    colors = ButtonDefaults.buttonColors(containerColor = colors.softBlue, contentColor = Color.White),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                                ) {
                                    Text(stringResource(R.string.request_button), style = AppType.subheadline, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                })
            }
        }
        item(key = "credit") {
            Text(
                stringResource(R.string.tmdb_credit),
                style = AppType.caption2,
                color = colors.secondaryLabel,
                modifier = Modifier.padding(horizontal = 32.dp).padding(bottom = 16.dp),
            )
            Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
        }
    }

    confirmingWithdraw?.let { film ->
        AlertDialog(
            onDismissRequest = { confirmingWithdraw = null },
            text = { Text(stringResource(R.string.request_withdrawAsk, film.title), style = AppType.body) },
            confirmButton = {
                TextButton(onClick = {
                    confirmingWithdraw = null
                    scope.launch { requests.withdraw(film) }
                }) { Text(stringResource(R.string.request_withdraw), color = colors.red, fontWeight = FontWeight.SemiBold) }
            },
            dismissButton = {
                TextButton(onClick = { confirmingWithdraw = null }) { Text(stringResource(R.string.android_cancel), color = colors.accent) }
            },
            containerColor = colors.groupedSurface,
        )
    }
    requests.message?.let { message ->
        AlertDialog(
            onDismissRequest = { requests.message = null },
            text = { Text(message, style = AppType.body) },
            confirmButton = {
                TextButton(onClick = { requests.message = null }) { Text(stringResource(R.string.android_ok), color = colors.accent) }
            },
            containerColor = colors.groupedSurface,
        )
    }
}

/** A tighter row for "Your requests": small poster, title and year on one line, Share and the checkmark. */
@Composable
private fun CompactFilmRow(
    film: Film,
    editing: Boolean,
    pending: Boolean,
    onShare: () -> Unit,
    onWithdraw: () -> Unit,
    onRemove: () -> Unit,
) {
    val colors = AppTheme.colors
    GroupedRow(padding = PaddingValues(start = if (editing) 4.dp else 16.dp, end = 4.dp, top = 6.dp, bottom = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (editing) {
                IconButton(onClick = onRemove, enabled = !pending) {
                    Icon(Icons.Filled.RemoveCircle, stringResource(R.string.request_withdraw), tint = colors.red)
                }
            }
            SmallPoster(film.posterUrl, 32, 48)
            Spacer(Modifier.width(10.dp))
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(film.title) }
                    film.year?.let {
                        withStyle(SpanStyle(fontSize = AppType.footnote.fontSize, color = colors.secondaryLabel)) { append("  $it") }
                    }
                },
                style = AppType.subheadline,
                color = colors.label,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (pending) {
                CircularProgressIndicator(color = colors.accent, modifier = Modifier.padding(12.dp).size(20.dp), strokeWidth = 2.dp)
            } else if (!editing) {
                IconButton(onClick = onShare) {
                    Icon(Icons.Outlined.Share, stringResource(R.string.android_shareFilm, film.title), tint = colors.accent, modifier = Modifier.size(22.dp.scaled()))
                }
                IconButton(onClick = onWithdraw) {
                    Icon(Icons.Filled.CheckCircle, stringResource(R.string.android_requested), tint = colors.accent, modifier = Modifier.size(22.dp.scaled()))
                }
            }
        }
    }
}

@Composable
private fun FilmRow(film: Film, trailing: @Composable () -> Unit) {
    val colors = AppTheme.colors
    GroupedRow(padding = PaddingValues(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SmallPoster(film.posterUrl, 46, 69)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(film.title, style = AppType.headline, color = colors.label, maxLines = 2, overflow = TextOverflow.Ellipsis)
                film.year?.let { Text(it, style = AppType.subheadline, color = colors.secondaryLabel) }
            }
            Spacer(Modifier.width(8.dp))
            trailing()
        }
    }
}

@Composable
private fun SmallPoster(url: String?, width: Int, height: Int) {
    Box(
        Modifier
            .size(width.dp, height.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(AppTheme.colors.fill4),
    ) {
        AsyncImage(model = url, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
    }
}
