import { useState, useEffect } from "react";
import { useDebounce } from "react-use";

import { findFlagUrlByIso2Code } from 'country-flags-svg-v2';

import "leaflet/dist/leaflet.css";
import ArtistMap from "./components/ArtistMap";
import Header from './components/Header';
import { fetchOriginHelper, fetchArtistOriginFeaturesHelper } from "./utils/helpers";


export function App() {

  const [searchTerm, setSearchTerm] = useState("Gorillaz");
  const [artistEntity, setArtistEntity] = useState(null);

  const [artistOriginFeatures, setArtistOriginFeatures] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const fetchOrigin = async (artistName) => {
    try {
        const entity = await fetchOriginHelper(artistName);
        setArtistEntity(entity);
        fetchArtistOriginFeatures(entity);
    } catch(err) {
      console.error("There's been an error fetching the artist musicbrainz entity", err)
    }
  }

  const fetchArtistOriginFeatures = async (artist_mb) => {
    try {
        const originFeatures = await fetchArtistOriginFeaturesHelper(artist_mb);
        setArtistOriginFeatures(originFeatures);
    } catch(err) {
      console.error("There's been an error fetching the artist origin features on Mapbox", err)
    }
  }

  useDebounce(
    () => setDebouncedSearchTerm(searchTerm), 1000, [searchTerm] 
  );

  useEffect(() => {
    fetchOrigin(searchTerm);
  }, [debouncedSearchTerm]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Header />
      <h1 className="text-3xl font-bold text-center text-blue-600 my-6">
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
        {/* artists are an array [ [artist1.entity, artist1.originfeatures], ...  ] */}
        <ArtistMap artists={[[artistEntity, artistOriginFeatures ]]}/>
    </div>
  );
}
