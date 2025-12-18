import { useState, useEffect } from "react";
import { useDebounce } from "react-use";

import { MusicBrainzApi } from 'musicbrainz-api';
import { findFlagUrlByIso2Code } from 'country-flags-svg-v2';

import "leaflet/dist/leaflet.css";
import Map from "./components/Map";


const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const MAPBOX_BASE_URL = "https://api.mapbox.com/search";

const mbApi = new MusicBrainzApi({
  appName: 'my-app',
  appVersion: '0.1.0',
  appContactInfo: 'user@mail.org',
})

function App() {

  const [searchTerm, setSearchTerm] = useState("Gorillaz");
  const [artistEntity, setArtistEntity] = useState(null);

  const [artistOriginFeatures, setArtistOriginFeatures] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY
  const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useDebounce(
    () => setDebouncedSearchTerm(searchTerm), 1000, [searchTerm] 
  );

  const fetchArtistOriginFeatures = async (artist_mb) => {
    
    // for now assume area_mb.relations is nonempty
    if(!Object.hasOwn(artist_mb, "begin-area")){
      // if begin-area doesnt exist use country
        if (artist_mb.country === null) throw new Error("Artist does not have a country")
        
        setCountryCode(artist_mb.country);
        return;
    }
    const beginArea_mb = await mbApi.lookup('area', artist_mb["begin-area"].id, ['area-rels']);
    if (beginArea_mb.relations === null){
        setCountryCode(artist_mb.country);
        return;
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
        setArtistOriginFeatures(data.features[0]);

    } catch(err) {
        console.error("Error trying to find country using area-rels:", err);
    }

  }

const fetchOrigin = async () => {

      try {
        // search artist from mb
        const res = await mbApi.search('artist', {query: `${searchTerm}`});

        if(res.count == 0){
          throw new Error('Failed to find artist of that name from musicbrainz');
        } 
        const artist = res.artists[0]
        console.log(res);

        // get artist mb entity
        const artist_mb = await mbApi.lookup('artist', artist.id, ['aliases']);
        setArtistEntity(artist_mb);
        fetchArtistOriginFeatures(artist_mb);
      } catch (err) {
        console.error("Error fetching country:", err);
      }
}

  useEffect(() => {
    fetchOrigin();
  }, [debouncedSearchTerm]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        Where {searchTerm} is from
      </h1>

      <div className="flex justify-center mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter artist name..."
          className="border rounded-lg p-2 w-64"
        />
      </div>
      {artistEntity && <h1 className="font-sans font-semibold text-center text-xl">{artistEntity["begin-area"] === null ? "No begin area found" : artistEntity["begin-area"]["name"]}</h1>}
      <div className="flex justify-center mt-4">
        <img src={artistOriginFeatures && findFlagUrlByIso2Code(artistOriginFeatures.properties.context.country.country_code)} alt="Country flag" className="w-md"/>
      </div>
        <Map artistEntity={artistEntity} artistOriginFeatures={artistOriginFeatures}></Map>
    </div>
  );
}

export default App;