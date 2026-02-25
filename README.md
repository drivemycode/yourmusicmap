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
+ refactor anything involving mbapi to just using the postgresql database
+ check if batch req for mapbox works
+ cache of (mbid, artist name, ..)
+ figure out how to deal with markers stylistically (deal with clusters, markers in the same city, popups with artist image)
+ figure out how to deal with marker clusters
+ add globe
