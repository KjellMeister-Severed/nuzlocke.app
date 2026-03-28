<script>
  import {
    onMount,
    onDestroy,
    afterUpdate,
    setContext,
    getContext
  } from 'svelte'
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
  import {
    activeGame,
    savedGames,
    format,
    getGameStore,
    IDS,
    read as storeRead,
    readBox,
    readTeam,
    readTeams,
    patch
  } from '$lib/store'
  import { settingsDefault } from '$lib/components/Settings/_data'

  import { fetchDataForGame, fetchLeague } from '$utils/fetchers'
  import { normalise, capitalise } from '$utils/string'

  import {
    fetchMpGame,
    fetchPlayerData,
    loadMpSession,
    syncPlayerData,
    buildBossDefeatedByMap,
    fetchPvpBattles,
    recordPvpBattle,
    parseGameData,
    mpPlayers,
    mpGameInfo,
    mpPvpBattles
  } from '$lib/mpStore'

  import MpNav from '$lib/components/MpNav.svelte'
  import MpPlayerSwitcher from '$lib/components/MpPlayerSwitcher.svelte'

  import { NuzlockeGroups } from '$lib/data/states'
  import { Grave, GraveRow, Fog } from '../../../graveyard'
  import { chunk } from '$utils/arr'
  import { summarise } from '$utils/badges'
  import { locid } from '$utils/pokemon'
  import { UNOWN, createImgUrl } from '$utils/rewrites'
  import { toDb } from '$utils/link'
  import PokemonCard from '$lib/components/pokemon-card.svelte'
  import { PIcon, Toggle, Tooltip } from '$c/core'

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
  let mpView = 'game'
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

  const onViewChange = (e) => (mpView = e.detail)

  // --- Shared Graveyard ---
  const { getPkmn, getPkmns } = getContext('game')
  const chunkSize = 6
  let allGraveyard = []
  let graveyardChunked = []
  let showFog = true

  $: if ($mpPlayers && $mpPlayers.length) {
    allGraveyard = $mpPlayers.flatMap((player) => {
      const data = parseGameData(player)
      return Object.keys(data)
        .filter((k) => !k.startsWith('__'))
        .map((k) => ({ ...data[k], _id: `${player.id}_${k}` }))
        .filter((i) => i.pokemon)
        .filter((i) => NuzlockeGroups.Dead.includes(i.status))
        .map((i) => ({ ...i, playerName: player.name }))
    })
    graveyardChunked = chunk(allGraveyard, chunkSize)
  }

  // --- Player Box ---
  let boxData = []
  let boxPokemon = {}
  let boxLoading = true
  let boxTeamData = []
  let boxWinData = []
  let boxMinimal = false

  function updateBoxData() {
    if (!gameData) return
    boxData = readBox(gameData)
    boxTeamData = readTeam(gameData)
    boxWinData = readTeams(gameData)
    if (boxData.length) {
      getPkmns(boxData.map((i) => i.pokemon)).then((data) => {
        boxPokemon = data
        boxLoading = false
      })
    } else {
      boxLoading = false
    }
  }

  $: if (gameData && mpView === 'box') updateBoxData()

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
      isOwner =
        session?.gameId === mpGameId && session?.playerId === viewingPlayerId

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

      const rawData =
        typeof pData.game_data === 'string'
          ? pData.game_data
          : JSON.stringify(pData.game_data || {})

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
      if (gameKey?.includes('radred'))
        deferStyles('/assets/pokemon-radicalred.css')
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
  <title
    >Nuzlocke | {playerInfo?.name || 'Multiplayer'}
    {isOwner ? '' : '(Viewing)'}</title
  >
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
    {isOwner}
    {gameKey}
    {mpGameId}
    playerName={playerInfo?.name || ''}
    activeView={mpView}
    on:view={onViewChange}
  />

  <div
    id="mp_game_el"
    class="mpplay"
    class:mpplay--graveyard={mpView === 'graveyard'}
    out:fade|local={{ duration: 200 }}
    in:fade|local={{ duration: 200, delay: 250 }}
  >
    <div class="mpplay__players">
      <MpPlayerSwitcher
        players={$mpPlayers}
        currentPlayerId={viewingPlayerId}
        {mpGameId}
        ownPlayerId={session?.playerId}
      />
    </div>

    {#if mpView === 'game'}
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
              class="mpplay__hidden-count"
            >
              <Icon
                inline={true}
                height="1.2em"
                icon={Hide}
                class="-mt-1 mr-1 inline-block fill-current"
              />
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

    {:else if mpView === 'box'}
    <main class="mpplay__main mpplay__box-main">
      {#if !isOwner}
        <div class="mpplay__readonly">
          Viewing {playerInfo?.name}'s box (read-only)
        </div>
      {/if}

      {#if boxLoading}
        <Loader />
      {:else if boxData.length === 0}
        <div class="mpplay__empty">No Pokémon in the box yet.</div>
      {:else}
        <div class="mpplay__box-toolbar">
          <Toggle id="mp-minimal" bind:state={boxMinimal}>
            <small>Hide stats</small>
          </Toggle>
        </div>
        <div class="mpplay__box-grid" class:mpplay__box-grid--minimal={boxMinimal}>
          {#each boxData as p (locid(p))}
            {#if boxPokemon[p.pokemon]}
              <div class="mpplay__box-card" in:fade={{ duration: 200 }}>
                <PokemonCard
                  minimal={boxMinimal}
                  sprite={createImgUrl(boxPokemon[p.pokemon], { shiny: p.status === 6, ext: 'png' })}
                  fallback={UNOWN}
                  maxStat={Math.max(150, ...Object.values(boxPokemon[p.pokemon].baseStats))}
                  moves={[]}
                  ability={p.nickname ? { name: p.nickname + ' the ' + (p.nature || '').toLowerCase() } : null}
                  name={boxPokemon[p.pokemon].name}
                  stats={boxPokemon[p.pokemon].baseStats}
                  nature={p.nature}
                  types={(boxPokemon[p.pokemon].types || []).map(t => t.toLowerCase())}
                >
                  <span class="mpplay__box-footer" slot="footer">
                    {#if p.location === 'Starter'}
                      Met in a fateful encounter
                    {:else if p.status === 2}
                      Obtained from {p.location || p.customName}
                    {:else if p.status === 3}
                      Received in a trade {(p.customName || p.location).startsWith('Route') ? 'on' : 'in'}
                      {p.customName || p.location}
                    {:else if !p.location || (p.customId && !p.customName)}
                      Met in an unknown place
                    {:else if p.customName}
                      Met {p.customName.startsWith('Route') ? 'on' : 'in'}
                      {p.customName}
                    {:else}
                      Met {p.location.startsWith('Route') ? 'on' : 'in'}
                      {p.location}
                    {/if}

                    {#if boxTeamData?.includes(locid(p))}
                      <span class="mpplay__box-team-badge">In Team</span>
                    {/if}
                  </span>
                </PokemonCard>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </main>

    {:else if mpView === 'graveyard'}
    <main class="mpplay__main mpplay__grave-main">
      <div class="mpplay__grave-content" in:fade={{ duration: 400, delay: 200 }}>
        {#if !allGraveyard.length}
          <div class="mpplay__empty">
            No Pokémon have fallen yet. Congratulations!
          </div>
        {:else}
          <div class="mpplay__grave-controls">
            <div class="mpplay__grave-toggle">
              <span class="mpplay__grave-toggle-label">Fog</span>
              <Toggle id="mp-fog" bind:state={showFog} />
            </div>
          </div>
          {#if showFog}<Fog />{/if}
        {/if}
      </div>

      {#if allGraveyard.length}
        <div class="mpplay__graves">
          {#each graveyardChunked as row, i}
            <GraveRow {i} maxRows={graveyardChunked.length}>
              {#each row as p, j (p._id)}
                <div
                  class="mpplay__grave-cell"
                  class:mpplay__grave-cell--alt={j % 2}
                  in:fade={{
                    duration: 600,
                    delay: Math.min(3000 / allGraveyard.length, 400) * (i * chunkSize + j) + 800
                  }}
                >
                  <Grave
                    pokemon={p.pokemon}
                    nickname={p.nickname}
                    death={p?.death}
                  />
                  <p class="mpplay__grave-owner">
                    {p.playerName}'s
                  </p>
                </div>
              {/each}
            </GraveRow>
          {/each}
        </div>
      {/if}
    </main>
    {/if}
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

  .mpplay__players {
    max-width: 48rem;
    margin: 0 auto 1rem;
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

  /* --- Empty state --- */
  .mpplay__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24rem;
    font-size: 1.125rem;
    text-align: center;
    color: theme('colors.gray.400');
  }

  :global(.dark) .mpplay__empty {
    color: theme('colors.gray.600');
  }

  /* --- Box view --- */
  .mpplay__box-main {
    max-width: 80rem;
  }

  .mpplay__box-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }

  .mpplay__box-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }

  .mpplay__box-grid--minimal {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.5rem;
  }

  .mpplay__box-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: theme('colors.gray.500');
  }

  :global(.dark) .mpplay__box-footer {
    color: theme('colors.gray.400');
  }

  .mpplay__box-team-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 600;
    background: theme('colors.indigo.100');
    color: theme('colors.indigo.700');
  }

  :global(.dark) .mpplay__box-team-badge {
    background: rgba(99, 102, 241, 0.2);
    color: theme('colors.indigo.300');
  }

  /* --- Graveyard view --- */
  .mpplay--graveyard {
    max-width: 100%;
    overflow: visible;
  }

  .mpplay__grave-main {
    max-width: 100%;
  }

  .mpplay__grave-content {
    scroll-snap-align: start;
    scroll-margin-top: 1rem;
  }

  .mpplay__grave-controls {
    position: relative;
    z-index: 999999;
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  @media (min-width: theme('screens.md')) {
    .mpplay__grave-controls {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      flex-direction: column;
      gap: 0.5rem;
      width: 10rem;
      margin-bottom: 0;
    }
  }

  .mpplay__grave-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .mpplay__grave-toggle-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: theme('colors.gray.700');
  }

  :global(.dark) .mpplay__grave-toggle-label {
    color: theme('colors.gray.200');
  }

  .mpplay__graves {
    margin-top: 2rem;
    padding-bottom: 12rem;
  }

  @media (min-width: theme('screens.sm')) {
    .mpplay__graves {
      padding-bottom: 16rem;
    }
  }

  .mpplay__grave-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    scroll-snap-align: start;
    scroll-margin-top: -0.5rem;
  }

  @media (max-width: theme('screens.sm')) {
    .mpplay__grave-cell {
      margin-top: 2.5rem;
      padding: 0 1.5rem;
    }

    .mpplay__grave-cell--alt {
      flex-direction: column-reverse;
    }
  }

  @media (min-width: theme('screens.md')) {
    .mpplay__grave-cell {
      display: inline-flex;
    }
  }

  .mpplay__grave-owner {
    margin-top: -0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: theme('colors.gray.400');
    text-align: center;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
    z-index: 30;
  }

  :global(.dark) .mpplay__grave-owner {
    color: theme('colors.gray.500');
  }
</style>
