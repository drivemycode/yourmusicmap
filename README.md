# Setup guide (had to make this for myself after forgetting how to set up stuff on more than one occasion)

## setup local db
+ (link TBA) run local db based on musicbrainz db dump using docker here
+ ..after initial setup..
+ docker compose up -d db
+ docker compose ps db
+ docker compose exec -T db pg_isready -U musicbrainz

## setup website
+ npm run dev

## TODO list
+ support top 10, 25, 50, ... all?
+ use redis to cache formatted_artists
+ search up name by alias too
+ get artist image (lastfm image links dont seem to work)

+ change marker popup display (uniform for map/globe view)
+ compare different users' map
+ have top3or5or10 display custom markers


