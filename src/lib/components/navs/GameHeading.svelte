<script>
  import {
    activeGame,
    savedGames,
    updateGame,
    parse,
    readdata,
    getGameStore
  } from '$lib/store'
  import { fade, fly } from 'svelte/transition'

  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  import { MiniTeamController } from '$c/TeamBuilder'

  let game = {},
    games
  activeGame.subscribe((id) => {
    savedGames.subscribe(
      parse((g) => {
        game = g[id]
        games = Object.values(g).filter((i) => i.id !== id)
      })
    )
  })

  const load = (game) => {
    $activeGame = game.id
    document.body.style = 'opacity: 0; transition: opacity: 0.2s'
    window.location.reload()
  }

  const reset = (_) => {
    if (
      !window.confirm(
        "This will reset all data for this run, including your encounters, team & box. You cannot recover this data when it's reset. Are you sure?"
      )
    )
      return

    const [, , id] = readdata()
    const gameStore = getGameStore(id)

    savedGames.update(
      updateGame({
        ...game,
        attempts: +(game?.attempts || 1) + 1
      })
    )
    gameStore.set('{}')
  }

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { Icon, Logo, Button, Popover } from '$lib/components/core'
  import { Box, Save, Game, Grave, Caret, CaretRight } from '$icons'

  const pages = [
    { name: 'Game', link: '/game', icon: Game },
    { name: 'Box', link: '/box', icon: Box },
    { name: 'Grave', link: '/graveyard', icon: Grave }
  ]

  let savesOpen = false
</script>

<svelte:head>
  <title>Nuzlocke | {game?.name || ''}</title>
</svelte:head>

