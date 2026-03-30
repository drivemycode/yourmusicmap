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
    try {
        const res = await fetch("/api/origin-features", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artists: [{
              gid: artist_mb?.id ?? null,
              name: artist_mb?.name ?? null,
              beginAreaName: beginArea_mb?.name ?? null,
              beginAreaCountryName: beginArea_mb?.relations?.[0]?.area?.name ?? null,
            }],
          }),
        });
        if(!res.ok){
          throw new Error('Failed to fetch cached artist origin features');
        }
        const data = await res.json();   
        const featureCollection = data?.results?.[0] ?? null;
        
        if((featureCollection?.features ?? []).length == 0) throw new Error("Mapbox could not find any features based on area-rels provided by MusicBrainz")
        
        return featureCollection.features[0]; // return artist.originfeatures

    } catch(err) {
        console.error("Error trying to find country using area-rels:", err);
    }
}

const fetchLastFMTopArtistsPage = async (username, limit, page = 1) => {
    const url = new URL(LASTFM_BASE_URL);
    url.searchParams.set("method", "user.gettopartists");
    url.searchParams.set("user", username);
    url.searchParams.set("period", "overall");
    url.searchParams.set("limit", limit);
    url.searchParams.set("page", page);
    url.searchParams.set("api_key", LASTFM_API_KEY);
    url.searchParams.set("format", "json");

    const res = await fetch(url);
    if(!res.ok){
        throw new Error('Failed to fetch artist from LastFM');
    }

    return res.json();
}

export const fetchLastFMTopArtistsHelper = async (username, limit = 10) => {
    try {
        let topArtists = [];

        if (limit === "all") {
            let page = 1;
            let totalPages = 1;

            do {
                const data = await fetchLastFMTopArtistsPage(username, 100, page);
                const pageArtists = data?.topartists?.artist ?? [];
                const attr = data?.topartists?.["@attr"] ?? {};

                topArtists = topArtists.concat(pageArtists);
                totalPages = Number(attr.totalPages ?? page);
                page += 1;
            } while (page <= totalPages);
        } else {
            const data = await fetchLastFMTopArtistsPage(username, limit, 1);
            topArtists = data?.topartists?.artist ?? [];
        }

        console.log("Last fm top artists get req result");
        console.log(topArtists);

        const arr = await formatArtistsHelperV2(topArtists);

        return arr;
    } catch(err) {
        console.error('An error has occurred when trying to find your top LastFM artists', err);
        return [];
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

    if (!res.ok) {
      throw new Error(`GraphQL request failed with status ${res.status}`);
    }

    const json = await res.json();

    return json;
  } catch(err) {
        console.error(`An error has occurred when trying to execute ${query}`, err);
  }
}

const chunkArray = (arr, chunkSize) => {
  const chunks = [];

  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }

  return chunks;
};

