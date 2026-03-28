<script>
  export let id = 25

  import { createImgUrl } from '$utils/rewrites'
  import { fly, fade } from 'svelte/transition'
  import { onMount } from 'svelte'

  import { trackData } from '$lib/store'
  import { Picture, Button } from '$lib/components/core'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'

  const interval = 5000
  const distance = 200

  let flip = 0
  setInterval(() => {
    flip = (flip + 1) % 2
    id = Math.round(Math.random() * 151)
  }, interval)

  onMount(() => {
    trackData()
  })

  let src
  $: duration = Math.min(interval / 3, 800)
  $: src = createImgUrl({ imgId: id }, { ext: 'png' })
</script>

<svelte:head>
  <link rel="preload" as="image" href="/logo.webp" />
  <link rel="preload" as="image" href="/logo.png" />
</svelte:head>

<div class="home-page">
  <div class="theme-corner">
    <ThemeToggle />
  </div>

  <main>
    <div class="hero">
      <div class="pokemon-bg">
        {#if !flip}
          <img
            {src}
            alt="Pokemon #{id}"
            class="pokemon-sprite"
            out:fly={{ y: distance, duration }}
            in:fly={{ y: -distance, duration }}
          />
        {/if}
        {#if flip}
          <img
            {src}
            alt="Pokemon #{id}"
            class="pokemon-sprite"
            out:fly={{ y: distance, duration }}
            in:fly={{ y: -distance, duration }}
          />
        {/if}
      </div>

      <h1>
        <span class="title-pokemon">Pokémon</span>
        <Picture
          src="/logo"
          loading="eager"
          aspect="324x62"
          pixelated
          alt="Nuzlocke Tracker"
          className="logo-img"
        />
        <span class="title-tracker">Multiplayer Tracker</span>
      </h1>

      <p class="tagline">
        Track encounters, plan for Gym battles, and compete with friends
        in multiplayer Nuzlocke runs.
      </p>

      <div class="cta-group">
        <a href="/mp" class="cta-primary" data-sveltekit-preload-data>
          Play Multiplayer
        </a>
        <a href="/guides" class="cta-secondary" data-sveltekit-preload-data>
          Guides
        </a>
      </div>
    </div>
  </main>
</div>

<style lang="postcss">
  .home-page {
    @apply relative flex min-h-screen items-center justify-center overflow-hidden;
  }

  .theme-corner {
    @apply absolute top-4 right-4 z-10;
  }

  main {
    @apply relative z-10 flex flex-col items-center px-6 py-16;
  }

  .hero {
    @apply flex max-w-md flex-col items-center text-center;
  }

  .pokemon-bg {
    @apply relative mb-6 h-32 w-32;
  }

  .pokemon-sprite {
    @apply absolute inset-0 h-full w-full object-contain;
    image-rendering: pixelated;
  }

  h1 {
    @apply flex flex-col items-center gap-y-1 font-mono;
  }

  .title-pokemon {
    @apply text-sm font-medium uppercase tracking-[0.3em] text-gray-500;
  }

  :global(.dark) .title-pokemon {
    @apply text-gray-400;
  }

  h1 :global(.logo-img) {
    @apply h-auto w-64 transition sm:w-72;
  }

  .title-tracker {
    @apply mt-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-400;
  }

  :global(.dark) .title-tracker {
    @apply text-gray-500;
  }

  .tagline {
    @apply mt-5 max-w-xs text-sm leading-relaxed text-gray-600;
  }

  :global(.dark) .tagline {
    @apply text-gray-400;
  }

  .cta-group {
    @apply mt-8 flex flex-col gap-3 sm:flex-row;
  }

  .cta-primary {
    @apply rounded-lg px-8 py-3 text-sm font-bold uppercase tracking-wider transition;
    @apply bg-gray-900 text-white hover:bg-gray-700;
  }

  :global(.dark) .cta-primary {
    @apply bg-white text-gray-900 hover:bg-gray-200;
  }

  .cta-secondary {
    @apply rounded-lg border-2 px-8 py-3 text-sm font-bold uppercase tracking-wider transition;
    @apply border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900;
  }

  :global(.dark) .cta-secondary {
    @apply border-gray-600 text-gray-400 hover:border-white hover:text-white;
  }
</style>
