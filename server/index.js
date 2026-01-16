import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();

app.use(cors(
    {origin: 'http://127.0.0.1:5173'}
));
app.use(express.json());

app.post('/artist-info', async (req, res) => {
  const names = req.body.names.map(n => n.toLowerCase());

  const sql = `
SELECT DISTINCT ON (a.name)
  a.gid,
  a.name,
  ba.name AS origin,
  pa.name AS country
FROM artist a
LEFT JOIN area ba ON a.begin_area = ba.id
LEFT JOIN area pa ON ba.parent = pa.id
WHERE a.name = ANY($1)
ORDER BY a.name, a.id DESC;
    `;

  const { rows } = await pool.query(sql, [names]);
  res.json(rows);
});

app.listen(3000, () =>
  console.log('API running on http://localhost:3000')
);