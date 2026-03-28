<script>
  export let players = []
  export let currentPlayerId = ''
  export let mpGameId = ''
  export let ownPlayerId = ''

  import { PIcon } from '$lib/components/core'
  import { parseGameData } from '$lib/mpStore'

  function switchTo(playerId) {
    window.location.href = `/mp/${mpGameId}/play?player=${playerId}`
  }

  function getTeamSprites(player) {
    const data = parseGameData(player)
    return (data.__team || [])
      .filter((loc) => loc)
      .map((loc) => data[loc]?.pokemon)
      .filter(Boolean)
      .slice(0, 6)
  }
</script>

<div class="switcher">
  {#each players as player}
    {@const team = getTeamSprites(player)}
    {@const isActive = player.id === currentPlayerId}
    {@const isOwn = player.id === ownPlayerId}
    <button
      class="pill"
      class:active={isActive}
      on:click={() => switchTo(player.id)}
      title="{player.name}{isOwn ? ' (You)' : ''}"
    >
      <span class="pill-name" class:font-bold={isOwn}>{player.name}</span>
      {#if team.length > 0}
        <span class="pill-team">
          {#each team as mon}
            <PIcon name={mon} className="-m-2.5 scale-[0.55]" />
          {/each}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style lang="postcss">
  .switcher {
    @apply flex gap-1 overflow-x-auto;
    scrollbar-width: none;
  }

  .switcher::-webkit-scrollbar {
    display: none;
  }

  .pill {
    @apply flex shrink-0 items-center gap-x-0.5 rounded-full px-3 py-1 text-xs font-medium transition;
    @apply text-gray-500 hover:text-gray-900;
  }

  :global(.dark) .pill {
    @apply text-gray-400 hover:text-white;
  }

  .pill.active {
    @apply text-gray-900;
    @apply bg-gray-100;
  }

  :global(.dark) .pill.active {
    @apply text-white;
    @apply bg-gray-800;
  }

  .pill-name {
    @apply whitespace-nowrap;
  }

  .pill-team {
    @apply flex items-center;
  }
</style>
