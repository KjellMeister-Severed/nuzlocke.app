<script>
  export let game = null
  export let player = null
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''

  import { page } from '$app/stores'
  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Icon, Logo } from '$lib/components/core'
  import { Game as GameIcon, Box, Grave } from '$icons'

  const pages = [
    { name: 'Game', link: `/mp/${mpGameId}/play`, icon: GameIcon }
  ]
</script>

<nav>
  <div class="p-container">
    <div class="inline-flex items-center">
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

        <h1 class="hidden group-hover:border-black dark:group-hover:border-white lg:block lg:line-clamp-1">
          {game?.name || 'Multiplayer'}
        </h1>
      </a>
    </div>

    <span class="player-info">
      <span class="text-sm font-bold">
        {player?.name || ''}
      </span>
      {#if !isOwner}
        <span class="text-xs text-yellow-600 dark:text-yellow-400">(viewing)</span>
      {/if}
    </span>

    <span class="relative inline-flex">
      <ThemeToggle />

      {#each pages as p}
        <a
          class="link active"
          href={p.link}
        >
          <Icon inline={true} icon={p.icon} />
          {p.name}
        </a>
      {/each}

      <a
        class="link"
        href="/mp/{mpGameId}"
      >
        Lobby
      </a>
    </span>
  </div>
</nav>

<style lang="postcss">
  nav {
    position: fixed;
    z-index: 5000;
    @apply container mx-auto mb-8 bg-black text-white sm:bg-white sm:text-black md:mb-2;
  }

  nav :global(.p-container) {
    @apply px-0;
  }

  :global(.dark) nav {
    @apply sm:bg-gray-800 sm:text-gray-200;
  }

  @media (min-width: theme('screens.sm')) {
    nav {
      width: 100%;
      left: 0;
      right: 0;
    }

    nav::before {
      content: '';
      background: linear-gradient(white 50%, transparent);
      @apply absolute -bottom-6 h-6 w-full;
    }

    :global(.dark) nav::before {
      background: linear-gradient(theme('colors.gray.800') 50%, transparent);
    }
  }

  h1 {
    @apply -mb-1.5 border-b-2 border-transparent text-base transition sm:mb-0;
  }

  a.home {
    @apply ml-4 -mt-4 inline-flex h-12 items-center md:mt-0 md:-ml-2;
  }

  a.link {
    @apply inline-flex items-center gap-x-1 border-black p-2 px-3 text-sm transition md:p-4 md:text-base;
  }

  a.link.active {
    @apply cursor-default border-b-2 bg-gray-50 text-black;
  }

  a.link:not(.active) {
    @apply cursor-pointer hover:text-black sm:text-gray-500;
  }

  :global(.dark) a.link:not(.active) {
    @apply text-gray-400 hover:text-gray-100;
  }

  :global(.dark) a.link.active {
    @apply border-b-gray-200 bg-gray-900 text-gray-50 hover:text-gray-100;
  }

  .player-info {
    @apply hidden items-center gap-x-2 sm:inline-flex;
  }

  .p-container {
    @apply flex items-center justify-between;
  }
</style>
