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
