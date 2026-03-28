<script>
  export let player = null
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''
  export let players = []
  export let currentPlayerId = ''
  export let ownPlayerId = ''
  export let activeView = 'game'

  import { createEventDispatcher } from 'svelte'
  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Logo, Icon } from '$lib/components/core'
  import { Game, Box, Grave } from '$icons'
  import MpPlayerSwitcher from '$lib/components/MpPlayerSwitcher.svelte'
  import { MiniTeamController } from '$c/TeamBuilder'

  const dispatch = createEventDispatcher()

  const pages = [
    { name: 'Game', val: 'game', icon: Game },
    { name: 'Box', val: 'box', icon: Box },
    { name: 'Grave', val: 'graveyard', icon: Grave }
  ]
</script>

<nav class="mpnav">
  <div class="mpnav__inner">
    <a href="/mp/{mpGameId}" class="mpnav__back" aria-label="Back to lobby">
      {#if gameKey && Games[gameKey]?.logo}
        <Logo
          logo={Games[gameKey].logo}
          pictureClass="game--{gameKey}"
          class="mpnav__logo"
          alt="{gameKey} logo"
          aspect="192x96"
        />
      {:else}
        <span class="mpnav__back-arrow">&larr;</span>
      {/if}
    </a>

    <div class="mpnav__players">
      <MpPlayerSwitcher {players} {currentPlayerId} {mpGameId} {ownPlayerId} />
    </div>

    {#if activeView !== 'graveyard'}
      <div class="mpnav__team">
        <MiniTeamController />
      </div>
    {/if}

    <div class="mpnav__actions">
      {#each pages as p}
        <button
          class="mpnav__link"
          class:mpnav__link--active={activeView === p.val}
          on:click={() => dispatch('view', p.val)}
          title={p.name}
        >
          <Icon inline={true} icon={p.icon} class="mpnav__link-icon" />
          <span class="mpnav__link-label">{p.name}</span>
        </button>
      {/each}
      <ThemeToggle />
    </div>
  </div>
</nav>

<style lang="postcss">
  .mpnav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5000;
    height: 3.5rem;
    backdrop-filter: blur(14px) saturate(180%);
    -webkit-backdrop-filter: blur(14px) saturate(180%);
    background: rgba(255, 255, 255, 0.88);
    border-bottom: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04);
  }

  .mpnav::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.5), rgba(168, 85, 247, 0.5), rgba(236, 72, 153, 0.3));
    opacity: 0.7;
  }

  :global(.dark) .mpnav {
    background: rgba(17, 24, 39, 0.9);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.04);
  }

  :global(.dark) .mpnav::after {
    opacity: 0.5;
  }

  .mpnav__inner {
    max-width: 72rem;
    height: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1rem;
  }

  .mpnav__back {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: opacity 0.15s;
  }

  .mpnav__back:hover {
    opacity: 0.7;
  }

  .mpnav :global(.mpnav__logo) {
    height: 1.75rem;
    width: auto;
  }

  .mpnav__back-arrow {
    font-weight: 700;
    font-size: 0.875rem;
  }

  .mpnav__players {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .mpnav__team {
    display: none;
    flex-shrink: 0;
  }

  @media (min-width: theme('screens.md')) {
    .mpnav__team {
      display: flex;
      align-items: center;
    }
  }

  .mpnav__actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .mpnav__link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: theme('colors.gray.500');
    border-radius: 0.375rem;
    transition: color 0.15s, background 0.15s;
    position: relative;
  }

  .mpnav__link:hover {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.04);
  }

  .mpnav__link--active {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.06);
  }

  .mpnav__link--active::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 25%;
    right: 25%;
    height: 2px;
    background: theme('colors.red.500');
    border-radius: 1px;
  }

  :global(.dark) .mpnav__link {
    color: theme('colors.gray.400');
  }

  :global(.dark) .mpnav__link:hover {
    color: theme('colors.gray.100');
    background: rgba(255, 255, 255, 0.06);
  }

  :global(.dark) .mpnav__link--active {
    color: theme('colors.gray.50');
    background: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .mpnav__link--active::after {
    background: theme('colors.red.400');
  }

  .mpnav__link-label {
    display: none;
  }

  @media (min-width: theme('screens.sm')) {
    .mpnav__link-label {
      display: inline;
    }
  }
</style>
