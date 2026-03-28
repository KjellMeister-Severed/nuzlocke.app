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

<div class="mphome">
  <header class="mphome__header">
    <a href="/" class="mphome__back" aria-label="Home">&larr; Home</a>
    <ThemeToggle />
  </header>

  <main class="mphome__main">
    <h1 class="mphome__title">Multiplayer</h1>
    <p class="mphome__subtitle">
      Create a new session or join an existing one.
    </p>

    {#if existingSession}
      <a href="/mp/{existingSession.gameId}" class="mphome__session">
        <span class="mphome__session-dot" />
        <span>You have an active session</span>
        <span class="mphome__session-arrow">&rarr;</span>
      </a>
    {/if}

    <div class="mphome__cards">
      <section class="mphome__card">
        <h2 class="mphome__card-title">Create</h2>
        {#if !createdGame}
          <div class="mphome__card-form">
            <Input
              rounded
              placeholder="Game name"
              maxlength={40}
              bind:value={gameName}
              on:keydown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button
              rounded
              on:click={handleCreate}
              className="w-full"
              disabled={creating || !gameName.trim()}
            >
              {creating ? 'Creating...' : 'Create Game'}
            </Button>
          </div>
        {:else}
          <div class="mphome__card-form">
            <p class="mphome__created-msg">Game created!</p>
            <div class="mphome__link-row">
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
          <p class="mphome__error">{error}</p>
        {/if}
      </section>

      <section class="mphome__card">
        <h2 class="mphome__card-title">Join</h2>
        <div class="mphome__card-form">
          <Input
            rounded
            placeholder="Paste invite link or code"
            maxlength={200}
            bind:value={joinCode}
            on:keydown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button
            rounded
            on:click={handleJoin}
            className="w-full"
            disabled={!joinCode.trim()}
          >
            Join Game
          </Button>
        </div>
      </section>
    </div>
  </main>
</div>

<style lang="postcss">
  .mphome {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
  }

  .mphome__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
  }

  .mphome__back {
    font-size: 0.875rem;
    color: rgba(107, 114, 128, 1);
    transition: color 0.15s;
  }

  .mphome__back:hover {
    color: rgba(17, 24, 39, 1);
  }

  :global(.dark) .mphome__back {
    color: rgba(156, 163, 175, 1);
  }

  :global(.dark) .mphome__back:hover {
    color: rgba(255, 255, 255, 1);
  }

  .mphome__main {
    max-width: 32rem;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem 4rem;
  }

  .mphome__title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .mphome__subtitle {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: rgba(107, 114, 128, 1);
  }

  :global(.dark) .mphome__subtitle {
    color: rgba(156, 163, 175, 1);
  }

  .mphome__session {
    margin-top: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid rgba(134, 239, 172, 1);
    background: rgba(240, 253, 244, 1);
    color: rgba(22, 101, 52, 1);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s;
  }

  .mphome__session:hover {
    background: rgba(220, 252, 231, 1);
  }

  :global(.dark) .mphome__session {
    border-color: rgba(21, 128, 61, 1);
    background: rgba(20, 83, 45, 0.2);
    color: rgba(74, 222, 128, 1);
  }

  :global(.dark) .mphome__session:hover {
    background: rgba(20, 83, 45, 0.3);
  }

  .mphome__session-dot {
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    flex-shrink: 0;
    border-radius: 9999px;
    background: rgba(34, 197, 94, 1);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .mphome__session-arrow {
    margin-left: auto;
    color: rgba(34, 197, 94, 1);
  }

  .mphome__cards {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mphome__card {
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 2px solid rgba(229, 231, 235, 1);
    background: rgba(255, 255, 255, 1);
  }

  :global(.dark) .mphome__card {
    border-color: rgba(55, 65, 81, 1);
    background: rgba(31, 41, 55, 1);
  }

  .mphome__card-title {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 700;
  }

  .mphome__card-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mphome__created-msg {
    font-size: 0.875rem;
    color: rgba(22, 163, 74, 1);
  }

  :global(.dark) .mphome__created-msg {
    color: rgba(74, 222, 128, 1);
  }

  .mphome__link-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mphome__error {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: rgba(239, 68, 68, 1);
  }
</style>
