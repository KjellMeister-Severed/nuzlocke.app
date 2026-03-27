import { json } from '@sveltejs/kit'
import { query, initDb } from '$lib/server/db.js'
import crypto from 'crypto'

function generateId() {
  return crypto.randomBytes(8).toString('hex')
}

export async function POST({ request }) {
  await initDb()

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return json({ error: 'Game name is required' }, { status: 400 })
  }

  const id = generateId()
  await query('INSERT INTO mp_games (id, name) VALUES ($1, $2)', [id, name.trim()])

  return json({ id, name: name.trim() })
}
