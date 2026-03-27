import { initDb, query } from '$lib/server/db.js'
import { json } from '@sveltejs/kit'

export async function POST({ params, request }) {
  await initDb()
  const { gameId, playerId } = params
  const { pincode } = await request.json()

  const result = await query(
    'SELECT id, pincode FROM mp_players WHERE id = $1 AND game_id = $2',
    [playerId, gameId]
  )

  if (result.rows.length === 0) {
    return json({ error: 'Player not found' }, { status: 404 })
  }

  if (result.rows[0].pincode !== pincode) {
    return json({ error: 'Invalid PIN code' }, { status: 403 })
  }

  return json({ verified: true })
}
