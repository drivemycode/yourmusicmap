import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from "react-leaflet-cluster";      
      
const ArtistMap = ({ artists 
     // 2d array
     // first element is artist entity
     // second element is artist origin features
}) => {
  return (
      <MapContainer center={[0, 0]} zoom={3} class="my-10">
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {artists.length > 0 && (
          artists.map( (artist, index) => (
        <Marker key={index+1} position={artist[1] ? artist[1].geometry.coordinates.toReversed() : [0, 0]}>
          <Popup>
                {artist[0] && <h2>{artist[0]["begin-area"] === null ? "No begin area found" : artist[0]["begin-area"]["name"]}</h2>}
          </Popup>
        </Marker>
            ))
          )}
      </MapContainer>
  )
}      

export default ArtistMap;
