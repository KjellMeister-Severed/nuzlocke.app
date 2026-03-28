<script>
  import { savedGames, createGame } from '$lib/store'
  import { PixelatedContainer } from '$lib/components/containers'

  import {
    Radio,
    Button,
    Tabs,
    Input,
    Logo,
    Tooltip
  } from '$lib/components/core'
  import AutoComplete from '$c/core/AutoCompleteV2.svelte'

  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { File, Dice, Search, X } from '$icons'

  import Games from '$lib/data/games.json'

  import { filterObj } from '$lib/utils/arr'
  import { slide, fade } from 'svelte/transition'

  let validGames = filterObj(Games, (g) => g.supported)

  let gameName = ''
  const handleNewGame = () => {
    if (!selectedGame?.supported)
      return alert(`Sorry, ${selectedGame?.title} is currently not supported`)

    let createid = selected
    if (selectedGame?.difficulty)
      createid += difficultyOptions?.[difficulty]?.id || ''

    savedGames.update(createGame(gameName, createid))
    window.location = '/game'
  }

  const handleGenGame = () => {
    if (!selectedGame?.supported)
      return alert(`Sorry, ${selectedGame?.title} is currently not supported`)

    fetch(`/api/route/generate/${selectedGame?.pid}.json`)
      .then((res) => res.text())
      .then((res) => {
        let createid = selected
        if (selectedGame?.difficulty)
          createid += difficultyOptions?.[difficulty]?.id || ''

        savedGames.update(createGame(gameName, createid, res))
        window.location = '/game'
      })
  }

  let selected
  const handleSelect = (id) => () =>
    selected === id ? (selected = null) : (selected = id)

  const clearSelection = () => {
    selected = null
    difficulty = 0
  }

  let difficulty = 0,
    difficultyOptions = []

  let gen = 'All'
  const gens = [
    { label: 'All', val: 'All' },
    { label: 'Rom Hacks', val: 'romhack' }
  ].concat(
    ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].map((l) => ({
      label: `Gen ${l}`,
      val: l
    }))
  )

  let customName
  $: {
    if ((selectedGame && !gameName) || customName === gameName) {
      customName = gameName = selectedGame
        ? `${selectedGame?.title} Nuzlocke`
        : ''
    }
  }

  $: difficultyOptions = selectedGame?.difficulty?.map((d) => ({
    id: d.split(':')[1],
    name: d.split(':')[0] || 'Normal'
  }))
  $: selectedGame = validGames[selected]
  $: disabled = !gameName.length || !selected
  $: filteredGames = Object.entries(validGames).filter(
    ([, game]) => game.logo && (gen === 'All' || game.gen === gen)
  )
</script>

<svelte:head>
  <title>Nuzlocke Tracker | Create new game</title>
</svelte:head>

