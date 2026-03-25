import { Popup} from 'react-leaflet';

const ArtistPopup = ({artist}) => {
    const artistName = artist["name"] ?? artist["mb"]?.["name"] ?? '';
    const beginAreaName = artist["begin-area"]?.["name"] ?? artist["mb"]?.["begin-area"]?.["name"] ?? '';
    const groupedArtists = artist.artists ?? [artist];
    const hasMultipleArtists = groupedArtists.length > 1;
    const locationLabel = beginAreaName || artist["origin-features"]?.properties?.name || "Unknown origin";
    const fallbackInitial = artistName.slice(0, 1).toUpperCase() || "?";

    let varPopupKickerText = "";
    groupedArtists.forEach(ga => {
        varPopupKickerText += `#${ga["rank"]}, `
    })
    varPopupKickerText = varPopupKickerText.slice(0, -2);

    if ('rank' in artist || hasMultipleArtists) {
    return (
        <Popup className="artist-popup">
            <div className="artist-popup-card">
                <p className="artist-popup-kicker">
                    {`${varPopupKickerText} from ${locationLabel}`}
                </p>
                <div className="artist-popup-list">
                    {groupedArtists.map((groupArtist, index) => {
                        const groupArtistName = groupArtist["name"] ?? groupArtist["mb"]?.["name"] ?? '';
                        const groupArtistArea = groupArtist["begin-area"]?.["name"] ?? groupArtist["mb"]?.["begin-area"]?.["name"] ?? locationLabel;

                        return (
                            <div className="artist-popup-row" key={groupArtist.gid ?? `${groupArtistName}-${index}`}>
                                {groupArtist.image ? (
                                    <img
                                        src={groupArtist.image}
                                        alt={groupArtistName}
                                        className="artist-popup-image"
                                    />
                                ) : (
                                    <div className="artist-popup-image artist-popup-image--placeholder">
                                        {groupArtistName.slice(0, 1).toUpperCase() || "?"}
                                    </div>
                                )}
                                <div className="artist-popup-copy">
                                    <h3>{groupArtistName}</h3>
                                    <p>{groupArtist.playcount ? `${groupArtist.playcount} plays` : groupArtistArea}</p>
                                    {groupArtist.url && (
                                        <a href={groupArtist.url} target="_blank" rel="noreferrer">
                                            Open on Last.fm
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Popup>
    )
    } 
        return (
        <Popup className="artist-popup">
        <div className="artist-popup-card">
            <div className="artist-popup-row">
                {artist.image ? (
                    <img
                        src={artist.image}
                        alt={artistName}
                        className="artist-popup-image"
                    />
                ) : (
                    <div className="artist-popup-image artist-popup-image--placeholder">
                        {fallbackInitial}
                    </div>
                )}
                <div className="artist-popup-copy">
                    <h3>{artistName}</h3>
                    <p>{artistName === '' && artist["origin-features"] === null ? '' : `from ${locationLabel}`}</p>
                    {artist.url && (
                        <a href={artist.url} target="_blank" rel="noreferrer">
                            Open on Last.fm
                        </a>
                    )}
                </div>
            </div>
        </div>
        </Popup>
        )
}

export default ArtistPopup;
