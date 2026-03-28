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
        return pkmn?.pokemon
          ? { name: pkmn.pokemon, nickname: pkmn.nickname }
          : null
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
      const result = await joinMpGame(
        gameId,
        playerName.trim(),
        pincode,
        selectedPokemonGame
      )
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

<div class="lobby">
  <header class="lobby__header">
    <a href="/mp" class="lobby__back">&larr; Back</a>
    <ThemeToggle />
  </header>

  {#if loading}
    <div class="lobby__center">
      <Loader />
    </div>
  {:else if error}
    <div class="lobby__center lobby__center--col">
      <p class="lobby__err">{error}</p>
      <a href="/mp" class="lobby__err-link">Back to Multiplayer</a>
    </div>
  {:else}
    <main class="lobby__main">
      <div class="lobby__title-row">
        <h1 class="lobby__title">{$mpGameInfo?.name || 'Game Lobby'}</h1>
        {#if isMySession}
          <button class="lobby__play-btn" on:click={playAsMe}
            >Play &rarr;</button
          >
        {/if}
      </div>

      <!-- Invite -->
      <div class="lobby__invite">
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
      <section class="lobby__section">
        <h2 class="lobby__section-title">
          Players
          <span class="lobby__count">{$mpPlayers.length}</span>
        </h2>

        {#if $mpPlayers.length === 0}
          <p class="lobby__empty">No players yet. Be the first to join!</p>
        {:else}
          <div class="lobby__players">
            {#each $mpPlayers as player}
              {@const team = getPlayerTeam(player)}
              {@const gymCount = getPlayerDefeatedCount(player)}
              <div class="lobby__player">
                <div class="lobby__player-info">
                  {#if Games[player.pokemon_game]?.logo}
                    <Logo
                      logo={Games[player.pokemon_game].logo}
                      alt={player.pokemon_game}
                      class="lobby__player-logo"
                      aspect="48xauto"
                    />
                  {/if}
                  <span class="lobby__player-name">{player.name}</span>
                  {#if gymCount > 0}
                    <span class="lobby__gym-badge"
                      >{gymCount} gym{gymCount > 1 ? 's' : ''}</span
                    >
                  {/if}
                </div>

                {#if team.length > 0}
                  <div class="lobby__player-team">
                    {#each team as mon}
                      <PIcon name={mon.name} className="-m-2.5 scale-75" />
                    {/each}
                  </div>
                {/if}

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div class="lobby__player-actions" on:click|stopPropagation>
                  {#if isMySession && session.playerId === player.id}
                    <button
                      class="lobby__action lobby__action--primary"
                      on:click={playAsMe}>Play</button
                    >
                  {:else if isMySession}
                    <button
                      class="lobby__action"
                      on:click={() => viewPlayer(player.id)}>View</button
                    >
                  {:else}
                    <button
                      class="lobby__action"
                      on:click={() => handleEnterPin(player.id)}>Claim</button
                    >
                    <button
                      class="lobby__action"
                      on:click={() => viewPlayer(player.id)}>View</button
                    >
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Join Form -->
      {#if !isMySession}
        <section class="lobby__join">
          <h2 class="lobby__section-title">Join this Game</h2>
          <div class="lobby__join-form">
            <Input
              rounded
              placeholder="Your name"
              maxlength={26}
              bind:value={playerName}
            />
            <Input
              rounded
              placeholder="PIN code (4+ chars)"
              maxlength={20}
              bind:value={pincode}
            />
            <div>
              <p class="lobby__select-label">Pokémon game:</p>
              <select bind:value={selectedPokemonGame} class="lobby__select">
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
              disabled={joining ||
                !playerName.trim() ||
                !pincode ||
                pincode.length < 4 ||
                !selectedPokemonGame}
            >
              {joining ? 'Joining...' : 'Join Game'}
            </Button>
            {#if joinError}
              <p class="lobby__join-error">{joinError}</p>
            {/if}
          </div>
        </section>
      {/if}
    </main>
  {/if}
</div>

<style lang="postcss">
  .lobby {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
  }

  .lobby__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
  }

  .lobby__back {
    font-size: 0.875rem;
    color: rgba(107, 114, 128, 1);
    transition: color 0.15s;
  }

  .lobby__back:hover {
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .lobby__back {
    color: rgba(156, 163, 175, 1);
  }

  :global(.dark) .lobby__back:hover {
    color: rgba(255, 255, 255, 1);
  }

  .lobby__center {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .lobby__center--col {
    flex-direction: column;
    gap: 1rem;
  }

  .lobby__err {
    color: rgba(239, 68, 68, 1);
  }

  .lobby__err-link {
    font-size: 0.875rem;
    color: rgba(59, 130, 246, 1);
    text-decoration: underline;
  }

  .lobby__main {
    max-width: 42rem;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 1.5rem 4rem;
  }

  .lobby__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .lobby__title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .lobby__play-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    transition: background 0.15s;
    background: rgba(17, 24, 39, 1);
    color: #fff;
  }

  .lobby__play-btn:hover {
    background: rgba(55, 65, 81, 1);
  }

  :global(.dark) .lobby__play-btn {
    background: rgba(255, 255, 255, 1);
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .lobby__play-btn:hover {
    background: rgba(229, 231, 235, 1);
  }

  .lobby__invite {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lobby__section-title {
    margin-bottom: 0.75rem;
    font-size: 1rem;
    font-weight: 700;
  }

  .lobby__count {
    margin-left: 0.25rem;
    display: inline-flex;
    height: 1.25rem;
    width: 1.25rem;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 700;
    background: rgba(229, 231, 235, 1);
    color: rgba(75, 85, 99, 1);
  }

  :global(.dark) .lobby__count {
    background: rgba(55, 65, 81, 1);
    color: rgba(209, 213, 219, 1);
  }

  .lobby__empty {
    font-size: 0.875rem;
    color: rgba(156, 163, 175, 1);
  }

  .lobby__players {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lobby__player {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(229, 231, 235, 1);
    background: rgba(255, 255, 255, 1);
    transition: box-shadow 0.15s;
  }

  .lobby__player:hover {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  :global(.dark) .lobby__player {
    border-color: rgba(55, 65, 81, 1);
    background: rgba(31, 41, 55, 1);
  }

  .lobby__player-info {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.5rem;
  }

  .lobby :global(.lobby__player-logo) {
    height: 1.25rem;
    width: auto;
  }

  .lobby__player-name {
    font-size: 0.875rem;
    font-weight: 700;
  }

  .lobby__gym-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 500;
    background: rgba(220, 252, 231, 1);
    color: rgba(21, 128, 61, 1);
  }

  :global(.dark) .lobby__gym-badge {
    background: rgba(20, 83, 45, 0.3);
    color: rgba(74, 222, 128, 1);
  }

  .lobby__player-team {
    display: none;
    align-items: center;
  }

  @media (min-width: 640px) {
    .lobby__player-team {
      display: flex;
    }
  }

  .lobby__player-actions {
    display: flex;
    flex-shrink: 0;
    gap: 0.25rem;
  }

  .lobby__action {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    transition: background 0.15s;
    background: rgba(243, 244, 246, 1);
    color: rgba(55, 65, 81, 1);
  }

  .lobby__action:hover {
    background: rgba(229, 231, 235, 1);
  }

  :global(.dark) .lobby__action {
    background: rgba(55, 65, 81, 1);
    color: rgba(209, 213, 219, 1);
  }

  :global(.dark) .lobby__action:hover {
    background: rgba(75, 85, 99, 1);
  }

  .lobby__action--primary {
    background: rgba(17, 24, 39, 1);
    color: #fff;
  }

  .lobby__action--primary:hover {
    background: rgba(55, 65, 81, 1);
  }

  :global(.dark) .lobby__action--primary {
    background: rgba(255, 255, 255, 1);
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .lobby__action--primary:hover {
    background: rgba(229, 231, 235, 1);
  }

  .lobby__join {
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 2px solid rgba(229, 231, 235, 1);
  }

  :global(.dark) .lobby__join {
    border-color: rgba(55, 65, 81, 1);
  }

  .lobby__join-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .lobby__select-label {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    color: rgba(107, 114, 128, 1);
  }

  .lobby__select {
    width: 100%;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 2px solid rgba(209, 213, 219, 1);
    font-size: 0.875rem;
    background: rgba(255, 255, 255, 1);
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .lobby__select {
    border-color: rgba(75, 85, 99, 1);
    background: rgba(17, 24, 39, 1);
    color: rgba(229, 231, 235, 1);
  }

  .lobby__join-error {
    font-size: 0.875rem;
    color: rgba(239, 68, 68, 1);
  }
</style>
