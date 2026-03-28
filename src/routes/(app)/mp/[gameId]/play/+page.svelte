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
  <div class="mpplay__loading">
    <Loader />
  </div>
{:else if error}
  <div class="mpplay__error">
    <p class="mpplay__error-msg">{error}</p>
    <a href="/mp/{mpGameId}" class="mpplay__error-link">Back to Lobby</a>
  </div>
{:else if gameData && route}
  <MpNav
    player={playerInfo}
    {isOwner}
    gameKey={gameKey}
    mpGameId={mpGameId}
    players={$mpPlayers}
    currentPlayerId={viewingPlayerId}
    ownPlayerId={session?.playerId}
  />

  <div
    id="mp_game_el"
    class="mpplay"
    out:fade|local={{ duration: 200 }}
    in:fade|local={{ duration: 200, delay: 250 }}
  >
    <main id="main" class="mpplay__main">
      {#if !isOwner}
        <div class="mpplay__readonly">
          Viewing {playerInfo?.name}'s game (read-only)
        </div>
      {/if}

      <div class="mpplay__toolbar">
        <div class="mpplay__filters">
          {#if filter === 'nuzlocke'}
            <button
              transition:slide={{ duration: 250 }}
              class="mpplay__continue"
              on:click={routeEl?.setroute(latestnav(route, gameData))}
            >
              Continue at {latestnav(route, gameData).name}
              <Icon inline={true} class="ml-1 fill-current" icon={Arrow} />
            </button>
          {/if}

          <Tabs name="filter" tabs={filters} bind:selected={filter} />

          {#if filter === 'bosses'}
            <span transition:slide={{ duration: 250 }}>
              <Tabs name="bosses" tabs={bossFilters} bind:selected={bossFilter} />
            </span>
          {/if}

          {#if filter === 'route'}
            <span transition:slide={{ duration: 250 }}>
              <Tabs name="route" tabs={routeFilters} bind:selected={routeFilter} />
            </span>
          {/if}

          {#if filter === 'upcoming'}
            <span transition:slide={{ duration: 250 }} class="mpplay__hidden-count">
              <Icon inline={true} height="1.2em" icon={Hide} class="-mt-1 mr-1 inline-block fill-current" />
              <b>{latestnav(route, gameData).id}</b> items hidden
            </span>
          {/if}
        </div>

        {#if isOwner}
          <div class="mpplay__owner-tools">
            <Settings />
            <div class="mpplay__search">
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
{/if}

<style lang="postcss">
  .mpplay__loading {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
  }

  .mpplay__error {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .mpplay__error-msg {
    color: rgba(220, 38, 38, 1);
  }

  :global(.dark) .mpplay__error-msg {
    color: rgba(248, 113, 113, 1);
  }

  .mpplay__error-link {
    margin-top: 1rem;
    display: inline-block;
    font-size: 0.875rem;
    color: rgba(59, 130, 246, 1);
    text-decoration: underline;
  }

  .mpplay {
    max-width: 72rem;
    margin: 0 auto;
    overflow: hidden;
    padding: 6rem 1rem 6rem;
  }

  @media (max-width: 768px) {
    .mpplay {
      height: 100vh;
      overflow-y: scroll;
      padding-top: 7rem;
    }

    .mpplay ~ :global(footer) {
      display: none;
    }

    :global(html),
    :global(body) {
      overflow: hidden;
    }
  }

  .mpplay__main {
    max-width: 48rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mpplay__readonly {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(253, 224, 71, 1);
    background: rgba(254, 252, 232, 1);
    color: rgba(161, 98, 7, 1);
    text-align: center;
    font-size: 0.875rem;
  }

  :global(.dark) .mpplay__readonly {
    border-color: rgba(161, 98, 7, 1);
    background: rgba(113, 63, 18, 0.2);
    color: rgba(250, 204, 21, 1);
  }

  .mpplay__toolbar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .mpplay__toolbar {
      flex-direction: row;
    }
  }

  .mpplay__filters {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mpplay__continue {
    display: inline-flex;
    align-items: center;
    font-size: 0.875rem;
    color: rgba(75, 85, 99, 1);
    transition: color 0.15s;
  }

  .mpplay__continue:hover {
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .mpplay__continue {
    color: rgba(156, 163, 175, 1);
  }

  :global(.dark) .mpplay__continue:hover {
    color: rgba(255, 255, 255, 1);
  }

  .mpplay__hidden-count {
    display: inline-block;
    margin-bottom: -1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    letter-spacing: -0.025em;
    color: rgba(107, 114, 128, 1);
  }

  :global(.dark) .mpplay__hidden-count {
    color: rgba(156, 163, 175, 1);
  }

  .mpplay__owner-tools {
    display: inline-flex;
    flex-shrink: 0;
  }

  .mpplay__search {
    position: fixed;
    bottom: 1.5rem;
    z-index: 8888;
  }

  @media (min-width: 768px) {
    .mpplay__search {
      position: relative;
      bottom: 0;
      z-index: auto;
    }
  }
</style>
