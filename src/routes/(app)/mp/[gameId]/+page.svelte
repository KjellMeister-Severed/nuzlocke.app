<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  import { ScreenContainer } from '$lib/components/containers'
  import { Button, Input, Loader, Logo } from '$lib/components/core'
  import { Game } from '$icons'

  import { Expanded as Games } from '$lib/data/games'
  import { filterObj } from '$lib/utils/arr'
  import GamesData from '$lib/data/games.json'

  import {
    fetchMpGame,
    joinMpGame,
    saveMpSession,
    loadMpSession,
    verifyPin,
    mpGameInfo,
    mpPlayers
  } from '$lib/mpStore'

  const gameId = $page.params.gameId

  let loading = true
  let error = ''
  let session = null

  // Join form
  let playerName = ''
  let pincode = ''
  let selectedPokemonGame = ''
  let joining = false
  let joinError = ''

  // Invite link
  let copied = false

  let validGames = filterObj(GamesData, (g) => g.supported)

  onMount(async () => {
    session = loadMpSession()
    const data = await fetchMpGame(gameId)
    if (!data) {
      error = 'Game not found'
    }
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
  <title>Nuzlocke Tracker | Multiplayer Lobby</title>
</svelte:head>

<ScreenContainer title={$mpGameInfo?.name || 'Multiplayer Lobby'} icon={Game} className="mb-20">
  {#if loading}
    <Loader />
  {:else if error}
    <p class="text-center text-red-500">{error}</p>
  {:else}
    <div class="mx-auto flex max-w-2xl flex-col gap-y-6">

      <!-- Invite link -->
      <div class="flex items-center gap-x-2">
        <span class="shrink-0 text-sm text-gray-500 dark:text-gray-400">Invite:</span>
        <Input
          rounded
          placeholder="Invite link"
          value={browser ? `${window.location.origin}/mp/${gameId}` : ''}
          className="flex-1 text-xs"
        />
        <Button rounded on:click={copyInviteLink} className="text-xs">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <!-- Players list -->
      <div>
        <h3 class="mb-3 text-base font-bold">Players ({$mpPlayers.length})</h3>

        {#if $mpPlayers.length === 0}
          <p class="text-sm text-gray-500 dark:text-gray-400">No players have joined yet. Be the first!</p>
        {:else}
          <div class="flex flex-col gap-y-2">
            {#each $mpPlayers as player}
              <div class="player-row">
                <div class="flex items-center gap-x-3">
                  {#if Games[player.pokemon_game]?.logo}
                    <Logo
                      logo="{Games[player.pokemon_game].logo}"
                      alt="{player.pokemon_game}"
                      class="h-6 w-auto"
                      aspect="48xauto"
                    />
                  {/if}
                  <div>
                    <span class="font-bold">{player.name}</span>
                    <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {Games[player.pokemon_game]?.title || player.pokemon_game}
                    </span>
                  </div>
                </div>

                <div class="flex gap-x-2">
                  {#if isMySession && session.playerId === player.id}
                    <Button rounded on:click={playAsMe} className="text-xs">
                      Play
                    </Button>
                  {:else if isMySession}
                    <Button rounded on:click={() => viewPlayer(player.id)} className="text-xs">
                      View
                    </Button>
                  {:else}
                    <Button rounded on:click={() => handleEnterPin(player.id)} className="text-xs">
                      This is me
                    </Button>
                    <Button rounded on:click={() => viewPlayer(player.id)} className="text-xs">
                      View
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Join form -->
      {#if !isMySession}
        <div>
          <h3 class="mb-3 text-base font-bold text-green-600 dark:text-green-400">Join this Game</h3>

          <div class="flex flex-col gap-y-3">
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
              <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">Select your Pokémon game:</p>
              <select
                bind:value={selectedPokemonGame}
                class="game-select"
              >
                <option value="">-- Select a game --</option>
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
        </div>
      {:else}
        <div class="flex justify-center">
          <Button rounded solid on:click={playAsMe} className="text-lg px-8 py-3">
            Start Playing
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</ScreenContainer>

<style lang="postcss">
  .player-row {
    @apply flex items-center justify-between rounded-lg border-2 p-3;
    @apply border-gray-200 dark:border-gray-700;
  }

  .game-select {
    @apply w-full rounded-lg border-2 p-2 text-sm h-10;
    @apply border-gray-300 bg-white text-gray-900;
    @apply dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200;
    @apply focus:outline-none focus:ring-2 focus:ring-transparent;
  }
</style>