// format artists all at once in batch api calls
export const formatArtistsHelperV2 = async (artists) => {
  const artistQueryChunks = chunkArray(artists, 40);
  let artistNodes = [];

  for (const artistChunk of artistQueryChunks) {
    let q = "query {\n";

    artistChunk.forEach((a, i) => {
      const name = (a.name ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      const mbid = (a.mbid ?? "").trim();

      if (mbid) {
        q += `  artist${i}: allArtists(condition: { gid: "${mbid}" }, first: 1) {
    nodes {
      id
      gid
      name
      beginArea
    }
  }
`;
        return;
      }

      q += `  artist${i}: allArtists(condition: { name: "${name}" }, first: 10) {
    nodes {
      id
      gid
      name
      beginArea
    }
  }
  alias${i}: allArtistAliases(condition: { name: "${name}" }, first: 10) {
    nodes {
      artist
    }
  }
`;
    });

    q += "}\n";
    const artistData = await queryDB(q);

    const chunkNodes = new Array(artistChunk.length).fill(null);
    const aliasArtistIdsByIndex = new Map();

    artistChunk.forEach((a, i) => {
      const mbid = (a.mbid ?? "").trim();

      if (mbid) {
        const nodes = artistData?.data?.[`artist${i}`]?.nodes ?? [];
        chunkNodes[i] = nodes[0] ?? null;
        return;
      }

      const artistNodesByName = artistData?.data?.[`artist${i}`]?.nodes ?? [];
      const directArtistMatch =
        artistNodesByName.find((artist) => artist?.beginArea !== null && artist?.beginArea !== undefined)
        ?? artistNodesByName[0]
        ?? null;

      if (directArtistMatch !== null) {
        chunkNodes[i] = directArtistMatch;
        return;
      }

      const aliasNodes = artistData?.data?.[`alias${i}`]?.nodes ?? [];
      const aliasArtistIds = [...new Set(
        aliasNodes
          .map((aliasNode) => aliasNode?.artist)
          .filter((artistId) => artistId !== null && artistId !== undefined)
      )];

      if (aliasArtistIds.length > 0) {
        aliasArtistIdsByIndex.set(i, aliasArtistIds);
      }
    });

    const aliasArtistIds = [...new Set(
      [...aliasArtistIdsByIndex.values()].flat()
    )];
    if (aliasArtistIds.length > 0) {
      const aliasArtistQuery = `query {
  allArtists(filter: { id: { in: [${aliasArtistIds.join(", ")}] } }, first: ${aliasArtistIds.length}) {
    nodes {
      id
      gid
      name
      beginArea
    }
  }
}`;

      const aliasArtistData = await queryDB(aliasArtistQuery);
      const aliasArtistsById = new Map(
        (aliasArtistData?.data?.allArtists?.nodes ?? []).map((artist) => [artist.id, artist])
      );

      aliasArtistIdsByIndex.forEach((artistIds, index) => {
        const resolvedArtist =
          artistIds
            .map((artistId) => aliasArtistsById.get(artistId) ?? null)
            .find((artist) => artist?.beginArea !== null && artist?.beginArea !== undefined)
          ?? aliasArtistsById.get(artistIds[0])
          ?? null;

        chunkNodes[index] = resolvedArtist;
      });
    }

    artistNodes = artistNodes.concat(chunkNodes);
  }

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
    const areaIdChunks = chunkArray(beginAreaIds, 200);

    for (const areaIdChunk of areaIdChunks) {
      const areaQuery = `query {
  allAreas(filter: { id: { in: [${areaIdChunk.join(", ")}] } }, first: ${areaIdChunk.length}) {
    nodes {
      id
      name
    }
  }
}`;

      const beginAreaData = await queryDB(areaQuery);

      (beginAreaData?.data?.allAreas?.nodes ?? []).forEach((area) => {
        beginAreaById.set(area.id, area.name);
      });
    }

    const countryIdChunks = chunkArray(beginAreaIds, 60);

    for (const countryIdChunk of countryIdChunks) {
      let countryQuery = "query {\n";
      countryIdChunk.forEach((beginAreaId, i) => {
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

      countryIdChunk.forEach((beginAreaId, i) => {
        const countryNodes = beginAreaCountryData?.data?.[`c${i}`]?.nodes ?? [];
        beginAreaCountryById.set(beginAreaId, countryNodes[0]?.countryName ?? null);
      });
    }
  }

  const n = artistNodes.length;
  let geocodeCollections = [];
  const artistsForOriginLookup = artistNodes.map((artistNode, index) => {
    const beginAreaId = artistNode?.beginArea ?? null;

    return {
      id: artistNode?.id ?? null,
      gid: artistNode?.gid ?? null,
      name: artistNode?.name ?? artists[index]?.name ?? null,
      beginAreaName: beginAreaById.get(beginAreaId) ?? null,
      beginAreaCountryName: beginAreaCountryById.get(beginAreaId) ?? null,
    };
  });

  if (artistsForOriginLookup.some((artist) => artist.beginAreaName)) {
    try {
      const res = await fetch("/api/origin-features", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artists: artistsForOriginLookup,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to geocode begin areas with backend cache: ${res.status}`);
      }

      const geocodeData = await res.json();
      geocodeCollections = Array.isArray(geocodeData?.results)
        ? geocodeData.results
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
