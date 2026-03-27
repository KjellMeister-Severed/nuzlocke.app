import { json } from '@sveltejs/kit'
import { query, initDb } from '$lib/server/db.js'

export async function GET({ params }) {
  await initDb()
  const { gameId } = params

  const gameResult = await query('SELECT * FROM mp_games WHERE id = $1', [gameId])
  if (gameResult.rows.length === 0) {
    return json({ error: 'Game not found' }, { status: 404 })
  }

  const playersResult = await query(
    'SELECT id, name, pokemon_game, created_at, updated_at FROM mp_players WHERE game_id = $1 ORDER BY created_at',
    [gameId]
  )

  return json({
    game: gameResult.rows[0],
    players: playersResult.rows
  })
}
