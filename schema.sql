-- Multiplayer Nuzlocke Schema
-- Run this against your PostgreSQL database to set up the required tables

CREATE TABLE IF NOT EXISTS mp_games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
);

CREATE INDEX IF NOT EXISTS idx_mp_players_game_id ON mp_players(game_id);
