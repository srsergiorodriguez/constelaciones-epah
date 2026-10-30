<script lang="ts">
  import { curriculum } from '../data/types'
  import { hijosDe, periodosDe, planDe } from '../domain/plan'
  import { colorDe, marcaDe } from '../viz/palette'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    programaId: string
    resaltado: string | null
    onHover: (cursoId: string | null) => void
    onElegir: (programaId: string) => void
  }

  let { programaId, resaltado, onHover, onElegir }: Props = $props()

  const programa = $derived(curriculum.programas[programaId])
  const color = $derived(colorDe(programaId))
  const marca = $derived(marcaDe(programaId))
  const plan = $derived(planDe(programaId))
  const periodos = $derived(periodosDe(plan))
  const hijos = $derived(hijosDe(programaId))
  const abiertas = $derived(plan.filter((c) => c.cursoId === null).length)
  const creditos = $derived(
    plan.reduce((a, c) => a + (c.cursoId ? curriculum.cursos[c.cursoId].creditos : 3), 0),
  )

  let panel = $state<HTMLElement | null>(null)

  $effect(() => {
    const id = resaltado
    if (!id || !panel) return
    const fila = panel.querySelector(`[data-curso="${CSS.escape(id)}"]`)
    fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })

  const curso = (id: string) => curriculum.cursos[id]
  const nombrePeriodo = (n: number) => `${n}º periodo`
</script>

<aside class="panel" bind:this={panel} aria-label="Plan de estudios de {programa?.nombreCorto}">
  <header class="cabeza">
    <p class="tipo">{hijos.length > 0 ? 'Plan común de la maestría' : 'Plan de estudios'}</p>
    <p class="meta">
      {plan.length} casillas · {creditos} créditos{#if abiertas} · {abiertas} abiertas{/if}
    </p>
    <svg class="trazo" viewBox="0 0 120 4" aria-hidden="true">
      <line x1="0" y1="2" x2="120" y2="2" stroke={color} stroke-width="3" />
    </svg>
  </header>

  <div class="plan">
    {#each periodos as p (p)}
      <section class="periodo">
        <h3><span class="marca {marca}">{nombrePeriodo(p)}</span></h3>
        <ul>
          {#each plan.filter((c) => c.periodo === p) as c (c.periodo + '-' + c.columna)}
            <li>
              {#if c.cursoId}
                {@const k = curso(c.cursoId)}
                <button
                  class="casilla"
                  class:resaltada={resaltado === c.cursoId}
                  data-curso={c.cursoId}
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
              {:else}
                <div class="casilla abierta">
                  <svg class="glifo" viewBox="-12 -12 24 24" aria-hidden="true">
                    <circle r="6" fill="none" stroke="var(--c-ink-3)" stroke-width="1" stroke-dasharray="2 2" />
                  </svg>
                  <span class="texto">
                    <span class="nombre">{c.abierta}</span>
                    <span class="meta">casilla abierta · curso del énfasis</span>
                  </span>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>

  {#if hijos.length > 0}
    <section class="con-enfasis">
      <h3>Si eliges un énfasis</h3>
      <p class="intro">
        La misma maestría, con {hijos.length} figuras posibles. Cada una llena las casillas abiertas.
      </p>
      <ul class="hijos">
        {#each hijos as h (h.id)}
          <li>
            <button class="hijo" onclick={() => onElegir(h.id)} onmouseenter={() => onHover(null)}>
              <span class="hijo-nombre">{h.nombreCorto}</span>
              <span class="hijo-meta">{planDe(h.id).length} casillas</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
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

  .periodo {
    padding: var(--sp-3) 0 var(--sp-2);
    border-top: 1px solid var(--c-rule);
  }

  .periodo h3,
  .con-enfasis h3 {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-2);
    margin-bottom: var(--sp-2);
    font-weight: 600;
  }

  .con-enfasis h3 {
    color: var(--c-ink-3);
    font-weight: 400;
  }

  .periodo ul,
  .hijos {
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

  .abierta {
    cursor: default;
    opacity: 0.72;
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

  .abierta .nombre {
    font-family: var(--ff-serif);
    font-style: italic;
  }

  .casilla .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.04em;
    color: var(--c-ink-3);
  }

  .con-enfasis {
    padding-top: var(--sp-3);
    border-top: 1px solid var(--c-rule);
  }

  .intro {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
    padding: var(--sp-2) 0;
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
