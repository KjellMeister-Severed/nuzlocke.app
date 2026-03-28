<script>
  import { onMount, getContext } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Footer } from '$c/navs'

  import PokemonCard from '$lib/components/pokemon-card.svelte'

  import { Settings } from '$lib/components/Settings'
  import { Loader, PIcon, IconButton, Tooltip, Toggle, Icon } from '$c/core'
  import { Ball, Plus, Minus, Shiny, X, Deceased, External } from '$icons'

  import TypeLogo from '$lib/components/type-logo.svelte'
  import { Modal as AnalysisModal } from '$lib/components/Analysis'

  import { capitalise } from '$utils/string'
  import { drag } from '$utils/drag'
  import { locid } from '$utils/pokemon'

  import {
    getGameStore,
    getBox,
    readdata,
    read,
    readTeam,
    readTeams,
    patch,
    updatePokemon,
    killPokemon
  } from '$lib/store'

  import { canonTypes as types } from '$lib/data/types'
  import { stats, StatIconMap, StatLongMap } from '$lib/data/stats'

  import { UNOWN, createImgUrl } from '$utils/rewrites'
  import { toDb } from '$utils/link'
  import { summarise } from '$utils/badges'

  const region = getContext('region')
  const { getPkmns, getPkmn } = getContext('game')
  const { open } = getContext('simple-modal')

  let minimal = false
  let Particles
  let gameStore,
    teamData = [],
    winData,
    setTeam = (_) => _

  onMount(() => {
    import('$lib/components/particles').then((m) => (Particles = m.default))

    const [, , gameId] = readdata()
    gameStore = getGameStore(gameId)
    gameStore.subscribe(
      read((data) => {
        teamData = readTeam(data)
        winData = readTeams(data)
      })
    )

    setTeam = (data) => gameStore.update(patch({ __team: data.slice(0, 6) }))
    ;['game_el'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.style = 'opacity: 0'
        setTimeout((_) => el.remove(), 500)
      }
    })
  })

  let loading = true
  let ogbox = [],
    box = [],
    Pokemon = {}
  getBox((b) => {
    ogbox = box = b
    getPkmns(box.map((i) => i.pokemon)).then((data) => {
      Pokemon = data
      loading = false
    })
  })

  let type = ''
  let stat = ''

  const clear = () => (stat = type = '')
  const sum = (l) => l.reduce((acc, it) => acc + it, 0)
  $: filter = (p) => {
    const [fType, fVal] = type.split(':')

    if (fType == 'type')
      return (Pokemon[p.pokemon]?.types || [])
        .map((i) => i.toLowerCase())
        .includes(fVal)

    if (fType == 'badge')
      return winData
        .find((w) => w.id === fVal)
        ?.team?.find((d) => d.id === locid(p))

    return true
  }

  $: typeCounts = types.reduce(
    (acc, it) => ({
      ...acc,
      [it]: ogbox.filter((p) =>
        (Pokemon[p.pokemon]?.types || [])
          .map((i) => i.toLowerCase())
          .includes(it)
      ).length
    }),
    {}
  )

  $: box = [...ogbox].sort((a, b) => {
    if (stat === 'total') {
      return (
        sum(Object.values(Pokemon[b.pokemon]?.baseStats)) -
        sum(Object.values(Pokemon[a.pokemon]?.baseStats))
      )
    }

    if (stat === 'type') {
      const val = Pokemon[b.pokemon].types
        .join('/')
        .localeCompare(Pokemon[a.pokemon].types.join('/'))

      if (val !== 0) return val
      return (
        sum(Object.values(Pokemon[b.pokemon]?.baseStats)) -
        sum(Object.values(Pokemon[a.pokemon]?.baseStats))
      )
    }

    if (type.startsWith('badge')) {
      const [, fVal] = type.split(':')
      const winTeam = winData.find((w) => w.id === fVal)?.team || []
      return (
        winTeam.findIndex((p) => p.id === locid(b)) -
        winTeam.findIndex((p) => p.id === locid(a))
      )
    }

    return stat
      ? Pokemon[b.pokemon]?.baseStats[stat] -
          Pokemon[a.pokemon]?.baseStats[stat]
      : a.id - b.id
  })

  $: enabled = box.length && (stat || type)

  const toid = (p) => `${p.id}@${p.location}`

  let DeathModal
  const openDeathModal = async (args) => {
    if (DeathModal) open(DeathModal, args)
    import('$lib/components/DeathModal/index.svelte').then((m) => {
      DeathModal = m.default
      open(DeathModal, args)
    })
  }

  let EvoModal
  const openEvoModal = async (args) => {
    if (EvoModal) open(EvoModal, args)
    import('$lib/components/EvolutionModal.svelte').then((m) => {
      EvoModal = m.default
      open(EvoModal, args)
    })
  }

  let evoComplete = false
  const handleEvo = ({ evos, alias }, original) =>
    openEvoModal({
      evolutions: evos,
      base: alias,
      select: handleEvoComplete(original)
    })
  const handleEvoComplete = (o) => async (id) =>
    getPkmn(id).then((p) => {
      getPkmns(box.map((i) => i.pokemon).concat(p.alias)).then((data) => {
        Pokemon = data
        ogbox = ogbox.map((i) => {
          return toid(i) == toid(o) ? { ...i, pokemon: p.alias } : i
        })

        updatePokemon({ ...o, pokemon: p.alias })
        evoComplete = toid(o)
      })
    })

  const handleKill = (o) => () => {
    openDeathModal({
      submit: handleDeath(o),
      pokemon: Pokemon[o.pokemon],
      nickname: o.nickname
    })
  }

  const handleDeath = (o) => (death) => {
    ogbox = ogbox.filter((i) => toid(i) !== toid(o))
    killPokemon({ ...o, death })
    handleTeamRemove(o)
  }

  function handleTeamAdd(p) {
    setTeam((teamData || []).filter((i) => i !== locid(p)).concat(locid(p)))
  }

  function handleTeamRemove(p) {
    setTeam((teamData || []).filter((i) => i !== locid(p)))
  }

  let mons = []
  $: {
    mons = (teamData || [])
      .map((t) => ogbox.find((o) => t === locid(o)))
      .filter((i) => i)
      .slice(0, 6)
  }
