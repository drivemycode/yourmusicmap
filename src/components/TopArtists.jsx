import Header from "./Header";
import { useState, useEffect } from "react";
import { useDebounce } from "react-use";
import { fetchLastFMTopArtistsHelper } from "../utils/helpers";
import GeoViewSwitcher from "./GeoViewSwitcher";


const TopArtists = () => {
    const [username, setUsername] = useState("");
    const [debouncedUsername, setDebouncedUsername] = useState('');
    const [artists, setArtists] = useState([]);
    const [artistLimit, setArtistLimit] = useState("10");

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
            const topArtists = await fetchLastFMTopArtistsHelper(name, artistLimit);
            setArtists(topArtists);
        } catch(err) {
            console.error("There's been an error fetching your top artists on Lastfm", err)
        }
    }

    useDebounce(
    () => setDebouncedUsername(username), 1000, [username] 
    );

    useEffect(() => {
        fetchLastFMTopArtists(debouncedUsername);
    }, [debouncedUsername, artistLimit]);


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
      <div className="mb-6 flex justify-center">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          Artist count
          <select
            value={artistLimit}
            onChange={(e) => setArtistLimit(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
      {artists.length > 0 && (
        <p className="mb-6 text-center text-sm font-medium text-slate-600">
          {artists.length} artists mapped across {groupedArtists.length} locations
        </p>
      )}
      <GeoViewSwitcher artists={groupedArtists}/>
        </div>
    )
}

export default TopArtists
