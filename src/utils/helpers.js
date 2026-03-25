import { MusicBrainzApi } from 'musicbrainz-api';

const MAPBOX_BASE_URL = "https://api.mapbox.com/search";
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY

const mbApi = new MusicBrainzApi({
  appName: 'my-app',
  appVersion: '0.1.0',
  appContactInfo: 'user@mail.org',
})

export const fetchOriginHelper = async (artistName) => {
      try {
        // search artist from mb
        const res = await mbApi.search('artist', {query: artistName});

        if(res.count == 0){
          throw new Error('Failed to find artist of that name from musicbrainz');
        } 
        const artist = res.artists[0]

        // get artist mb entity
        const artist_mb = await mbApi.lookup('artist', artist.id, ['aliases']);
        
        return artist_mb;


      } catch (err) {
        console.error("Error fetching country:", err);
      }
}

export const fetchArtistOriginFeaturesHelper = async (artist_mb) => {
    const beginArea_mb = await mbApi.lookup('area', artist_mb["begin-area"].id, ['area-rels']);
    if (beginArea_mb.relations === null){
      throw new Error("No musicbrainz begin area could be found");    
    }

    // try to find the origin country
    let query = `${beginArea_mb.name} `;
    const n = beginArea_mb.relations.length;

    for(let i = 0; i < Math.min(n, 3); i ++) {
      query += beginArea_mb.relations[i].area.name + " ";

    }
    const url = new URL(`${MAPBOX_BASE_URL}/geocode/v6/forward`);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
    url.searchParams.set("limit", "1");
    url.searchParams.set("types", "district,place,locality");

    try {
        const res = await fetch(url);
        if(!res.ok){
          throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();   
        
        if(data.features.length == 0) throw new Error("Mapbox could not find any features based on area-rels provided by MusicBrainz")
        
        return data.features[0]; // return artist.originfeatures

    } catch(err) {
        console.error("Error trying to find country using area-rels:", err);
    }
}

export const fetchLastFMTopArtistsHelper = async (username) => {
    const url = new URL(LASTFM_BASE_URL);
    url.searchParams.set("method", "user.gettopartists");
    url.searchParams.set("user", username);
    url.searchParams.set("period", "overall");
    url.searchParams.set("limit", 10);
    url.searchParams.set("api_key", LASTFM_API_KEY);
    url.searchParams.set("format", "json");
    
    try {
        const res = await fetch(url);
        if(!res.ok){
            throw new Error('Failed to fetch artist from LastFM');
        }
        const data = await res.json();

        // data.topartists.artist is an array of the user's top artists
        console.log("Last fm top artists get req result");
        console.log(data); 
        const arr = await formatArtistsHelperV2(data.topartists.artist);
      
        return arr;
    } catch(err) {
        console.error('An error has occurred when trying to find your top LastFM artists', err);
        return [];
    } finally {
    }
}

// fetches artist origins 
export const formatArtistsHelper = async (artists) => {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now.bind(performance) : Date.now;
  const start = now();

  const n = artists.length
  let formatted_artists = new Array(n);

  for(let i = 0; i < n; i += 1){
      let artist_dict = {};
      const artist_mb = await fetchOriginHelper(artists[i].name);
      const artist_origin_features = await fetchArtistOriginFeaturesHelper(artist_mb);

      artist_dict["mb"] = artist_mb;
      artist_dict["origin-features"] = artist_origin_features;
      artist_dict["playcount"] = artists[i].playcount
      artist_dict["rank"] = artists[i]["@attr"]["rank"]
      artist_dict["url"] = artists[i]["url"]

      formatted_artists[i] = artist_dict;
  }

  const end = now();
  const duration = end - start;
  console.log(`formatArtistsHelper took ${duration.toFixed(2)} ms`);
  // attach duration (ms) to the returned array as a non-enumerable property
  Object.defineProperty(formatted_artists, 'durationMs', {
    value: duration,
    enumerable: false,
    writable: true,
    configurable: true,
  });

  return formatted_artists;
}

export const queryDB = async (query) => {
  try {
    const res = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
      })
    });

    const json = await res.json();

    return json;
  } catch(err) {
        console.error(`An error has occurred when trying to execute ${query}`, err);
  }
}

