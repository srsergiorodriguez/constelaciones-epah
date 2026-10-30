<script lang="ts">
  import { curriculum } from './lib/data/types'
  import { compose, propiosOf } from './lib/domain/compose'
  import SkyStage from './lib/components/SkyStage.svelte'
  import ProgramPicker from './lib/components/ProgramPicker.svelte'
  import PlanPanel from './lib/components/PlanPanel.svelte'
  import { colorDe, vivoDe } from './lib/viz/palette'

  const ANCHO = 1200
  const ALTO = 900

  const desdeHash = (): string[] => {
    if (typeof location === 'undefined') return []
    const id = decodeURIComponent(location.hash.slice(1))
    return curriculum.programas[id] ? [id] : []
  }

  let seleccion = $state<string[]>(desdeHash())
  let aviso = $state('')
  let resaltado = $state<string | null>(null)

  const escena = $derived(compose(seleccion, ANCHO, ALTO))

  $effect(() => {
    const hash = seleccion.map(encodeURIComponent).join(',')
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
  })

  const maestrias = Object.values(curriculum.programas)
    .filter((p) => p.tipo === 'maestria')
    .map((p) => ({ id: p.id, nombre: p.nombreCorto, vivo: vivoDe(p.id) }))

  const totalCursos = Object.keys(curriculum.cursos).length
  const totalProgramas = Object.keys(curriculum.programas).length

  const actual = $derived.by(() => {
    const id = seleccion[0]
    if (!id) return null
    const p = curriculum.programas[id]
    const padre = p.padreId ? curriculum.programas[p.padreId] : null
    return {
      id,
      nombre: p.nombreCorto,
      padre: padre ? padre.nombreCorto : null,
      color: colorDe(id),
      propios: propiosOf(id).length,
    }
  })

  function alternar(id: string) {
    seleccion = seleccion[0] === id ? [] : [id]
    resaltado = null
    aviso = ''
  }

  function elegir(id: string) {
    seleccion = [id]
    resaltado = null
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
</script>

<main class="lienzo">
  <header class="cabecera">
    <div class="marca">
      <h1>
        <button class="titulo" onclick={limpiar} title="Volver al universo">Constelaciones</button>
      </h1>
      <p>Escuela de Posgrados · Facultad de Artes y Humanidades</p>
    </div>

    <div class="actual" aria-live="polite">
      {#if actual}
        <p class="programa">{actual.nombre}</p>
        <p class="detalle">
          {#if actual.padre}{actual.padre} · {/if}{actual.propios} cursos propios
        </p>
        <svg class="trazo" viewBox="0 0 60 4" aria-hidden="true">
          <line x1="0" y1="2" x2="60" y2="2" stroke={actual.color} stroke-width="3" />
        </svg>
      {:else}
        <p class="programa">El universo</p>
        <p class="detalle">{totalCursos} cursos · {totalProgramas} programas</p>
      {/if}
    </div>
  </header>

  <div class="cuerpo">
    <aside class="lateral">
      <ProgramPicker {seleccion} onToggle={alternar} />
    </aside>

    <div class="cielo-contenedor">
      <SkyStage
        {escena}
        {seleccion}
        {resaltado}
        onHover={(id) => (resaltado = id)}
        onElegir={elegir}
      />
    </div>

    {#if actual}
      <div class="lateral-derecho">
        <PlanPanel programaId={actual.id} {resaltado} onHover={(id) => (resaltado = id)} onElegir={elegir} />
      </div>
    {/if}
  </div>

  <footer class="pie">
    <div class="izquierda">
      {#if seleccion.length > 0}
        <button class="limpiar" onclick={limpiar}>Volver al universo</button>
      {:else}
        <span class="pista">Elige un programa en la lista o toca una silueta del universo.</span>
        <ul class="familias">
          {#each maestrias as m (m.id)}
            <li>
              <svg viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3.2" fill={m.vivo} /></svg>
              {m.nombre}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
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

  .cabecera {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: var(--sp-6);
  }

  .marca h1 {
    font-family: var(--ff-display);
    font-size: var(--fz-3xl);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  /* el título es el camino de vuelta al universo */
  .titulo {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-align: left;
    cursor: pointer;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }

  .titulo:hover {
    text-decoration: underline;
  }

  .marca p {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-md);
    color: var(--c-ink-3);
    margin-top: var(--sp-2);
  }

  .actual {
    text-align: right;
  }

  .programa {
    font-family: var(--ff-display);
    font-size: var(--fz-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.05;
    color: var(--c-ink);
  }

  .detalle {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    margin-top: var(--sp-1);
  }

  .trazo {
    display: block;
    margin: var(--sp-2) 0 0 auto;
    width: 60px;
    height: 4px;
  }

  .cuerpo {
    display: grid;
    grid-template-columns: var(--w-picker) 1fr;
    gap: var(--sp-6);
    min-height: 0;
  }

  .cuerpo:has(.lateral-derecho) {
    grid-template-columns: var(--w-picker) 1fr var(--w-sheet);
  }

  .lateral-derecho {
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
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-4);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--c-rule);
    font-size: var(--fz-xs);
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
    font-size: var(--fz-sm);
  }

  .limpiar {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    border-bottom: 1px solid var(--c-rule);
  }

  .limpiar:hover {
    color: var(--c-ink);
  }

  .vivo {
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
  }

  .familias {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .familias li {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
  }

  .familias svg {
    width: 8px;
    height: 8px;
  }

  @media (max-width: 900px) {
    .lienzo {
      height: auto;
      min-height: 100dvh;
      padding: var(--sp-4);
    }

    .cabecera {
      grid-template-columns: 1fr;
      gap: var(--sp-3);
    }

    .actual {
      text-align: left;
    }

    .trazo {
      margin-left: 0;
    }

    .cuerpo,
    .cuerpo:has(.lateral-derecho) {
      grid-template-columns: 1fr;
      grid-template-rows: auto 60vh auto;
    }
  }
</style>
