import { initDb, query } from '$lib/server/db.js'
import { json } from '@sveltejs/kit'
import crypto from 'crypto'

function generateId() {
  return crypto.randomBytes(8).toString('hex')
}

export async function POST({ params, request }) {
  await initDb()
  const { gameId } = params
  const { name, pincode, pokemonGame } = await request.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return json({ error: 'Player name is required' }, { status: 400 })
  }
  if (!pincode || typeof pincode !== 'string' || pincode.length < 4) {
    return json(
      { error: 'PIN code must be at least 4 characters' },
      { status: 400 }
    )
  }
  if (!pokemonGame || typeof pokemonGame !== 'string') {
    return json(
      { error: 'Pokemon game selection is required' },
      { status: 400 }
    )
  }

  const gameResult = await query('SELECT * FROM mp_games WHERE id = $1', [
    gameId
  ])
  if (gameResult.rows.length === 0) {
    return json({ error: 'Game not found' }, { status: 404 })
  }

  const id = generateId()
  await query(
    'INSERT INTO mp_players (id, game_id, name, pincode, pokemon_game) VALUES ($1, $2, $3, $4, $5)',
    [id, gameId, name.trim(), pincode, pokemonGame]
  )

  return json({ id, name: name.trim(), gameId })
}
