<script>
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import {
    patch,
    addlocation,
    removelocation,
    hidelocation,
    read
  } from '$lib/store'

  import { toDbLocation } from '$utils/link'
  import { insertList } from '$utils/arr'
  import { shortuuid } from '$utils/uuid'
  import { slugify } from '$utils/string'

  import { Tooltip } from '$lib/components/core'
  import CustomLocation from './CustomLocation.svelte'
  import StarterType from '$lib/components/starter-type.svelte'
  import GymCard from '$lib/components/gym-card.svelte'
  import PokemonSelector from '$lib/components/pokemon-selector.svelte'
  import MpPvpPhase from '$lib/components/MpPvpPhase.svelte'

  import {
    hideRouteF,
    isRoute,
    isGym,
    isStarter,
    isCustom,
    showStarterRoute,
    showRoute,
    showGym,
    showCustom
  } from './_predicates'
  import { filterEntry } from './_filters'

  export let route,
    game,
    filters,
    search,
    progress = '',
    className = '',
    defeatedByMap = {},
    mpPlayers = [],
    mpPvpBattles = [],
    currentPlayerId = '',
    isOwner = false,
    pincode = ''

  const dispatch = createEventDispatcher()
  $: isMpMode = mpPlayers.length >= 2

  $: pvpLockedAfterIndex = (() => {
    if (!isMpMode) return -1
    const totalPairings = (mpPlayers.length * (mpPlayers.length - 1)) / 2
    for (let i = 0; i < routeList.length; i++) {
      const p = routeList[i]
      if (isGym(p) && (p.group === 'gym-leader' || p.group === 'elite-four')) {
        const bossBattles = mpPvpBattles.filter((b) => b.boss_id === p.value)
        const completedCount = bossBattles.filter((b) => b.winner_id).length
        if (completedCount < totalPairings) return i
      }
    }
    return -1
  })()

  const { store, key, data } = game

  let starter = data.__starter || 'fire'
  let element

  let custom = [],
    hidden = [],
    bossTeamIds = [],
    hideRoute = (_) => false
  store.subscribe(
    read((d) => {
      if (!custom.length && d.__custom?.length) custom = d.__custom
      if (!hidden.length && d.__hidden?.length) hidden = d.__hidden

      bossTeamIds = (d.__teams || []).map((i) => i.id)
      hideRoute = hideRouteF(d)
    })
  )

  const onnewlocation = (e) => {
    const index = e.detail.id + 1
    const loc = { type: 'custom', name: '', id: shortuuid(), index }
    custom = custom.concat(loc)
    store.update(addlocation(loc))
  }

  const ondeletelocation = (e) => {
    const id = e.detail.id
    custom = custom.filter((i) => i.id !== id)
    store.update(removelocation(id))
  }

  const onhidelocation = (e) => {
    const id = e.detail.id
    store.update(hidelocation(id))
  }

  const setstarter = (e) => {
    starter = e.detail.value
    game.store.update(patch({ __starter: starter }))
  }

  export const setnav = (e) =>
    setloc(`boss-${e.detail.value}`, e.detail.value + 20)

  export const setroute =
    ({ name, id }) =>
    () =>
      setloc(`route-${name}`, id + 10)

  let scroll, ulRef
  const scrollToItem = (id) => {
    document.getElementById(id).scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }

  const setloc = (id, i) => {
    document.getElementById(id) ? scrollToItem(id) : (scroll = id)
  }

  const locid = (p, i) => {
    return p.type === 'custom'
      ? slugify(`${p.type}-${p.name}-${p.id}`)
      : slugify(`${p.type}-${p.name}-${p.origPos}`)
  }

  afterUpdate(() => {
    if (!scroll) return
    setTimeout(scrollToItem.bind({}, scroll))
    scroll = null
  })

  $: routeList = insertList(route, custom)
</script>

