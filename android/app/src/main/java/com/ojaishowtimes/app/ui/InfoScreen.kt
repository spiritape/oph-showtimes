package com.ojaishowtimes.app.ui

import androidx.activity.compose.BackHandler
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.ListAlt
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.automirrored.outlined.Accessible
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Eco
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.EventSeat
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.LocalCafe
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ojaishowtimes.app.BuildConfig
import com.ojaishowtimes.app.R
import com.ojaishowtimes.app.data.Appearance
import com.ojaishowtimes.app.data.FilmRequests
import com.ojaishowtimes.app.data.Settings
import com.ojaishowtimes.app.data.TextSize
import kotlin.math.roundToInt

/** Info and Settings (ios/Playhouse/SettingsView.swift), with Visiting the Playhouse inside it. */
@Composable
fun InfoScreen(settings: Settings, onDismiss: () -> Unit) {
    var visiting by rememberSaveable { mutableStateOf(false) }
    AppSheet(
        title = stringResource(if (visiting) R.string.visit_title else R.string.info_title),
        onDismiss = onDismiss,
        onBack = if (visiting) ({ visiting = false }) else null,
    ) {
        BackHandler(enabled = visiting) { visiting = false }
        AnimatedContent(
            targetState = visiting,
            transitionSpec = {
                if (targetState) slideInHorizontally { it } togetherWith slideOutHorizontally { -it / 3 }
                else slideInHorizontally { -it / 3 } togetherWith slideOutHorizontally { it }
            },
            label = "info",
        ) { showVisiting ->
            if (showVisiting) VisitingContent() else SettingsContent(settings, onVisiting = { visiting = true })
        }
    }
}

@Composable
private fun SettingsContent(settings: Settings, onVisiting: () -> Unit) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 12.dp)) {
        // About the Playhouse first.
        GroupedSection(rows = listOf(
            {
                Column(
                    Modifier.fillMaxWidth().padding(vertical = 20.dp, horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Image(
                        painterResource(R.drawable.emblem),
                        contentDescription = null,
                        colorFilter = ColorFilter.tint(colors.accent),
                        modifier = Modifier.size(44.dp),
                    )
                    Image(
                        painterResource(R.drawable.wordmark),
                        contentDescription = stringResource(R.string.android_logoDescription).substringBefore('.'),
                        colorFilter = ColorFilter.tint(colors.accent),
                        modifier = Modifier.height(14.dp),
                    )
                    Text(stringResource(R.string.info_address), style = AppType.footnote, color = colors.secondaryLabel, textAlign = TextAlign.Center)
                }
            },
            { LinkRow(Icons.Outlined.Info, stringResource(R.string.info_visiting), chevron = true, onClick = onVisiting) },
            { LinkRow(Icons.Outlined.Language, stringResource(R.string.android_website)) { Links.openInApp(context, PlayhouseInfo.WEBSITE, colors) } },
            {
                val phone = stringResource(R.string.android_phone)
                LinkRow(Icons.Outlined.Phone, phone, description = stringResource(R.string.android_callPlayhouse, phone)) {
                    Links.open(context, PlayhouseInfo.PHONE_URL)
                }
            },
            { LinkRow(Icons.Outlined.Email, stringResource(R.string.android_email)) { Links.open(context, PlayhouseInfo.EMAIL_URL) } },
            { DirectionsRow() },
        ))

        // Appearance: Dark (the default), Light, or the phone's own setting.
        GroupedSection(rows = Appearance.entries.map { option ->
            {
                val selected = settings.appearance == option
                GroupedRow(onClick = { settings.updateAppearance(option) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(option.label), style = AppType.body, color = colors.label, modifier = Modifier.weight(1f))
                        if (selected) Icon(Icons.Outlined.Check, null, tint = colors.accent, modifier = Modifier.size(20.dp))
                    }
                }
            }
        })

        TextSizeSection(settings)

        GroupedSection(
            rows = listOf(
                { ValueRow(stringResource(R.string.info_version), "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})") },
                { ValueRow(stringResource(R.string.info_appBy), stringResource(R.string.android_appByName)) },
            ),
            // TMDB's terms ask for its logo and notice with the app's credits, less prominent than the Playhouse's own marks.
            footer = {
                Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val tmdb = stringResource(R.string.android_tmdbDescription)
                    Image(
                        painterResource(R.drawable.tmdb_logo),
                        contentDescription = null,
                        modifier = Modifier
                            .height(9.dp)
                            .clickable(role = Role.Button) { Links.openInApp(context, FilmRequests.TMDB_URL, colors) }
                            .semantics { contentDescription = tmdb },
                    )
                    FooterText(stringResource(R.string.tmdb_credit))
                }
            },
        )
        Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
    }
}

