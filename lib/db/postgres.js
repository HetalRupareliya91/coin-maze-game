// Only imported/used when process.env.DATABASE_URL is set (see
// app/api/leaderboard/route.js). Uses the `pg` package, a pure-JS Postgres
// driver with no native build step, so it installs the same everywhere
// (including Windows) unlike native-compiled SQLite bindings.

import { Pool } from "pg";

let pool = null;
let tableReady = null;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function ensureTable() {
  if (!tableReady) {
    tableReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        time_ms INTEGER NOT NULL,
        played_on TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
  return tableReady;
}

export async function getScores(limit) {
  await ensureTable();
  const { rows } = await getPool().query(
    'SELECT name, score, time_ms AS "timeMs", played_on AS date FROM leaderboard ORDER BY score DESC LIMIT $1',
    [limit]
  );
  return rows;
}

export async function insertScore({ name, score, timeMs }, limit) {
  await ensureTable();
  const date = new Date().toLocaleDateString();
  await getPool().query("INSERT INTO leaderboard (name, score, time_ms, played_on) VALUES ($1, $2, $3, $4)", [
    name,
    score,
    timeMs,
    date,
  ]);
  return getScores(limit);
}
