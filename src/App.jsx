import { useState, useEffect } from "react";
import { useDebounce } from "react-use";

import { MusicBrainzApi } from 'musicbrainz-api';
import { findFlagUrlByIso2Code } from 'country-flags-svg-v2';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";

const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const MAPBOX_BASE_URL = "https://api.mapbox.com/search/geocode/v6/forward";

const mbApi = new MusicBrainzApi({
  appName: 'my-app',
  appVersion: '0.1.0',
  appContactInfo: 'user@mail.org',
})

function App() {

  const [searchTerm, setSearchTerm] = useState("Radiohead");
  const [countryFlag, setCountryFlag] = useState("");
  const [artistEntity, setArtistEntity] = useState(null);
  const [artistAreaGeocode, setArtistAreaGeocode] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY
  const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useDebounce(
    () => setDebouncedSearchTerm(searchTerm), 1000, [searchTerm] 
  );

  const fetchGeocode = async (artist_mb) => {

    // assume that the country attribute of the mb entity is not null
    const url = new URL(MAPBOX_BASE_URL);
    const country = artist_mb.country;
    const beginArea = artist_mb["begin-area"];

    if (beginArea === null){
      url.searchParams.set("q", country.name);
    } else {
      url.searchParams.set("q", beginArea.name);
      url.searchParams.set("country", country);
    }
    url.searchParams.set("limit", "1");
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);

    try {
        const res = await fetch(url);
        if(!res.ok){
          throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();

        const geocodes = data.features;
        if(geocodes === null) throw new Error(`No geocodes could be found for ${country.name}, ${beginArea.name}`);

        const geocode = geocodes[0].geometry.coordinates;

        setArtistAreaGeocode(geocode.reverse()); // have to flip the geocode to normal
    } catch(err) {
        console.error("Error fetching country geocode:", err);
    }
  }

const fetchCountry = async () => {
      const url = new URL(LASTFM_BASE_URL);
      url.searchParams.set("method", "artist.getinfo");
      url.searchParams.set("artist", searchTerm);
      url.searchParams.set("api_key", LASTFM_API_KEY);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "5");

      try {
        const res = await fetch(url);
        if(!res.ok){
          throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();
        
        if(!Object.hasOwn(data, "artist")){
          throw new Error('Failed to find artist of that name from LastFM');
        }
        if(!Object.hasOwn(data.artist, 'mbid')){
          throw new Error('Failed to fetch artist MBID');
        }
        
        const artist_mb = await mbApi.lookup('artist', data.artist.mbid, ['aliases']);
        setArtistEntity(artist_mb);
        
        console.log(artist_mb);
        if (artist_mb.country === null) throw new Error("Artist does not have a country")

        const country_code = artist_mb.country;
        const flagUrl = findFlagUrlByIso2Code(country_code);
        setCountryFlag(flagUrl);

        fetchGeocode(artist_mb);

      } catch (err) {
        console.error("Error fetching country:", err);
      }
}

  useEffect(() => {
    fetchCountry();
  }, [debouncedSearchTerm]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        where {searchTerm} is from
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
      <div className="flex justify-center mt-4">
        {countryFlag && <img src={countryFlag} alt="Country flag" />}
      </div>

      <MapContainer center={artistAreaGeocode ?? [0,0]} zoom={6} className="mt-4">
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup>
        <Marker position={artistAreaGeocode ?? [0,0]}>
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