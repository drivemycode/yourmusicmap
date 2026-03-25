import Header from "./Header";
import { useState, useEffect } from "react";
import { useDebounce } from "react-use";
import { fetchLastFMTopArtistsHelper } from "../utils/helpers";
import ArtistMap from "./ArtistMap";


const TopArtists = () => {
    const [username, setUsername] = useState("");
    const [debouncedUsername, setDebouncedUsername] = useState('');
    const [artists, setArtists] = useState([]);

    const groupedArtists = artists.reduce((groups, artist) => {
        const coordinates = artist["origin-features"]?.geometry?.coordinates;

        if (!coordinates) {
            groups.push({
                ...artist,
                artists: [artist],
            });
            return groups;
        }

        const key = coordinates.join(",");
        const existingGroup = groups.find(
            (group) => group["origin-features"]?.geometry?.coordinates?.join(",") === key
        );

        if (existingGroup) {
            existingGroup.artists.push(artist);
            existingGroup.names = existingGroup.artists.map((groupArtist) => groupArtist.name);
            existingGroup.totalPlaycount = existingGroup.artists.reduce(
                (sum, groupArtist) => sum + Number(groupArtist.playcount ?? 0),
                0
            );
            existingGroup.rank = Math.min(
                ...existingGroup.artists.map((groupArtist) => Number(groupArtist.rank ?? Number.MAX_SAFE_INTEGER))
            ).toString();
            return groups;
        }

        groups.push({
            ...artist,
            artists: [artist],
            names: [artist.name],
            totalPlaycount: Number(artist.playcount ?? 0),
        });

        return groups;
    }, []);

    const fetchLastFMTopArtists = async (name) => {
        try {
            const topArtists = await fetchLastFMTopArtistsHelper(name);
            setArtists(topArtists);
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
        <div className="min-h-screen bg-gray-100 p-6">
            <Header />    
            <h2 className="my-20 text-center text-3xl font-bold text-slate-800">Your top artists came from..</h2>
            <div className="flex justify-center mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter last.fm username.."
          className="border rounded-lg p-2 w-64"
        />
      </div>
      {artists.length > 0 && (
        <p className="mb-6 text-center text-sm font-medium text-slate-600">
          {artists.length} artists mapped across {groupedArtists.length} locations
        </p>
      )}
      <ArtistMap artists={groupedArtists}/>
        </div>
    )
}

export default TopArtists
