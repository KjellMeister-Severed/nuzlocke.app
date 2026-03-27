<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { ScreenContainer } from '$lib/components/containers'
  import { Button, Input } from '$lib/components/core'
  import { createMpGame, loadMpSession } from '$lib/mpStore'
  import { Game } from '$icons'

  let gameName = ''
  let joinCode = ''
  let creating = false
  let createdGame = null
  let copied = false
  let error = ''
  let existingSession = null

  onMount(() => {
    existingSession = loadMpSession()
  })

  async function handleCreate() {
    if (!gameName.trim()) return
    creating = true
    error = ''
    try {
      createdGame = await createMpGame(gameName.trim())
    } catch (e) {
      error = 'Failed to create game'
    }
    creating = false
  }

  function getInviteLink(gameId) {
    if (!browser) return ''
    return `${window.location.origin}/mp/${gameId}`
  }

  async function copyLink() {
    if (!createdGame) return
    const link = getInviteLink(createdGame.id)
    await navigator.clipboard.writeText(link)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function handleJoin() {
    if (!joinCode.trim()) return
    // Extract game ID from a full URL or just use the code
    let id = joinCode.trim()
    if (id.includes('/mp/')) {
      id = id.split('/mp/').pop().split('/')[0].split('?')[0]
    }
    window.location.href = `/mp/${id}`
  }
</script>

<svelte:head>
  <title>Nuzlocke Tracker | Multiplayer</title>
</svelte:head>

<ScreenContainer title="Multiplayer" icon={Game} className="mb-20">
  <div class="mx-auto flex max-w-lg flex-col gap-y-8">

    {#if existingSession}
      <div class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p class="mb-2 text-sm font-bold text-yellow-400">Active Session</p>
        <p class="mb-3 text-xs text-gray-300">You have an active multiplayer session.</p>
        <a href="/mp/{existingSession.gameId}" class="inline-block">
          <Button rounded className="text-sm">Return to Lobby</Button>
        </a>
      </div>
    {/if}

    <div class="rounded-lg border border-blue-500/30 bg-gray-800/50 p-6">
      <h2 class="mb-4 text-xl font-bold text-blue-400">Create a Game</h2>
      <p class="mb-4 text-sm text-gray-400">Start a new multiplayer nuzlocke session and invite your friends.</p>

      {#if !createdGame}
        <div class="flex flex-col gap-y-3">
          <input
            type="text"
            bind:value={gameName}
            placeholder="Game name (e.g. Friday Night Nuzlocke)"
            class="w-full rounded border border-gray-600 bg-gray-700 p-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            on:keydown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button rounded on:click={handleCreate} className="w-full" disabled={creating || !gameName.trim()}>
            {creating ? 'Creating...' : 'Create Game'}
          </Button>
        </div>
      {:else}
        <div class="flex flex-col gap-y-3">
          <p class="text-sm text-green-400">Game created! Share this link with your friends:</p>
          <div class="flex items-center gap-x-2">
            <input
              type="text"
              readonly
              value={getInviteLink(createdGame.id)}
              class="w-full rounded border border-gray-600 bg-gray-700 p-2 text-xs text-gray-300"
            />
            <Button rounded on:click={copyLink} className="whitespace-nowrap text-sm">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <a href="/mp/{createdGame.id}" class="inline-block">
            <Button rounded className="w-full text-sm">Go to Lobby</Button>
          </a>
        </div>
      {/if}

      {#if error}
        <p class="mt-2 text-sm text-red-400">{error}</p>
      {/if}
    </div>

    <div class="rounded-lg border border-pink-500/30 bg-gray-800/50 p-6">
      <h2 class="mb-4 text-xl font-bold text-pink-400">Join a Game</h2>
      <p class="mb-4 text-sm text-gray-400">Paste an invite link or game code from your friend.</p>

      <div class="flex flex-col gap-y-3">
        <input
          type="text"
          bind:value={joinCode}
          placeholder="Invite link or game code"
          class="w-full rounded border border-gray-600 bg-gray-700 p-2 text-sm text-white placeholder-gray-400 focus:border-pink-500 focus:outline-none"
          on:keydown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <Button rounded on:click={handleJoin} className="w-full" disabled={!joinCode.trim()}>
          Join Game
        </Button>
      </div>
    </div>
  </div>
</ScreenContainer>
