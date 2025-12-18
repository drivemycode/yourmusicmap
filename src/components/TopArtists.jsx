import Header from "./Header";
import { useState, useEffect } from "react";
import { useDebounce } from "react-use";
import { fetchLastFMTopArtistsHelper } from "../utils/helpers";
import ArtistMap from "./ArtistMap";


const TopArtists = () => {
    const [username, setUsername] = useState("");
    const [debouncedUsername, setDebouncedUsername] = useState('');
    const [artists, setArtists] = useState([]);

    const fetchLastFMTopArtists = async (name) => {
        try {
            const topArtists = await fetchLastFMTopArtistsHelper(name);
            setArtists(topArtists);
            console.log(topArtists);
        } catch(err) {
            console.error("There's been an error fetching your top artists on Lastfm", err)
        }
    }

    useDebounce(
    () => setDebouncedUsername(username), 1000, [username] 
    );

    useEffect(() => {
        fetchLastFMTopArtists(username);
    }, [debouncedUsername]);


    return (
        <div class="min-h-screen bg-gray-100 p-6">
            <Header />    
            <h2 class="my-20">Your top artists came from..</h2>
            <div className="flex justify-center mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter last.fm username.."
          className="border rounded-lg p-2 w-64"
        />
      </div>
      <ArtistMap artists={artists}/>
        </div>
    )
}

export default TopArtists