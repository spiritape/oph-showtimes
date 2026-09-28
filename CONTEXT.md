# OPH Showtimes

An unofficial, fast, minimal schedule of everything playing at the Ojai Playhouse, with calendar feeds. The Playhouse's own website is the source of truth.

## Language

### Schedule

**Showtime**:
One scheduled occurrence of a Film or Event at a specific date and time, with its own ticket link.
_Avoid_: Screening, session, performance

**Film**:
A title shown as a movie, grouped from every Showtime with the same title, ignoring case and spacing. For example, *Digger* is one Film with ten Showtimes.
_Avoid_: Movie, feature

**Event**:
A non-film title the Playhouse hosts (comedy, live shows, talks). Like a Film, it has one or more Showtimes.
_Avoid_: Show, gig

**Title**:
A Film or Event, i.e. anything that has Showtimes. Used when the distinction doesn't matter.
_Avoid_: Listing, item, program

**Category**:
The kind of title a Film or Event is, as labeled by the Playhouse (e.g. film, comedy).
_Avoid_: Genre, type

**Source**:
The official Ojai Playhouse website that we read the schedule from.
_Avoid_: Feed, API

### Calendar

**Calendar Feed**:
A subscribable calendar that contains every upcoming Showtime.
_Avoid_: ICS, calendar export
