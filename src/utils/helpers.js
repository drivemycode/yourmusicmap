const MAPBOX_BASE_URL = "https://api.mapbox.com/search";
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY


import { MusicBrainzApi } from 'musicbrainz-api';

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
    const url = new URL(`${MAPBOX_BASE_URL}/searchbox/v1/forward`);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
    url.searchParams.set("limit", "1");
    url.searchParams.set("types", "district,city,locality");

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

        const arr = formatArtistsHelper(data.topartists.artist);
        return arr;
    } catch(err) {
        console.error('An error has occurred when trying to find your top LastFM artists', err);
        return [];
    } finally {
    }
}

export const formatArtistsHelper = async (artists) => {
    const n = artists.length;
    let formatted_artists = new Array(n);

    for(let i = 0; i < n; i ++){
        const artist_mb = await fetchOriginHelper(artists[i].name);
        const artist_origin_features = await fetchArtistOriginFeaturesHelper(artist_mb);

        formatted_artists[i] = [artist_mb, artist_origin_features];
    }
    return formatted_artists;
}