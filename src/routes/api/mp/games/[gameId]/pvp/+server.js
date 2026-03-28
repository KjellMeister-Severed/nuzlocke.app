import { initDb, query } from '$lib/server/db.js'
import { json } from '@sveltejs/kit'
import { randomUUID } from 'crypto'

// GET: Fetch all PvP battles for this game
export async function GET({ params }) {
  await initDb()
  const { gameId } = params

  const result = await query(
    `SELECT b.id, b.boss_id, b.player1_id, b.player2_id, b.winner_id, b.created_at,
            p1.name AS player1_name, p2.name AS player2_name,
            COALESCE(w.name, '') AS winner_name
     FROM mp_pvp_battles b
     JOIN mp_players p1 ON p1.id = b.player1_id
     JOIN mp_players p2 ON p2.id = b.player2_id
     LEFT JOIN mp_players w ON w.id = b.winner_id
     WHERE b.game_id = $1
     ORDER BY b.created_at`,
    [gameId]
  )

  return json({ battles: result.rows })
}

// POST: Record a PvP battle result
export async function POST({ params, request }) {
  await initDb()
  const { gameId } = params
  const { bossId, player1Id, player2Id, winnerId, pincode } =
    await request.json()

  if (!bossId || !player1Id || !player2Id) {
    return json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify pincode belongs to one of the participants
  const pinCheck = await query(
    'SELECT id FROM mp_players WHERE id IN ($1, $2) AND game_id = $3 AND pincode = $4',
    [player1Id, player2Id, gameId, pincode]
  )
  if (pinCheck.rows.length === 0) {
    return json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Check if this battle already exists
  const existing = await query(
    `SELECT id FROM mp_pvp_battles
     WHERE game_id = $1 AND boss_id = $2
       AND ((player1_id = $3 AND player2_id = $4) OR (player1_id = $4 AND player2_id = $3))`,
    [gameId, bossId, player1Id, player2Id]
  )

  if (existing.rows.length > 0) {
    // Update existing battle with winner
    await query('UPDATE mp_pvp_battles SET winner_id = $1 WHERE id = $2', [
      winnerId || null,
      existing.rows[0].id
    ])
    return json({ id: existing.rows[0].id, updated: true })
  }

  const id = randomUUID().split('-')[0]

  await query(
    `INSERT INTO mp_pvp_battles (id, game_id, boss_id, player1_id, player2_id, winner_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, gameId, bossId, player1Id, player2Id, winnerId || null]
  )

  return json({ id, created: true })
}
