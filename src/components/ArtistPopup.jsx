import { Popup} from 'react-leaflet';

const ArtistPopup = ({artist}) => {

    if ('rank' in artist) {
    return (
        <Popup>
            <h2>{artist["rank"] + ' with ' + artist["playcount"] + ' plays: ' + artist["mb"]["name"] + ' from ' + artist["mb"]["begin-area"]["name"]}</h2>
        </Popup>
    )
    } 
        return (
        <Popup>
        <h2>{artist["mb"] === null && artist["origin-features"] === null ? '' : artist["mb"]["name"] + ' from ' + artist["mb"]["begin-area"]["name"]}</h2>
        </Popup>
        )
}

export default ArtistPopup;