<ul bind:this={ulRef} class="route-list {className}">
  {#each routeList as p, id (locid(p, id))}
    {@const hidden = !filterEntry(filters, search, game.data, progress - 1)(p)}
    {@const pvpLocked =
      isMpMode && pvpLockedAfterIndex >= 0 && id > pvpLockedAfterIndex}

    {#if isStarter(p)}
      <li
        class="route-list__item route-list__item--starter"
        id="route-{p.name}"
        in:fade
        out:fade={{ duration: 100 }}
        class:hidden={hidden || !showStarterRoute(p, filters, hideRoute)}
      >
        <PokemonSelector
          {id}
          {store}
          encounters={p.encounters}
          type="starter"
          location="Starter"
          locationName="Starter"
          on:new={onnewlocation}
        >
          <div slot="location" class="route-list__starter-loc">
            <StarterType {key} on:select={setstarter} bind:starter />
            <p>
              Starter* <Tooltip
                >Selecting a starter type modifies Rival encounters.</Tooltip
              >
            </p>
          </div>
        </PokemonSelector>
      </li>
    {:else if isRoute(p)}
      <li
        class="route-list__item"
        id="route-{p.name}"
        in:fade
        out:fade={{ duration: 100 }}
        class:hidden={hidden || !showRoute(p, filters, hideRoute)}
        class:route-list__item--locked={pvpLocked}
      >
        {#if pvpLocked}
          <div class="route-list__gate">
            <span>Complete PvP battles to unlock</span>
          </div>
        {:else}
          <PokemonSelector
            {id}
            {store}
            infolink={toDbLocation(key, p.name)}
            location={p.name}
            encounters={p.encounters}
            on:hide={onhidelocation}
            on:new={onnewlocation}
          />
        {/if}
      </li>
    {:else if isCustom(p)}
      <li
        class="route-list__item route-list__item--custom"
        id="custom-{p.index}"
        in:fade
        out:fade={{ duration: 100 }}
        class:hidden={hidden || !showCustom(p, filters, hideRoute)}
        class:route-list__item--locked={pvpLocked}
      >
        {#if pvpLocked}
          <div class="route-list__gate">
            <span>Complete PvP battles to unlock</span>
          </div>
        {:else}
          <PokemonSelector
            type="custom"
            locationName={p.name}
            location={p.id}
            {id}
            {store}
            on:new={onnewlocation}
            on:delete={ondeletelocation}
          >
            <svelte:fragment slot="location">
              <CustomLocation {store} id={p.id} />
            </svelte:fragment>
          </PokemonSelector>
        {/if}
      </li>
    {:else if isGym(p)}
      <li
        class="route-list__item route-list__item--boss"
        class:hidden={hidden || !showGym(p, filters)}
        id="boss-{id}"
        in:fade
        out:fade={{ duration: 100 }}
      >
        <GymCard
          forceVs
          {starter}
          game={key}
          id={p.value}
          defeated={bossTeamIds.includes(p.value)}
          defeatedByPlayers={defeatedByMap[p.value] || []}
          location={p.name}
          type={p.group}
        />

        {#if isMpMode && (p.group === 'gym-leader' || p.group === 'elite-four')}
          <MpPvpPhase
            bossId={p.value}
            bossName={p.name}
            players={mpPlayers}
            battles={mpPvpBattles}
            {currentPlayerId}
            {isOwner}
            {pincode}
            on:report
          />
        {/if}
      </li>
    {/if}
  {/each}
</ul>

<style lang="postcss">
  .route-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  @media (min-width: theme('screens.lg')) {
    .route-list {
      gap: 0.375rem;
    }
  }

  .route-list__item {
    scroll-margin-top: 3.5rem;
    scroll-snap-align: start;
    position: relative;
    z-index: 0;
  }

  .route-list__item:focus-within {
    z-index: 10;
  }

  @media (min-width: theme('screens.md')) {
    .route-list__item {
      scroll-margin-top: 4rem;
    }
  }

  .route-list__item--starter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .route-list__item--custom {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .route-list__item--boss {
    margin: 0.5rem 0;
  }

  @media (min-width: theme('screens.md')) {
    .route-list__item--boss {
      margin: 0.75rem 0;
    }
  }

  .route-list__item--locked {
    pointer-events: none;
    opacity: 0.3;
  }

  .route-list__gate {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 1rem;
    border: 1px dashed theme('colors.gray.300');
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: theme('colors.gray.400');
  }

  :global(.dark) .route-list__gate {
    border-color: theme('colors.gray.600');
    color: theme('colors.gray.500');
  }

  .route-list__starter-loc {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 0.5rem;
    margin-right: -0.25rem;
  }

  @media (min-width: theme('screens.lg')) {
    .route-list__starter-loc {
      flex-direction: row;
      margin-left: -1.5rem;
    }
  }
</style>
