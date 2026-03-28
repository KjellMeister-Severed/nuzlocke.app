<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  import { Button, Input, Loader, Logo, PIcon } from '$lib/components/core'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'

  import { Expanded as Games } from '$lib/data/games'
  import { filterObj } from '$lib/utils/arr'
  import GamesData from '$lib/data/games.json'
  import { capitalise } from '$lib/utils/string'

  import {
    fetchMpGame,
    joinMpGame,
    saveMpSession,
    loadMpSession,
    verifyPin,
    parseGameData,
    mpGameInfo,
    mpPlayers
  } from '$lib/mpStore'

  const gameId = $page.params.gameId

  let loading = true
  let error = ''
  let session = null

  let playerName = ''
  let pincode = ''
  let selectedPokemonGame = ''
  let joining = false
  let joinError = ''
  let copied = false

  let validGames = filterObj(GamesData, (g) => g.supported)

  function getPlayerTeam(player) {
    const data = parseGameData(player)
    return (data.__team || [])
      .filter((loc) => loc)
      .map((loc) => {
        const pkmn = data[loc]
        return pkmn?.pokemon ? { name: pkmn.pokemon, nickname: pkmn.nickname } : null
      })
      .filter(Boolean)
      .slice(0, 6)
  }

  function getPlayerDefeatedCount(player) {
    const data = parseGameData(player)
    return (data.__teams || []).length
  }

  onMount(async () => {
    session = loadMpSession()
    const data = await fetchMpGame(gameId)
    if (!data) error = 'Game not found'
    loading = false
  })

  async function handleJoin() {
    if (!playerName.trim() || !pincode || !selectedPokemonGame) return
    joining = true
    joinError = ''
    try {
      const result = await joinMpGame(gameId, playerName.trim(), pincode, selectedPokemonGame)
      saveMpSession({ gameId, playerId: result.id, pincode })
      session = { gameId, playerId: result.id, pincode }
      await fetchMpGame(gameId)
    } catch (e) {
      joinError = e.message || 'Failed to join'
    }
    joining = false
  }

  async function handleEnterPin(playerId) {
    const pin = prompt('Enter your PIN code:')
    if (!pin) return
    const ok = await verifyPin(gameId, playerId, pin)
    if (ok) {
      saveMpSession({ gameId, playerId, pincode: pin })
      session = { gameId, playerId, pincode: pin }
    } else {
      alert('Invalid PIN code')
    }
  }

  function viewPlayer(playerId) {
    window.location.href = `/mp/${gameId}/play?player=${playerId}`
  }

  function playAsMe() {
    if (!session) return
    window.location.href = `/mp/${gameId}/play?player=${session.playerId}`
  }

  async function copyInviteLink() {
    if (!browser) return
    const link = `${window.location.origin}/mp/${gameId}`
    await navigator.clipboard.writeText(link)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  $: isMySession = session?.gameId === gameId
</script>

<svelte:head>
  <title>Nuzlocke | {$mpGameInfo?.name || 'Lobby'}</title>
</svelte:head>

<div class="lobby-page">
  <header class="lobby-header">
    <a href="/mp" class="back-link">&larr; Back</a>
    <ThemeToggle />
  </header>

  {#if loading}
    <div class="flex flex-1 items-center justify-center">
      <Loader />
    </div>
  {:else if error}
    <div class="flex flex-1 flex-col items-center justify-center gap-4">
      <p class="text-red-500">{error}</p>
      <a href="/mp" class="text-sm text-blue-500 underline">Back to Multiplayer</a>
    </div>
  {:else}
    <main>
      <div class="lobby-title-row">
        <h1>{$mpGameInfo?.name || 'Game Lobby'}</h1>
        {#if isMySession}
          <button class="play-btn" on:click={playAsMe}>
            Play &rarr;
          </button>
        {/if}
      </div>

      <!-- Invite -->
      <div class="invite-row">
        <Input
          rounded
          value={browser ? `${window.location.origin}/mp/${gameId}` : ''}
          className="flex-1 text-xs"
        />
        <Button rounded on:click={copyInviteLink} className="shrink-0 text-xs">
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>

      <!-- Players -->
      <section class="players-section">
        <h2>Players <span class="player-count">{$mpPlayers.length}</span></h2>

        {#if $mpPlayers.length === 0}
          <p class="empty-text">No players yet. Be the first to join!</p>
        {:else}
          <div class="player-list">
            {#each $mpPlayers as player}
              {@const team = getPlayerTeam(player)}
              {@const gymCount = getPlayerDefeatedCount(player)}
              <div class="player-row">
                <div class="player-main">
                  {#if Games[player.pokemon_game]?.logo}
                    <Logo
                      logo="{Games[player.pokemon_game].logo}"
                      alt="{player.pokemon_game}"
                      class="h-5 w-auto"
                      aspect="48xauto"
                    />
                  {/if}
                  <span class="player-name">{player.name}</span>
                  {#if gymCount > 0}
                    <span class="gym-badge">{gymCount} gym{gymCount > 1 ? 's' : ''}</span>
                  {/if}
                </div>

                {#if team.length > 0}
                  <div class="player-team">
                    {#each team as mon}
                      <PIcon name={mon.name} className="-m-2.5 scale-75" />
                    {/each}
                  </div>
                {/if}

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="player-actions" on:click|stopPropagation>
                  {#if isMySession && session.playerId === player.id}
                    <button class="action-btn primary" on:click={playAsMe}>Play</button>
                  {:else if isMySession}
                    <button class="action-btn" on:click={() => viewPlayer(player.id)}>View</button>
                  {:else}
                    <button class="action-btn" on:click={() => handleEnterPin(player.id)}>Claim</button>
                    <button class="action-btn" on:click={() => viewPlayer(player.id)}>View</button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Join Form -->
      {#if !isMySession}
        <section class="join-section">
          <h2>Join this Game</h2>
          <div class="join-form">
            <Input rounded placeholder="Your name" maxlength={26} bind:value={playerName} />
            <Input rounded placeholder="PIN code (4+ chars)" maxlength={20} bind:value={pincode} />
            <div>
              <p class="select-label">Pokémon game:</p>
              <select bind:value={selectedPokemonGame} class="game-select">
                <option value="">Select a game</option>
                {#each Object.entries(validGames) as [id, game]}
                  <option value={id}>{game.title}</option>
                {/each}
              </select>
            </div>
            <Button
              rounded
              on:click={handleJoin}
              className="w-full"
              disabled={joining || !playerName.trim() || !pincode || pincode.length < 4 || !selectedPokemonGame}
            >
              {joining ? 'Joining...' : 'Join Game'}
            </Button>
            {#if joinError}
              <p class="text-sm text-red-500">{joinError}</p>
            {/if}
          </div>
        </section>
      {/if}
    </main>
  {/if}
</div>

<style lang="postcss">
  .lobby-page {
    @apply flex min-h-screen flex-col;
  }

  .lobby-header {
    @apply flex items-center justify-between px-6 py-4;
  }

  .back-link {
    @apply text-sm text-gray-500 transition hover:text-gray-900;
  }

  :global(.dark) .back-link {
    @apply text-gray-400 hover:text-white;
  }

  main {
    @apply mx-auto flex w-full max-w-2xl flex-col gap-y-6 px-6 pt-4 pb-16;
  }

  .lobby-title-row {
    @apply flex items-center justify-between;
  }

  h1 {
    @apply text-2xl font-bold tracking-tight;
  }

  .play-btn {
    @apply rounded-lg px-5 py-2 text-sm font-bold transition;
    @apply bg-gray-900 text-white hover:bg-gray-700;
  }

  :global(.dark) .play-btn {
    @apply bg-white text-gray-900 hover:bg-gray-200;
  }

  .invite-row {
    @apply flex items-center gap-x-2;
  }

  .players-section h2,
  .join-section h2 {
    @apply mb-3 text-base font-bold;
  }

  .player-count {
    @apply ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-tiny font-bold;
    @apply bg-gray-200 text-gray-600;
  }

  :global(.dark) .player-count {
    @apply bg-gray-700 text-gray-300;
  }

  .empty-text {
    @apply text-sm text-gray-400;
  }

  .player-list {
    @apply flex flex-col gap-y-2;
  }

  .player-row {
    @apply flex items-center gap-x-3 rounded-lg border px-4 py-3;
    @apply border-gray-200 bg-white;
  }

  :global(.dark) .player-row {
    @apply border-gray-700 bg-gray-800;
  }

  .player-main {
    @apply flex flex-1 items-center gap-x-2;
  }

  .player-name {
    @apply text-sm font-bold;
  }

  .gym-badge {
    @apply rounded-full px-2 py-0.5 text-tiny font-medium;
    @apply bg-green-100 text-green-700;
  }

  :global(.dark) .gym-badge {
    @apply bg-green-900/30 text-green-400;
  }

  .player-team {
    @apply hidden items-center sm:flex;
  }

  .player-actions {
    @apply flex shrink-0 gap-x-1;
  }

  .action-btn {
    @apply rounded-md px-3 py-1 text-xs font-medium transition;
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
  }

  :global(.dark) .action-btn {
    @apply bg-gray-700 text-gray-300 hover:bg-gray-600;
  }

  .action-btn.primary {
    @apply bg-gray-900 text-white hover:bg-gray-700;
  }

  :global(.dark) .action-btn.primary {
    @apply bg-white text-gray-900 hover:bg-gray-200;
  }

  .join-section {
    @apply rounded-xl border-2 p-5;
    @apply border-gray-200;
  }

  :global(.dark) .join-section {
    @apply border-gray-700;
  }

  .join-form {
    @apply flex flex-col gap-y-3;
  }

  .select-label {
    @apply mb-1 text-xs text-gray-500;
  }

  .game-select {
    @apply w-full rounded-lg border-2 p-2 text-sm;
    @apply border-gray-300 bg-white text-gray-900;
    @apply dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200;
  }
</style>
