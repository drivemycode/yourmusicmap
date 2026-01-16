import { MusicBrainzApi } from 'musicbrainz-api';

const MAPBOX_BASE_URL = "https://api.mapbox.com/search";
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY
const DB_API_URL = 'http://localhost:3000/artist-info';

const mbApi = new MusicBrainzApi({
  appName: 'my-app',
  appVersion: '0.1.0',
  appContactInfo: 'user@mail.org',
})


export const fetchOriginHelper = async (artistName) => {
      try {
        // search artist from mb
        const res = await mbApi.search('artist', {query: artistName});

        if(res.count == 0){
          throw new Error('Failed to find artist of that name from musicbrainz');
        } 
        const artist = res.artists[0]

        // get artist mb entity
        const artist_mb = await mbApi.lookup('artist', artist.id, ['aliases']);
        
        return artist_mb;


      } catch (err) {
        console.error("Error fetching country:", err);
      }
}

export const fetchArtistOriginFeaturesHelper = async (artist_mb) => {
    const beginArea_mb = await mbApi.lookup('area', artist_mb["begin-area"].id, ['area-rels']);
    if (beginArea_mb.relations === null){
      throw new Error("No musicbrainz begin area could be found");    
    }

    // try to find the origin country
    let query = `${beginArea_mb.name} `;
    const n = beginArea_mb.relations.length;

    for(let i = 0; i < Math.min(n, 3); i ++) {
      query += beginArea_mb.relations[i].area.name + " ";

    }
    const url = new URL(`${MAPBOX_BASE_URL}/geocode/v6/forward`);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
    url.searchParams.set("limit", "1");
    url.searchParams.set("types", "district,place,locality");

    try {
        const res = await fetch(url);
        if(!res.ok){
          throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();   
        
        if(data.features.length == 0) throw new Error("Mapbox could not find any features based on area-rels provided by MusicBrainz")
        
        return data.features[0]; // return artist.originfeatures

    } catch(err) {
        console.error("Error trying to find country using area-rels:", err);
    }
}

export const fetchLastFMTopArtistsHelper = async (username) => {
    const url = new URL(LASTFM_BASE_URL);
    url.searchParams.set("method", "user.gettopartists");
    url.searchParams.set("user", username);
    url.searchParams.set("period", "overall");
    url.searchParams.set("limit", 5);
    url.searchParams.set("api_key", LASTFM_API_KEY);
    url.searchParams.set("format", "json");
    
    try {
        const res = await fetch(url);
        if(!res.ok){
            throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();

        // data.topartists.artist is an array of the user's top artists
        const arr = formatArtistsHelper(data.topartists.artist);
        formatArtistsHelperV2(data.topartists.artist);
      
        return arr;
    } catch(err) {
        console.error('An error has occurred when trying to find your top LastFM artists', err);
        return [];
    } finally {
    }
}

// fetches artist origins 
export const formatArtistsHelper = async (artists, ) => {

    const n = artists.length
    let formatted_artists = new Array(n);

    for(let i = 0; i < n; i += 1){
        let artist_dict = {};
        const artist_mb = await fetchOriginHelper(artists[i].name);
        const artist_origin_features = await fetchArtistOriginFeaturesHelper(artist_mb);

        artist_dict["mb"] = artist_mb;
        artist_dict["origin-features"] = artist_origin_features;
        artist_dict["playcount"] = artists[i].playcount
        artist_dict["rank"] = artists[i]["@attr"]["rank"]
        artist_dict["url"] = artists[i]["url"]

        formatted_artists[i] = artist_dict;
    }
    return formatted_artists;
}

// format artists all at once in batch api calls
export const formatArtistsHelperV2 = async (artists) => {
  // use batch post

  const artist_names = artists.map((artist) => artist.name.toLowerCase());
  try {
    const db_res = await fetch(
        DB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: artist_names
      })
      }
    )
  const data = await db_res.json();
  console.log(data);
  } catch(err) {
        console.error('An error has occurred when trying to find your top LastFM artists', err);
  }

  const url = new URL(`${MAPBOX_BASE_URL}/geocode/v6/batch`)
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  let post_body = [];
  const n = artists.length;
  for(let i = 0; i < n; i ++){
      post_body.push({
        "types": ["district", "place", "locality"],
        // need to somehow get location
      })
  }

}