import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from "react-leaflet-cluster";      
      
const Map = ({
    artistEntity,
    artistOriginFeatures
}) => {
  return (
      <MapContainer center={artistOriginFeatures ? artistOriginFeatures.geometry.coordinates.toReversed() : [0, 0]} zoom={3} className="mt-4">
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup>
        <Marker position={artistOriginFeatures ? artistOriginFeatures.geometry.coordinates.toReversed() : [0, 0]}>
          <Popup>
                {artistEntity && <h2>{artistEntity["begin-area"] === null ? "No begin area found" : artistEntity["begin-area"]["name"]}</h2>}
          </Popup>
        </Marker>
        </MarkerClusterGroup>
      </MapContainer>
  )
}      

export default Map
