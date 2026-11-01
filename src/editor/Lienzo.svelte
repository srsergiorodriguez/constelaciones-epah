<script lang="ts">
  import { placeOnFigure } from '../lib/domain/figures'

  interface Props {
    puntos: [number, number][]
    estrellas: number
    onCambio: (puntos: [number, number][]) => void
  }

  let { puntos, estrellas, onCambio }: Props = $props()

  let lienzo = $state<SVGSVGElement | null>(null)
  let arrastrando = $state<number | null>(null)
  let pasando = $state<number | null>(null)

  /** De coordenadas de pantalla a coordenadas de la figura (0..100). */
  function aFigura(ev: PointerEvent): [number, number] {
    const caja = lienzo!.getBoundingClientRect()
    const escala = 100 / Math.min(caja.width, caja.height)
    const x = (ev.clientX - caja.left - (caja.width - caja.height) / 2) * escala
    const y = (ev.clientY - caja.top - (caja.height - caja.width) / 2) * escala
    return [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))]
  }

  function mover(ev: PointerEvent) {
    if (arrastrando === null) return
    const [x, y] = aFigura(ev)
    const copia = puntos.map((p, i) => (i === arrastrando ? ([x, y] as [number, number]) : p))
    onCambio(copia)
  }

  function soltar() {
    arrastrando = null
  }

  /** Inserta un nodo justo donde se hizo clic sobre la línea. */
  function insertar(ev: PointerEvent, i: number) {
    if (arrastrando !== null) return
    const [x, y] = aFigura(ev)
    const copia = [...puntos]
    copia.splice(i + 1, 0, [x, y])
    onCambio(copia)
  }

  function borrar(i: number) {
    if (puntos.length <= 2) return
    onCambio(puntos.filter((_, k) => k !== i))
  }

  const caja = $derived.by(() => {
    const xs = puntos.map((p) => p[0])
    const ys = puntos.map((p) => p[1])
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  const estrellasPts = $derived(placeOnFigure(puntos, estrellas))
  const trazo = $derived(puntos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' '))
</script>

<svelte:window onpointermove={mover} onpointerup={soltar} />

<div class="lienzo">
  <svg
    bind:this={lienzo}
    viewBox="0 0 100 100"
    role="application"
    aria-label="Editor de la silueta: {puntos.length} nodos"
  >
    <rect x="0" y="0" width="100" height="100" class="fondo" />

    <g class="rejilla" aria-hidden="true">
      {#each [10, 20, 30, 40, 50, 60, 70, 80, 90] as n (n)}
        <line x1={n} y1="0" x2={n} y2="100" />
        <line x1="0" y1={n} x2="100" y2={n} />
      {/each}
    </g>

    <!-- segmentos de inserción: invisibles, anchos, para poder tocar la línea -->
    {#each puntos.slice(1) as _p, i (i)}
      <line
        x1={puntos[i][0]}
        y1={puntos[i][1]}
        x2={puntos[i + 1][0]}
        y2={puntos[i + 1][1]}
        class="insertar"
        role="button"
        tabindex="-1"
        aria-label="Insertar nodo en el segmento {i + 1}"
        onpointerdown={(ev) => insertar(ev, i)}
      />
    {/each}

    <!-- la app ajusta la figura a su caja: el rectángulo muestra cuál es -->
    <rect x={caja.x0} y={caja.y0} width={caja.x1 - caja.x0} height={caja.y1 - caja.y0} class="caja" />

    <path d={trazo} class="figura" />

    {#each estrellasPts as e, i (i)}
      <circle cx={e[0]} cy={e[1]} r="1.5" class="estrella" />
    {/each}

    {#each puntos as p, i (i)}
      <circle
        cx={p[0]}
        cy={p[1]}
        r={pasando === i || arrastrando === i ? 2.4 : 1.8}
        class="nodo"
        class:activo={arrastrando === i}
        role="button"
        tabindex="-1"
        aria-label="Nodo {i + 1}"
        onpointerdown={(ev) => {
          ev.preventDefault()
          arrastrando = i
        }}
        onpointerenter={() => (pasando = i)}
        onpointerleave={() => (pasando = null)}
        ondblclick={() => borrar(i)}
      />
    {/each}
  </svg>
</div>

<style>
  .lienzo {
    aspect-ratio: 1;
    width: 100%;
    max-width: 620px;
    border: 1px solid var(--c-rule);
    background: var(--c-paper);
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
  }

  .fondo {
    fill: var(--c-paper);
  }

  .rejilla line {
    stroke: var(--c-grid);
    stroke-width: 0.3;
  }

  .insertar {
    stroke: transparent;
    stroke-width: 6;
    cursor: copy;
  }

  .caja {
    fill: none;
    stroke: var(--c-ink-3);
    stroke-width: 0.4;
    stroke-dasharray: 2 2;
    pointer-events: none;
  }

  .figura {
    fill: none;
    stroke: var(--c-ink);
    stroke-width: 1.4;
    stroke-linejoin: round;
    stroke-linecap: round;
    pointer-events: none;
  }

  .estrella {
    fill: var(--c-ink);
    opacity: 0.55;
    pointer-events: none;
  }

  .nodo {
    fill: var(--c-paper);
    stroke: var(--c-ink);
    stroke-width: 0.7;
    cursor: grab;
  }

  .nodo.activo {
    fill: var(--c-ink);
    cursor: grabbing;
  }
</style>
