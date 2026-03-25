import { useEffect, useRef } from 'react';
import * as globeletjs from "globeletjs";
import "globeletjs/dist/globelet.css";

const Globe = ( { artists 
     // artists is an array of multiple artists
     // one artist is one dictionary of different attributes
}) => {
    const containerRef = useRef(null);
    const globeRef = useRef(null);

    useEffect( () => {
        let cancelled = false;

        const init = async () => {
            if(!containerRef.current) return;

            const params = {
                container: containerRef.current,
                style: "./klokantech-basic-style-geojson.json",
                center: [-100, 38.5],
                altitude: 6280,
            };

            const globe = await globeletjs.initGlobe(params);
            if(cancelled){
                globe?.destroy?.();
                return;
            }
            globeRef.current = globe;
        }
        init();

        return () => {
            cancelled = true;
            globeRef.current?.destroy?.();
            globeRef.current = null;
        };
    }, [])
    return (
        <div ref={containerRef} className="h-[600px] w-full"/>
    );
}

export default Globe;