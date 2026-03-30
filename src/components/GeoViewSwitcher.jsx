import { useState } from "react";
import ArtistMap from "./ArtistMap";
import Globe from "./Globe";

const GeoViewSwitcher = ({ artists }) => {
  const [viewMode, setViewMode] = useState("map");
  const artistsWithCoordinates = artists.filter((artist) => {
    const beginArea = artist?.["begin-area"];
    const coordinates = artist?.["origin-features"]?.geometry?.coordinates;
    return beginArea !== null
      && beginArea !== undefined
      && Array.isArray(coordinates)
      && coordinates.length >= 2;
  });
  const artistsWithoutBeginArea = artists.filter((artist) => {
    const beginArea = artist?.["begin-area"];
    return beginArea === null || beginArea === undefined;
  });

  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setViewMode("globe")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              viewMode === "globe"
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Globe
          </button>
        </div>
      </div>

      <div className="relative">
        {artistsWithoutBeginArea.length > 0 && (
          <aside className="absolute right-4 top-4 z-[1000] max-h-64 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Unknown begin area
            </h3>
            <p className="mb-3 text-xs text-slate-600">
              {artistsWithoutBeginArea.length} artist{artistsWithoutBeginArea.length === 1 ? "" : "s"} could not be placed on the {viewMode}.
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {artistsWithoutBeginArea.map((artist, index) => {
                const names = artist?.names?.length
                  ? artist.names
                  : artist?.artists?.map((groupArtist) => groupArtist?.name).filter(Boolean)
                  ?? [artist?.name ?? "Unknown artist"];

                return (
                  <li
                    key={`${names.join("-")}-${index}`}
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    {names.join(", ")}
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {viewMode === "map" ? (
          <ArtistMap artists={artistsWithCoordinates} />
        ) : (
          <Globe artists={artistsWithCoordinates} />
        )}
      </div>
    </>
  );
};

export default GeoViewSwitcher;
