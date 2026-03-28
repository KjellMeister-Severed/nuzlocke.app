<script>
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''
  export let playerName = ''
  export let activeView = 'game'

  import { createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Logo, Icon } from '$lib/components/core'
  import { Game, Box, Grave } from '$icons'
  import { MiniTeamController } from '$c/TeamBuilder'

  const dispatch = createEventDispatcher()

  const pages = [
    { name: 'Game', val: 'game', icon: Game },
    { name: 'Box', val: 'box', icon: Box },
    { name: 'Grave', val: 'graveyard', icon: Grave }
  ]
</script>

<nav class="gnav" class:graveyard={activeView === 'graveyard'}>
  <div class="gnav__inner">
    <!-- Left: Logo + Game name -->
    <div class="gnav__left">
      <a href="/mp/{mpGameId}" class="gnav__home">
        {#if gameKey && Games[gameKey]?.logo}
          <Logo
            logo={Games[gameKey].logo}
            pictureClass="game--{gameKey}"
            class="gnav__logo"
            alt="{gameKey} logo"
            aspect="192x96"
          />
        {:else}
          <span class="gnav__back-arrow">&larr;</span>
        {/if}
      </a>

      <div class="gnav__title-group">
        {#if playerName}
          <span class="gnav__title" in:fade>
            {playerName}{isOwner ? '' : ' (Viewing)'}
          </span>
        {/if}
      </div>
    </div>

    <!-- Center: Mini team -->
    {#if activeView !== 'graveyard'}
      <div class="gnav__center">
        <MiniTeamController />
      </div>
    {/if}

    <!-- Right: Page links + theme -->
    <div class="gnav__right">
      {#each pages as p}
        <button
          class="gnav__link"
          class:gnav__link--active={activeView === p.val}
          on:click={() => dispatch('view', p.val)}
          title={p.name}
        >
          <Icon inline={true} icon={p.icon} class="gnav__link-icon" />
          <span class="gnav__link-label">{p.name}</span>
        </button>
      {/each}
      <ThemeToggle />
    </div>
  </div>
</nav>

<style lang="postcss">
  .gnav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5000;
    height: 3.25rem;
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    background: rgba(255, 255, 255, 0.82);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  :global(.dark) .gnav {
    background: rgba(17, 24, 39, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .gnav.graveyard {
    background: rgba(0, 0, 0, 0.6);
    border-bottom-color: rgba(255, 255, 255, 0.04);
  }

  .gnav__inner {
    max-width: 80rem;
    margin: 0 auto;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.75rem;
    gap: 0.5rem;
  }

  @media (min-width: theme('screens.md')) {
    .gnav__inner {
      padding: 0 1.5rem;
    }
  }

  .gnav__left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex-shrink: 1;
  }

  .gnav__home {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .gnav :global(.gnav__logo) {
    height: 2rem;
    width: auto;
  }

  .gnav__back-arrow {
    font-weight: 700;
    font-size: 0.875rem;
  }

  .gnav__title-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .gnav__title {
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: theme('colors.gray.700');
    display: none;
  }

  @media (min-width: theme('screens.lg')) {
    .gnav__title {
      display: block;
    }
  }

  :global(.dark) .gnav__title {
    color: theme('colors.gray.200');
  }

  .gnav__center {
    display: none;
    flex-shrink: 0;
  }

  @media (min-width: theme('screens.md')) {
    .gnav__center {
      display: flex;
      align-items: center;
    }
  }

  .gnav__right {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }

  .gnav__link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: theme('colors.gray.500');
    border-radius: 0.375rem;
    transition: color 0.15s, background 0.15s;
    text-decoration: none;
    position: relative;
  }

  .gnav__link:hover {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.04);
  }

  .gnav__link--active {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.06);
  }

  .gnav__link--active::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 25%;
    right: 25%;
    height: 2px;
    background: theme('colors.red.500');
    border-radius: 1px;
  }

  :global(.dark) .gnav__link {
    color: theme('colors.gray.400');
  }

  :global(.dark) .gnav__link:hover {
    color: theme('colors.gray.100');
    background: rgba(255, 255, 255, 0.06);
  }

  :global(.dark) .gnav__link--active {
    color: theme('colors.gray.50');
    background: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .gnav__link--active::after {
    background: theme('colors.red.400');
  }

  .gnav__link-label {
    display: none;
  }

  @media (min-width: theme('screens.sm')) {
    .gnav__link-label {
      display: inline;
    }
  }

  :global(.game--sw),
  :global(.game--sh) {
    @apply -mr-4 -ml-4;
  }

  :global(.game--emkaizo) {
    @apply -mr-2 -ml-2;
  }

  @media (min-width: theme('screens.md')) {
    :global(.game--sw),
    :global(.game--sh) {
      @apply -mr-6 ml-0;
    }

    :global(.game--emkaizo) {
      @apply -mr-2 ml-0;
    }
  }
</style>
