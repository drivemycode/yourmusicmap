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

  const sql = `SELECT * FROM artist WHERE gid IN ANY($1);`;

  const { rows } = await pool.query(sql, [names]);
  res.json(rows);
});

app.listen(3000, () =>
  console.log('API running on http://localhost:3000')
);