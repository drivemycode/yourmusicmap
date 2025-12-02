import { useState, useEffect } from "react";
import { useDebounce } from "react-use";

import { MusicBrainzApi } from 'musicbrainz-api';
import { findFlagUrlByIso2Code } from 'country-flags-svg-v2';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";


const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const MAPBOX_BASE_URL = "https://api.mapbox.com/search";

const mbApi = new MusicBrainzApi({
  appName: 'my-app',
  appVersion: '0.1.0',
  appContactInfo: 'user@mail.org',
})

function App() {

  const [searchTerm, setSearchTerm] = useState("Hans Zimmer");
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
      // refactor this to mb browse next time
      const url = new URL(LASTFM_BASE_URL);
      url.searchParams.set("method", "artist.getinfo");
      url.searchParams.set("artist", searchTerm);
      url.searchParams.set("api_key", LASTFM_API_KEY);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "5");

      try {
        // get artist info from lastfm
        const res = await fetch(url);
        if(!res.ok){
          throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();
        console.log(data);
        if(!Object.hasOwn(data, "artist")){
          throw new Error('Failed to find artist of that name from LastFM');
        }
        if(!Object.hasOwn(data.artist, 'mbid')){
          throw new Error('Failed to fetch artist MBID');
        }
        
        // get artist mb entity
        const artist_mb = await mbApi.lookup('artist', data.artist.mbid, ['aliases']);
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

      <MapContainer center={artistOriginFeatures ? artistOriginFeatures.geometry.coordinates.toReversed() : [0, 0]} zoom={6} className="mt-4">
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup>
        <Marker position={artistOriginFeatures ? artistOriginFeatures.geometry.coordinates.toReversed() : [0, 0]}>
          <Popup>
                {artistEntity && <h2>{artistEntity["begin-area"] === null ? "No begin area found" : artistEntity["begin-area"]["name"]}</h2>}
          </Popup>
        </Marker>
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default App;