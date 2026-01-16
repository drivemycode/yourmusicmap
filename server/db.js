import pg from 'pg'
const { Pool} = pg;

export const pool = new Pool({
  host: 'localhost',
  port: 5000,          
  user: 'musicbrainz',
  password: 'musicbrainz',
  database: 'musicbrainz',
  statement_timeout: 5000
});