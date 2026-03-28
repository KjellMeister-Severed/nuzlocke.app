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
  <div class="nav-row">
    <a href="/mp/{mpGameId}" class="nav-logo" aria-label="Back to lobby">
      {#if gameKey && Games[gameKey]?.logo}
        <Logo
          logo="{Games[gameKey].logo}"
          pictureClass="game--{gameKey}"
          class="h-7 w-auto sm:h-8"
          alt="{gameKey} logo"
          aspect="192x96"
        />
      {:else}
        <span class="text-sm font-bold">&larr;</span>
      {/if}
    </a>

    <div class="nav-center">
      <MpPlayerSwitcher
        {players}
        {currentPlayerId}
        {mpGameId}
        {ownPlayerId}
      />
    </div>

    <div class="nav-right">
      <ThemeToggle />
    </div>
  </div>
</nav>

<style lang="postcss">
  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5000;
    @apply border-b bg-white;
    border-color: rgba(0, 0, 0, 0.08);
  }

  :global(.dark) nav {
    @apply bg-gray-900;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .nav-row {
    @apply mx-auto flex max-w-5xl items-center gap-x-3 px-4 py-2;
  }

  .nav-logo {
    @apply flex shrink-0 items-center transition-opacity hover:opacity-70;
  }

  .nav-center {
    @apply flex min-w-0 flex-1 justify-center;
  }

  .nav-right {
    @apply flex shrink-0 items-center;
  }
</style>
