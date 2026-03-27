<script>
  export let game = null
  export let player = null
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''

  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Logo } from '$lib/components/core'
</script>

<nav>
  <div class="p-container">
    <div class="inline-flex items-center gap-x-3">
      <a href="/mp/{mpGameId}" rel="external" class="home group" aria-label="Back to lobby">
        {#if gameKey && Games[gameKey]?.logo}
          <Logo
            logo="{Games[gameKey].logo}"
            pictureClass="game--{gameKey}"
            class="h-10 w-auto max-md:pt-2 sm:w-20 md:mr-4 md:h-auto"
            alt="{gameKey} logo"
            aspect="192x96"
          />
        {/if}
      </a>
      <div class="flex flex-col">
        <span class="text-xs text-gray-400">{game?.name || 'Multiplayer'}</span>
        <span class="text-sm font-bold text-white">
          {player?.name || ''}
          {#if !isOwner}
            <span class="text-xs font-normal text-yellow-400">(viewing)</span>
          {/if}
        </span>
      </div>
    </div>

    <ThemeToggle className="mt-2" />
  </div>
</nav>

<style lang="postcss">
  nav {
    @apply container mx-auto mb-8 py-4 -mb-16 md:mb-2 sm:text-black sm:bg-transparent;
  }

  :global(.dark) nav {
    @apply text-gray-200;
  }

  .p-container {
    @apply flex items-center justify-between;
  }
</style>
