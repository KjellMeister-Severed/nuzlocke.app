<script>
  import { onMount, onDestroy, afterUpdate, setContext, getContext } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { fade, slide } from 'svelte/transition'

  import { Loader, Tabs } from '$lib/components/core'
  import { SupportBanner } from '$lib/components/navs'
  import { GameRoute, Search } from '$lib/components/Game'
  import { Settings } from '$lib/components/Settings'

  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Arrow, Hide } from '$icons'

  import deferStyles from '$lib/utils/defer-styles'
  import debounce from '$lib/utils/debounce'

  import { Expanded as Games, RegionMap } from '$lib/data/games.js'
  import { activeGame, savedGames, format, getGameStore, IDS, read as storeRead } from '$lib/store'
  import { settingsDefault } from '$lib/components/Settings/_data'

  import { fetchDataForGame, fetchLeague } from '$utils/fetchers'
  import { normalise } from '$utils/string'

  import {
    fetchMpGame,
    fetchPlayerData,
    loadMpSession,
    syncPlayerData,
    buildBossDefeatedByMap,
    fetchPvpBattles,
    recordPvpBattle,
    mpPlayers,
    mpGameInfo,
    mpPvpBattles
  } from '$lib/mpStore'

  import MpPlayerSwitcher from '$lib/components/MpPlayerSwitcher.svelte'
  import MpNav from '$lib/components/MpNav.svelte'

  const mpSetGameKey = getContext('mpSetGameKey')

  const mpGameId = $page.params.gameId
  const viewingPlayerId = $page.url.searchParams.get('player')

  let gameStore, gameKey, gameData
  let routeEl
  let search = ''
  let loading = true
  let error = ''
  let originalActiveGame
  let originalSavedGames
  let unsubSync
  let isOwner = false
  let session = null
  let playerInfo = null
  let mpPkmnData = null
  let defeatedByMap = {}

  let filter = 'nuzlocke'
  const filters = [
    { label: 'Nuzlocke', val: 'nuzlocke' },
    { label: 'Routes', val: 'route' },
    { label: 'Bosses', val: 'bosses' },
    { label: 'Upcoming', val: 'upcoming' }
  ]

  let routeFilter = 'all'
  let routeFilters = [
    { label: 'All', val: 'all' },
    { label: 'Upcoming', val: 'upcoming' },
    { label: 'Planned', val: 'planned' },
    { label: 'Missed', val: 'missed' }
  ]

  let bossFilter = 'all'
  const bossFilters = [
    { label: 'All', val: 'all' },
    { label: 'Gym leaders', val: 'gym-leader' },
    { label: 'Elite Four', val: 'elite-four' },
    { label: 'Rival fights', val: 'rival' },
    { label: 'Evil team', val: 'evil-team' }
  ]

  let route
  const fetchRoute = async (gen) => {
    if (route) return route
    const res = await fetch(`/api/route/${gen}.json`)
    route = await res.json()
    return route
  }

  afterUpdate(() => {
    if (gameKey) deferStyles(`/assets/items/${gameKey}.css`)
  })

  const _onsearch = (e) => (search = e.detail.search)
  const onsearch = debounce(_onsearch, 350)

  const latestnav = (routes, game) => {
    const custom = (game?.__custom || []).reduce(
      (acc, c) => ({ ...acc, [c.id]: true }),
      {}
    )
    const locations = new Set(
      Object.entries(game)
        .filter(([id, loc]) => loc.pokemon && !!loc.status && !custom[id])
        .map(([, i]) => i.location)
    )

    let i = 0
    while (
      i < routes.length &&
      (locations.size || routes[i].type !== 'route')
    ) {
      locations.delete(routes[i]?.name)
      i++
    }

    const r = routes[Math.min(i, routes.length - 1)]
    return { ...r, id: i }
  }

  onMount(async () => {
    try {
      session = loadMpSession()

      // Check if this player is the owner
      isOwner = session?.gameId === mpGameId && session?.playerId === viewingPlayerId

      // Fetch game info
      await fetchMpGame(mpGameId)

      // Build defeated-by map from all players' data
      defeatedByMap = buildBossDefeatedByMap($mpPlayers)

      // Fetch PvP battles
      await fetchPvpBattles(mpGameId)

      // Fetch player data
      const pData = await fetchPlayerData(mpGameId, viewingPlayerId)
      if (!pData || pData.error) {
        error = 'Player not found'
        loading = false
        return
      }

      playerInfo = pData
      gameKey = pData.pokemon_game
      mpSetGameKey(gameKey)

      const rawData = typeof pData.game_data === 'string' ? pData.game_data : JSON.stringify(pData.game_data || {})

      // Bridge MP data into localStorage so existing components
      // (ProgressModal, PokemonSelector team management, etc.) work correctly.
      // They call readdata()/getGameStore()/getTeams()/getGen() which read from localStorage.
      const mpLocalId = `mp_${mpGameId}_${viewingPlayerId}`
      originalActiveGame = localStorage.getItem(IDS.active)
      originalSavedGames = localStorage.getItem(IDS.saves)

      localStorage.setItem(IDS.game(mpLocalId), rawData)

      // Add a temporary savedGames entry so getGen()/readdata() return the correct
      // pokemon game key. Components like ProgressModal depend on this.
      const mpSaveEntry = format({
        id: mpLocalId,
        created: +new Date(),
        name: playerInfo.name || 'MP',
        game: gameKey,
        settings: settingsDefault,
        attempts: 1
      })
      savedGames.update((current) =>
        current ? current + ',' + mpSaveEntry : mpSaveEntry
      )

      activeGame.set(mpLocalId)

      // Use the standard localStorage-backed store so all components share it
      gameStore = getGameStore(mpLocalId)
      // Ensure store has latest data (handles cached store from previous visit)
      gameStore.set(rawData)

      // For owner: sync store changes back to server
      if (isOwner) {
        unsubSync = gameStore.subscribe((val) => {
          if (!val) return
          syncPlayerData(mpGameId, viewingPlayerId, session.pincode, val)
        })
      }

      gameStore.subscribe(
        storeRead((game) => {
          gameData = game
        })
      )

      const gameInfo = Games[gameKey]
      if (gameInfo) {
        await fetchRoute(gameInfo.pid)
      }

      if (gameKey === 'blazingem') deferStyles('/assets/pokemon-blazingem.css')
      if (gameKey?.includes('radred')) deferStyles('/assets/pokemon-radicalred.css')
      if (browser) setTimeout(() => document.body.classList.add('lazy-pkm'), 0)

      loading = false
    } catch (e) {
      console.error('MP play page error:', e)
      error = 'Failed to load game data'
      loading = false
    }
  })

  async function handlePvpReport(e) {
    const { bossId, player1Id, player2Id, winnerId, pincode: pin } = e.detail
    await recordPvpBattle(mpGameId, bossId, player1Id, player2Id, winnerId, pin)
  }

  onDestroy(() => {
    // Clean up server sync subscription
    if (unsubSync) unsubSync()
    // Restore original active game and saved games
    if (browser) {
      if (originalActiveGame) {
        localStorage.setItem(IDS.active, originalActiveGame)
        activeGame.set(originalActiveGame)
      }
      if (originalSavedGames !== undefined) {
        localStorage.setItem(IDS.saves, originalSavedGames || '')
        savedGames.set(originalSavedGames)
      }
    }
  })
