<script>
  import { browser } from '$app/environment'
  import { setContext } from 'svelte'
  import { page } from '$app/stores'
  import { writable, get } from 'svelte/store'

  import { fetchDataForGame, fetchLeague } from '$utils/fetchers'
  import { normalise } from '$utils/string'
  import { RegionMap } from '$lib/data/games'

  import { fetchPlayerData } from '$lib/mpStore'

  // We need to determine gameKey from the player's data
  // Store it in a writable so children can use it reactively
  const mpGameKey = writable(null)

  // Set up contexts that child components expect
  // 'region' context
  setContext('region', 'unknown') // will be overridden reactively if possible

  // 'game' context - must work once mpGameKey is resolved
  setContext('game', {
    getLeague: (...args) => fetchLeague(...args),
    getAllPkmn: async () => {
      const key = get(mpGameKey)
      if (!key) return []
      const res = await fetchDataForGame(key)
      return res ? Object.values(res.aliasMap) : []
    },
    getEncounterablePkmn: async () => {
      const key = get(mpGameKey)
      if (!key) return []
      const res = await fetchDataForGame(key)
      return res ? Object.values(res.aliasMap).filter((p) => p?.canEncounter) : []
    },
    getPkmn: async (id) => {
      const key = get(mpGameKey)
      if (!key) return null
      const p = await fetchDataForGame(key)
      if (!p) return null
      const nid = normalise(id)
      return p.idMap[nid] || p.aliasMap[nid] || p.nameMap[nid]
    },
    getPkmns: async (ids = []) => {
      const key = get(mpGameKey)
      if (!key) return {}
      const p = await fetchDataForGame(key)
      if (!p) return {}
      let result = {}
      for (const id of ids) {
        const nid = normalise(id).trim()
        const res = p.idMap[nid] || p.aliasMap[nid] || p.nameMap[nid]
        if (!nid) continue
        if (!res) {
          console.error('Error reading ', nid)
          continue
        }
        result[res.alias] = res
      }
      return result
    }
  })

  // Export a function for child pages to set the game key once they know it
  setContext('mpSetGameKey', (key) => {
    mpGameKey.set(key)
  })
</script>

<slot />
