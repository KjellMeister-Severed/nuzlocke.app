<script>
  export let player = null
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''
  export let players = []
  export let currentPlayerId = ''
  export let ownPlayerId = ''

  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Logo } from '$lib/components/core'
  import MpPlayerSwitcher from '$lib/components/MpPlayerSwitcher.svelte'
</script>

<nav>
  <div class="nav-top">
    <a href="/mp/{mpGameId}" class="nav-logo" aria-label="Back to lobby">
      {#if gameKey && Games[gameKey]?.logo}
        <Logo
          logo="{Games[gameKey].logo}"
          pictureClass="game--{gameKey}"
          class="h-8 w-auto sm:h-10"
          alt="{gameKey} logo"
          aspect="192x96"
        />
      {/if}
    </a>

    <span class="nav-player">
      <span class="text-sm font-bold">{player?.name || ''}</span>
      {#if !isOwner}
        <span class="text-tiny text-yellow-600 dark:text-yellow-400">(viewing)</span>
      {/if}
    </span>

    <span class="nav-actions">
      <ThemeToggle />
      <a href="/mp/{mpGameId}" class="nav-link">Lobby</a>
    </span>
  </div>

  <div class="nav-players">
    <MpPlayerSwitcher
      {players}
      {currentPlayerId}
      {mpGameId}
      {ownPlayerId}
    />
  </div>
</nav>

<style lang="postcss">
  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5000;
    @apply border-b border-gray-200 bg-white;
  }

  :global(.dark) nav {
    @apply border-gray-700 bg-gray-800;
  }

  .nav-top {
    @apply container mx-auto flex items-center justify-between px-3 py-2;
  }

  .nav-logo {
    @apply flex items-center;
  }

  .nav-player {
    @apply hidden items-center gap-x-1.5 sm:flex;
  }

  .nav-actions {
    @apply flex items-center gap-x-2;
  }

  .nav-link {
    @apply rounded-md px-3 py-1.5 text-sm font-medium transition;
    @apply text-gray-600 hover:bg-gray-100 hover:text-gray-900;
  }

  :global(.dark) .nav-link {
    @apply text-gray-300 hover:bg-gray-700 hover:text-white;
  }

  .nav-players {
    @apply container mx-auto border-t border-gray-100 px-2;
  }

  :global(.dark) .nav-players {
    @apply border-gray-700;
  }
</style>
