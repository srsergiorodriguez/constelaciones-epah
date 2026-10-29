<script lang="ts">
  import { curriculum } from '../data/types'
  import { figureNameOf } from '../domain/figures'
  import { hijosDe, periodosDe, planDe } from '../domain/plan'
  import { colorDe } from '../viz/palette'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    programaId: string
    resaltado: string | null
    onHover: (cursoId: string | null) => void
    onElegir: (programaId: string) => void
  }

  let { programaId, resaltado, onHover, onElegir }: Props = $props()

  const programa = $derived(curriculum.programas[programaId])
  const figura = $derived(figureNameOf(programaId, programa?.padreId ?? null))
  const color = $derived(colorDe(programaId))

  const plan = $derived(planDe(programaId))
  const periodos = $derived(periodosDe(plan))
  const hijos = $derived(hijosDe(programaId))

  const curso = (id: string) => curriculum.cursos[id]

  const nombrePeriodo = (n: number) => `${n}º periodo`
</script>

<aside class="panel" aria-label="Plan de estudios de {programa?.nombreCorto}">
  <header class="cabeza">
    <p class="tipo">{hijos.length > 0 ? 'Énfasis de la maestría' : 'Plan de estudios'}</p>
    <p class="meta">
      {#if hijos.length > 0}
        {hijos.length} rutas, una figura cada una
      {:else}
        {plan.length} casillas · {plan.reduce((a, c) => a + curso(c.cursoId).creditos, 0)} créditos{#if figura} · figura {figura}{/if}
      {/if}
    </p>
    <svg class="trazo" viewBox="0 0 120 4" aria-hidden="true">
      <line x1="0" y1="2" x2="120" y2="2" stroke={color} stroke-width="3" />
    </svg>
  </header>

  {#if hijos.length > 0}
    <p class="intro">Una maestría no tiene un plan único: tiene {hijos.length} énfasis.</p>
    <ul class="hijos">
      {#each hijos as h (h.id)}
        <li>
          <button class="hijo" onclick={() => onElegir(h.id)} onmouseenter={() => onHover(null)}>
            <span class="hijo-nombre">{h.nombreCorto}</span>
            <span class="hijo-meta">{planDe(h.id).length} casillas · {figureNameOf(h.id) ?? ''}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="plan">
      {#each periodos as p (p)}
        <section class="periodo">
          <h3>{nombrePeriodo(p)}</h3>
          <ul>
            {#each plan.filter((c) => c.periodo === p) as c (c.cursoId + c.columna)}
              {@const k = curso(c.cursoId)}
              <li>
                <button
                  class="casilla"
                  class:resaltada={resaltado === c.cursoId}
                  onmouseenter={() => onHover(c.cursoId)}
                  onmouseleave={() => onHover(null)}
                  onfocus={() => onHover(c.cursoId)}
                  onblur={() => onHover(null)}
                >
                  <svg class="glifo" viewBox="-12 -12 24 24" aria-hidden="true">
                    <StarGlyph eje={k.eje} r={5} color={color} />
                  </svg>
                  <span class="texto">
                    <span class="nombre">{k.nombre}</span>
                    <span class="meta">{k.codigo} · {k.creditos} cr{#if k.ofertaVariable} · oferta variable{/if}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {/if}
</aside>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    padding-left: var(--sp-4);
    border-left: 1px solid var(--c-rule);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--c-rule) transparent;
  }

  .cabeza {
    padding-bottom: var(--sp-3);
  }

  .tipo {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-3);
  }

  .meta {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
    margin-top: 2px;
  }

  .trazo {
    display: block;
    width: 100%;
    height: 4px;
    margin-top: var(--sp-2);
  }

  .intro {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
    padding: var(--sp-3) 0;
  }

  .hijos {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .hijo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--c-rule);
    text-align: left;
  }

  .hijo-nombre {
    font-family: var(--ff-serif);
    font-size: var(--fz-md);
    color: var(--c-ink);
  }

  .hijo-meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
    margin-top: 1px;
  }

  .hijo:hover .hijo-nombre {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .periodo {
    padding: var(--sp-3) 0 var(--sp-2);
    border-top: 1px solid var(--c-rule);
  }

  .periodo h3 {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    margin-bottom: var(--sp-1);
  }

  .periodo ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .casilla {
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: start;
    gap: var(--sp-2);
    width: 100%;
    padding: var(--sp-1) var(--sp-2) var(--sp-1) 0;
    border-radius: 2px;
    text-align: left;
    transition: background-color var(--t-fast) var(--ease);
  }

  .casilla:hover,
  .casilla.resaltada {
    background: var(--c-papel);
  }

  .glifo {
    width: 24px;
    height: 24px;
  }

  .texto {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .nombre {
    font-family: var(--ff-sans);
    font-size: var(--fz-sm);
    line-height: 1.2;
    color: var(--c-ink);
  }

  .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.04em;
    color: var(--c-ink-3);
  }

  @media (max-width: 1100px) {
    .panel {
      padding-left: 0;
      border-left: 0;
      border-top: 1px solid var(--c-rule);
      padding-top: var(--sp-3);
      height: auto;
      max-height: 46vh;
    }
  }
</style>
