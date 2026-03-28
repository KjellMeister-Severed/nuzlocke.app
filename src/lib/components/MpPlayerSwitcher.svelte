<script>
  export let players = []
  export let currentPlayerId = ''
  export let mpGameId = ''
  export let ownPlayerId = ''

  import { Expanded as Games } from '$lib/data/games'
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

<div class="player-bar">
  {#each players as player}
    {@const team = getTeamSprites(player)}
    <button
      class="player-pill"
      class:active={player.id === currentPlayerId}
      class:own={player.id === ownPlayerId}
      on:click={() => switchTo(player.id)}
      title="{player.name}{player.id === ownPlayerId ? ' (You)' : ''}"
    >
      <span class="pill-name">{player.name}</span>
      {#if team.length > 0}
        <span class="pill-team">
          {#each team as mon}
            <PIcon name={mon} className="-m-2.5 scale-[0.6]" />
          {/each}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style lang="postcss">
  .player-bar {
    @apply flex gap-1.5 overflow-x-auto px-1 py-1;
    scrollbar-width: none;
  }

  .player-bar::-webkit-scrollbar {
    display: none;
  }

  .player-pill {
    @apply flex shrink-0 items-center gap-x-1 rounded-full px-3 py-1 text-xs font-medium transition;
    @apply border border-gray-200 bg-white text-gray-700 hover:bg-gray-50;
  }

  :global(.dark) .player-pill {
    @apply border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700;
  }

  .player-pill.active {
    @apply border-blue-400 bg-blue-50 text-blue-700 ring-1 ring-blue-300;
  }

  :global(.dark) .player-pill.active {
    @apply border-blue-500 text-blue-300;
    background-color: rgba(59, 130, 246, 0.15);
    --tw-ring-color: rgba(59, 130, 246, 0.5);
    @apply ring-1;
  }

  .player-pill.own .pill-name {
    @apply font-bold;
  }

  .pill-name {
    @apply whitespace-nowrap;
  }

  .pill-team {
    @apply flex items-center;
  }
</style>
