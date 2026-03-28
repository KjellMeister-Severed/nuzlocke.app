<script>
  export let sprite,
    fallback,
    name,
    types,
    tera,
    level = '',
    moves,
    maxStat,
    held = '',
    ability = '',
    stats,
    nature = undefined,
    minimal = false

  import { capitalise, regionise } from '$lib/utils/string'
  import { isEmpty } from '$lib/utils/obj'

  import { PIcon, Icon, Tooltip } from '$c/core'

  import { Hand } from '$icons'

  import { color } from '$lib/data/colors.ts'
  import { Wrapper as SettingWrapper } from '$lib/components/Settings'

  import TypeBadge from '$lib/components/type-badge.svelte'
  import MoveCard from '$lib/components/move-card.svelte'
  import StatBlock from '$lib/components/stat-block.svelte'

  import { UNOWN } from '$utils/rewrites'
  import { Stars as Pattern } from '$utils/pattern'

  const canonname = name.replace(/-(Alola|Galar)/, '')

  const anim = ['bob'][Math.floor(Math.random() * 1)]
  const animDur = Math.floor(Math.random() * 4) + 4
  const animDelay = Math.floor(Math.random() * 10) / 10
</script>

<SettingWrapper id="theme" let:setting={themeId}>
  {@const color1 = color(types[0], themeId)}
  {@const color2 = color(types[1] || types[0], themeId)}
  {@const pattern = Pattern(color2)}
  <div class="pkcard {$$restProps.class || ''}" class:pkcard--minimal={minimal}>
    <!-- Type badges -->
    <div class="pkcard__types">
      {#each types as t}
        <TypeBadge type={t} />
      {/each}
      {#if tera}
        <TypeBadge tera type={tera} />
      {/if}
      <div class="pkcard__badge-row">
        <slot name="badges" />
      </div>
    </div>

    <!-- Header with color -->
    <div
      class="pkcard__header"
      style="--pk-col: {color1}; background-image: url(&quot;{pattern}&quot;);"
      class:pkcard__header--minimal={minimal}
    >
      <div class="pkcard__info">
        {#if level}
          <div class="pkcard__level">
            <span class="pkcard__level-label">Lv</span>
            <span class="pkcard__level-num">{level}</span>
            {#if level.startsWith('+') || level.startsWith('-')}
              <Tooltip>Calculated as your party's Max Level {level}</Tooltip>
            {/if}
          </div>
        {/if}

        <div class="pkcard__name-block">
          {#if ability}
            <span class="pkcard__ability" class:cursor-help={!!ability.effect}>
              {#if ability.effect}
                <Tooltip>{ability.effect}</Tooltip>
              {/if}
              {ability.name}
            </span>
          {/if}

          <span class="pkcard__name">{regionise(capitalise(name))}</span>

          {#if held}
            <div class="pkcard__held">
              <Tooltip
                >{held.name}: {held.effect?.replace(/^Held: +/g, '')}</Tooltip
              >
              <PIcon type="item" name={held.sprite} />
              <Icon inline={true} icon={Hand} class="pkcard__held-hand" />
            </div>
          {/if}
        </div>
      </div>

      <!-- Sprite -->
      <div class="pkcard__sprite-wrap" class:pkcard__sprite-wrap--sm={minimal}>
        <slot name="img" />
        {#if sprite}
          <img
            width="96"
            height="96"
            style="--v-anim-dur: {animDur}s; --v-anim-delay: {animDelay}s"
            class="pkcard__sprite {anim}"
            src={sprite}
            onerror="this.onerror=null;this.src='{fallback}'"
            alt={name}
          />
        {:else}
          <img
            width="96"
            height="96"
            src={UNOWN}
            style="--v-anim-dur: {animDur}s; --v-anim-delay: {animDelay}s"
            class="pkcard__sprite pkcard__sprite--unknown {anim}"
            alt="Unknown sprite for {name}"
          />
        {/if}
      </div>
    </div>

    <!-- Body: Stats & Moves -->
    {#if !minimal}
      <div class="pkcard__body" style="border-color: {color1}">
        {#if moves && moves.length}
          <div class="pkcard__moves">
            {#each moves.filter((m) => !isEmpty(m)) as m}
              <MoveCard {...m} stab={types.includes(m.type)} />
            {/each}
          </div>
        {/if}

        {#if $$slots.stats}
          <slot name="stats" />
        {:else}
          <StatBlock
            class="pkcard__stats"
            col={color1}
            {nature}
            max={maxStat}
            {...stats}
          />
        {/if}
      </div>

      <slot name="footer" id={canonname} />
    {/if}
  </div>
</SettingWrapper>

<style lang="postcss">
  .pkcard {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
    overflow: visible;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .pkcard:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  :global(.dark) .pkcard {
    background: theme('colors.gray.900');
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    border: 1px solid theme('colors.gray.800');
  }

  :global(.dark) .pkcard:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  /* Type badges */
  .pkcard__types {
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(-50%) translateX(-0.125rem);
    display: flex;
    gap: 0.25rem;
    z-index: 10;
  }

  .pkcard--minimal .pkcard__types {
    transform: translateY(-50%) translateX(-0.125rem) scale(0.8);
    transform-origin: left;
  }

  :global(.box) .pkcard__types {
    transform: translateY(-50%) translateX(-0.125rem) scale(0.8);
    transform-origin: left;
  }

  .pkcard__badge-row {
    margin-left: 0.5rem;
    cursor: help;
    height: 1rem;
  }

  @media (min-width: theme('screens.md')) {
    .pkcard__badge-row {
      transform: scale(1.1);
    }
  }

  .pkcard__badge-row > :global(*:nth-child(even) i) {
    z-index: 50;
    margin: 0 -0.25rem;
    transform: translateY(0.375rem);
  }

  .pkcard__badge-row > :global(*:nth-child(odd) i) {
    z-index: 10;
    margin: 0 -0.25rem;
    transform: translateY(-0.25rem);
  }

  .pkcard--minimal .pkcard__badge-row {
    position: absolute;
    bottom: -4rem;
    left: -0.5rem;
    transform: scale(1) translateY(0.5rem);
  }

  /* Header */
  .pkcard__header {
    position: relative;
    z-index: 0;
    display: flex;
    justify-content: space-between;
    padding: 1rem 0 0.75rem 1rem;
    border-radius: 0.75rem 0.75rem 0 0;
    background-color: var(--pk-col);
    overflow: visible;
  }

  .pkcard__header::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(130deg, white 40%, transparent);
    z-index: -1;
  }

  :global(.dark) .pkcard__header::before {
    background: linear-gradient(
      130deg,
      theme('colors.gray.900') 40%,
      transparent
    );
  }

  .pkcard__header--minimal {
    border-radius: 0.75rem;
  }

  /* Info block */
  .pkcard__info {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: none;
  }

  .pkcard__level {
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  }

  .pkcard__level-label {
    font-size: 0.6875rem;
    line-height: 1;
    color: theme('colors.gray.600');
  }

  :global(.dark) .pkcard__level-label {
    color: theme('colors.gray.400');
  }

  .pkcard__level-num {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
  }

  .pkcard__name-block {
    position: relative;
    z-index: 40;
    padding-right: 0.5rem;
  }

  .pkcard__ability {
    display: block;
    font-size: 0.6875rem;
    line-height: 1;
    margin-bottom: 0.125rem;
    color: theme('colors.gray.500');
    pointer-events: auto;
  }

  .pkcard__name {
    font-size: 1.125rem;
    font-weight: 500;
    line-height: 1.2;
    pointer-events: auto;
  }

  .pkcard__held {
    position: absolute;
    right: 0;
    bottom: -0.125rem;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateX(100%);
    padding: 0.25rem;
    cursor: help;
    pointer-events: auto;
  }

  :global(.pkcard__held-hand) {
    margin-top: -0.875rem;
    fill: currentColor;
  }

  :global(.dark .pkcard__held-hand) {
    color: white;
  }

  /* Sprite */
  .pkcard__sprite-wrap {
    position: absolute;
    right: -2rem;
    top: 0;
    height: 0;
    transform-origin: bottom right;
  }

  .pkcard__sprite-wrap--sm {
    transform: scale(0.75);
  }

  .pkcard__sprite {
    height: 10rem;
    width: auto;
    transform: translateY(-4rem);
    image-rendering: pixelated;
    pointer-events: none;
    min-width: 10rem;
    animation-delay: var(--v-anim-delay);
  }

  .pkcard__sprite.bob {
    animation: bob var(--v-anim-dur) ease infinite;
  }

  .pkcard__sprite--unknown {
    transform: translateY(-4rem) translateX(-1.5rem) scale(0.75);
  }

  @keyframes bob {
    0%,
    100% {
      transform: translate(
          var(--tw-translate-x, 0),
          var(--tw-translate-y, -4rem)
        )
        scaleX(1) scaleY(1);
    }
    25%,
    75% {
      transform: translate(
          var(--tw-translate-x, 0),
          var(--tw-translate-y, -4rem)
        )
        scaleX(1.02) scaleY(0.95);
    }
    50% {
      transform: translate(
          var(--tw-translate-x, 0),
          var(--tw-translate-y, -4rem)
        )
        scaleX(0.95) scaleY(1.03);
    }
  }

  /* Body */
  .pkcard__body {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column-reverse;
    border-top: 2px solid;
    border-radius: 0 0 0.75rem 0.75rem;
    background: white;
    padding-bottom: 0.25rem;
  }

  :global(.dark) .pkcard__body {
    background: theme('colors.gray.900');
  }

  @media (min-width: theme('screens.md')) {
    .pkcard__body {
      flex-direction: row;
      align-items: center;
    }
  }

  .pkcard__moves {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 1rem;
    margin: 0.75rem 0 0.75rem 1rem;
    flex: 2;
  }

  @media (min-width: theme('screens.lg')) {
    .pkcard__moves {
      gap: 0.75rem 1rem;
    }
  }

  :global(.pkcard__stats) {
    flex: 1;
    flex-grow: 1;
    margin: 1rem;
    width: auto;
    grid-template-columns: repeat(20, minmax(0, 1fr));
  }

  @media (min-width: theme('screens.md')) {
    :global(.pkcard__stats) {
      margin-top: 0.75rem;
    }
  }
</style>
