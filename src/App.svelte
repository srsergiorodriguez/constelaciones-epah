<script lang="ts">
  import { atlas, curriculum } from './lib/data/types'
  import { compose } from './lib/domain/compose'
  import { atlasToViewport } from './lib/domain/nebula'
  import SkyStage from './lib/components/SkyStage.svelte'

  const ANCHO = 1200
  const ALTO = 900

  const seleccion: string[] = []
  const escena = compose(seleccion, ANCHO, ALTO)

  const map = atlasToViewport(ANCHO, ALTO)
  const centro: [number, number] = [ANCHO / 2, ALTO / 2]
  const marcas = Object.entries(atlas.regiones ?? {})
    .map(([id, p]) => {
      const [x, y] = map(p as [number, number])
      // el rótulo va por fuera del cúmulo, como en una carta estelar
      const dx = x - centro[0]
      const dy = y - centro[1]
      const d = Math.hypot(dx, dy) || 1
      return {
        id,
        x: x + (dx / d) * 92,
        y: y + (dy / d) * 92,
        texto: curriculum.programas[id].nombreCorto,
      }
    })

  const totalCursos = Object.keys(curriculum.cursos).length
  const totalProgramas = Object.keys(curriculum.programas).length
</script>

<main class="lienzo">
  <header class="cabecera">
    <h1>Constelación</h1>
    <p>Escuela de Posgrados · Facultad de Artes y Humanidades</p>
    <p class="meta">{totalCursos} cursos · {totalProgramas} programas</p>
  </header>

  <div class="cielo-contenedor">
    <SkyStage {escena} etiquetas={marcas} />
  </div>

  <footer class="pie">
    <span class="pista">Ningún curso se oculta: la constelación se enciende sobre el cielo.</span>
    <span class="aviso">Sprint 1 · nebulosa</span>
  </footer>
</main>

<style>
  .lienzo {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 100dvh;
    padding: var(--sp-8) var(--sp-12) var(--sp-4);
    gap: var(--sp-4);
    background: radial-gradient(circle at 50% 45%, #fff 0%, #fff 55%, #fbfaf6 100%);
  }

  .cabecera h1 {
    font-family: var(--ff-display);
    font-size: var(--fz-30);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .cabecera p {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-14);
    color: var(--c-ink-3);
    margin-top: var(--sp-1);
  }

  .cabecera .meta {
    font-family: var(--ff-sans);
    font-style: normal;
    font-size: var(--fz-125);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    margin-top: var(--sp-2);
  }

  .cielo-contenedor {
    position: relative;
    min-height: 0;
  }

  .pie {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-4);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--c-rule);
    font-size: var(--fz-11);
    color: var(--c-ink-3);
  }

  .pista {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-125);
  }

  .aviso {
    font-family: var(--ff-sans);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    .lienzo {
      padding: var(--sp-4);
    }

    .pie {
      flex-direction: column;
      gap: var(--sp-1);
    }
  }
</style>
