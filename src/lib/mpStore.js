import { browser } from '$app/environment'
import { settingsDefault } from '$lib/components/Settings/_data'
import { NuzlockeGroups } from '$lib/data/states'
import { writable } from 'svelte/store'

// Multiplayer session info stored in localStorage
const MP_KEYS = {
  session: 'nuzlocke.mp.session', // { gameId, playerId, pincode }
  viewingPlayer: 'nuzlocke.mp.viewing' // playerId being viewed (if different from own)
}

export const mpSession = writable(null)
export const mpPlayers = writable([])
export const mpGameInfo = writable(null)
export const mpViewingPlayer = writable(null) // the player being viewed (read-only)
export const mpIsReadOnly = writable(false)
export const mpGameData = writable('{}')

export function loadMpSession() {
  if (!browser) return null
  const raw = localStorage.getItem(MP_KEYS.session)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    mpSession.set(session)
    return session
  } catch {
    return null
  }
}

export function saveMpSession(session) {
  if (!browser) return
  localStorage.setItem(MP_KEYS.session, JSON.stringify(session))
  mpSession.set(session)
}

export function clearMpSession() {
  if (!browser) return
  localStorage.removeItem(MP_KEYS.session)
  localStorage.removeItem(MP_KEYS.viewingPlayer)
  mpSession.set(null)
  mpViewingPlayer.set(null)
  mpIsReadOnly.set(false)
}

// Fetch multiplayer game info and player list
export async function fetchMpGame(gameId) {
  const res = await fetch(`/api/mp/games/${encodeURIComponent(gameId)}`)
  if (!res.ok) return null
  const data = await res.json()
  mpGameInfo.set(data.game)
  mpPlayers.set(data.players)
  return data
}

// Fetch a specific player's data
export async function fetchPlayerData(gameId, playerId) {
  const res = await fetch(
    `/api/mp/games/${encodeURIComponent(gameId)}/players/${encodeURIComponent(
      playerId
    )}`
  )
  if (!res.ok) return null
  return await res.json()
}

// Save player game data to the server
let saveTimeout = null
export function syncPlayerData(gameId, playerId, pincode, gameData) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    await fetch(
      `/api/mp/games/${encodeURIComponent(gameId)}/players/${encodeURIComponent(
        playerId
      )}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode, gameData })
      }
    )
  }, 1000) // Debounce saves by 1 second
}

// Verify a player's pincode
export async function verifyPin(gameId, playerId, pincode) {
  const res = await fetch(
    `/api/mp/games/${encodeURIComponent(gameId)}/players/${encodeURIComponent(
      playerId
    )}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode })
    }
  )
  if (!res.ok) return false
  const data = await res.json()
  return data.verified === true
}

// Create a multiplayer game
export async function createMpGame(name) {
  const res = await fetch('/api/mp/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  if (!res.ok) return null
  return await res.json()
}

// Join a multiplayer game
export async function joinMpGame(gameId, name, pincode, pokemonGame) {
  const res = await fetch(`/api/mp/games/${encodeURIComponent(gameId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pincode, pokemonGame })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to join game')
  }
  return await res.json()
}

// Read multiplayer game data (returns same format as readdata)
export function readMpData(playerData) {
  if (!playerData) return [{}, null, null, null]

  const gameData =
    typeof playerData.game_data === 'string'
      ? _safeParse(playerData.game_data)
      : playerData.game_data || {}

  const gameKey = playerData.pokemon_game

  return [
    gameData,
    gameKey,
    playerData.id,
    {
      id: playerData.id,
      name: playerData.name,
      game: playerData.pokemon_game,
      created: playerData.created_at,
      updated: playerData.updated_at,
      settings: settingsDefault
    }
  ]
}

function _safeParse(str) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : {}
  } catch {
    return {}
  }
}

// Create a writable store that auto-syncs to the server
export function createMpGameStore(
  gameId,
  playerId,
  pincode,
  initialData = '{}'
) {
  const store = writable(initialData)

  store.subscribe((val) => {
    if (!browser) return
    if (!val) return
    syncPlayerData(gameId, playerId, pincode, val)
  })

  return store
}

// Read box data from mp game data (same logic as store.js readBox)
export function readMpBox(data) {
  const customIdMap = {}
  if (data.__custom) {
    for (const c of data.__custom) {
      customIdMap[c.id] = c
    }
  }

  return Object.entries(data)
    .filter(([, i]) => i.pokemon)
    .filter(([, { status }]) => NuzlockeGroups.Available.includes(status))
    .map(([id, p]) => {
      let custom
      if (customIdMap[id]) custom = customIdMap[id]
      return custom ? { ...p, customId: custom.id, customName: custom.name } : p
    })
}
