import Foundation
import Testing
@testable import Playhouse

/// A Feed in the exact shape src/feed.ts writes.
private let json = """
{"version":1,"generatedAt":"2026-10-14T04:16:21.872Z",
 "theater":{"name":"Ojai Playhouse","address":"145 E Ojai Ave, Ojai, CA 93023","phone":"(805) 646-1011","timeZone":"America/Los_Angeles"},
 "titles":[
  {"key":"digger","slug":"digger","name":"Digger","subtitle":null,"kind":"film","categoryLabel":"Film",
   "year":"2026","director":null,"runtime":"1hr 30min","rating":null,"synopsis":null,
   "imageUrl":null,"thumbnailUrl":null,"livestreamUrl":null,"url":"https://ojaishowtimes.com/t/digger/",
   "showtimes":[
    {"id":"a","startsAt":"2026-10-14T02:00:00Z","endsAt":"2026-10-14T03:30:00.000Z","price":"$15",
     "booking":{"label":"Tickets","url":"https://tickets.example/a","free":false}},
    {"id":"b","startsAt":"2026-10-15T06:30:00.000Z","endsAt":"2026-10-15T08:00:00.000Z","price":null,"booking":null}]},
  {"key":"dr. brown","slug":"dr-brown","name":"Dr. Brown","subtitle":null,"kind":"liveShow","categoryLabel":"Comedy",
   "year":null,"director":null,"runtime":null,"rating":null,"synopsis":null,
   "imageUrl":null,"thumbnailUrl":null,"livestreamUrl":null,"url":"https://ojaishowtimes.com/t/dr-brown/",
   "showtimes":[{"id":"c","startsAt":"2026-10-14T03:00:00.000Z","endsAt":"2026-10-14T05:00:00.000Z","price":null,"booking":null}],
   "someFutureField":true}]}
"""

private let feed = try! Feed.decode(Data(json.utf8))
private func date(_ s: String) -> Date { try! Date(s, strategy: .iso8601) }

@Test func decodesTheFeedAndIgnoresNewFields() {
    #expect(feed.titles.map(\.name) == ["Digger", "Dr. Brown"])
    #expect(feed.titles[1].kind == .liveShow)
    #expect(feed.titles[0].showtimes[0].booking?.url.absoluteString == "https://tickets.example/a")
    #expect(feed.titles[0].showtimes[0].startsAt == date("2026-10-14T02:00:00Z"))
}

@Test func groupsShowtimesByDayInTheTheatersTime() {
    // 02:00 and 03:00 UTC on the 14th are the evening of the 13th in Ojai; 06:30 UTC on the 15th is still the 14th.
    let days = feed.days(.everything, now: date("2026-10-13T20:00:00Z"))
    #expect(days.map(\.day.day) == [13, 14])
    #expect(days[0].showtimes.map(\.id) == ["a", "c"])
}

@Test func filtersAndDropsShowtimesOnceTheyreHalfAnHourIn() {
    #expect(feed.days(.liveShows, now: date("2026-10-13T20:00:00Z")).flatMap(\.showtimes).map(\.id) == ["c"])
    #expect(feed.days(.films, now: date("2026-10-14T02:31:00Z")).flatMap(\.showtimes).map(\.id) == ["b"])
}

@Test func labelsDaysRelativeToNowInTheTheatersTime() {
    let now = date("2026-10-13T20:00:00Z") // 1 PM Tuesday in Ojai
    #expect(feed.dayLabel(date("2026-10-14T02:00:00Z"), now: now) == "Today")
    #expect(feed.dayLabel(date("2026-10-15T06:30:00Z"), now: now) == "Tomorrow")
    #expect(feed.dayLabel(date("2026-10-16T20:00:00Z"), now: now, short: true) == "Fri, Oct 16")
    #expect(feed.timeLabel(date("2026-10-14T02:00:00Z")) == "7:00\u{202F}PM") // narrow no-break space
}

@Test func widgetsChangeAsShowtimesDropOffAndAtMidnight() {
    let changes = feed.listChanges(after: date("2026-10-13T20:00:00Z"), within: 24 * 60 * 60)
    #expect(changes == [
        date("2026-10-14T02:30:00Z"), // a drops off
        date("2026-10-14T03:30:00Z"), // c drops off
        date("2026-10-14T07:00:00Z"), // midnight in Ojai
    ])
}

