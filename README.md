# Setup guide (had to make this for myself after forgetting how to set up stuff on more than one occasion)

## setup local db
+ (link TBA) run local db based on musicbrainz db dump using docker here
+ ..after initial setup..
+ docker compose up -d musicbrainz
+ docker compose ps
+ docker compose exec db psql -U musicbrainz -d musicbrainz_db

## setup website
+ npm run dev

## TODO list
+ add globe
+ support top 10, 25, 50, ... all?
+ use redis to cache formatted_artists
+ search up name by alias too
+ change marker icon
+ get artist image (lastfm image links dont seem to work)


