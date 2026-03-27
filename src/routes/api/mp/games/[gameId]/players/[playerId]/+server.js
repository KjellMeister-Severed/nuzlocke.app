import { initDb, query } from '$lib/server/db.js'
import { json } from '@sveltejs/kit'

export async function GET({ params }) {
  await initDb()
  const { gameId, playerId } = params

  const result = await query(
    'SELECT id, name, pokemon_game, game_data, save_meta, created_at, updated_at FROM mp_players WHERE id = $1 AND game_id = $2',
    [playerId, gameId]
  )

  if (result.rows.length === 0) {
    return json({ error: 'Player not found' }, { status: 404 })
  }

  return json(result.rows[0])
}

export async function PUT({ params, request }) {
  await initDb()
  const { gameId, playerId } = params
  const { pincode, gameData, saveMeta } = await request.json()

  // Verify pincode
  const playerResult = await query(
    'SELECT pincode FROM mp_players WHERE id = $1 AND game_id = $2',
    [playerId, gameId]
  )

  if (playerResult.rows.length === 0) {
    return json({ error: 'Player not found' }, { status: 404 })
  }

  if (playerResult.rows[0].pincode !== pincode) {
    return json({ error: 'Invalid PIN code' }, { status: 403 })
  }

  const updates = []
  const values = []
  let paramIndex = 1

  if (gameData !== undefined) {
    updates.push(`game_data = $${paramIndex++}`)
    values.push(
      typeof gameData === 'string' ? gameData : JSON.stringify(gameData)
    )
  }

  if (saveMeta !== undefined) {
    updates.push(`save_meta = $${paramIndex++}`)
    values.push(saveMeta)
  }

  updates.push(`updated_at = NOW()`)

  values.push(playerId, gameId)

  await query(
    `UPDATE mp_players SET ${updates.join(
      ', '
    )} WHERE id = $${paramIndex++} AND game_id = $${paramIndex}`,
    values
  )

  return json({ success: true })
}
