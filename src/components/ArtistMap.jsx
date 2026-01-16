import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from "react-leaflet-cluster";      
import ArtistPopup from './ArtistPopup';

const ArtistMap = ({ artists 
     // 2d array
     // first element is artist entity
     // second element is artist origin features

     // artists is an array of multiple artists
     // one artist is one dictionary of different attributes
}) => {
  return (
      <MapContainer center={[0, 0]} zoom={3} class="my-10">
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {artists.length > 0 && (
          artists.map( (artist, index) => (
        <Marker key={index+1} position={artist["origin-features"] ? artist["origin-features"].geometry.coordinates.toReversed() : [0, 0]}>
          <ArtistPopup artist={artist}></ArtistPopup>
        </Marker>
            ))
          )}
      </MapContainer>
  )
}      

export default ArtistMap;
