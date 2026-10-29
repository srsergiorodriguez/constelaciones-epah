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
    etiquetas: { x: number; y: number; texto: string }[]
  }

  let { escena, seleccion, etiquetas }: Props = $props()

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

  const colorEstrella = (en: string[]) =>
    en.length ? colorDe(en[0], Math.max(0, seleccion.indexOf(en[0]))) : 'var(--c-ink)'

  // Viaje: cada cambio de escena interpola desde la posición actual.
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

    const bisagras = new Set(
      escena.estrellas.filter((e) => e.estado === 'bisagra').map((e) => e.cursoId),
    )
    const plan = planViaje(desde, objetivo, { bisagras })
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
  const conFigura = $derived(escena.figuras.filter((f) => f.puntos.length > 1))
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
    {#each escena.figuras as f (f.programaId)}
      {#if f.anclaje && escena.nucleo.length}
        {@const c = escena.nucleo.reduce((a, p) => [a[0] + p[0] / escena.nucleo.length, a[1] + p[1] / escena.nucleo.length] as [number, number], [0, 0] as [number, number])}
        <line
          x1={c[0]}
          y1={c[1]}
          x2={f.anclaje[0]}
          y2={f.anclaje[1]}
          stroke={colorDe(f.programaId, Math.max(0, seleccion.indexOf(f.programaId)))}
          class="enlace"
          class:visible={!enNebulosa}
        />
      {/if}
    {/each}
    {#each conFigura as f (f.programaId)}
      <path
        d={polylinePath(f.puntos)}
        fill="none"
        stroke={colorDe(f.programaId, Math.max(0, seleccion.indexOf(f.programaId)))}
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
          r={Math.max(3, r * 0.56)}
          fill={fam === 'ink' ? 'var(--c-ink)' : `var(--c-${fam}-3)`}
          opacity={enNebulosa ? 0.62 : 0.24}
        />
      {:else}
        {@const color = colorEstrella(e.en)}
        <g transform="translate({p[0]},{p[1]})" class="en-foco" class:borde={e.estado === 'bisagra'}>
          <StarGlyph eje={c.eje} r={r} {color} />
          {#if e.en.length > 1}
            <circle r={r * 2.2} fill="none" stroke={colorDe(e.en[1], Math.max(0, seleccion.indexOf(e.en[1])))} stroke-width="0.8" />
          {/if}
        </g>
        <text
          x={p[0] + r + 6}
          y={p[1] - r - 3}
          class="código"
          class:visible={!viajando}
        >{c.codigo}</text>
      {/if}
    {/each}
  </g>

  {#if enNebulosa}
    <g class="rótulos" aria-hidden="true">
      {#each etiquetas as et}
        <text x={et.x} y={et.y}>{et.texto}</text>
      {/each}
    </g>
  {/if}
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
    stroke-width: 0.8;
  }

  .marca,
  .marca-fuerte {
    stroke: var(--c-grid);
    stroke-width: 0.7;
  }

  .marca-fuerte {
    stroke-width: 1.2;
  }

  .enlace {
    stroke-width: 0.8;
    stroke-dasharray: 2 5;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .enlace.visible {
    opacity: 0.35;
  }

  .silueta {
    stroke-width: 1.3;
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .silueta.visible {
    opacity: 0.38;
  }

  .en-foco {
    transition: opacity var(--t-base) var(--ease);
  }

  .código {
    font-family: var(--ff-sans);
    font-size: 9px;
    letter-spacing: 0.08em;
    fill: var(--c-ink-3);
    opacity: 0;
    transition: opacity var(--t-base) var(--ease) 240ms;
    pointer-events: none;
  }

  .código.visible {
    opacity: 1;
  }

  .rótulos text {
    font-family: var(--ff-sans);
    font-size: 9.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    fill: var(--c-ink-3);
    opacity: 0.42;
    text-anchor: middle;
  }

  @media (prefers-reduced-motion: reduce) {
    .silueta,
    .código,
    .en-foco {
      transition: none;
    }
  }
</style>
