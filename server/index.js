import { postgraphile } from "postgraphile";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ConnectionFilterPlugin from "postgraphile-plugin-connection-filter";
import { createClient } from "redis";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnvFile = (filePath) => {
  try {
    const file = fs.readFileSync(filePath, "utf8");

    file.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
  } catch {
    // ignore missing env file
  }
};

loadEnvFile(path.resolve(__dirname, "../.env"));

const MAPBOX_ACCESS_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN
  ?? process.env.VITE_MAPBOX_ACCESS_TOKEN
  ?? "";

const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:16379",
});

redis.on("error", (error) => {
  console.error("Redis error", error);
});

await redis.connect();

app.use(cors({
  origin: "http://127.0.0.1:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const normalizeArtistKey = (artist) =>
  (artist?.gid ?? artist?.id ?? artist?.name ?? "unknown")
    .toString()
    .trim()
    .toLowerCase();

const buildOriginCacheKey = (artist) =>
  `artist-origin:${normalizeArtistKey(artist)}`;

app.post("/api/origin-features", express.json(), async (req, res) => {
  const artists = Array.isArray(req.body?.artists) ? req.body.artists : [];

  if (!MAPBOX_ACCESS_TOKEN) {
    res.status(500).json({ error: "Missing Mapbox access token on the server." });
    return;
  }

  try {
    const results = new Array(artists.length).fill(null);
    const misses = [];

    for (let i = 0; i < artists.length; i += 1) {
      const artist = artists[i];
      const beginAreaName = artist?.beginAreaName ?? null;
      const countryName = artist?.beginAreaCountryName ?? null;

      if (!beginAreaName) {
        continue;
      }

      const cacheKey = buildOriginCacheKey(artist);
      const cachedValue = await redis.get(cacheKey);

      if (cachedValue) {
        results[i] = JSON.parse(cachedValue);
        continue;
      }

      misses.push({ index: i, artist, cacheKey, beginAreaName, countryName });
    }

    if (misses.length > 0) {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/batch");
      url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
      url.searchParams.set("limit", "1");

      const chunkSize = 1000;

      for (let i = 0; i < misses.length; i += chunkSize) {
        const missChunk = misses.slice(i, i + chunkSize);
        const payload = missChunk.map((miss) => ({
          q: [miss.beginAreaName, miss.countryName].filter(Boolean).join(", "),
          types: ["district", "place", "locality"],
        }));

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Mapbox batch geocode failed with status ${response.status}`);
        }

        const data = await response.json();
        const batchResults = Array.isArray(data?.batch)
          ? data.batch
          : Array.isArray(data)
            ? data
            : [];

        await Promise.all(
          missChunk.map(async (miss, chunkIndex) => {
            const featureCollection = batchResults[chunkIndex] ?? null;
            results[miss.index] = featureCollection;

            await redis.set(
              miss.cacheKey,
              JSON.stringify(featureCollection),
              { EX: 60 * 60 * 24 * 30 }
            );
          })
        );
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error resolving cached origin features:", error);
    res.status(500).json({ error: "Failed to resolve origin features." });
  }
});

app.use(
  postgraphile(
    "postgres://musicbrainz:musicbrainz@localhost:15432/musicbrainz_db",
    "musicbrainz",
    {
      appendPlugins: [ConnectionFilterPlugin],
      graphiql: true,
      enhanceGraphiql: true,
    }
  )
);

app.listen(5050, () => {
  console.log("PostGraphile running at http://localhost:5050/graphiql");
});
