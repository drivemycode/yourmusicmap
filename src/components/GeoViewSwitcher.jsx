import { useState } from "react";
import ArtistMap from "./ArtistMap";
import Globe from "./Globe";

const GeoViewSwitcher = ({ artists }) => {
  const [viewMode, setViewMode] = useState("map");

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

      {viewMode === "map" ? (
        <ArtistMap artists={artists} />
      ) : (
        <Globe artists={artists} />
      )}
    </>
  );
};

export default GeoViewSwitcher;
