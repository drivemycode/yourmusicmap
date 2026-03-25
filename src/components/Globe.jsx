import { useEffect, useRef } from 'react';
import * as globeletjs from "globeletjs";
import "globeletjs/dist/globelet.css";

const createMarkerElement = (artist) => {
    const markerElement = document.createElement("button");
    const markerCount = artist?.artists?.length ?? 1;

    markerElement.type = "button";
    markerElement.className = "flex h-4 w-4 items-center justify-center rounded-full border border-white/80 bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]";
    markerElement.style.cursor = "pointer";

    if (markerCount > 1) {
        markerElement.className = "flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/80 bg-emerald-600 px-1 text-[10px] font-semibold text-white shadow-[0_0_0_4px_rgba(16,185,129,0.2)]";
        markerElement.textContent = `${markerCount}`;
    }

    const artistNames = artist?.names?.length
        ? artist.names.join(", ")
        : artist?.name ?? "Unknown artist";

    markerElement.setAttribute("aria-label", artistNames);
    markerElement.title = artistNames;

    return markerElement;
};

const Globe = ( { artists 
     // artists is an array of multiple artists
     // one artist is one dictionary of different attributes
}) => {
    const containerRef = useRef(null);
    const globeRef = useRef(null);
    const markersRef = useRef([]);
    const artistsRef = useRef(artists);

    artistsRef.current = artists;

    const syncMarkers = () => {
        const globe = globeRef.current;
        if (!globe) return;

        markersRef.current.forEach((marker) => {
            globe.removeMarker(marker);
        });
        markersRef.current = [];

        const nextMarkers = artistsRef.current
            .filter((artist) => {
                const coordinates = artist?.["origin-features"]?.geometry?.coordinates;
                return Array.isArray(coordinates) && coordinates.length >= 2;
            })
            .map((artist) => {
                const [longitude, latitude] = artist["origin-features"].geometry.coordinates;

                return globe.addMarker({
                    element: createMarkerElement(artist),
                    position: [longitude, latitude],
                });
            });

        markersRef.current = nextMarkers;
    };

    useEffect( () => {
        let cancelled = false;

        const init = async () => {
            if(!containerRef.current) return;

            const params = {
                container: containerRef.current,
                style: "/globe-style.json",
            };

            const globe = await globeletjs.initGlobe(params);
            if(cancelled){
                globe?.destroy?.();
                return;
            }
            globe.startAnimation();
            globeRef.current = globe;
            syncMarkers();
        }
        init();

        return () => {
            cancelled = true;
            markersRef.current.forEach((marker) => {
                globeRef.current?.removeMarker(marker);
            });
            markersRef.current = [];
            globeRef.current?.destroy?.();
            globeRef.current = null;
        };
    }, [])

    useEffect(() => {
        syncMarkers();
    }, [artists]);

    return (
        <div ref={containerRef} className="h-[600px] w-full"/>
    );
}

export default Globe;
