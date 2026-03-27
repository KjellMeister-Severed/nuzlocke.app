<script>
  export let players = []
  export let currentPlayerId = ''
  export let mpGameId = ''
  export let ownPlayerId = ''

  import { Expanded as Games } from '$lib/data/games'
  import { Logo } from '$lib/components/core'
  import { slide } from 'svelte/transition'

  let expanded = false

  function switchTo(playerId) {
    window.location.href = `/mp/${mpGameId}/play?player=${playerId}`
  }
</script>

<div class="switcher" transition:slide={{ duration: 200 }}>
  <button
    class="toggle"
    on:click={() => (expanded = !expanded)}
    aria-label="Toggle player list"
  >
    <span class="text-xs font-bold tracking-wider text-gray-400">
      PLAYERS ({players.length})
    </span>
    <span class="caret" class:expanded>▼</span>
  </button>

  {#if expanded}
    <div class="player-list" transition:slide={{ duration: 200 }}>
      {#each players as player}
        <button
          class="player-item"
          class:active={player.id === currentPlayerId}
          class:is-own={player.id === ownPlayerId}
          on:click={() => switchTo(player.id)}
        >
          <div class="flex items-center gap-x-2">
            {#if Games[player.pokemon_game]?.logo}
              <Logo
                logo="{Games[player.pokemon_game].logo}"
                alt="{player.pokemon_game}"
                class="h-4 w-auto"
                aspect="48xauto"
              />
            {/if}
            <span class="name">{player.name}</span>
            {#if player.id === ownPlayerId}
              <span class="tag you">You</span>
            {/if}
          </div>
          {#if player.id === currentPlayerId}
            <span class="tag viewing">Viewing</span>
          {/if}
        </button>
      {/each}

      <a
        href="/mp/{mpGameId}"
        class="back-link"
      >
        ← Back to Lobby
      </a>
    </div>
  {/if}
</div>

<style lang="postcss">
  .switcher {
    @apply fixed right-2 top-14 z-[9998] rounded-lg border border-gray-600 bg-gray-800/95 shadow-lg backdrop-blur;
    min-width: 180px;
  }

  .toggle {
    @apply flex w-full items-center justify-between gap-x-2 px-3 py-2 text-left;
  }

  .caret {
    @apply text-xs text-gray-500 transition-transform;
  }

  .caret.expanded {
    transform: rotate(180deg);
  }

  .player-list {
    @apply flex flex-col border-t border-gray-700;
  }

  .player-item {
    @apply flex items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-700/50;
  }

  .player-item.active {
    @apply bg-blue-500/10;
  }

  .player-item.is-own .name {
    @apply font-bold;
  }

  .name {
    @apply text-gray-200;
  }

  .tag {
    @apply rounded px-1.5 py-0.5 text-[10px] font-bold uppercase;
  }

  .tag.you {
    @apply bg-green-500/20 text-green-400;
  }

  .tag.viewing {
    @apply bg-blue-500/20 text-blue-400;
  }

  .back-link {
    @apply border-t border-gray-700 px-3 py-2 text-xs text-gray-400 transition hover:text-white;
  }
</style>
