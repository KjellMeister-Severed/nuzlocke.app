<script>
  import { createEventDispatcher } from 'svelte'
  import { fade, slide } from 'svelte/transition'

  export let bossId = ''
  export let bossName = ''
  export let players = []
  export let battles = []
  export let currentPlayerId = ''
  export let isOwner = false
  export let pincode = ''

  const dispatch = createEventDispatcher()

  $: pairings = (() => {
    const pairs = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        pairs.push({ p1: players[i], p2: players[j] })
      }
    }
    return pairs
  })()

  $: bossBattles = battles.filter((b) => b.boss_id === bossId)

  function findBattle(p1Id, p2Id) {
    return bossBattles.find(
      (b) =>
        (b.player1_id === p1Id && b.player2_id === p2Id) ||
        (b.player1_id === p2Id && b.player2_id === p1Id)
    )
  }

  function getWinnerName(battle) {
    if (!battle?.winner_id) return null
    const p = players.find((pl) => pl.id === battle.winner_id)
    return p?.name || 'Unknown'
  }

  $: completedCount = pairings.filter((pair) => {
    const b = findBattle(pair.p1.id, pair.p2.id)
    return b?.winner_id
  }).length

  $: allComplete = completedCount === pairings.length && pairings.length > 0

  function handleReport(p1Id, p2Id, winnerId) {
    dispatch('report', { bossId, player1Id: p1Id, player2Id: p2Id, winnerId, pincode })
  }
</script>

{#if players.length >= 2}
  <div
    class="pvp"
    class:pvp-done={allComplete}
    transition:slide={{ duration: 200 }}
  >
    <div class="pvp-top">
      <span class="pvp-label">
        PvP &middot; {bossName}
      </span>
      <span class="pvp-progress">
        {#if allComplete}
          <span class="done-badge" in:fade>Done</span>
        {:else}
          {completedCount}/{pairings.length}
        {/if}
      </span>
    </div>

    <div class="pvp-list">
      {#each pairings as pair}
        {@const battle = findBattle(pair.p1.id, pair.p2.id)}
        {@const winner = getWinnerName(battle)}
        <div class="match" class:match-done={!!winner}>
          <span
            class="name"
            class:winner={battle?.winner_id === pair.p1.id}
          >{pair.p1.name}</span>
          <span class="vs">vs</span>
          <span
            class="name"
            class:winner={battle?.winner_id === pair.p2.id}
          >{pair.p2.name}</span>

          <span class="match-result">
            {#if winner}
              <span class="text-green-600 dark:text-green-400">{winner}</span>
            {:else if isOwner}
              <button class="report-btn" on:click={() => handleReport(pair.p1.id, pair.p2.id, pair.p1.id)}>
                {pair.p1.name}
              </button>
              <button class="report-btn" on:click={() => handleReport(pair.p1.id, pair.p2.id, pair.p2.id)}>
                {pair.p2.name}
              </button>
            {:else}
              <span class="text-gray-400">&hellip;</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="postcss">
  .pvp {
    @apply my-3 rounded-lg border p-3;
    @apply border-gray-200 bg-gray-50;
  }

  :global(.dark) .pvp {
    @apply border-gray-700 bg-gray-800/50;
  }

  .pvp-done {
    @apply border-green-200 bg-green-50;
  }

  :global(.dark) .pvp-done {
    @apply border-green-800 bg-green-900/20;
  }

  .pvp-top {
    @apply mb-2 flex items-center justify-between;
  }

  .pvp-label {
    @apply text-xs font-bold uppercase tracking-wide text-gray-500;
  }

  :global(.dark) .pvp-label {
    @apply text-gray-400;
  }

  .pvp-progress {
    @apply text-xs text-gray-400;
  }

  .done-badge {
    @apply rounded-full bg-green-500 px-2 py-0.5 text-tiny font-bold text-white;
  }

  .pvp-list {
    @apply flex flex-col gap-y-1;
  }

  .match {
    @apply flex items-center gap-x-2 rounded-md px-2 py-1.5 text-xs;
    @apply bg-white;
  }

  :global(.dark) .match {
    @apply bg-gray-800;
  }

  .match-done {
    @apply opacity-60;
  }

  .name {
    @apply font-medium;
  }

  .name.winner {
    @apply font-bold text-green-600;
  }

  :global(.dark) .name.winner {
    @apply text-green-400;
  }

  .vs {
    @apply text-gray-300;
  }

  :global(.dark) .vs {
    @apply text-gray-600;
  }

  .match-result {
    @apply ml-auto flex items-center gap-x-1 text-tiny;
  }

  .report-btn {
    @apply rounded px-2 py-0.5 font-medium transition;
    @apply bg-gray-100 text-gray-600 hover:bg-gray-200;
  }

  :global(.dark) .report-btn {
    @apply bg-gray-700 text-gray-300 hover:bg-gray-600;
  }
</style>