// format artists all at once in batch api calls
export const formatArtistsHelperV2 = async (artists) => {
  // use batch post
let q = "query {\n";
artists.forEach((a, i) => {
  const name = (a.name ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  const mbid = (a.mbid ?? "").trim();

  const condition = mbid ? `gid: "${mbid}"` : `name: "${name}"`;
  const first = mbid ? 1 : 10;

  q += `  a${i}: allArtists(condition: { ${condition} }, first: ${first}) {
    nodes {
      gid
      name
      beginArea
    }
  }
`;
});
  q += "}\n";
  const artistData = await queryDB(q);
  console.log(artistData);

  const artistNodes = Object.values(artistData?.data ?? {}).map((artistConnection) => {
    const nodes = artistConnection?.nodes ?? [];
    return nodes[0] ?? null;
  });

  // for now.. ignore artists with NO begin area
  const beginAreaIds = [...new Set(
    artistNodes
      .map((artist) => artist?.beginArea)
      .filter((beginAreaId) => beginAreaId !== null && beginAreaId !== undefined)
  )];

  console.log(beginAreaIds);

  let beginAreaById = new Map();
  let beginAreaCountryById = new Map();
  if (beginAreaIds.length > 0) {
    const areaQuery = `query {
  allAreas(filter: { id: { in: [${beginAreaIds.join(", ")}] } }, first: ${beginAreaIds.length}) {
    nodes {
      id
      name
    }
  }
}`;

    const beginAreaData = await queryDB(areaQuery);

    beginAreaById = new Map(
      (beginAreaData?.data?.allAreas?.nodes ?? []).map((area) => [area.id, area.name])
    );

    let countryQuery = "query {\n";
    beginAreaIds.forEach((beginAreaId, i) => {
      countryQuery += `  c${i}: areaParentCountries(areaId: ${beginAreaId}) {
    nodes {
      countryName
      depth
    }
  }
`;
    });
    countryQuery += "}\n";

    const beginAreaCountryData = await queryDB(countryQuery);

    beginAreaCountryById = new Map(
      beginAreaIds.map((beginAreaId, i) => {
        const countryNodes = beginAreaCountryData?.data?.[`c${i}`]?.nodes ?? [];
        return [beginAreaId, countryNodes[0]?.countryName ?? null];
      })
    );
  }

  const url = new URL(`${MAPBOX_BASE_URL}/geocode/v6/batch`)
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "1");
  let post_body = [];
  const n = artistNodes.length;
  for(let i = 0; i < n; i ++){
      const beginAreaId = artistNodes[i]?.beginArea;
      const beginAreaName = beginAreaById.get(beginAreaId) ?? null;
      const beginAreaCountryName = beginAreaCountryById.get(beginAreaId) ?? null;
      const geocodeQuery = [beginAreaName, beginAreaCountryName]
        .filter(Boolean)
        .join(", ");

      post_body.push({
        "q": geocodeQuery || null,
        "types": ["district", "place", "locality"],
      })
  }

  let geocodeCollections = [];
  if (post_body.some((entry) => entry.q)) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(post_body),
      });

      if (!res.ok) {
        throw new Error(`Failed to geocode begin areas with Mapbox: ${res.status}`);
      }

      const geocodeData = await res.json();
      geocodeCollections = Array.isArray(geocodeData?.batch)
        ? geocodeData.batch
        : Array.isArray(geocodeData)
          ? geocodeData
          : [];
    } catch (err) {
      console.error("Error trying to batch geocode begin areas:", err);
    }
  }

  let formatted_artists = new Array(n);
  for(let i = 0; i < n; i += 1){
      const artistNode = artistNodes[i];
      const beginAreaId = artistNode?.beginArea ?? null;
      const beginAreaName = beginAreaById.get(beginAreaId) ?? null;
      const featureCollection = geocodeCollections[i];
      const originFeature = featureCollection?.features?.[0] ?? null;
      const artistImage = [...(artists[i]?.image ?? [])]
        .reverse()
        .find((image) => image?.["#text"])?.["#text"] ?? null;

      formatted_artists[i] = {
        "gid": artistNode?.gid ?? null,
        "name": artistNode?.name ?? artists[i]?.name ?? null,
        "begin-area": beginAreaId !== null ? {
          "id": beginAreaId,
          "name": beginAreaName,
        } : null,
        "origin-features": originFeature,
        "image": artistImage,
        "playcount": artists[i]?.playcount,
        "rank": artists[i]?.["@attr"]?.rank,
        "url": artists[i]?.url,
      };
  }

  return formatted_artists;
}