@Test func readsTitleLinks() {
    #expect(AppLink.titleSlug(AppLink.title(feed.titles[1])) == "dr-brown")
    #expect(AppLink.titleSlug(URL(string: "https://ojaishowtimes.com/t/dr-brown/")!) == nil)
}

@Test func timelineRunsFromWhatPlayedToWhatsComingUp() throws {
    var withPast = feed
    var played = feed.titles[1]
    played.key = "earlier"
    played.showtimes = [Showtime(id: "old", startsAt: date("2026-10-10T03:00:00Z"), endsAt: date("2026-10-10T05:00:00Z"))]
    withPast.past = [played]
    let now = date("2026-10-14T03:31:00Z")
    // "old" was published as past; "a" (02:00) and "c" (03:00) have played since; "b" is still to come.
    let days = withPast.timeline(.everything, now: now)
    #expect(days.flatMap(\.showtimes).map(\.id) == ["old", "a", "c", "b"])
    #expect(days.flatMap(\.showtimes).map { $0.showtime.hasPlayed(now: now) } == [true, true, true, false])
    #expect(withPast.timeline(.liveShows, now: now).flatMap(\.showtimes).map(\.id) == ["old", "c"])
}

@Test func freeShowsOnlyFreeShowtimes() {
    var withFree = feed
    withFree.titles[0].showtimes[1].booking = .init(label: "RSVP", url: URL(string: "https://rsvp.example")!, free: true)
    #expect(withFree.days(.free, now: date("2026-10-13T20:00:00Z")).flatMap(\.showtimes).map(\.id) == ["b"])
}

@Test func opensTheCurrentTitleFromThePastList() {
    var finished = feed.titles[0]
    finished.key = "gone"
    #expect(feed.titleToOpen(feed.titles[0]).showtimes.count == 2)
    #expect(feed.titleToOpen(finished).showtimes.isEmpty)
}

@Test func labelsYesterday() {
    #expect(feed.dayLabel(date("2026-10-13T03:00:00Z"), now: date("2026-10-13T20:00:00Z")) == "Yesterday")
}

@Test func readsSoldOutFromTheFeedOrThePrice() {
    let soldOutText = Showtime(id: "x", startsAt: .now, endsAt: .now, price: "$20\nSOLD OUT!")
    #expect(soldOutText.isSoldOut)
    #expect(soldOutText.displayPrice == "$20")
    let flagged = Showtime(id: "y", startsAt: .now, endsAt: .now, price: "$15", soldOut: true)
    #expect(flagged.isSoldOut)
    let limited = Showtime(id: "z", startsAt: .now, endsAt: .now, price: "$150 + fees\nLIMITED TICKETS AVAILABLE AT THE DOOR", soldOut: false)
    #expect(!limited.isSoldOut)
    #expect(limited.displayPrice == "$150 + fees · LIMITED TICKETS AVAILABLE AT THE DOOR")
}

@Test func prefillsGoogleCalendarLikeTheWebsite() {
    let item = ScheduledShowtime(title: feed.titles[0], showtime: feed.titles[0].showtimes[0])
    let url = GoogleCalendar.url(for: item, theater: feed.theater)
    let query = Dictionary(uniqueKeysWithValues: URLComponents(url: url, resolvingAgainstBaseURL: false)!
        .queryItems!.map { ($0.name, $0.value ?? "") })
    #expect(url.host() == "calendar.google.com")
    #expect(query["text"] == "Digger")
    #expect(query["dates"] == "20261014T020000Z/20261014T033000Z")
    #expect(query["location"] == "Ojai Playhouse, 145 E Ojai Ave, Ojai, CA 93023")
    #expect(query["details"] == "$15\nTickets: https://tickets.example/a\nhttps://ojaishowtimes.com/t/digger/")
}

@Test func searchMatchesNameCategoryAndDirectorIgnoringCaseAndAccents() {
    let digger = feed.titles[0]
    #expect(digger.matches("dig"))
    #expect(digger.matches("DIGGER film"))
    #expect(!digger.matches("digger comedy"))
    #expect(feed.titles[1].matches("comédy"))
    let days = feed.days(.everything, now: date("2026-10-13T20:00:00Z")).matching("brown")
    #expect(days.flatMap(\.showtimes).map(\.id) == ["c"])
}