</script>

<svelte:head>
  <title>Nuzlocke | {playerInfo?.name || 'Multiplayer'} {isOwner ? '' : '(Viewing)'}</title>
</svelte:head>

{#if loading}
  <Loader />
{:else if error}
  <div class="container mx-auto pt-24 text-center">
    <p class="text-red-600 dark:text-red-400">{error}</p>
    <a href="/mp/{mpGameId}" class="mt-4 inline-block text-blue-600 underline dark:text-blue-400">Back to Lobby</a>
  </div>
{:else if gameData && route}
  <MpNav
    game={$mpGameInfo}
    player={playerInfo}
    {isOwner}
    gameKey={gameKey}
    mpGameId={mpGameId}
  />

  <MpPlayerSwitcher
    players={$mpPlayers}
    currentPlayerId={viewingPlayerId}
    {mpGameId}
    ownPlayerId={session?.playerId}
  />

  <div
    id="mp_game_el"
    out:fade|local={{ duration: 250 }}
    in:fade|local={{ duration: 250, delay: 300 }}
    class="container mx-auto overflow-hidden pb-24"
  >
    <div class="flex snap-start flex-row flex-wrap justify-center pb-16">
      <main
        id="main"
        class="p-container relative flex flex-col gap-y-4 md:py-6"
      >
        {#if !isOwner}
          <div class="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-center text-sm text-yellow-400">
            Viewing {playerInfo?.name}'s game (read-only)
          </div>
        {/if}

        <div
          class="flex snap-y snap-start snap-always flex-col items-start justify-between gap-y-4 pt-14 md:mb-6 md:flex-row md:pt-14 lg:gap-y-0"
        >
          <div class="flex w-full flex-col gap-y-2">
            {#if filter === 'nuzlocke'}
              <button
                transition:slide={{ duration: 250 }}
                class="inline-flex items-center text-sm"
                on:click={routeEl?.setroute(latestnav(route, gameData))}
              >
                Continue at {latestnav(route, gameData).name}
                <Icon inline={true} class="ml-1 fill-current" icon={Arrow} />
              </button>
            {/if}

            <Tabs name="filter" tabs={filters} bind:selected={filter} />

            {#if filter === 'bosses'}
              <span transition:slide={{ duration: 250 }}>
                <Tabs
                  name="bosses"
                  tabs={bossFilters}
                  bind:selected={bossFilter}
                />
              </span>
            {/if}

            {#if filter === 'route'}
              <span transition:slide={{ duration: 250 }}>
                <Tabs
                  name="route"
                  tabs={routeFilters}
                  bind:selected={routeFilter}
                />
              </span>
            {/if}

            {#if filter === 'upcoming'}
              <span
                transition:slide={{ duration: 250 }}
                class="-mb-4 inline-block text-sm leading-5 tracking-tight dark:text-gray-400"
              >
                <Icon
                  inline={true}
                  height="1.2em"
                  icon={Hide}
                  class="-mt-1 mr-1 inline-block fill-current"
                /><b>{latestnav(route, gameData).id}</b> items hidden
              </span>
            {/if}
          </div>

          {#if isOwner}
            <div class="inline-flex">
              <Settings />
              <div class="fixed bottom-6 max-md:z-[8888] md:relative md:bottom-0">
                <Search on:search={onsearch} />
              </div>
            </div>
          {/if}
        </div>

        <GameRoute
          {route}
          {search}
          filters={{ main: filter, boss: bossFilter, route: routeFilter }}
          bind:this={routeEl}
          className="-mt-8 sm:mt-0"
          game={{ data: gameData, store: gameStore, key: gameKey }}
          progress={latestnav(route, gameData).id}
          {defeatedByMap}
          mpPlayers={$mpPlayers}
          mpPvpBattles={$mpPvpBattles}
          currentPlayerId={viewingPlayerId}
          {isOwner}
          pincode={session?.pincode || ''}
          on:report={handlePvpReport}
        />
      </main>
    </div>
  </div>
{/if}

<style lang="postcss">
  :global(html, body) {
    @apply max-md:overflow-hidden;
  }

  @media (max-width: theme('screens.md')) {
    .container ~ :global(footer) {
      display: none;
    }

    .container {
      height: 100vh;
      overflow-y: scroll;
    }
  }

  .container {
    min-height: 100%;
    @apply snap-y snap-always;
  }
</style>