<nav class="gnav {$page.url.pathname.replace('/', '')}">
  <div class="gnav__inner">
    <!-- Left: Logo + Game name + Save switcher -->
    <div class="gnav__left">
      <a href="/" rel="external" class="gnav__home">
        {#if game?.game}
          <Logo
            logo={game?.game}
            pictureClass="game--{game?.game}"
            class="gnav__logo"
            alt="{game?.game} logo"
            aspect="192x96"
          />
        {/if}
      </a>

      <div class="gnav__title-group">
        {#if game?.name}
          <span class="gnav__title" in:fade>
            {(game?.name || '').slice(0, 24)}{game?.name?.length > 24
              ? '…'
              : ''}
          </span>
        {/if}

        {#if browser}
          <Popover
            title="Load & manage game saves"
            position={window?.innerWidth < 700 ? 'bottom' : 'right'}
          >
            <button class="gnav__saves-btn" title="Switch saves">
              <Icon inline={true} icon={Save} class="fill-current" />
              <Icon
                inline={true}
                icon={CaretRight}
                class="fill-current max-sm:hidden"
              />
              <Icon inline={true} icon={Caret} class="fill-current sm:hidden" />
            </button>

            <div
              in:fly={{ duration: 200, y: 8 }}
              out:fade={{ duration: 100 }}
              class="gnav__saves-dropdown"
              slot="popover"
            >
              <div class="gnav__saves-header">Saves</div>

              {#each games as g}
                <button
                  class="gnav__saves-item"
                  on:click={load(g)}
                  title="Load {g.name}"
                >
                  <span>{g.name}</span>
                  <Logo
                    alt="{g.name} logo"
                    logo={g?.game}
                    class="gnav__saves-logo"
                    aspect="192x96"
                  />
                </button>
              {/each}

              <div class="gnav__saves-footer">
                <Button on:click={reset} rounded solid class="w-full text-sm"
                  >New Attempt</Button
                >
                <p class="gnav__saves-hint">
                  Reset <b>{game?.name || ''}</b> — attempt {+(
                    game?.attempts || 1
                  ) + 1}
                </p>
              </div>
            </div>
          </Popover>
        {/if}
      </div>
    </div>

    <!-- Center: Mini team -->
    {#if $page.url.pathname !== '/graveyard'}
      <div class="gnav__center">
        <MiniTeamController />
      </div>
    {/if}

    <!-- Right: Page links + theme -->
    <div class="gnav__right">
      {#each pages as p}
        <a
          class="gnav__link"
          class:gnav__link--active={p.link === $page.url.pathname}
          href={p.link}
        >
          <Icon inline={true} icon={p.icon} class="gnav__link-icon" />
          <span class="gnav__link-label">{p.name}</span>
        </a>
      {/each}
      <ThemeToggle />
    </div>
  </div>
</nav>

<style lang="postcss">
  .gnav {
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

  :global(.dark) .gnav {
    background: rgba(17, 24, 39, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .gnav.graveyard {
    background: rgba(0, 0, 0, 0.6);
    border-bottom-color: rgba(255, 255, 255, 0.04);
  }

  .gnav__inner {
    max-width: 80rem;
    margin: 0 auto;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.75rem;
    gap: 0.5rem;
  }

  @media (min-width: theme('screens.md')) {
    .gnav__inner {
      padding: 0 1.5rem;
    }
  }

  .gnav__left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex-shrink: 1;
  }

  .gnav__home {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .gnav :global(.gnav__logo) {
    height: 2rem;
    width: auto;
  }

  .gnav__title-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .gnav__title {
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: theme('colors.gray.700');
    display: none;
  }

  @media (min-width: theme('screens.lg')) {
    .gnav__title {
      display: block;
    }
  }

  :global(.dark) .gnav__title {
    color: theme('colors.gray.200');
  }

  .gnav__saves-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0.25rem;
    border-radius: 0.375rem;
    color: theme('colors.gray.500');
    transition: color 0.15s, background 0.15s;
  }

  .gnav__saves-btn:hover {
    color: theme('colors.gray.800');
    background: rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .gnav__saves-btn:hover {
    color: theme('colors.gray.200');
    background: rgba(255, 255, 255, 0.08);
  }

  .gnav__saves-dropdown {
    width: 15rem;
    max-height: 80vh;
    overflow-y: auto;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
    margin-top: 0.5rem;
  }

  :global(.dark) .gnav__saves-dropdown {
    background: theme('colors.gray.900');
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }

  .gnav__saves-header {
    padding: 0.625rem 0.875rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: theme('colors.gray.400');
    border-bottom: 1px solid theme('colors.gray.100');
  }

  :global(.dark) .gnav__saves-header {
    color: theme('colors.gray.500');
    border-bottom-color: theme('colors.gray.800');
  }

  .gnav__saves-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    color: theme('colors.gray.600');
    transition: background 0.1s, color 0.1s;
    cursor: pointer;
    border-bottom: 1px solid theme('colors.gray.50');
  }

  .gnav__saves-item:hover {
    background: theme('colors.gray.50');
    color: theme('colors.blue.600');
  }

  :global(.dark) .gnav__saves-item {
    color: theme('colors.gray.300');
    border-bottom-color: theme('colors.gray.800');
  }

  :global(.dark) .gnav__saves-item:hover {
    background: theme('colors.gray.800');
    color: theme('colors.blue.400');
  }

  .gnav :global(.gnav__saves-logo) {
    width: 3.5rem;
    flex-shrink: 0;
  }

  .gnav__saves-footer {
    padding: 0.75rem;
    text-align: center;
    border-top: 1px solid theme('colors.gray.100');
  }

  :global(.dark) .gnav__saves-footer {
    border-top-color: theme('colors.gray.800');
  }

  .gnav__saves-hint {
    margin-top: 0.375rem;
    font-size: 0.6875rem;
    color: theme('colors.gray.400');
    line-height: 1.3;
  }

  .gnav__center {
    display: none;
    flex-shrink: 0;
  }

  @media (min-width: theme('screens.md')) {
    .gnav__center {
      display: flex;
      align-items: center;
    }
  }

  .gnav__right {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
  }

  .gnav__link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: theme('colors.gray.500');
    border-radius: 0.375rem;
    transition: color 0.15s, background 0.15s;
    text-decoration: none;
    position: relative;
  }

  .gnav__link:hover {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.04);
  }

  .gnav__link--active {
    color: theme('colors.gray.900');
    background: rgba(0, 0, 0, 0.06);
  }

  .gnav__link--active::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 25%;
    right: 25%;
    height: 2px;
    background: theme('colors.red.500');
    border-radius: 1px;
  }

  :global(.dark) .gnav__link {
    color: theme('colors.gray.400');
  }

  :global(.dark) .gnav__link:hover {
    color: theme('colors.gray.100');
    background: rgba(255, 255, 255, 0.06);
  }

  :global(.dark) .gnav__link--active {
    color: theme('colors.gray.50');
    background: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .gnav__link--active::after {
    background: theme('colors.red.400');
  }

  .gnav__link-label {
    display: none;
  }

  @media (min-width: theme('screens.sm')) {
    .gnav__link-label {
      display: inline;
    }
  }

  :global(.game--sw),
  :global(.game--sh) {
    @apply -mr-4 -ml-4;
  }

  :global(.game--emkaizo) {
    @apply -mr-2 -ml-2;
  }

  @media (min-width: theme('screens.md')) {
    :global(.game--sw),
    :global(.game--sh) {
      @apply -mr-6 ml-0;
    }

    :global(.game--emkaizo) {
      @apply -mr-2 ml-0;
    }
  }
</style>