</script>

{#if loading}
  <Loader />
{:else}
  <div
    out:fade|local={{ duration: 200 }}
    in:fade|local={{ duration: 200, delay: 250 }}
    class="boxpage"
  >
    <main class="boxpage__main {region}">
      <!-- Toolbar -->
      <div class="boxpage__toolbar">
        <div class="boxpage__toolbar-left">
          <AnalysisModal box={Object.values(Pokemon)}>
            <small>Box</small>
          </AnalysisModal>
          <AnalysisModal box={mons.map((p) => Pokemon[p.pokemon])}>
            <small>Team</small>
          </AnalysisModal>
        </div>

        <div class="boxpage__toolbar-right">
          <Toggle id="minimal" bind:state={minimal}>
            <small>Hide stats</small>
          </Toggle>
          <Settings />
        </div>
      </div>

      <!-- Filters -->
      <div class="boxpage__filters">
        <!-- Stat sort pills -->
        <div class="boxpage__stat-filters">
          <button
            class="boxpage__clear-btn"
            disabled={!enabled}
            on:click={clear}
            title="Clear filters"
          >
            <Icon class="fill-current" height="0.9em" inline icon={X} />
            <span>Clear</span>
          </button>

          {#each stats as s}
            <label
              class="boxpage__stat-pill"
              class:boxpage__stat-pill--active={stat === s}
            >
              <input type="radio" bind:group={stat} name="sortable" value={s} />
              {#if StatLongMap[s]}
                <Tooltip delay="1000">Sort by highest {StatLongMap[s]}</Tooltip>
              {:else}
                <Tooltip delay="1000">Sort by {s}</Tooltip>
              {/if}
              {#if StatIconMap[s]}
                <Icon
                  inline={true}
                  class="fill-current {s !== 'spa' ? '' : ''}"
                  icon={StatIconMap[s]}
                />
              {/if}
              <span>{capitalise(s)}</span>
            </label>
          {/each}
        </div>

        <!-- Type filter -->
        <div class="boxpage__type-filters">
          {#each types as t}
            {#if typeCounts[t] > 0}
              <label
                class="boxpage__type-pill"
                class:boxpage__type-pill--dim={(type && !type.endsWith(t)) ||
                  !typeCounts[t]}
                class:boxpage__type-pill--active={type && type.endsWith(t)}
              >
                <input
                  disabled={!typeCounts[t]}
                  bind:group={type}
                  value="type:{t}"
                  type="radio"
                  name="filter"
                />
                <Tooltip delay="1000">Filter to {t} types</Tooltip>
                <TypeLogo
                  tooltip={false}
                  type={t}
                  className="w-full justify-center"
                />
              </label>
            {/if}
          {/each}
        </div>

        <!-- Badge filter -->
        {#if true}
          {@const gymData = winData.filter((d) => d.group === 'gym-leader')}
          {#if gymData.length}
            <div class="boxpage__badge-filters">
              {#each gymData as d}
                <label
                  class="boxpage__badge-pill"
                  class:boxpage__badge-pill--dim={type && !type.endsWith(d.id)}
                  class:boxpage__badge-pill--active={type &&
                    type.endsWith(d.id)}
                >
                  <PIcon type="b" name={d.type || d.speciality || d.id} />
                  <Tooltip delay="1000">Filter to team for {d.name}</Tooltip>
                  <input
                    bind:group={type}
                    type="radio"
                    value="badge:{d.id}"
                    name="badge"
                  />
                </label>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Card grid -->
      <div
        class="boxpage__grid"
        class:boxpage__grid--minimal={minimal}
        class:boxpage__grid--team={stat === 'team' || type.startsWith('badge:')}
      >
        {#if box.length === 0}
          <div class="boxpage__empty">You have no Pokémon in your box</div>
        {/if}

        {#each (stat === 'team' ? mons : box).filter(filter) as p (locid(p))}
          {@const badgeSummary = summarise(p, winData)}

          <div
            use:drag={{ data: p, effect: 'add', hideImg: true }}
            class="boxpage__card-wrap"
          >
            <PIcon
              class="data-drag-img invisible absolute -left-20 -top-20 -z-20"
              name={p.pokemon}
            />

            <PokemonCard
              {minimal}
              sprite={createImgUrl(Pokemon[p.pokemon], {
                shiny: p.status === 6,
                ext: 'png'
              })}
              fallback={UNOWN}
              maxStat={Math.max(
                150,
                ...Object.values(Pokemon[p.pokemon].baseStats)
              )}
              moves={[]}
              ability={p.nickname
                ? {
                    name: p.nickname + ' the ' + (p.nature || '').toLowerCase()
                  }
                : null}
              name={Pokemon[p.pokemon].name}
              stats={Pokemon[p.pokemon].baseStats}
              nature={p.nature}
              types={(Pokemon[p.pokemon].types || []).map((t) =>
                t.toLowerCase()
              )}
            >
              <svelte:fragment slot="badges">
                {#if badgeSummary}
                  {@const { summary, icons } = badgeSummary}
                  <Tooltip>{summary}</Tooltip>
                  {#each icons as icon}
                    <PIcon name={icon} type="b" />
                  {/each}
                {/if}
              </svelte:fragment>

              <span slot="img">
                {#if evoComplete === toid(p)}
                  <span class="boxpage__evo-particles">
                    <Particles
                      amount={25}
                      icons={['ice-stone', 'dawn-stone', 'fire-stone']}
                      on:end={() => (evoComplete = false)}
                    />
                  </span>
                {/if}
                {#if p.status === 6}
                  <Icon
                    inline={true}
                    icon={Shiny}
                    height="3.6em"
                    class="boxpage__shiny boxpage__shiny--1"
                  />
                  <Icon
                    inline={true}
                    icon={Shiny}
                    height="2.8em"
                    class="boxpage__shiny boxpage__shiny--2"
                  />
                {/if}
              </span>

              <span class="boxpage__card-footer" slot="footer" let:id>
                {#if p.location === 'Starter'}
                  Met in a fateful encounter
                {:else if p.status === 2}
                  Obtained from {p.location || p.customName}
                {:else if p.status === 3}
                  Received in a trade {(p.customName || p.location).startsWith(
                    'Route'
                  )
                    ? 'on'
                    : 'in'}
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

                {#if !p.customName}
                  <span class="boxpage__separator">|</span>

                  <a
                    class="boxpage__info-link"
                    href={toDb(id)}
                    title="Pokémon DB Link for {id}"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Info
                    <Icon
                      inline={true}
                      icon={External}
                      class="-mt-0.5 inline fill-current"
                    />
                  </a>
                {/if}

                <!-- Card action buttons -->
                <div class="boxpage__card-actions" class:hidden={minimal}>
                  {#if Pokemon[p.pokemon].evos?.length}
                    <IconButton
                      className="translate-y-1 -mb-px transform scale-75"
                      borderless
                      name="dawn-stone"
                      on:click={handleEvo(Pokemon[p.pokemon], p)}
                    />
                  {/if}
                  <IconButton
                    on:click={handleKill(p)}
                    className="translate-y-1"
                    src={Deceased}
                    borderless
                  />
                  {#if !teamData || teamData?.length < 6 || teamData?.includes(p.location)}
                    <IconButton
                      className="translate-y-1 transform scale-125"
                      borderless
                      src={Ball}
                      title="{teamData?.includes(locid(p))
                        ? `Remove`
                        : `Add`} {p.pokemon} {teamData?.includes(locid(p))
                        ? `from`
                        : `to`} your team"
                      on:click={(teamData?.includes(locid(p))
                        ? handleTeamRemove
                        : handleTeamAdd
                      ).bind({}, p)}
                    >
                      {#if teamData?.includes(locid(p))}
                        <Icon
                          class="absolute right-0.5 top-2 scale-75 transform rounded-full bg-white dark:bg-gray-900"
                          inline
                          icon={Minus}
                        />
                      {:else}
                        <Icon
                          class="absolute right-0.5 top-2 scale-75 transform rounded-full bg-white dark:bg-gray-900"
                          inline
                          icon={Plus}
                        />
                      {/if}
                    </IconButton>
                  {/if}
                </div>
              </span>
            </PokemonCard>
          </div>
        {/each}
      </div>

      <Footer class="!relative !mt-6 !-mb-20 md:hidden" />
    </main>
  </div>
{/if}

<style lang="postcss">
  input[type='radio'] {
    display: none;
  }

  .boxpage {
    max-width: 80rem;
    margin: 0 auto;
  }

  .boxpage__main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 3.75rem 1rem 8rem;
    scroll-snap-type: y mandatory;
    overflow: hidden;
  }

  @media (min-width: theme('screens.md')) {
    .boxpage__main {
      padding: 5rem 2rem 12rem;
    }
  }

  @media (min-width: theme('screens.xl')) {
    .boxpage__main {
      width: 75%;
      margin: 0 auto;
    }
  }

  /* Toolbar */
  .boxpage__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    scroll-snap-align: start;
  }

  .boxpage__toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .boxpage__toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* Filters */
  .boxpage__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    align-items: flex-start;
  }

  @media (min-width: theme('screens.md')) {
    .boxpage__filters {
      flex-wrap: nowrap;
    }
  }

  /* Stat pills */
  .boxpage__stat-filters {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 0.375rem;
    width: 100%;
  }

  @media (min-width: theme('screens.sm')) {
    .boxpage__stat-filters {
      width: auto;
    }
  }

  .boxpage__clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid theme('colors.gray.300');
    color: theme('colors.gray.500');
    transition: all 0.15s;
    cursor: pointer;
  }

  .boxpage__clear-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .boxpage__clear-btn:not(:disabled):hover {
    border-color: theme('colors.gray.800');
    color: theme('colors.gray.800');
  }

  :global(.dark) .boxpage__clear-btn {
    border-color: theme('colors.gray.600');
    color: theme('colors.gray.400');
  }

  :global(.dark) .boxpage__clear-btn:not(:disabled):hover {
    border-color: theme('colors.gray.300');
    color: theme('colors.gray.200');
  }

  .boxpage__stat-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border-radius: 0.5rem;
    font-size: 0.6875rem;
    font-weight: 500;
    border: 1px solid theme('colors.gray.300');
    color: theme('colors.gray.500');
    cursor: pointer;
    transition: all 0.15s;
  }

  .boxpage__stat-pill:hover {
    border-color: theme('colors.gray.500');
  }

  .boxpage__stat-pill--active {
    background: theme('colors.gray.800');
    border-color: theme('colors.gray.800');
    color: white;
  }

  :global(.dark) .boxpage__stat-pill {
    border-color: theme('colors.gray.600');
    color: theme('colors.gray.400');
  }

  :global(.dark) .boxpage__stat-pill--active {
    background: theme('colors.gray.100');
    border-color: theme('colors.gray.100');
    color: theme('colors.gray.900');
  }

  /* Type filters */
  .boxpage__type-filters {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.375rem;
    width: 100%;
  }

  @media (min-width: theme('screens.sm')) {
    .boxpage__type-filters {
      width: auto;
    }
  }

  @media (min-width: theme('screens.md')) {
    .boxpage__type-filters {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  @media (min-width: theme('screens.xl')) {
    .boxpage__type-filters {
      grid-template-columns: repeat(9, 1fr);
    }
  }

  .boxpage__type-pill {
    height: 1.625rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .boxpage__type-pill--dim {
    filter: grayscale(1);
    opacity: 0.4;
  }

  .boxpage__type-pill--active {
    filter: none;
    opacity: 1;
  }

  /* Badge filters */
  .boxpage__badge-filters {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25rem;
    padding-left: 0.5rem;
    border-left: 1px solid theme('colors.gray.200');
    transform: scale(1.15);
    transform-origin: left;
  }

  :global(.dark) .boxpage__badge-filters {
    border-left-color: theme('colors.gray.600');
  }

  @media (min-width: theme('screens.xl')) {
    .boxpage__badge-filters {
      grid-template-columns: repeat(8, 1fr);
      transform: scale(1.3);
    }
  }

  .boxpage__badge-pill {
    cursor: pointer;
    text-align: center;
    padding: 0.125rem 0.25rem;
    transition: all 0.15s;
  }

  .boxpage__badge-pill--dim {
    filter: grayscale(1);
    opacity: 0.4;
  }

  .boxpage__badge-pill--active {
    filter: none;
    opacity: 1;
  }

  /* Card grid */
  .boxpage__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem 1rem;
    margin-top: 1rem;
  }

  @media (min-width: theme('screens.sm')) {
    .boxpage__grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: theme('screens.lg')) {
    .boxpage__grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: theme('screens.xl')) {
    .boxpage__grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .boxpage__grid--minimal {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem 0.75rem;
  }

  @media (min-width: theme('screens.sm')) {
    .boxpage__grid--minimal {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: theme('screens.md')) {
    .boxpage__grid--minimal {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (min-width: theme('screens.lg')) {
    .boxpage__grid--minimal {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  .boxpage__grid--team {
    /* Wider cards for team/badge view */
  }

  @media (min-width: theme('screens.xl')) {
    .boxpage__grid--team:not(.boxpage__grid--minimal) {
      grid-template-columns: repeat(3, 1fr);
    }

    .boxpage__grid--team.boxpage__grid--minimal {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  .boxpage__card-wrap {
    scroll-snap-align: start;
    position: relative;
  }

  .boxpage__empty {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24rem;
    font-size: 1.125rem;
    color: theme('colors.gray.400');
  }

  :global(.dark) .boxpage__empty {
    color: theme('colors.gray.600');
  }

  /* Card footer */
  .boxpage__card-footer {
    z-index: 40;
    display: block;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: theme('colors.gray.500');
    position: relative;
  }

  .boxpage__separator {
    margin: 0 0.25rem;
    opacity: 0.4;
  }

  .boxpage__info-link {
    display: inline;
    border-bottom: 1px solid transparent;
    transition: all 0.15s;
  }

  .boxpage__info-link:hover {
    border-bottom-color: currentColor;
    color: theme('colors.gray.900');
  }

  :global(.dark) .boxpage__info-link:hover {
    color: theme('colors.gray.100');
  }

  /* Card actions */
  .boxpage__card-actions {
    position: absolute;
    bottom: -1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    border-radius: 0.5rem;
    border: 1px solid theme('colors.gray.200');
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: -2;
    overflow: hidden;
  }

  :global(.dark) .boxpage__card-actions {
    background: theme('colors.gray.900');
    border-color: transparent;
  }

  .boxpage__card-actions::after {
    content: '';
    position: absolute;
    background: inherit;
    width: calc(100% + 12px);
    left: -6px;
    bottom: 50%;
    z-index: -10;
    height: calc(50% + 1px);
  }

  /* Evo particles */
  .boxpage__evo-particles {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
  }

  /* Shiny sparkles */
  :global(.boxpage__shiny) {
    position: absolute;
    z-index: 50;
    fill: currentColor;
    color: theme('colors.orange.200');
    animation: pulse 2s ease-in-out infinite;
  }

  :global(.boxpage__shiny--1) {
    left: 50%;
    transform: translateY(-75%) translateX(-100%);
  }

  :global(.boxpage__shiny--2) {
    top: 0;
    right: 0;
    transform: translateY(25%) translateX(-67%) rotate(180deg);
    color: theme('colors.orange.300');
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
