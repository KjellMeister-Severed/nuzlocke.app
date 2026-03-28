<script>
  export let id,
    store,
    location,
    locationName = '',
    type = '',
    infolink = ''

  import { nonnull, equal as oEqual } from '$utils/obj'

  import { read, readdata, patch, getTeams } from '$lib/store'
  import { capitalise } from '$lib/utils/string'

  import { fly } from 'svelte/transition'
  import { Natures, NaturesMap } from '$lib/data/natures'
  import { NuzlockeStates, NuzlockeGroups } from '$lib/data/states'
  import { IconButton, Input } from '$lib/components/core'
  import { Wrapper as SettingsWrapper } from '$lib/components/Settings'

  import AutoCompleteV2 from '$c/core/AutoCompleteV2.svelte'
  import Popover from '$lib/components/core/Popover.svelte'

  import { PIcon, Icon } from '$c/core'
  import {
    Chevron,
    Add,
    Ball,
    Plus,
    Minus,
    Delete,
    Deceased,
    External,
    Bin,
    Hide,
    Dots,
    Map,
    Search,
    LongGrass
  } from '$icons'

  import { createEventDispatcher, onMount, getContext } from 'svelte'

  let selected, nickname, status, nature, hidden, death
  let prevstatus = 'loading'

  let search, statusSearch, natureSearch

  export let encounters = []
  let encounterItems = []

  const encounterF = (_) =>
    getPkmns(encounters).then((e) =>
      (encounters || []).map((id) => e[id]).filter((i) => i)
    )

  let Particles, EvoModal, DeathModal
  onMount(() => {
    const [data] = readdata()
    const loc = data[location]
    if (typeof loc?.pokemon !== 'undefined') {
      const o = {
        ...loc,
        alias: loc.pokemon,
        sprite: loc.pokemon,
        label: capitalise(loc.pokemon)
      }
      selected = o
    }

    import('$lib/components/particles').then((m) => (Particles = m.default))
    import('$lib/components/EvolutionModal.svelte').then(
      (m) => (EvoModal = m.default)
    )
    import('$lib/components/DeathModal/index.svelte').then(
      (m) => (DeathModal = m.default)
    )
    prevstatus = null
  })

  const { getAllPkmn, getPkmn, getPkmns, getEncounterablePkmn } =
    getContext('game')
  const dispatch = createEventDispatcher()

  let loading = true
  let dupelines = new Set(),
    misslines = new Set()

  let team, inteam

  getTeams((t) => (team = t.team))

  let resetd, hiddenLength
  store &&
    store.subscribe(
      read((data) => {
        hiddenLength = data?.__hidden?.length

        const getStateMons = (data, stateGroup) => {
          return Object.values(data)
            .filter((p) => p && (!p.status || stateGroup.includes(p?.status)))
            .map((p) => p.pokemon)
            .filter((i) => i)
        }

        getPkmns(getStateMons(data, NuzlockeGroups.Dupes)).then(
          (p) => (dupelines = new Set(Object.values(p).map((p) => p?.evoline)))
        )
        getPkmns(getStateMons(data, NuzlockeGroups.MissDupes)).then(
          (p) => (misslines = new Set(Object.values(p).map((p) => p?.evoline)))
        )

        if (!!resetd && !data[location]) {
          handleClear()
          return
        }

        const pkmn = data[location]
        if (!pkmn) return

        resetd = pkmn

        status = pkmn.status ? NuzlockeStates[pkmn.status] : null
        nature = pkmn.nature ? NaturesMap[pkmn.nature] : null
        hidden = pkmn.hidden
        nickname = pkmn.nickname
        death = pkmn.death
        if (pkmn.pokemon)
          getPkmn(pkmn.pokemon).then((p) => {
            selected = p
            loading = false
          })
      })
    )

  $: {
    const topatch = nonnull({
      id,
      pokemon: selected?.alias,
      status: status?.id,
      nature: nature?.id,
      location: locationName || location,
      ...(nickname ? { nickname } : {}),
      ...(hidden ? { hidden: true } : {}),
      ...(status?.id === 5 && death ? { death } : {})
    })

    if (selected && !oEqual(topatch, resetd)) {
      console.log('Patching', location)
      store.update(patch({ [location]: topatch }))

      if (status?.id === 5 && (team || []).includes(location)) {
        store.update(patch({ __team: team.filter((loc) => loc !== location) }))
      }
    }

    inteam = (team || []).includes(location)
  }

  const onhide = () => {
    if (
      !hiddenLength &&
      !window.confirm(
        `Hiding a location will delete all encounter data for this location and prevent it from appearing in this run.\n\nYou can reset hidden locations from "Settings".\n\nAre you sure you want to hide ${location}?`
      )
    )
      return

    handleClear()
    dispatch('hide', { id: location })
  }

  const onnew = () => dispatch('new', { id })
  const ondelete = () => {
    if (
      selected &&
      !confirm(
        `You are about to delete a custom location - this will also delete your Pokémon, ${selected.name}. Are you sure you wish to continue?`
      )
    )
      return

    handleClear()
    dispatch('delete', { id: location })
  }

  function setTeam(team) {
    store.update(patch({ __team: team.slice(0, 6) }))
  }

  function handleTeamAdd() {
    setTeam((team || []).filter((i) => i !== location).concat(location))
  }

  function handleTeamRemove() {
    setTeam((team || []).filter((i) => i !== location))
  }

  function handleClear() {
    status = nickname = selected = death = resetd = null
    search = statusSearch = natureSearch = null
    store.update(
      patch({
        [location]: {},
        __team: team.filter((i) => i !== location).slice(0, 6)
      })
    )
  }

  let statusComplete = false
  const handleStatus = (sid) => () => {
    const cb = (data) => {
      if (NuzlockeGroups.Unavailable.includes(status?.id)) handleTeamRemove()
      if (NuzlockeGroups.Dead.includes(status?.id)) death = data

      status = NuzlockeStates[sid]
      _animateStatus(sid)
    }

    if (sid === 5) return handleDeath(cb)
    else cb()
  }

  const _animateStatus = (sid) => {
    if (sid === 2 || sid === 3) statusComplete = ['parcel', 'profs-letter']
    if (sid === 1)
      statusComplete = ['poke-ball', 'friend-ball', 'heavy-ball', 'master-ball']
    if (sid === 5)
      statusComplete = [
        'thick-club',
        'quick-claw',
        'rare-bone',
        'dragon-fang',
        'sharp-beak'
      ]
    if (sid === 6)
      statusComplete = [
        'health-av-candy',
        'tapunium-z--held',
        'revive',
        'electric-gem',
        'max-revive'
      ]
    if (sid === 100)
      statusComplete = ['revival-herb', 'revival-herb', 'starf-berry']
    if (sid === 200)
      statusComplete = ['thunder-stone', 'fire-stone', 'water-stone']
  }

  const { open } = getContext('simple-modal')
  let evoComplete = false
  const handleSplitEvolution = (base, evolutions) =>
    open(EvoModal, { evolutions, base, select: handleSingleEvolution })
  const handleSingleEvolution = async (id) =>
    getPkmn(id).then((p) => {
      selected = p
      evoComplete = true
      _animateStatus(200)
    })

  const handleEvolution = (base, evos) => async () =>
    handleSplitEvolution(base, evos)
  const handleDeath = (submit) =>
    open(DeathModal, { submit, pokemon: selected, nickname })

  const handleReveal = () => {
    hidden = false
    _animateStatus(100)
  }

  $: gray = NuzlockeGroups.Unavailable.includes(status?.id)
