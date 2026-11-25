# Playhouse for Android

The Ojai Playhouse app for Android: Kotlin, Jetpack Compose and Material 3, mirroring the
iOS app in `ios/` (its SwiftUI sources are the spec). Application id `com.ojaishowtimes.app`,
minSdk 26.

## Build and run

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
~/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or open `android/` in Android Studio. The SDK path goes in `local.properties` (not committed).

## Where things are

| iOS | Android |
| --- | --- |
| `Shared/Feed.swift` | `data/Feed.kt` |
| `FeedStore.swift` | `data/FeedStore.kt` (last good copy in `files/schedule.json`) |
| `FilmRequests.swift` | `data/FilmRequests.kt` (per-install id in `filmRequests` prefs) |
| `Theme.swift`, `TextSize.swift` | `ui/Theme.kt`, `data/Settings.kt` |
| `ScheduleView.swift`, `BookingBadge.swift` | `ui/ScheduleScreen.kt`, `ui/Components.kt` |
| `TitleView.swift`, `GoogleCalendar.swift` | `ui/TitleScreen.kt`, `ui/Links.kt` |
| `RequestFilmView.swift` | `ui/RequestScreen.kt` |
| `SettingsView.swift`, `PlayhouseInfoView.swift` | `ui/InfoScreen.kt` |

Every user-facing string is in `app/src/main/res/values/strings.xml`. Ids with a dot match
`tools/text-editor.html` (`schedule.request` is `R.string.schedule_request` in code); ids
starting `android.` exist only here.

Not yet on Android: New Title notifications (FCM), the home-screen widget, Wear OS, and
Play Store signing.
