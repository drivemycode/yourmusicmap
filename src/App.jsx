import { useState, useEffect } from "react";
import { useDebounce } from "react-use";
import { MusicBrainzApi } from 'musicbrainz-api';

const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const COUNTRY_FLAG_EMOJIS_URL = "https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/by-code.json";

function App() {
  const mbApi = new MusicBrainzApi({
    appName: 'my-app',
    appVersion: '0.1.0',
    appContactInfo: 'user@mail.org',
  })
  const [searchTerm, setSearchTerm] = useState("Radiohead");
  const [country, setCountry] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY

  useDebounce(
    () => setDebouncedSearchTerm(searchTerm), 500, [searchTerm] 
  );

const fetchCountryFlagEmojis = async () => {
  try {
    const res = await fetch(COUNTRY_FLAG_EMOJIS_URL);
    const data = await res.json();

    ret
    console.log(data);

  } catch {
        console.error("Error getting country flag emojis:", err);
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
        setCountry(artist_mb.country);
      } catch (err) {
        console.error("Error fetching country:", err);
      }
}
  useEffect(() => {
      fetchCountryFlagEmojis()
  }, [])

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
      {country}
      </div>
    </div>
  );
}

export default App;