@Composable
private fun LinkRow(
    icon: ImageVector,
    text: String,
    chevron: Boolean = false,
    description: String? = null,
    onClick: () -> Unit,
) {
    val colors = AppTheme.colors
    GroupedRow(onClick = onClick, modifier = if (description != null) Modifier.semantics(mergeDescendants = true) { contentDescription = description } else Modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = colors.accent, modifier = Modifier.size(22.dp.scaled()))
            Spacer(Modifier.width(14.dp))
            Text(text, style = AppType.body, color = if (chevron) colors.label else colors.accent, modifier = Modifier.weight(1f))
            if (chevron) Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = colors.secondaryLabel)
        }
    }
}

/** Directions: Google Maps, or a geo: link for whichever other maps app the phone has. */
@Composable
private fun DirectionsRow() {
    val colors = AppTheme.colors
    val context = LocalContext.current
    var open by remember { mutableStateOf(false) }
    Box {
        LinkRow(Icons.Outlined.Map, stringResource(R.string.info_directions)) { open = true }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.info_googleMaps), style = AppType.body) },
                leadingIcon = { Icon(Icons.Outlined.Language, null) },
                onClick = {
                    open = false
                    Links.open(context, PlayhouseInfo.GOOGLE_DIRECTIONS_URL, R.string.android_noMaps)
                },
            )
            DropdownMenuItem(
                text = { Text(stringResource(R.string.info_appleMaps), style = AppType.body) },
                leadingIcon = { Icon(Icons.Outlined.Map, null) },
                onClick = {
                    open = false
                    Links.chooseMapsApp(context, PlayhouseInfo.GEO_URL)
                },
            )
        }
    }
}

@Composable
private fun ValueRow(label: String, value: String) {
    val colors = AppTheme.colors
    GroupedRow(modifier = Modifier.semantics(mergeDescendants = true) {}) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = AppType.body, color = colors.label, modifier = Modifier.weight(1f))
            Text(value, style = AppType.body, color = colors.secondaryLabel)
        }
    }
}

/**
 * The Text Size section (ios/Playhouse/TextSize.swift TextSizeSettings): a slider that's always
 * there, and a switch to follow the phone instead. Moving the slider switches that off.
 */
