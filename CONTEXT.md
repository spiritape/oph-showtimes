# OPH Showtimes

An unofficial, fast, minimal schedule of everything playing at the Ojai Playhouse, with calendar and email notifications. The Playhouse's own website is the source of truth.

## Language

### Schedule

**Showtime**:
One scheduled occurrence of a Film or Event at a specific date and time, with its own ticket link.
_Avoid_: Screening, session, performance

**Film**:
A title shown as a movie, grouped from every Showtime that has the exact same title. For example, *Digger* is one Film with ten Showtimes.
_Avoid_: Movie, feature

**Event**:
A non-film title the Playhouse hosts (comedy, live shows, talks). Like a Film, it has one or more Showtimes.
_Avoid_: Show, gig

**Title**:
A Film or Event, i.e. anything that has Showtimes. Used when the distinction doesn't matter.
_Avoid_: Listing, item, program

**Returning Title**:
A Title that reappears more than 60 days after its last Showtime. It is treated as new.
_Avoid_: Re-release, revival

**Category**:
The kind of title a Film or Event is, as labeled by the Playhouse (e.g. film, comedy).
_Avoid_: Genre, type

**Source**:
The official Ojai Playhouse website that we read the schedule from.
_Avoid_: Feed, API

### Notifications

**Calendar Feed**:
A subscribable calendar that contains every upcoming Showtime.
_Avoid_: ICS, calendar export

**New Title Alert**:
One email sent to Subscribers listing every Title that is new (never seen before, or a Returning Title) since the last check. New Showtimes for a Title already listed don't count.
_Avoid_: New Film Alert, notification, update email

**Subscriber**:
A person who has confirmed their email address to receive New Title Alerts.
_Avoid_: User, member, follower