</script>

<SettingsWrapper id="nickname-clause" let:setting={nicknames}>
  <div class="psel" class:psel--gray={gray} class:psel--wide={nicknames}>
    <!-- Location name -->
    <div class="psel__loc">
      {#if $$slots.location}
        <slot name="location" />
      {:else}
        <span class="psel__loc-name">{location}</span>
      {/if}
    </div>

    <!-- Encounter search / hidden reveal -->
    <SettingsWrapper id="encounter-suggestions" let:setting={suggest}>
      <SettingsWrapper id="dupe-clause" let:setting={dupes}>
        <SettingsWrapper id="missed-dupes" let:setting={missdupes}>
          {#if selected && (selected.hidden || hidden)}
            <button class="psel__hidden-btn" on:click={handleReveal}>
              <div class="psel__hidden-preview">
                <PIcon
                  className="-my-2 sm:-my-3 -mx-2"
                  name={selected.sprite}
                />
                <span>{selected.name}</span>
              </div>
              <span class="psel__hidden-label">Reveal</span>
              <Icon
                icon={LongGrass}
                height="1.4rem"
                class="psel__grass psel__grass--1"
              />
              <Icon
                icon={LongGrass}
                height="1.4rem"
                class="psel__grass psel__grass--2"
              />
              <Icon
                icon={LongGrass}
                height="2.5rem"
                class="psel__grass psel__grass--3"
              />
            </button>
          {:else}
            {@const fetchSearch = (search && search !== selected) || !suggest}

            <AutoCompleteV2
              inset={selected ? true : '2.4em'}
              itemF={(_) =>
                fetchSearch ? getEncounterablePkmn() : encounterF()}
              max={fetchSearch ? 16 : (encounters || []).length}
              on:change={(_) => (search = null)}
              bind:search
              bind:selected
              id="{location} Encounter"
              name="{location} Encounter"
              placeholder="Find encounter"
              class="psel__encounter"
            >
              <span
                class="psel__option"
                class:hidden={dupes === 2 &&
                  (missdupes ? misslines : dupelines).has(option?.evoline)}
                class:psel__option--dupe={dupes === 1 &&
                  (missdupes ? misslines : dupelines).has(option?.evoline)}
                aria-label={label}
                slot="option"
                let:option
                let:label
              >
                <PIcon
                  name={option?.sprite}
                  className="transform -mb-4 -ml-6 -mt-5 -mr-2"
                />
                {@html label}
                {#if dupes === 1 && (missdupes ? misslines : dupelines).has(option?.evoline)}
                  <span class="psel__dupe-tag">dupe</span>
                {/if}
              </span>

              <svelte:fragment slot="icon" let:iconClass>
                {#if selected}
                  <div class="psel__particles-anchor">
                    {#if statusComplete}
                      <Particles
                        amount={Math.round(Math.random() * 4) +
                          Math.pow(statusComplete.length, 2)}
                        icons={statusComplete}
                        on:end={() => (statusComplete = false)}
                      />
                    {/if}
                  </div>

                  <PIcon
                    name={selected.sprite}
                    className="{gray ? 'grayscale' : ''} {iconClass}"
                  />
                {:else}
                  <Icon
                    inline={true}
                    height="0.7em"
                    icon={Search}
                    class="left-3 fill-current text-gray-500 {iconClass}"
                  />
                {/if}
              </svelte:fragment>
            </AutoCompleteV2>
          {/if}
        </SettingsWrapper>
      </SettingsWrapper>
    </SettingsWrapper>

    <!-- Nickname -->
    <SettingsWrapper id="nickname-clause" on="1">
      <Input
        rounded
        bind:value={nickname}
        name="{location} Nickname"
        placeholder="Nickname"
        className="psel__nickname {!selected || hidden || status?.id === 4
          ? 'psel__field--secondary'
          : ''}"
      />
    </SettingsWrapper>

    <!-- Status -->
    <SettingsWrapper id="permadeath" on="1" condition={status?.id === 5}>
      <div class="psel__dead-badge">
        <Icon
          inline={true}
          class="fill-current"
          icon={NuzlockeStates[5].icon}
        />
        <span>Dead</span>
      </div>

      <svelte:fragment slot="else">
        <AutoCompleteV2
          itemF={(_) => Object.values(NuzlockeStates)}
          labelF={(_) => _.state}
          inset={status ? '2rem' : null}
          bind:search={statusSearch}
          bind:selected={status}
          id="{location} Status"
          name="{location} Status"
          placeholder="Status"
          class="psel__status {!selected || hidden
            ? 'psel__field--secondary'
            : ''} {status?.id === 4 ? 'psel__status--wide' : ''}"
        >
          <svelte:fragment slot="icon" let:iconClass let:selected>
            {#if selected}
              <Icon
                inline={true}
                class="{iconClass} left-3 fill-current"
                icon={selected.icon}
              />
            {/if}
          </svelte:fragment>

          <div
            on:click={handleStatus(option.id)}
            class="psel__status-option"
            slot="option"
            let:option
            let:label
          >
            <Icon inline={true} icon={option.icon} class="fill-current" />
            {@html label}
          </div>
        </AutoCompleteV2>
      </svelte:fragment>
    </SettingsWrapper>

    <!-- Nature -->
    <AutoCompleteV2
      itemF={(_) => Natures}
      max={Natures.length}
      bind:search={natureSearch}
      bind:selected={nature}
      id="{location} Nature"
      name="{location} Nature"
      placeholder="Nature"
      class="psel__nature {!selected || status?.id === 4 || hidden
        ? 'psel__field--secondary'
        : ''}"
    >
      <div class="psel__nature-option" slot="option" let:option let:label>
        <span>{@html label}</span>
        {#if option.value.length}
          <span class="psel__nature-mods">
            <span class="psel__nature-up">
              {option.value[0]}
              <Icon inline={true} icon={Chevron} class="fill-current" />
            </span>
            <span class="psel__nature-down">
              {option.value[1]}
              <Icon
                inline={true}
                icon={Chevron}
                class="rotate-180 transform fill-current"
              />
            </span>
          </span>
        {/if}
      </div>
    </AutoCompleteV2>

    <!-- Action buttons -->
    <div class="psel__actions">
      {#if selected && status && status.id !== 4 && status.id !== 5}
        <IconButton
          rounded
          src={Deceased}
          title="Kill {selected.name}"
          track="kill"
          on:click={handleStatus(5)}
          containerClassName={!selected || hidden ? 'hidden sm:block' : ''}
        />
      {/if}

      {#if selected && !hidden && !status}
        <IconButton
          rounded
          name="poke-ball"
          color="orange"
          className="-translate-y-0.5"
          containerClassName={!selected ? 'hidden sm:block' : ''}
          on:click={handleStatus(1)}
          title="Capture {selected.name}"
        />
      {/if}

      {#if selected && !hidden && selected?.evos?.length && (!status || NuzlockeGroups.Available.includes(status.id))}
        <IconButton
          rounded
          name="dawn-stone"
          className="-translate-y-0.5"
          containerClassName={!selected ? 'hidden sm:block' : ''}
          color="green"
          title="Evolve {selected.name}"
          on:click={handleEvolution(selected.sprite, selected.evos)}
        />
      {/if}

      {#if selected && !hidden && (inteam || team.length < 6) && status && NuzlockeGroups.Available.includes(status.id)}
        <IconButton
          rounded
          src={Ball}
          className="transform scale-125"
          containerClassName="relative"
          color="sky"
          title="{inteam ? `Remove` : `Add`} {selected.name} {inteam
            ? `from`
            : `to`} your team"
          on:click={inteam ? handleTeamRemove : handleTeamAdd}
        >
          <Icon
            class="absolute right-0.5 top-0.5 scale-75 transform rounded-full bg-white dark:bg-gray-800"
            inline
            icon={inteam ? Minus : Plus}
          />
        </IconButton>
      {/if}

      <!-- Context menu -->
      <Popover title="Open contextual menu" className="psel__popover-anchor">
        <Icon inline={true} height="1.4em" icon={Dots} class="fill-current" />

        <ul in:fly={{ duration: 200, x: 30 }} class="psel__menu" slot="popover">
          <div class="psel__menu-header">
            <strong>{locationName || location}</strong>
            <Icon inline={true} icon={Map} class="fill-current" />
          </div>

          <li>
            <button on:click={onnew}>
              <Icon inline={true} icon={Add} class="mr-2 fill-current" />
              Add Location
            </button>
          </li>

          <SettingsWrapper id="permadeath" on="1" condition={status?.id === 5}>
            <li slot="else">
              <button on:click={handleClear}>
                <Icon inline={true} icon={Delete} class="mr-2 fill-current" />
                Clear Encounter
              </button>
            </li>
          </SettingsWrapper>

          {#if type === 'custom'}
            <li>
              <button on:click={ondelete}>
                <Icon inline={true} icon={Bin} class="mr-2 fill-current" />
                Delete Location
              </button>
            </li>
          {/if}

          {#if type !== 'custom' && type !== 'starter'}
            <li>
              <button on:click={onhide}>
                <Icon inline={true} icon={Hide} class="mr-2 fill-current" />
                Hide Location
              </button>
            </li>
          {/if}

          {#if selected && !hidden && selected?.evos?.length && (!status || NuzlockeGroups.Available.includes(status.id))}
            <li>
              <button
                class="inline-flex"
                on:click={handleEvolution(selected.sprite, selected.evos)}
              >
                <PIcon
                  className="transform scale-75 -mr-2 -ml-1.5 -my-1 grayscale"
                  type="item"
                  name="dawn-stone"
                />
                <span class="ml-0.5">Evolve {nickname || selected.name}</span>
              </button>
            </li>
          {/if}

          {#if selected && !hidden && !status}
            <li>
              <button class="inline-flex" on:click={handleStatus(1)}>
                <PIcon
                  className="transform scale-75 -mr-2 -ml-1.5 -my-1 grayscale"
                  type="item"
                  name="poke-ball"
                />
                Capture {selected.name}
              </button>
            </li>
          {/if}

          {#if selected && !hidden && (inteam || team.length < 6) && status && NuzlockeGroups.Available.includes(status.id)}
            <li>
              <button
                class="inline-flex"
                title="{inteam ? `Remove` : `Add`} {selected.name} {inteam
                  ? `from`
                  : `to`} your team"
                on:click={inteam ? handleTeamRemove : handleTeamAdd}
              >
                <span class="relative mr-2">
                  <Icon inline icon={Ball} class="scale-125 transform" />
                  <Icon
                    class="group-bg absolute -right-1.5 -top-1 scale-75 transform rounded-full bg-white dark:bg-gray-900"
                    inline
                    icon={inteam ? Minus : Plus}
                  />
                </span>
                {inteam ? `Remove from Team` : `Add to Team`}
              </button>
            </li>
          {/if}

          {#if infolink}
            <li>
              <a
                href={infolink}
                title="Pokémon DB Link for {location}"
                rel="noreferrer"
                target="_blank"
              >
                <Icon
                  inline={true}
                  icon={External}
                  class="-mt-0.5 mr-2 inline fill-current"
                />
                Route Info
              </a>
            </li>
          {/if}
        </ul>
      </Popover>
    </div>
  </div>
</SettingsWrapper>

<style lang="postcss">
  /* --- Selector row --- */
  .psel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 0.5rem;
    width: 100%;
    align-items: center;
    padding: 0.625rem 0.75rem;
    border-radius: 0.625rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.6);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    transition: all 0.15s ease;
  }

  :global(.dark) .psel {
    border-color: rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.025);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .psel:hover {
    border-color: rgba(0, 0, 0, 0.12);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  :global(.dark) .psel:hover {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .psel--gray {
    opacity: 0.45;
  }

  @media (min-width: theme('screens.md')) {
    .psel {
      grid-template-columns: minmax(7rem, 10rem) 2fr 1fr 1fr 1fr auto;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
    }

    .psel--wide {
      grid-template-columns: minmax(7rem, 10rem) 2fr 1fr 1fr 1fr 1fr auto;
    }
  }

  @media (min-width: theme('screens.lg')) {
    .psel {
      grid-template-columns: minmax(8rem, 12rem) 2fr 1fr 1fr 1fr auto;
    }

    .psel--wide {
      grid-template-columns: minmax(8rem, 12rem) 2fr 1fr 1fr 1fr 1fr auto;
    }
  }

  /* Location */
  .psel__loc {
    grid-column: span 2;
    font-weight: 500;
    font-size: 0.9375rem;
    padding: 0.25rem 0;
    color: theme('colors.gray.800');
  }

  :global(.dark) .psel__loc {
    color: theme('colors.gray.200');
  }

  @media (min-width: theme('screens.md')) {
    .psel__loc {
      grid-column: span 1;
      font-size: 0.8125rem;
      font-weight: 400;
      text-align: right;
      padding-right: 0.75rem;
      color: theme('colors.gray.500');
    }

    :global(.dark) .psel__loc {
      color: theme('colors.gray.400');
    }
  }

  .psel__loc-name {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Encounter AC */
  :global(.psel__encounter) {
    grid-column: span 2;
    width: 92%;
  }

  @media (min-width: theme('screens.sm')) {
    :global(.psel__encounter) {
      width: 100%;
    }
  }

  @media (min-width: theme('screens.md')) {
    :global(.psel__encounter) {
      grid-column: span 1;
    }
  }

  /* Hidden button */
  .psel__hidden-btn {
    grid-column: span 2;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 92%;
    overflow: hidden;
    padding-right: 0.75rem;
    border: 2px solid theme('colors.gray.200');
    border-radius: 0.5rem;
    transition: border-color 0.15s;
  }

  :global(.dark) .psel__hidden-btn {
    border-color: theme('colors.gray.600');
    background: transparent;
  }

  .psel__hidden-btn:hover {
    border-color: theme('colors.lime.500');
  }

  :global(.dark) .psel__hidden-btn:hover {
    border-color: theme('colors.lime.400');
    background: rgba(255, 255, 255, 0.03);
  }

  @media (min-width: theme('screens.sm')) {
    .psel__hidden-btn {
      width: 100%;
    }
  }

  @media (min-width: theme('screens.md')) {
    .psel__hidden-btn {
      grid-column: span 1;
    }
  }

  .psel__hidden-preview {
    display: inline-flex;
    align-items: center;
    opacity: 0.5;
    filter: blur(2px) grayscale(1);
  }

  :global(.dark) .psel__hidden-preview {
    opacity: 1;
  }

  .psel__hidden-label {
    letter-spacing: 0.04em;
    font-size: 0.8125rem;
    color: theme('colors.gray.400');
    transition: color 0.15s;
  }

  .psel__hidden-btn:hover .psel__hidden-label {
    color: theme('colors.lime.500');
  }

  :global(.dark) .psel__hidden-btn:hover .psel__hidden-label {
    color: theme('colors.lime.400');
  }

  :global(.psel__grass) {
    position: absolute;
    transition: color 0.15s;
  }

  :global(.psel__grass--1) {
    left: 0.125rem;
    bottom: -0.375rem;
    color: theme('colors.gray.200');
  }

  :global(.psel__grass--2) {
    left: 1.75rem;
    bottom: -0.375rem;
    color: theme('colors.gray.200');
  }

  :global(.psel__grass--3) {
    left: 0.375rem;
    bottom: -0.75rem;
    color: theme('colors.gray.300');
  }

  :global(.dark .psel__grass--1),
  :global(.dark .psel__grass--2) {
    color: theme('colors.gray.700');
  }

  :global(.dark .psel__grass--3) {
    color: theme('colors.gray.600');
  }

  .psel__hidden-btn:hover :global(.psel__grass--1),
  .psel__hidden-btn:hover :global(.psel__grass--2) {
    color: theme('colors.lime.400');
    animation: shake 0.3s ease infinite;
  }

  .psel__hidden-btn:hover :global(.psel__grass--3) {
    color: theme('colors.lime.500');
    animation: shake 0.3s ease infinite;
  }

  @keyframes shake {
    0%,
    100% {
      transform: rotate(0);
    }
    25% {
      transform: rotate(-3deg);
    }
    75% {
      transform: rotate(3deg);
    }
  }

  /* Option styling */
  .psel__option {
    display: flex;
    align-items: center;
    height: 2rem;
    padding: 0 1rem 0 1.25rem;
  }

  @media (min-width: theme('screens.md')) {
    .psel__option {
      padding: 0.375rem 1rem 0.375rem 1.25rem;
    }
  }

  .psel__option--dupe {
    font-size: 0.6875rem;
    opacity: 0.25;
    filter: grayscale(1);
    margin-right: 0.5rem;
  }

  .psel__dupe-tag {
    position: absolute;
    right: 1rem;
    font-size: 0.625rem;
  }

  .psel__particles-anchor {
    position: absolute;
    left: 1rem;
    top: 0.5rem;
    z-index: 50;
  }

  /* Nickname */
  :global(.psel__nickname) {
    grid-column: span 2;
  }

  @media (min-width: theme('screens.md')) {
    :global(.psel__nickname) {
      grid-column: span 1;
    }
  }

  /* Dead badge */
  .psel__dead-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.5rem;
    padding: 0 0.75rem;
    border: 2px solid theme('colors.gray.200');
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: theme('colors.gray.800');
    cursor: not-allowed;
  }

  :global(.dark) .psel__dead-badge {
    border-color: theme('colors.gray.600');
    color: theme('colors.gray.200');
  }

  /* Status */
  :global(.psel__status) {
    grid-column: span 1;
  }

  :global(.psel__status--wide) {
    grid-column: span 2;
  }

  @media (min-width: theme('screens.sm')) {
    :global(.psel__status--wide) {
      grid-column: span 1;
    }
  }

  .psel__status-option {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  @media (min-width: theme('screens.md')) {
    .psel__status-option {
      padding: 0.625rem 0.75rem;
    }
  }

  /* Nature */
  :global(.psel__nature) {
    grid-column: span 1;
  }

  .psel__nature-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.25rem;
  }

  @media (min-width: theme('screens.md')) {
    .psel__nature-option {
      padding: 0.625rem 0.25rem;
    }
  }

  .psel__nature-mods {
    display: flex;
    flex-direction: column;
    gap: 0;
    font-size: 0.625rem;
    margin-right: -0.75rem;
  }

  @media (min-width: theme('screens.sm')) {
    .psel__nature-mods {
      flex-direction: column;
    }
  }

  .psel__nature-up {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    color: theme('colors.orange.400');
  }

  .psel__nature-down {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    color: theme('colors.blue.300');
  }

  /* Secondary fields (hidden when no pkmn selected on mobile) */
  :global(.psel__field--secondary) {
    display: none;
  }

  @media (min-width: theme('screens.sm')) {
    :global(.psel__field--secondary) {
      display: block;
    }
  }

  /* Actions */
  .psel__actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  :global(.psel__popover-anchor) {
    position: absolute;
    top: 0;
    right: 0.25rem;
  }

  @media (min-width: theme('screens.sm')) {
    :global(.psel__popover-anchor) {
      position: relative;
      top: auto;
      right: auto;
    }
  }

  /* Context menu */
  .psel__menu {
    display: flex;
    flex-direction: column;
    width: 12rem;
    background: white;
    border-radius: 0.75rem;
    padding-top: 0;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    color: theme('colors.gray.800');
  }

  :global(.dark) .psel__menu {
    background: theme('colors.gray.900');
    color: theme('colors.gray.50');
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }

  .psel__menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid theme('colors.gray.100');
  }

  :global(.dark) .psel__menu-header {
    border-bottom-color: theme('colors.gray.800');
  }

  .psel__menu li {
    border-bottom: 1px solid theme('colors.gray.50');
  }

  :global(.dark) .psel__menu li {
    border-bottom-color: theme('colors.gray.800');
  }

  .psel__menu li:last-of-type {
    border-bottom: none;
  }

  .psel__menu button,
  .psel__menu a {
    display: inline-flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.875rem;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .psel__menu li:hover {
    background: theme('colors.gray.50');
    color: theme('colors.red.500');
  }

  :global(.dark) .psel__menu li:hover {
    background: theme('colors.orange.500');
    color: white;
  }

  :global(.dark) .psel__menu li:hover :global(.group-bg) {
    background: theme('colors.orange.500');
    color: white;
  }
</style>
