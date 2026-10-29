<script lang="ts">
  import { curriculum } from '../data/types'
  import type { Escena } from '../domain/compose'
  import { radioDe } from '../viz/palette'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    escena: Escena
    etiquetas?: { x: number; y: number; texto: string }[]
  }

  let { escena, etiquetas = [] }: Props = $props()

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

  const anillos = [180, 280, 380, 480, 580]
</script>

<svg
  class="cielo"
  viewBox="0 0 {escena.ancho} {escena.alto}"
  role="img"
  aria-label="Cielo de cursos de la Escuela de Posgrados: {escena.estrellas.length} cursos"
  preserveAspectRatio="xMidYMid meet"
>
  <defs>
    <radialGradient id="vineta" cx="50%" cy="50%" r="62%">
      <stop offset="60%" stop-color="var(--c-paper)" stop-opacity="0" />
      <stop offset="100%" stop-color="var(--c-papel)" stop-opacity="0.55" />
    </radialGradient>
  </defs>

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

  <g class="nebulosa">
    {#each escena.estrellas as e (e.cursoId)}
      {@const c = curriculum.cursos[e.cursoId]}
      {@const fam = familiaDe(e.cursoId)}
      {@const r = radioDe(c.nProgramas)}
      <circle
        cx={e.x}
        cy={e.y}
        r={Math.max(1.8, r * 0.62)}
        fill={fam === 'ink' ? 'var(--c-ink)' : `var(--c-${fam}-3)`}
        opacity="0.62"
      />
    {/each}
  </g>

  <g class="rótulos" aria-hidden="true">
    {#each etiquetas as et}
      <text x={et.x} y={et.y}>{et.texto}</text>
    {/each}
  </g>

  <rect width={escena.ancho} height={escena.alto} fill="url(#vineta)" pointer-events="none" />
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

  .rótulos text {
    font-family: var(--ff-sans);
    font-size: 9.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    fill: var(--c-ink-3);
    opacity: 0.42;
    text-anchor: middle;
  }
</style>
