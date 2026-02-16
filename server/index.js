import { postgraphile } from "postgraphile";
import express from "express";
import cors from "cors";
import ConnectionFilterPlugin from "postgraphile-plugin-connection-filter";

const app = express();

app.use(cors({
  origin: "http://127.0.0.1:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

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
