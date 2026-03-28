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

  // Build set of boss IDs with incomplete PvP phases (gates further routes)
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

  /** Custom route handlers & Empty routes */
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

  /** Event Handlers */
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

<ul bind:this={ulRef} class="flex flex-col gap-y-0 lg:gap-y-2 {className}">
  {#each routeList as p, id (locid(p, id))}
    {@const hidden = !filterEntry(filters, search, game.data, progress - 1)(p)}
    {@const pvpLocked = isMpMode && pvpLockedAfterIndex >= 0 && id > pvpLockedAfterIndex}

  {#if isStarter(p)}
      <li
        class="flex items-center gap-x-2"
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
          <div
            slot="location"
            class="-mr-1 flex flex-row-reverse items-center gap-x-2 lg:-ml-6 lg:flex-row"
          >
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
        class="location"
        id="route-{p.name}"
        in:fade
        out:fade={{ duration: 100 }}
        class:hidden={hidden || !showRoute(p, filters, hideRoute)}
        class:pvp-gated={pvpLocked}
      >
        {#if pvpLocked}
          <div class="pvp-gate-overlay">
            <span>🔒 Complete PvP battles to unlock</span>
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
        class="location flex items-center gap-x-2"
        id="custom-{p.index}"
        in:fade
        out:fade={{ duration: 100 }}
        class:hidden={hidden || !showCustom(p, filters, hideRoute)}
        class:pvp-gated={pvpLocked}
      >
        {#if pvpLocked}
          <div class="pvp-gate-overlay">
            <span>🔒 Complete PvP battles to unlock</span>
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
        class="boss -mb-4 md:my-2"
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
  li {
    scroll-margin-top: 28px;
    @apply snap-start;
  }

  @media (min-width: theme('screens.md')) {
    li.location {
      scroll-margin-top: 32px;
    }
  }

  .pvp-gated {
    @apply pointer-events-none opacity-40;
  }

  .pvp-gate-overlay {
    @apply flex items-center justify-center rounded-lg border border-dashed px-4 py-3;
    @apply border-amber-400/50 bg-amber-50/30 text-sm text-amber-700;
  }

  :global(.dark) .pvp-gate-overlay {
    @apply border-amber-600/30 bg-amber-900/10 text-amber-400;
  }
</style>
