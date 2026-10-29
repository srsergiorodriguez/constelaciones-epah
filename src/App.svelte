<script lang="ts">
  import { curriculum, atlas } from './lib/data/types'
  import { compose } from './lib/domain/compose'
  import { atlasToViewport } from './lib/domain/nebula'
  import SkyStage from './lib/components/SkyStage.svelte'
  import ProgramPicker from './lib/components/ProgramPicker.svelte'
  import Legend from './lib/components/Legend.svelte'

  const ANCHO = 1200
  const ALTO = 900

  const desdeHash = (): string[] => {
    if (typeof location === 'undefined') return []
    return decodeURIComponent(location.hash.slice(1))
      .split(',')
      .filter((id) => curriculum.programas[id])
      .slice(0, 2)
  }

  let seleccion = $state<string[]>(desdeHash())
  let aviso = $state('')

  // el estado vive en el hash: un enlace comparte la constelación elegida
  $effect(() => {
    const hash = seleccion.map(encodeURIComponent).join(',')
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
  })

  const escena = $derived(compose(seleccion, ANCHO, ALTO))

  const map = atlasToViewport(ANCHO, ALTO)
  const centro: [number, number] = [ANCHO / 2, ALTO / 2]
  const marcas = Object.entries(atlas.regiones ?? {}).map(([id, p]) => {
    const [x, y] = map(p as [number, number])
    const dx = x - centro[0]
    const dy = y - centro[1]
    const d = Math.hypot(dx, dy) || 1
    return {
      x: x + (dx / d) * 92,
      y: y + (dy / d) * 92,
      texto: curriculum.programas[id].nombreCorto,
    }
  })

  const totalCursos = Object.keys(curriculum.cursos).length
  const totalProgramas = Object.keys(curriculum.programas).length

  function alternar(id: string) {
    if (seleccion.includes(id)) {
      seleccion = seleccion.filter((x) => x !== id)
      aviso = ''
      return
    }
    if (seleccion.length >= 2) {
      const fuera = seleccion[0]
      seleccion = [...seleccion.slice(1), id]
      aviso = `Se apagó ${curriculum.programas[fuera].nombreCorto}.`
      return
    }
    seleccion = [...seleccion, id]
    aviso = ''
  }

  function limpiar() {
    seleccion = []
    aviso = ''
  }

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape' && seleccion.length > 0) limpiar()
  }

  $effect(() => {
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const estado = $derived(
    seleccion.length === 0
      ? 'El cielo completo'
      : seleccion.length === 1
        ? 'Una constelación'
        : 'Dos constelaciones',
  )
</script>

<main class="lienzo">
  <header class="cabecera">
    <h1>Constelación</h1>
    <p>Escuela de Posgrados · Facultad de Artes y Humanidades</p>
    <p class="meta">{totalCursos} cursos · {totalProgramas} programas</p>
  </header>

  <div class="cuerpo">
    <aside class="lateral">
      <ProgramPicker {seleccion} onToggle={alternar} />
    </aside>

    <div class="cielo-contenedor">
      <SkyStage {escena} {seleccion} etiquetas={marcas} />
    </div>
  </div>

  <footer class="pie">
    <div class="izquierda">
      {#if seleccion.length > 0}
        <Legend {seleccion} onQuitar={alternar} />
        <button class="limpiar" onclick={limpiar}>Volver al cielo</button>
      {:else}
        <span class="pista">Elige un programa: sus estrellas se reúnen y forman su figura.</span>
      {/if}
    </div>
    <span class="aviso">{estado}</span>
    <p class="vivo" aria-live="polite">{aviso}</p>
  </footer>
</main>

<style>
  .lienzo {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100dvh;
    padding: var(--sp-6) var(--sp-8) var(--sp-3);
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

  .cuerpo {
    display: grid;
    grid-template-columns: var(--w-picker) 1fr;
    gap: var(--sp-4);
    min-height: 0;
  }

  .lateral {
    min-height: 0;
  }

  .cielo-contenedor {
    position: relative;
    min-height: 0;
  }

  .pie {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: var(--sp-4);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--c-rule);
    font-size: var(--fz-11);
    color: var(--c-ink-3);
  }

  .izquierda {
    display: flex;
    align-items: baseline;
    gap: var(--sp-6);
    flex-wrap: wrap;
  }

  .pista {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-125);
  }

  .limpiar {
    font-family: var(--ff-sans);
    font-size: var(--fz-11);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    border-bottom: 1px solid var(--c-rule);
  }

  .limpiar:hover {
    color: var(--c-ink);
  }

  .aviso {
    font-family: var(--ff-sans);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .vivo {
    grid-column: 1 / -1;
    font-size: var(--fz-11);
    color: var(--c-ink-3);
    min-height: 1em;
  }

  @media (max-width: 900px) {
    .lienzo {
      height: auto;
      min-height: 100dvh;
      padding: var(--sp-4);
    }

    .cuerpo {
      grid-template-columns: 1fr;
      grid-template-rows: auto 60vh;
    }

    .pie {
      grid-template-columns: 1fr;
    }
  }
</style>
