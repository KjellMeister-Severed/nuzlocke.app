<script>
  import { createEventDispatcher } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import { PIcon, Button } from '$lib/components/core'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Ball } from '$icons'

  export let bossId = ''
  export let bossName = ''
  export let players = []
  export let battles = []
  export let currentPlayerId = ''
  export let isOwner = false
  export let pincode = ''

  const dispatch = createEventDispatcher()

  // Generate all unique pairings
  $: pairings = (() => {
    const pairs = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        pairs.push({ p1: players[i], p2: players[j] })
      }
    }
    return pairs
  })()

  // Map battles for this boss
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
    class="pvp-phase"
    class:pvp-complete={allComplete}
    transition:slide={{ duration: 250 }}
  >
    <div class="pvp-header">
      <span class="pvp-icon">⚔️</span>
      <div>
        <h4 class="text-sm font-bold">
          PvP Phase — {bossName}
        </h4>
        <p class="text-tiny text-gray-500 dark:text-gray-400">
          {completedCount}/{pairings.length} battles completed
        </p>
      </div>
      {#if allComplete}
        <span class="ml-auto rounded-full bg-green-500 px-2 py-0.5 text-tiny font-bold text-white" in:fade>
          Complete
        </span>
      {/if}
    </div>

    <div class="pvp-battles">
      {#each pairings as pair}
        {@const battle = findBattle(pair.p1.id, pair.p2.id)}
        {@const winner = getWinnerName(battle)}
        <div
          class="pvp-battle"
          class:pvp-decided={!!winner}
        >
          <div class="flex flex-1 items-center gap-x-2">
            <span
              class="text-xs font-bold"
              class:text-green-600={battle?.winner_id === pair.p1.id}
              class:dark:text-green-400={battle?.winner_id === pair.p1.id}
            >
              {pair.p1.name}
            </span>
            <span class="text-tiny text-gray-400">vs</span>
            <span
              class="text-xs font-bold"
              class:text-green-600={battle?.winner_id === pair.p2.id}
              class:dark:text-green-400={battle?.winner_id === pair.p2.id}
            >
              {pair.p2.name}
            </span>
          </div>

          {#if winner}
            <span class="text-tiny text-green-600 dark:text-green-400">
              🏆 {winner}
            </span>
          {:else if isOwner}
            <div class="flex gap-x-1">
              <button
                class="pvp-btn"
                on:click={() => handleReport(pair.p1.id, pair.p2.id, pair.p1.id)}
                title="{pair.p1.name} wins"
              >
                {pair.p1.name} won
              </button>
              <button
                class="pvp-btn"
                on:click={() => handleReport(pair.p1.id, pair.p2.id, pair.p2.id)}
                title="{pair.p2.name} wins"
              >
                {pair.p2.name} won
              </button>
            </div>
          {:else}
            <span class="text-tiny text-gray-400">Awaiting result</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="postcss">
  .pvp-phase {
    @apply my-2 rounded-lg border-2 border-amber-300/50 bg-amber-50/50 p-3;
    @apply dark:border-amber-600/30 dark:bg-amber-900/10;
  }

  .pvp-complete {
    @apply border-green-300/50 bg-green-50/50;
    @apply dark:border-green-600/30 dark:bg-green-900/10;
  }

  .pvp-header {
    @apply mb-2 flex items-center gap-x-2;
  }

  .pvp-icon {
    @apply text-xl;
  }

  .pvp-battles {
    @apply flex flex-col gap-y-1;
  }

  .pvp-battle {
    @apply flex items-center justify-between rounded-md px-2 py-1.5;
    @apply bg-white/60 dark:bg-gray-800/40;
  }

  .pvp-decided {
    @apply opacity-70;
  }

  .pvp-btn {
    @apply rounded-md px-2 py-0.5 text-tiny font-medium transition;
    @apply bg-amber-100 text-amber-800 hover:bg-amber-200;
    @apply dark:bg-amber-800/30 dark:text-amber-300 dark:hover:bg-amber-800/50;
  }
</style>
