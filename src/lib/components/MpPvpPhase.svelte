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
    dispatch('report', {
      bossId,
      player1Id: p1Id,
      player2Id: p2Id,
      winnerId,
      pincode
    })
  }
</script>

{#if players.length >= 2}
  <div
    class="pvp"
    class:pvp--done={allComplete}
    transition:slide={{ duration: 200 }}
  >
    <div class="pvp__header">
      <span class="pvp__title">PvP &middot; {bossName}</span>
      <span class="pvp__counter">
        {#if allComplete}
          <span class="pvp__badge" in:fade>Done</span>
        {:else}
          {completedCount}/{pairings.length}
        {/if}
      </span>
    </div>

    <div class="pvp__matches">
      {#each pairings as pair}
        {@const battle = findBattle(pair.p1.id, pair.p2.id)}
        {@const winner = getWinnerName(battle)}
        <div class="pvp__match" class:pvp__match--settled={!!winner}>
          <span
            class="pvp__player"
            class:pvp__player--winner={battle?.winner_id === pair.p1.id}
            >{pair.p1.name}</span
          >

          <span class="pvp__vs">vs</span>

          <span
            class="pvp__player"
            class:pvp__player--winner={battle?.winner_id === pair.p2.id}
            >{pair.p2.name}</span
          >

          <span class="pvp__result">
            {#if winner}
              <span class="pvp__winner-name">{winner}</span>
            {:else if isOwner}
              <button
                class="pvp__report-btn"
                on:click={() =>
                  handleReport(pair.p1.id, pair.p2.id, pair.p1.id)}
              >
                {pair.p1.name}
              </button>
              <button
                class="pvp__report-btn"
                on:click={() =>
                  handleReport(pair.p1.id, pair.p2.id, pair.p2.id)}
              >
                {pair.p2.name}
              </button>
            {:else}
              <span class="pvp__pending">&hellip;</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="postcss">
  .pvp {
    margin: 0.75rem 0;
    padding: 0.75rem 0.75rem 0.75rem 1rem;
    border-radius: 0.625rem;
    border: 1px solid rgba(229, 231, 235, 1);
    background: rgba(249, 250, 251, 1);
    position: relative;
    overflow: hidden;
  }

  .pvp::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.6), rgba(168, 85, 247, 0.4));
    border-radius: 3px 0 0 3px;
  }

  :global(.dark) .pvp {
    border-color: rgba(55, 65, 81, 1);
    background: rgba(31, 41, 55, 0.5);
  }

  .pvp--done {
    border-color: rgba(187, 247, 208, 1);
    background: rgba(240, 253, 244, 1);
  }

  .pvp--done::before {
    background: linear-gradient(180deg, rgba(34, 197, 94, 0.7), rgba(22, 163, 74, 0.5));
  }

  :global(.dark) .pvp--done {
    border-color: rgba(22, 101, 52, 1);
    background: rgba(20, 83, 45, 0.2);
  }

  .pvp__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .pvp__title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(107, 114, 128, 1);
  }

  :global(.dark) .pvp__title {
    color: rgba(156, 163, 175, 1);
  }

  .pvp__counter {
    font-size: 0.75rem;
    color: rgba(156, 163, 175, 1);
  }

  .pvp__badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 700;
    color: #fff;
    background: rgba(34, 197, 94, 1);
  }

  .pvp__matches {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .pvp__match {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 1);
    transition: opacity 0.15s;
  }

  :global(.dark) .pvp__match {
    background: rgba(31, 41, 55, 1);
  }

  .pvp__match--settled {
    opacity: 0.6;
  }

  .pvp__player {
    font-weight: 500;
  }

  .pvp__player--winner {
    font-weight: 700;
    color: rgba(22, 163, 74, 1);
  }

  :global(.dark) .pvp__player--winner {
    color: rgba(74, 222, 128, 1);
  }

  .pvp__vs {
    color: rgba(209, 213, 219, 1);
  }

  :global(.dark) .pvp__vs {
    color: rgba(75, 85, 99, 1);
  }

  .pvp__result {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
  }

  .pvp__winner-name {
    color: rgba(22, 163, 74, 1);
  }

  :global(.dark) .pvp__winner-name {
    color: rgba(74, 222, 128, 1);
  }

  .pvp__pending {
    color: rgba(156, 163, 175, 1);
  }

  .pvp__report-btn {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 500;
    transition: background 0.15s;
    background: rgba(243, 244, 246, 1);
    color: rgba(75, 85, 99, 1);
  }

  .pvp__report-btn:hover {
    background: rgba(229, 231, 235, 1);
  }

  :global(.dark) .pvp__report-btn {
    background: rgba(55, 65, 81, 1);
    color: rgba(209, 213, 219, 1);
  }

  :global(.dark) .pvp__report-btn:hover {
    background: rgba(75, 85, 99, 1);
  }
</style>