@Composable
private fun TextSizeSection(settings: Settings) {
    val colors = AppTheme.colors
    val size = settings.textSize
    val phoneScale = LocalConfiguration.current.fontScale
    /** The slider position: the chosen size, or the nearest one to the phone's. */
    val step = TextSize.steps.indexOf(size).takeIf { it >= 0 }
        ?: TextSize.steps.indexOfLast { it.scale <= phoneScale + 0.01f }.coerceAtLeast(1)
    val sizeName = stringResource(size.label)
    GroupedSection(
        rows = listOf(
            {
                GroupedRow(padding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Fixed sizes, so the two letters show the range whatever size is chosen.
                        Text("A", fontSize = 13.sp / settingsScale(), color = colors.label)
                        Slider(
                            value = step.toFloat(),
                            onValueChange = { settings.updateTextSize(TextSize.steps[it.roundToInt()]) },
                            valueRange = 0f..(TextSize.steps.size - 1).toFloat(),
                            steps = TextSize.steps.size - 2,
                            colors = SliderDefaults.colors(
                                thumbColor = androidx.compose.ui.graphics.Color.White,
                                activeTrackColor = colors.accent,
                                inactiveTrackColor = colors.fill2,
                                activeTickColor = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.6f),
                                inactiveTickColor = colors.secondaryLabel,
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 12.dp)
                                .semantics { stateDescription = sizeName; contentDescription = "" },
                        )
                        Text("A", fontSize = 22.sp / settingsScale(), color = colors.label)
                    }
                }
            },
            {
                GroupedRow(onClick = { settings.updateTextSize(if (size == TextSize.System) TextSize.steps[step] else TextSize.System) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.info_matchSize), style = AppType.body, color = colors.label, modifier = Modifier.weight(1f))
                        Switch(
                            checked = size == TextSize.System,
                            onCheckedChange = { on -> settings.updateTextSize(if (on) TextSize.System else TextSize.steps[step]) },
                            colors = SwitchDefaults.colors(checkedTrackColor = colors.softGreen, checkedThumbColor = androidx.compose.ui.graphics.Color.White),
                        )
                    }
                }
            },
        ),
        footer = {
            FooterText(
                if (size == TextSize.System) stringResource(R.string.info_sizeSystem)
                else stringResource(R.string.info_sizeChosen, sizeName)
            )
        },
    )
}

/** Undoes the app's text size, for the slider's fixed-size letters. */
@Composable
private fun settingsScale(): Float = androidx.compose.ui.platform.LocalDensity.current.fontScale

/** Box office, parking, policies and the rest (ios/Playhouse/PlayhouseInfoView.swift). */
@Composable
private fun VisitingContent() {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 12.dp)) {
        VisitSection(R.string.android_visitBoxOffice, Icons.Outlined.ConfirmationNumber, R.string.visit_boxOffice1, R.string.visit_boxOffice2)
        VisitSection(R.string.android_visitAbout, Icons.Outlined.AccountBalance, R.string.visit_about)
        VisitSection(R.string.android_visitParking, Icons.Outlined.DirectionsCar, R.string.visit_parking1, R.string.visit_parking2)
        VisitSection(R.string.android_visitFood, Icons.Outlined.LocalCafe, R.string.visit_food)
        VisitSection(R.string.android_visitAccess, Icons.AutoMirrored.Outlined.Accessible, R.string.visit_access)
        VisitSection(R.string.android_visitSeating, Icons.Outlined.EventSeat, R.string.visit_seating1, R.string.visit_seating2)
        VisitSection(R.string.android_visitTickets, Icons.Outlined.CreditCard, R.string.visit_tickets)
        VisitSection(
            R.string.android_visitPolicies, Icons.AutoMirrored.Outlined.ListAlt,
            R.string.visit_policy1, R.string.visit_policy2, R.string.visit_policy3, R.string.visit_policy4,
            R.string.visit_policy5, R.string.visit_policy6, R.string.visit_policy7,
        )
        VisitSection(R.string.android_visitGreen, Icons.Outlined.Eco, R.string.visit_green)
        Spacer(Modifier.windowInsetsBottomHeight(WindowInsets.navigationBars))
    }
}

@Composable
private fun VisitSection(@StringRes title: Int, icon: ImageVector, vararg lines: Int) {
    val colors = AppTheme.colors
    GroupedSection(
        header = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = colors.secondaryLabel, modifier = Modifier.size(16.dp.scaled()))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(title).uppercase(), style = AppType.footnote, fontWeight = FontWeight.Medium, color = colors.secondaryLabel)
            }
        },
        rows = lines.map { line -> { GroupedRow { Text(stringResource(line), style = AppType.body, color = colors.label) } } },
    )
}
