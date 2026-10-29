<script lang="ts">
  import { untrack } from 'svelte'
  import { curriculum } from '../data/types'
  import type { Escena } from '../domain/compose'
  import type { Punto } from '../domain/figures'
  import { polylinePath } from '../viz/geometry'
  import { finDelPlan, planViaje, posicionEn, prefiereMenosMovimiento } from '../viz/motion'
  import { colorDe, radioDe } from '../viz/palette'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    escena: Escena
    seleccion: string[]
    resaltado: string | null
    onHover: (cursoId: string | null) => void
  }

  let { escena, seleccion, resaltado, onHover }: Props = $props()

  let pos = $state<Record<string, Punto>>({})
  let viajando = $state(false)
  let raf = 0

  const FAMILIA: Record<string, string> = {
    'mae-creacion': 'creacion',
    'mae-he': 'he',
    'mae-gepc': 'gepc',
    'mae-periodismo': 'perio',
    'mae-patrimonio': 'patrim',
  }

  function familiaDe(cursoId: string): string {
    const c = curriculum.cursos[cursoId]
    if (!c || c.alcance === 'escuela') return 'ink'
    for (const [id, fam] of Object.entries(FAMILIA)) {
      const p = curriculum.programas[id]
      if (c.maestrias.includes(p.nombreCorto)) return fam
    }
    return 'ink'
  }

  const colorEstrella = (en: string[]) => (en.length ? colorDe(en[0]) : 'var(--c-ink)')

  $effect(() => {
    const objetivo = new Map<string, Punto>(escena.estrellas.map((e) => [e.cursoId, [e.x, e.y] as Punto]))
    const desde = untrack(() => new Map<string, Punto>(Object.entries(pos) as [string, Punto][]))

    cancelAnimationFrame(raf)

    if (desde.size === 0 || prefiereMenosMovimiento()) {
      const directo: Record<string, Punto> = {}
      for (const [id, p] of objetivo) directo[id] = p
      pos = directo
      viajando = false
      return
    }

    const plan = planViaje(desde, objetivo)
    const fin = finDelPlan(plan)
    const t0 = performance.now()
    viajando = true

    const tick = () => {
      const ahora = performance.now() - t0
      const nuevo: Record<string, Punto> = {}
      for (const [id, v] of plan) nuevo[id] = posicionEn(v, ahora)
      pos = nuevo
      if (ahora < fin) raf = requestAnimationFrame(tick)
      else viajando = false
    }

    tick()
    return () => cancelAnimationFrame(raf)
  })

  const anillos = [180, 280, 380, 480, 580]
  const enNebulosa = $derived(seleccion.length === 0)
</script>

<svg
  class="cielo"
  viewBox="0 0 {escena.ancho} {escena.alto}"
  role="img"
  aria-label="Cielo de cursos de la Escuela: {escena.estrellas.length} cursos, {seleccion.length} programas seleccionados"
  preserveAspectRatio="xMidYMid meet"
>
  <g class="retícula" aria-hidden="true">
    {#each anillos as r}
      <ellipse cx={escena.ancho / 2} cy={escena.alto / 2} rx={r} ry={r * 0.86} />
    {/each}
    {#each Array.from({ length: 36 }, (_, i) => i * 10) as a}
      {@const t = (a * Math.PI) / 180}
      {@const cx = escena.ancho / 2}
      {@const cy = escena.alto / 2}
      <line
        x1={cx + Math.sin(t) * 600}
        y1={cy - Math.cos(t) * 516}
        x2={cx + Math.sin(t) * 616}
        y2={cy - Math.cos(t) * 530}
        class={a % 30 === 0 ? 'marca-fuerte' : 'marca'}
      />
    {/each}
  </g>

  <g class="figuras" aria-hidden="true">
    {#if escena.eje}
      <line
        x1={escena.eje[0][0]}
        y1={escena.eje[0][1]}
        x2={escena.eje[1][0]}
        y2={escena.eje[1][1]}
        stroke="var(--c-ink-3)"
        class="enlace"
        class:visible={!enNebulosa}
      />
    {/if}
    {#each escena.figuras as f (f.programaId)}
      <path
        d={polylinePath(f.puntos)}
        fill="none"
        stroke={colorDe(f.programaId)}
        class="silueta"
        class:visible={!enNebulosa}
      />
    {/each}
  </g>

  <g class="estrellas">
    {#each escena.estrellas as e (e.cursoId)}
      {@const c = curriculum.cursos[e.cursoId]}
      {@const p = pos[e.cursoId] ?? [e.x, e.y]}
      {@const r = radioDe(c.nProgramas)}
      {#if e.estado === 'nebulosa'}
        {@const fam = familiaDe(e.cursoId)}
        <circle
          cx={p[0]}
          cy={p[1]}
          r={Math.max(3.2, r * 0.42)}
          fill={fam === 'ink' ? 'var(--c-ink)' : `var(--c-${fam}-3)`}
          opacity={enNebulosa ? 0.62 : 0.22}
        />
      {:else}
        {@const color = colorEstrella(e.en)}
        <g
          transform="translate({p[0]},{p[1]})"
          class="estrella"
          class:resaltada={resaltado === e.cursoId}
          role="button"
          tabindex="0"
          aria-label="{c.nombre}, {c.creditos} créditos"
          onmouseenter={() => onHover(e.cursoId)}
          onmouseleave={() => onHover(null)}
          onfocus={() => onHover(e.cursoId)}
          onblur={() => onHover(null)}
        >
          {#if resaltado === e.cursoId}
            <circle r={r * 2.6} class="halo" />
          {/if}
          <StarGlyph eje={c.eje} r={r} {color} />
        </g>
        <text
          x={p[0] + r + 7}
          y={p[1] - r - 2}
          class="código"
          class:visible={!viajando || resaltado === e.cursoId}
        >{c.codigo}</text>
      {/if}
    {/each}
  </g>

</svg>

<style>
  .cielo {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .retícula ellipse {
    fill: none;
    stroke: var(--c-grid);
    stroke-width: var(--stroke-grid);
  }

  .marca,
  .marca-fuerte {
    stroke: var(--c-grid);
    stroke-width: 0.8;
  }

  .marca-fuerte {
    stroke-width: 1.4;
  }

  .enlace {
    stroke-width: var(--stroke-link);
    stroke-dasharray: 3 6;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .enlace.visible {
    opacity: 0.4;
  }

  .silueta {
    stroke-width: var(--stroke-const);
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .silueta.visible {
    opacity: 0.5;
  }

  .estrella {
    cursor: pointer;
    outline: none;
  }

  .estrella:focus-visible .halo {
    stroke: var(--c-focus);
  }

  .halo {
    fill: none;
    stroke: var(--c-ink);
    stroke-width: 1;
    opacity: 0.55;
  }

  .código {
    font-family: var(--ff-sans);
    font-size: 12px;
    letter-spacing: 0.08em;
    fill: var(--c-ink-2);
    opacity: 0;
    transition: opacity var(--t-base) var(--ease) 240ms;
    pointer-events: none;
  }

  .código.visible {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .silueta,
    .código,
    .enlace {
      transition: none;
    }
  }
</style>
