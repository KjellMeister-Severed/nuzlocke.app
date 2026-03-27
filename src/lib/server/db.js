import pg from 'pg'

const { Pool } = pg

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    })
  }
  return pool
}

export async function query(text, params) {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS mp_games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS mp_players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES mp_games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pincode TEXT NOT NULL,
      pokemon_game TEXT NOT NULL,
      game_data TEXT DEFAULT '{}',
      save_meta TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_mp_players_game_id ON mp_players(game_id)
  `)
}
