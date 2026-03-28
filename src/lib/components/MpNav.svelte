<script>
  export let player = null
  export let isOwner = false
  export let gameKey = ''
  export let mpGameId = ''
  export let players = []
  export let currentPlayerId = ''
  export let ownPlayerId = ''

  import { Expanded as Games } from '$lib/data/games'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Logo } from '$lib/components/core'
  import MpPlayerSwitcher from '$lib/components/MpPlayerSwitcher.svelte'
</script>

<nav class="mpnav">
  <div class="mpnav__inner">
    <a href="/mp/{mpGameId}" class="mpnav__back" aria-label="Back to lobby">
      {#if gameKey && Games[gameKey]?.logo}
        <Logo
          logo={Games[gameKey].logo}
          pictureClass="game--{gameKey}"
          class="mpnav__logo"
          alt="{gameKey} logo"
          aspect="192x96"
        />
      {:else}
        <span class="mpnav__back-arrow">&larr;</span>
      {/if}
    </a>

    <div class="mpnav__players">
      <MpPlayerSwitcher {players} {currentPlayerId} {mpGameId} {ownPlayerId} />
    </div>

    <div class="mpnav__actions">
      <ThemeToggle />
    </div>
  </div>
</nav>

<style lang="postcss">
  .mpnav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5000;
    height: 3.25rem;
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    background: rgba(255, 255, 255, 0.82);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  :global(.dark) .mpnav {
    background: rgba(17, 24, 39, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .mpnav__inner {
    max-width: 72rem;
    height: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1rem;
  }

  .mpnav__back {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: opacity 0.15s;
  }

  .mpnav__back:hover {
    opacity: 0.7;
  }

  .mpnav :global(.mpnav__logo) {
    height: 1.75rem;
    width: auto;
  }

  .mpnav__back-arrow {
    font-weight: 700;
    font-size: 0.875rem;
  }

  .mpnav__players {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .mpnav__actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
</style>
