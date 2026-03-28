<script>
  import { browser } from '$app/environment'
  import { onMount, getContext } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Grave, GraveRow, Fog } from './'
  import { NuzlockeGroups } from '$lib/data/states'
  import Audio from '$lib/components/Audio.svelte'

  import { locid } from '$utils/pokemon'
  import { chunk } from '$utils/arr'
  import { capitalise } from '$utils/string'
  import { summarise } from '$utils/badges'

  import { activeGame, getGame, read, readTeams, patch } from '$lib/store'
  import { Loader, Toggle, Tooltip, PIcon } from '$c/core'

  import { IMG } from '$utils/rewrites'

  let DeathModal
  const openDeathModal = async (args) => {
    if (DeathModal) open(DeathModal, args)
    import('$lib/components/DeathModal/index.svelte').then((m) => {
      DeathModal = m.default
      open(DeathModal, args)
    })
  }

  let box = {},
    bossData = {},
    gameStore
  activeGame.subscribe((gameId) => {
    if (browser && !gameId) return
    gameStore = getGame(gameId)
    gameStore.subscribe(
      read((data) => {
        box = data
        bossData = readTeams(data)
      })
    )
  })

  const region = getContext('region')
  const { open } = getContext('simple-modal')
  const { getPkmn } = getContext('game')

  const handleEdit = (p) => async (o) => {
    const pokemon = await getPkmn(o.detail.pokemon)

    const mode =
      o.detail?.death?.opponent || o.detail?.death?.trainer ? 'edit' : 'new'

    const submit = (death) => {
      mode === 'new'
        ? gameStore.update(patch({ [p._id]: { ...p, death } }))
        : gameStore.update(
            patch({ [p._id]: { ...p, death: { ...p.death, ...death } } })
          )
    }

    openDeathModal({ ...o.detail, submit, pokemon, mode })
  }

  const chunkSize = 6
  let graveyard = []
  $: graveyard = Object.keys(box)
    .map((key) => ({ ...box[key], _id: key }))
    .filter((i) => i.pokemon)
    .filter((i) => NuzlockeGroups.Dead.includes(i.status))

  let chunked = []
  $: chunked = chunk(graveyard, chunkSize)

  let showFog = true,
    showAudio = true
</script>

<svelte:head>
  <title>Nuzlocke Tracker | Graveyard</title>
</svelte:head>

<main class="gyard {region}">
  <div class="gyard__content" in:fade={{ duration: 400, delay: 200 }}>
    {#if !graveyard.length}
      <div class="gyard__empty">
        You have no Pokémon in the graveyard.<br />Congratulations!
      </div>
    {:else}
      <!-- Controls -->
      <div class="gyard__controls">
        <div class="gyard__toggle">
          <span class="gyard__toggle-label">Fog</span>
          <Toggle id="fog" bind:state={showFog} />
        </div>
        <div class="gyard__toggle">
          <span class="gyard__toggle-label">Audio</span>
          <Toggle id="audio" bind:state={showAudio} />
        </div>
      </div>

      {#if showAudio}
        <Audio
          class="bottom-8 left-0 z-[999999] lg:fixed"
          src="/audio/lavender.mp3"
        />
      {/if}
      {#if showFog}<Fog />{/if}
    {/if}
  </div>

  {#if graveyard.length}
    <div class="gyard__graves">
      {#each chunked as row, i}
        <GraveRow {i} maxRows={chunked.length}>
          {#each row as p, j (p._id)}
            {@const result = summarise(p, bossData)}

            <div
              class="gyard__grave-cell"
              class:gyard__grave-cell--alt={j % 2}
              in:fade={{
                duration: 600,
                delay:
                  Math.min(3000 / graveyard.length, 400) * (i * chunkSize + j) +
                  800
              }}
            >
              <Grave
                pokemon={p.pokemon}
                nickname={p.nickname}
                death={p?.death}
                on:click={handleEdit(p)}
              >
                <svelte:fragment slot="badges">
                  {#if result}
                    {@const { icons, summary } = result}
                    <div class="gyard__badges">
                      <Tooltip>{summary}</Tooltip>
                      {#each icons as icon}
                        <PIcon name={icon} type="b" />
                      {/each}
                    </div>
                  {/if}
                </svelte:fragment>
              </Grave>
            </div>
          {/each}
        </GraveRow>
      {/each}
    </div>
  {/if}
</main>

<style lang="postcss">
  .gyard {
    width: 100vw;
    overflow: hidden;
  }

  @media (max-width: theme('screens.md')) {
    .gyard {
      height: 100vh;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
    }
  }

  @media (min-width: theme('screens.md')) {
    .gyard {
      width: auto;
      overflow: auto;
    }
  }

  .gyard__content {
    padding: 3.75rem 1rem 0;
    scroll-snap-align: start;
    scroll-margin-top: 1rem;
  }

  @media (min-width: theme('screens.sm')) {
    .gyard__content {
      padding: 3.75rem 2rem 0;
    }
  }

  .gyard__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24rem;
    font-size: 1.125rem;
    text-align: center;
    color: theme('colors.gray.400');
  }

  :global(.dark) .gyard__empty {
    color: theme('colors.gray.600');
  }

  /* Controls */
  .gyard__controls {
    position: relative;
    z-index: 999999;
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  @media (min-width: theme('screens.md')) {
    .gyard__controls {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      flex-direction: column;
      gap: 0.5rem;
      width: 10rem;
      margin-bottom: 0;
    }
  }

  .gyard__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .gyard__toggle-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: theme('colors.gray.700');
  }

  :global(.dark) .gyard__toggle-label {
    color: theme('colors.gray.200');
  }

  /* Graves */
  .gyard__graves {
    margin-top: 2rem;
    padding-bottom: 12rem;
  }

  @media (min-width: theme('screens.sm')) {
    .gyard__graves {
      padding-bottom: 16rem;
    }
  }

  .gyard__grave-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    scroll-snap-align: start;
    scroll-margin-top: -0.5rem;
  }

  @media (max-width: theme('screens.sm')) {
    .gyard__grave-cell {
      margin-top: 2.5rem;
      padding: 0 1.5rem;
    }

    .gyard__grave-cell--alt {
      flex-direction: row-reverse;
    }
  }

  @media (min-width: theme('screens.md')) {
    .gyard__grave-cell {
      display: inline-block;
    }
  }

  .gyard__badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem;
    width: 5rem;
    margin: -0.25rem 0 -1.5rem;
    line-height: 1;
    transform: scale(0.75);
    filter: grayscale(1);
    transition: filter 0.2s;
    cursor: help;
  }

  .gyard__grave-cell:hover .gyard__badges {
    filter: none;
  }
</style>
