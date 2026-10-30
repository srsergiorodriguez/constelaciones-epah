<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { curriculum } from '../data/types'
  import { figureNameOf } from '../domain/figures'
  import { marcaDe, vivoDe } from '../viz/palette'

  interface Props {
    seleccion: string[]
    onToggle: (id: string) => void
  }

  let { seleccion, onToggle }: Props = $props()

  const maestrias = Object.values(curriculum.programas).filter((p) => p.tipo === 'maestria')

  const enfasisDe = (id: string) =>
    Object.values(curriculum.programas).filter((p) => p.tipo === 'enfasis' && p.padreId === id)

  const peDe = (id: string) =>
    Object.values(curriculum.programas).filter((p) => p.tipo === 'programa_especializado' && p.padreId === id)

  const abiertas = new SvelteSet<string>()

  // la maestría de un programa elegido se abre sola
  $effect(() => {
    for (const id of seleccion) {
      const p = curriculum.programas[id]
      const raiz = p.tipo === 'maestria' ? p.id : (p.maestriaId ?? p.padreId)
      if (raiz) abiertas.add(raiz)
    }
  })

  function alternarCarpeta(id: string) {
    if (abiertas.has(id)) abiertas.delete(id)
    else abiertas.add(id)
  }

  const indiceDe = (id: string) => seleccion.indexOf(id)
</script>

<nav class="selector" aria-label="Programas de la Escuela">
  <p class="cabecera">Programas</p>
  <ul>
    {#each maestrias as m (m.id)}
      {@const abierta = abiertas.has(m.id)}
      {@const idx = indiceDe(m.id)}
      <li class="grupo">
        <div class="fila maestria" class:activo={idx >= 0}>
          <button
            class="chevron"
            aria-expanded={abierta}
            aria-label={abierta ? `Cerrar ${m.nombreCorto}` : `Abrir ${m.nombreCorto}`}
            onclick={() => alternarCarpeta(m.id)}
          >
            <svg viewBox="0 0 10 10" aria-hidden="true" class:girado={abierta}>
              <path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" stroke-width="1.2" />
            </svg>
          </button>
          <button class="nombre" aria-pressed={idx >= 0} onclick={() => onToggle(m.id)}>
            <svg class="punto" viewBox="0 0 8 8" aria-hidden="true">
              <circle
                cx="4"
                cy="4"
                r="3"
                fill={idx >= 0 ? vivoDe(m.id) : 'none'}
                stroke="var(--c-ink-3)"
                stroke-width="1"
              />
            </svg>
            <span class="marca {marcaDe(m.id)}">{m.nombreCorto}</span>
          </button>
        </div>

        {#if abierta}
          <ul class="hijos">
            {#each enfasisDe(m.id) as e (e.id)}
              {@const ie = indiceDe(e.id)}
              <li>
                <button class="fila enfasis" class:activo={ie >= 0} aria-pressed={ie >= 0} onclick={() => onToggle(e.id)}>
                  <span class="guion"></span>
                  <span class="texto">{e.nombreCorto}</span>
                </button>
              </li>
              {#each peDe(e.id) as pe (pe.id)}
                {@const ip = indiceDe(pe.id)}
                <li>
                  <button class="fila pe" class:activo={ip >= 0} aria-pressed={ip >= 0} onclick={() => onToggle(pe.id)}>
                    <span class="guion corto"></span>
                    <span class="texto">{pe.nombreCorto}</span>
                  </button>
                </li>
              {/each}
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
</nav>

<style>
  .selector {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    padding-right: var(--sp-4);
    border-right: 1px solid var(--c-rule);
  }

  .cabecera {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    padding-bottom: var(--sp-2);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0 var(--sp-1) var(--sp-4) 0;
    overflow-y: auto;
    min-height: 0;
    flex: 1 1 auto;
    scrollbar-width: thin;
    scrollbar-color: var(--c-rule) transparent;
  }

  .grupo + .grupo {
    margin-top: 2px;
  }

  .fila {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    width: 100%;
    text-align: left;
    line-height: 1.2;
    color: var(--c-ink-2);
    border-radius: 2px;
    transition: background-color var(--t-fast) var(--ease);
  }

  .maestria {
    gap: 0;
  }

  .chevron {
    flex: 0 0 auto;
    width: 18px;
    height: 24px;
    display: grid;
    place-items: center;
    color: var(--c-ink-3);
  }

  .chevron svg {
    width: 10px;
    height: 10px;
    transition: transform var(--t-fast) var(--ease);
  }

  .chevron svg.girado {
    transform: rotate(90deg);
  }

  .nombre {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex: 1 1 auto;
    padding: 4px var(--sp-2) 4px 0;
    font-family: var(--ff-sans);
    font-size: var(--fz-sm);
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--c-ink);
    text-align: left;
  }

  .hijos {
    padding: 0 0 var(--sp-1) 0;
    overflow: visible;
  }

  .enfasis,
  .pe {
    padding: 4px var(--sp-2) 4px 22px;
    font-family: var(--ff-serif);
    font-size: var(--fz-md);
  }

  .pe {
    padding-left: 34px;
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
  }

  .texto {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fila:hover {
    background: var(--c-papel);
  }

  .activo {
    color: var(--c-ink);
  }

  .activo .texto {
    font-weight: 700;
  }

  .punto {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid var(--c-ink-3);
  }

  .punto.lleno {
    background: var(--c-ink);
    border-color: transparent;
  }

  @media (max-width: 900px) {
    .selector {
      height: auto;
      max-height: 38vh;
      border-right: 0;
      border-bottom: 1px solid var(--c-rule);
      padding: 0 0 var(--sp-2);
    }
  }
</style>