<div class="page-wrapper">
  <!-- Header -->
  <header class="page-header">
    <Icon inline icon={File} height="1.4em" class="fill-current opacity-60" />
    <h1>New Nuzlocke</h1>
  </header>

  <!-- Search (all screen sizes) -->
  <div class="search-row">
    <AutoComplete
      max={Object.keys(validGames).length}
      itemF={(_) => Object.keys(validGames)}
      labelF={(i) => i && Games[i].title}
      placeholder="Search for a game..."
      class="search-autocomplete"
      bind:selected
    >
      <Icon
        slot="icon"
        let:iconClass
        inline
        icon={Search}
        class="{iconClass} fill-current text-gray-400 dark:text-gray-500"
      />
      <div
        class="flex items-center gap-3 px-3 py-2"
        slot="option"
        let:option={i}
        let:label
      >
        {#if Games[i].logo}
          <Logo
            logo="{Games[i].logo}"
            alt={Games[i].title + ' logo'}
            class="w-14 shrink-0"
            role="presentation"
            aspect="192x96"
          />
        {/if}
        <span class="text-sm">{@html label}</span>
      </div>
    </AutoComplete>
  </div>

  <!-- Gen filter tabs -->
  <Tabs
    name="gens"
    className="gen-tabs"
    tabs={gens}
    bind:selected={gen}
  />

  <!-- Game grid -->
  <ul role="radiogroup" aria-label="Select a Pokémon game" class="game-grid">
    {#each filteredGames as [id, game] (id)}
      <li in:fade={{ duration: 150 }}>
        <button
          role="radio"
          aria-checked={selected === id}
          title="Pokémon {game.title}"
          on:click={handleSelect(id)}
          class="game-card"
          class:game-card--selected={selected === id}
          class:game-card--dimmed={selected && selected !== id}
        >
          <Logo
            logo="{game.logo}"
            aspect="192x96"
            role="presentation"
            alt={'Pokémon ' + game.title + ' logo'}
            class="game-logo"
          />
          <strong>{game.title}</strong>
        </button>
      </li>
    {/each}
  </ul>

  {#if !filteredGames.length}
    <p class="empty-state">No games found for this generation.</p>
  {/if}
</div>

<!-- Bottom config panel — slides in when a game is selected -->
{#if selectedGame}
  <div class="panel-backdrop" transition:fade={{ duration: 150 }}>
    <div class="config-panel" transition:slide={{ duration: 200 }}>
      <PixelatedContainer className="config-panel-inner">
        <!-- Selected game info + close -->
        <div class="panel-header">
          <div class="panel-game-info">
            {#if selectedGame.logo}
              <Logo
                logo="{selectedGame.logo}"
                alt={selectedGame.title + ' logo'}
                class="w-16 shrink-0"
                role="presentation"
                aspect="192x96"
              />
            {/if}
            <div>
              <h2>{selectedGame.title}</h2>
              <span class="panel-gen-badge">
                {selectedGame.gen === 'romhack' ? 'Rom Hack' : `Gen ${selectedGame.gen}`}
              </span>
            </div>
          </div>
          <button
            class="panel-close"
            on:click={clearSelection}
            aria-label="Deselect game"
          >
            <Icon inline icon={X} height="1.2em" class="fill-current" />
          </button>
        </div>

        <hr class="panel-divider" />

        <!-- Config form -->
        <div class="panel-form">
          <Input
            rounded
            placeholder="Run name"
            className="panel-input"
            maxlength={26}
            bind:value={gameName}
          />

          {#if selectedGame?.difficulty}
            <div class="panel-difficulty">
              <label class="panel-label">Difficulty</label>
              <Radio
                name="difficulty"
                options={difficultyOptions.map((d) => d.name)}
                className="!flex-row gap-x-1"
                bind:selected={difficulty}
              />
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="panel-actions">
          <Button rounded {disabled} on:click={handleNewGame} className="panel-btn">
            <Icon inline icon={File} height="1em" class="fill-current inline mr-1" />
            Create game
          </Button>
          <div class="panel-randomize">
            <Tooltip>
              Generate a game with pre-randomized encounters, designed for games
              like Scarlet &amp; Violet with overworld only encounters
            </Tooltip>
            <Button rounded {disabled} on:click={handleGenGame} className="panel-btn">
              <Icon inline icon={Dice} height="1em" class="fill-current inline mr-1" />
              Randomize
            </Button>
          </div>
        </div>
      </PixelatedContainer>
    </div>
  </div>
{/if}

<style lang="postcss">
  /* Page layout */
  .page-wrapper {
    @apply mx-auto mt-20 max-w-5xl px-4 pb-8;
  }

  /* Header */
  .page-header {
    @apply mb-6 flex items-center justify-center gap-2 text-center;
  }
  .page-header h1 {
    @apply text-2xl font-bold sm:text-3xl;
  }

  /* Search */
  .search-row {
    @apply mx-auto mb-4 max-w-lg;
  }
  :global(.search-autocomplete) {
    @apply w-full;
  }

  /* Gen tabs */
  :global(.gen-tabs) {
    @apply mx-auto mb-6 flex justify-center gap-x-3 overflow-x-auto px-2;
  }

  /* Game grid */
  .game-grid {
    @apply grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .game-card {
    @apply flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-transparent px-3 py-4 text-center text-xs font-medium transition-all;
    background: transparent;
  }
  .game-card:hover {
    @apply border-orange-300 dark:border-orange-500;
    background: theme('colors.orange.50');
  }
  :global(.dark) .game-card:hover {
    background: theme('colors.gray.800');
  }

  .game-card--selected {
    @apply border-orange-500 dark:border-orange-400;
    background: theme('colors.orange.50');
  }
  :global(.dark) .game-card--selected {
    background: theme('colors.gray.800');
  }

  .game-card--dimmed {
    @apply opacity-40;
  }
  .game-card--dimmed:hover {
    @apply opacity-100;
  }

  :global(.game-logo) {
    @apply mx-auto w-20 transition sm:w-24;
  }

  .game-card strong {
    @apply mx-auto max-w-[14ch] leading-tight;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .empty-state {
    @apply py-12 text-center text-sm text-gray-400 dark:text-gray-500;
  }

  /* Bottom config panel */
  .panel-backdrop {
    @apply fixed inset-x-0 bottom-0 z-50;
    pointer-events: none;
  }
  .config-panel {
    @apply mx-auto max-w-3xl px-4 pb-4;
    pointer-events: auto;
  }
  :global(.config-panel-inner) {
    @apply flex flex-col gap-3 px-5 py-4;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  }

  .panel-header {
    @apply flex items-center justify-between gap-4;
  }
  .panel-game-info {
    @apply flex items-center gap-3;
  }
  .panel-game-info h2 {
    @apply text-base font-bold leading-tight sm:text-lg;
  }
  .panel-gen-badge {
    @apply inline-block rounded bg-gray-200 px-2 py-0.5 text-tiny font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300;
  }

  .panel-close {
    @apply flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200;
    background: transparent;
    border: none;
  }

  .panel-divider {
    @apply border-gray-200 dark:border-gray-700;
  }

  .panel-form {
    @apply flex flex-col gap-3 sm:flex-row sm:items-end;
  }
  :global(.panel-input) {
    @apply flex-1;
  }

  .panel-difficulty {
    @apply flex items-center gap-2;
  }
  .panel-label {
    @apply text-xs font-bold whitespace-nowrap;
  }

  .panel-actions {
    @apply flex flex-col gap-2 sm:flex-row;
  }
  :global(.panel-btn) {
    @apply flex-1;
  }
  .panel-randomize {
    @apply flex-1;
  }
  :global(.panel-randomize .panel-btn) {
    @apply w-full;
  }
</style>
