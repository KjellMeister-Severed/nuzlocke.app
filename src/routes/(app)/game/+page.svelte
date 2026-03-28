<script>
  import { onMount, afterUpdate } from 'svelte'
  import { browser } from '$app/environment'
  import { fade, slide } from 'svelte/transition'

  import { Loader, Tabs } from '$lib/components/core'

  import { SupportBanner } from '$lib/components/navs'
  import { GameRoute, Search } from '$lib/components/Game'
  import { Settings } from '$lib/components/Settings'

  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Arrow, Hide } from '$icons'

  import deferStyles from '$lib/utils/defer-styles'
  import debounce from '$lib/utils/debounce'

  import { Expanded as Games } from '$lib/data/games.js'
  import {
    getGameStore,
    read,
    readdata,
    savedGames,
    activeGame,
    updateGame,
    parse
  } from '$lib/store'

  let gameStore, gameKey, gameData
  let routeEl

  let search = ''

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

  onMount(() => {
    parse((saves) => {
      if (!browser) return
      let game = saves[$activeGame]
      if (!game.id) return
      savedGames.update(
        updateGame({
          ...game,
          updated: +new Date()
        })
      )
    })($savedGames)
  })

  afterUpdate(() => {
    deferStyles(`/assets/items/${gameKey}.css`)
  })

  const setup = () =>
    new Promise((resolve) => {
      console.time('setup')
      const [, key, id] = readdata()
      if (browser && !id) return (window.location = '/')

      gameStore = getGameStore(id)
      gameKey = key

      fetchRoute(Games[key].pid).then((r) => {
        console.timeEnd('setup')
        resolve(r)
      })

      gameStore.subscribe(
        read((game) => {
          console.timeLog('setup')
          gameData = game
        })
      )
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
</script>

{#await setup()}
  <Loader />
{:then route}
  <div
    id="game_el"
    out:fade|local={{ duration: 200 }}
    in:fade|local={{ duration: 200, delay: 250 }}
    class="gpage"
  >
    <main class="gpage__main">
      <!-- Toolbar -->
      <div class="gpage__toolbar">
        <div class="gpage__toolbar-left">
          {#if filter === 'nuzlocke'}
            <button
              transition:slide={{ duration: 200 }}
              class="gpage__continue"
              on:click={routeEl.setroute(latestnav(route, gameData))}
            >
              <Icon inline={true} class="gpage__continue-icon" icon={Arrow} />
              <span
                >Continue at <strong>{latestnav(route, gameData).name}</strong
                ></span
              >
            </button>
          {/if}

          <div class="gpage__filters">
            <Tabs name="filter" tabs={filters} bind:selected={filter} />
          </div>

          {#if filter === 'bosses'}
            <div transition:slide={{ duration: 200 }} class="gpage__subfilters">
              <Tabs
                name="bosses"
                tabs={bossFilters}
                bind:selected={bossFilter}
              />
            </div>
          {/if}

          {#if filter === 'route'}
            <div transition:slide={{ duration: 200 }} class="gpage__subfilters">
              <Tabs
                name="route"
                tabs={routeFilters}
                bind:selected={routeFilter}
              />
            </div>
          {/if}

          {#if filter === 'upcoming'}
            <div
              transition:slide={{ duration: 200 }}
              class="gpage__hidden-count"
            >
              <Icon
                inline={true}
                height="1.1em"
                icon={Hide}
                class="fill-current"
              />
              <span><b>{latestnav(route, gameData).id}</b> items hidden</span>
            </div>
          {/if}
        </div>

        <div class="gpage__toolbar-right">
          <Settings />
          <div class="gpage__search-wrap">
            <Search on:search={onsearch} />
          </div>
        </div>
      </div>

      <!-- Route list -->
      <GameRoute
        {route}
        {search}
        filters={{ main: filter, boss: bossFilter, route: routeFilter }}
        bind:this={routeEl}
        className="gpage__routes"
        game={{ data: gameData, store: gameStore, key: gameKey }}
        progress={latestnav(route, gameData).id}
      />
    </main>
  </div>
{/await}

<style lang="postcss">
  :global(html, body) {
    @apply max-md:overflow-hidden;
  }

  .gpage {
    max-width: 72rem;
    margin: 0 auto;
    padding-bottom: 6rem;
    min-height: 100vh;
  }

  @media (max-width: theme('screens.md')) {
    .gpage {
      height: 100vh;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
    }
    .gpage ~ :global(footer) {
      display: none;
    }
  }

  .gpage__main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 3.75rem 1rem 0;
  }

  @media (min-width: theme('screens.md')) {
    .gpage__main {
      padding: 4.5rem 2rem 0;
      gap: 1.25rem;
    }
  }

  .gpage__toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  @media (min-width: theme('screens.md')) {
    .gpage__toolbar {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
  }

  .gpage__toolbar-left {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    flex: 1;
    min-width: 0;
  }

  .gpage__toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .gpage__continue {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: theme('colors.gray.500');
    transition: color 0.15s;
    padding: 0.125rem 0;
  }

  .gpage__continue:hover {
    color: theme('colors.gray.900');
  }

  :global(.dark) .gpage__continue:hover {
    color: theme('colors.gray.200');
  }

  .gpage__continue :global(.gpage__continue-icon) {
    fill: currentColor;
    flex-shrink: 0;
  }

  .gpage__filters,
  .gpage__subfilters {
    width: 100%;
  }

  .gpage__hidden-count {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: theme('colors.gray.400');
    padding: 0.125rem 0;
  }

  :global(.dark) .gpage__hidden-count {
    color: theme('colors.gray.500');
  }

  .gpage__search-wrap {
    position: fixed;
    bottom: 1.5rem;
    right: 0;
    z-index: 8888;
  }

  @media (min-width: theme('screens.md')) {
    .gpage__search-wrap {
      position: relative;
      bottom: auto;
      z-index: auto;
    }
  }

  :global(.gpage__routes) {
    margin-top: -0.5rem;
  }

  @media (min-width: theme('screens.sm')) {
    :global(.gpage__routes) {
      margin-top: 0;
    }
  }
</style>
