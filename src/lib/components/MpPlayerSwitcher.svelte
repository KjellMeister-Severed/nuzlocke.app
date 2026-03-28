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

<div class="mpsw">
  {#each players as player}
    {@const team = getTeamSprites(player)}
    {@const isActive = player.id === currentPlayerId}
    {@const isOwn = player.id === ownPlayerId}
    <button
      class="mpsw__pill"
      class:mpsw__pill--active={isActive}
      on:click={() => switchTo(player.id)}
      title="{player.name}{isOwn ? ' (You)' : ''}"
    >
      <span class="mpsw__name" class:mpsw__name--own={isOwn}>{player.name}</span
      >
      {#if team.length > 0}
        <span class="mpsw__team">
          {#each team as mon}
            <PIcon name={mon} className="-m-2.5 scale-[0.55]" />
          {/each}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style lang="postcss">
  .mpsw {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .mpsw::-webkit-scrollbar {
    display: none;
  }

  .mpsw__pill {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--mpsw-text, rgba(107, 114, 128, 1));
    transition: all 0.15s ease;
  }

  .mpsw__pill:hover {
    color: var(--mpsw-text-hover, rgba(17, 24, 39, 1));
  }

  :global(.dark) .mpsw__pill {
    --mpsw-text: rgba(156, 163, 175, 1);
    --mpsw-text-hover: rgba(255, 255, 255, 1);
  }

  .mpsw__pill--active {
    color: var(--mpsw-active-text, rgba(17, 24, 39, 1));
    background: var(--mpsw-active-bg, rgba(255, 255, 255, 1));
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08), 0 0 0 1.5px rgba(99, 102, 241, 0.25);
    font-weight: 600;
  }

  :global(.dark) .mpsw__pill--active {
    --mpsw-active-text: rgba(255, 255, 255, 1);
    --mpsw-active-bg: rgba(55, 65, 81, 0.8);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2), 0 0 0 1.5px rgba(129, 140, 248, 0.3);
  }

  .mpsw__name {
    white-space: nowrap;
  }

  .mpsw__name--own {
    font-weight: 700;
  }

  .mpsw__team {
    display: flex;
    align-items: center;
  }
</style>
