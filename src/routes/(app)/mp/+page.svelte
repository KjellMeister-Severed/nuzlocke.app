<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { Button, Input } from '$lib/components/core'
  import { createMpGame, loadMpSession } from '$lib/mpStore'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'

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

<div class="mp-page">
  <header class="mp-header">
    <a href="/" class="back-link" aria-label="Home">&larr; Home</a>
    <ThemeToggle />
  </header>

  <main>
    <h1>Multiplayer</h1>
    <p class="subtitle">Create a new session or join an existing one.</p>

    {#if existingSession}
      <a href="/mp/{existingSession.gameId}" class="session-card">
        <span class="session-dot"></span>
        <span>You have an active session</span>
        <span class="session-arrow">&rarr;</span>
      </a>
    {/if}

    <div class="cards">
      <section class="card">
        <h2>Create</h2>
        {#if !createdGame}
          <div class="card-form">
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
          <div class="card-form">
            <p class="text-sm text-green-600 dark:text-green-400">Game created!</p>
            <div class="flex items-center gap-x-2">
              <Input
                rounded
                value={getInviteLink(createdGame.id)}
                className="flex-1 text-xs"
              />
              <Button rounded on:click={copyLink} className="shrink-0 text-xs">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <a href="/mp/{createdGame.id}">
              <Button rounded className="w-full">Go to Lobby</Button>
            </a>
          </div>
        {/if}
        {#if error}
          <p class="mt-2 text-sm text-red-500">{error}</p>
        {/if}
      </section>

      <section class="card">
        <h2>Join</h2>
        <div class="card-form">
          <Input
            rounded
            placeholder="Paste invite link or code"
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
  </main>
</div>

<style lang="postcss">
  .mp-page {
    @apply flex min-h-screen flex-col;
  }

  .mp-header {
    @apply flex items-center justify-between px-6 py-4;
  }

  .back-link {
    @apply text-sm text-gray-500 transition hover:text-gray-900;
  }

  :global(.dark) .back-link {
    @apply text-gray-400 hover:text-white;
  }

  main {
    @apply mx-auto flex w-full max-w-lg flex-col px-6 pt-8 pb-16;
  }

  h1 {
    @apply text-2xl font-bold tracking-tight;
  }

  .subtitle {
    @apply mt-1 text-sm text-gray-500;
  }

  :global(.dark) .subtitle {
    @apply text-gray-400;
  }

  .session-card {
    @apply mt-6 flex items-center gap-x-3 rounded-lg border-2 px-4 py-3 text-sm font-medium transition;
    @apply border-green-300 bg-green-50 text-green-800 hover:bg-green-100;
  }

  :global(.dark) .session-card {
    @apply border-green-700 bg-green-900/20 text-green-400 hover:bg-green-900/30;
  }

  .session-dot {
    @apply inline-block h-2 w-2 shrink-0 rounded-full bg-green-500;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .session-arrow {
    @apply ml-auto text-green-500;
  }

  .cards {
    @apply mt-8 flex flex-col gap-y-6;
  }

  .card {
    @apply rounded-xl border-2 p-5;
    @apply border-gray-200 bg-white;
  }

  :global(.dark) .card {
    @apply border-gray-700 bg-gray-800;
  }

  .card h2 {
    @apply mb-4 text-lg font-bold;
  }

  .card-form {
    @apply flex flex-col gap-y-3;
  }
</style>
