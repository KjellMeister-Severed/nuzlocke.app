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
  <div class="mx-auto flex max-w-lg flex-col gap-y-6">

    {#if existingSession}
      <div class="session-banner">
        <p class="mb-1 text-sm font-bold">Active Session</p>
        <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">You have an active multiplayer session.</p>
        <a href="/mp/{existingSession.gameId}">
          <Button rounded className="text-sm">Return to Lobby</Button>
        </a>
      </div>
    {/if}

    <section>
      <h2 class="section-title blue">Create a Game</h2>
      <p class="section-desc">Start a new multiplayer nuzlocke session and invite your friends.</p>

      {#if !createdGame}
        <div class="flex flex-col gap-y-3">
          <Input
            rounded
            placeholder="Game name"
            maxlength={40}
            bind:value={gameName}
            on:keydown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button rounded on:click={handleCreate} className="w-full" disabled={creating || !gameName.trim()}>
            {creating ? 'Creating...' : 'Create Game'}
          </Button>
        </div>
      {:else}
        <div class="flex flex-col gap-y-3">
          <p class="text-sm text-green-600 dark:text-green-400">Game created! Share this link:</p>
          <div class="flex items-center gap-x-2">
            <Input
              rounded
              placeholder="Invite link"
              value={getInviteLink(createdGame.id)}
              className="flex-1 text-xs"
            />
            <Button rounded on:click={copyLink} className="whitespace-nowrap text-sm">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <a href="/mp/{createdGame.id}">
            <Button rounded className="w-full text-sm">Go to Lobby</Button>
          </a>
        </div>
      {/if}

      {#if error}
        <p class="mt-2 text-sm text-red-500">{error}</p>
      {/if}
    </section>

    <section>
      <h2 class="section-title pink">Join a Game</h2>
      <p class="section-desc">Paste an invite link or game code from your friend.</p>

      <div class="flex flex-col gap-y-3">
        <Input
          rounded
          placeholder="Invite link or game code"
          maxlength={200}
          bind:value={joinCode}
          on:keydown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <Button rounded on:click={handleJoin} className="w-full" disabled={!joinCode.trim()}>
          Join Game
        </Button>
      </div>
    </section>
  </div>
</ScreenContainer>

<style lang="postcss">
  section {
    @apply flex flex-col gap-y-3;
  }

  .section-title {
    @apply text-lg font-bold;
  }

  .section-title.blue {
    @apply text-blue-600 dark:text-blue-400;
  }

  .section-title.pink {
    @apply text-pink-600 dark:text-pink-400;
  }

  .section-desc {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  .session-banner {
    @apply rounded-lg border-2 border-yellow-400 p-4;
    @apply bg-yellow-50 dark:bg-yellow-500/10;
  }
</style>
