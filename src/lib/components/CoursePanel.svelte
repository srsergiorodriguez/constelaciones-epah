<script lang="ts">
  import { curriculum } from '../data/types'
  import { hijosDe } from '../domain/plan'
  import { programasOf } from '../domain/graph'
  import { marcaDe } from '../viz/palette'
  import { desplazarAlFoco } from '../viz/scroll'
  import type { Foco } from '../domain/niveles'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    cursoId: string
    foco: Foco | null
    onCerrar: () => void
    onElegir: (programaId: string) => void
    onFoco: (programaId: string | null) => void
  }

  let { cursoId, foco, onCerrar, onElegir, onFoco }: Props = $props()

  const curso = $derived(curriculum.cursos[cursoId])

  let panel = $state<HTMLElement | null>(null)

  $effect(() => desplazarAlFoco(panel, foco))

  /** Escalones a los que este curso cuenta: especializado → énfasis → maestría. */
  const cadena = $derived.by(() => {
    const pes = Object.values(curriculum.programas).filter(
      (p) =>
        p.tipo === 'programa_especializado' &&
        curriculum.ofertas.some(
          (o) => o.programaId === p.id && o.cursoId === cursoId && o.obligatoriedad === 'obligatorio',
        ),
    )
    return pes.map((pe) => {
      const enfasis = pe.padreId ? curriculum.programas[pe.padreId] : null
      const maestria = enfasis?.padreId ? curriculum.programas[enfasis.padreId] : null
      return { pe, enfasis, maestria }
    })
  })

  const planes = $derived(programasOf(cursoId).map((id) => curriculum.programas[id]))
  const familias = $derived([...new Set(planes.map((p) => p.maestriaId).filter(Boolean))] as string[])
  /** Un curso del tronco no tiene familia: su marca es la neutra. */
  const familia = $derived(cadena.length > 0 ? (familias[0] ?? '') : '')
</script>

<aside class="panel" bind:this={panel} aria-label="Detalle del curso">
  <header>
    <div class="fila-curso">
      <svg class="glifo" viewBox="-12 -12 24 24" aria-hidden="true">
        <StarGlyph eje={curso.eje} r={7} color="var(--c-ink)" />
      </svg>
      <div>
        <p class="rotulo">{curso.codigo}</p>
        <h2>{curso.nombre}</h2>
      </div>
    </div>
    <p class="meta">
      {curso.creditos} créditos · {curso.formato}{#if curso.ofertaVariable} · oferta variable{/if}
    </p>
    <svg class="trazo" viewBox="0 0 120 4" aria-hidden="true">
      <line x1="0" y1="2" x2="120" y2="2" stroke="var(--c-ink)" stroke-width="3" />
    </svg>
    <button class="cerrar" onclick={onCerrar}>Cerrar detalle</button>
  </header>

  {#if cadena.length > 0}
    <section>
      <h3 class="marca {marcaDe(familia)}">Cuenta para</h3>
      {#each cadena as c (c.pe.id)}
        <ol class="escalera">
          <li>
            <button class="escalon" onclick={() => onElegir(c.pe.id)}>
              <span class="nivel">12 cr</span>
              <span class="nombre">{c.pe.nombreCorto}</span>
            </button>
          </li>
          {#if c.enfasis}
            <li>
              <button class="escalon" onclick={() => onElegir(c.enfasis!.id)}>
                <span class="nivel">36 cr</span>
                <span class="nombre">{c.enfasis.nombreCorto}</span>
              </button>
            </li>
          {/if}
          {#if c.maestria}
            <li>
              <button class="escalon" onclick={() => onElegir(c.maestria!.id)}>
                <span class="nivel">título</span>
                <span class="nombre">{c.maestria.nombreCorto}</span>
              </button>
            </li>
          {/if}
        </ol>
      {/each}
    </section>
  {:else}
    <section>
      <h3 class="marca {marcaDe(familia)}">Cuenta para</h3>
      <p class="nota">
        Es un curso del tronco: cuenta para cualquier plan de la Escuela, pero no forma cuerpo de
        especialización.
      </p>
    </section>
  {/if}

  <section>
    <h3>Planes que lo incluyen</h3>
    <ul class="planes">
      {#each planes as p (p.id)}
        <li>
          <button
            class="plan"
            class:resaltada={foco?.id === p.id}
            data-foco={p.id}
            onclick={() => onElegir(p.id)}
            onmouseenter={() => onFoco(p.id)}
            onmouseleave={() => onFoco(null)}
            onfocus={() => onFoco(p.id)}
            onblur={() => onFoco(null)}
          >
            <span class="nombre">{p.nombreCorto}</span>
            <span class="meta">{p.tipo === 'enfasis' ? 'énfasis' : 'maestría'}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
</aside>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 0;
    height: 100%;
    padding-left: var(--sp-4);
    border-left: 1px solid var(--c-rule);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--c-rule) transparent;
  }

  .fila-curso {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
  }

  .glifo {
    width: 24px;
    height: 24px;
    margin-top: 2px;
  }


  h2 {
    font-family: var(--ff-display);
    font-size: var(--fz-lg);
    font-weight: 700;
    line-height: 1.15;
    margin-top: 2px;
  }

  .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    margin-top: var(--sp-2);
  }

  .trazo {
    display: block;
    width: 100%;
    height: 4px;
    margin-top: var(--sp-2);
  }

  .cerrar {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    border-bottom: 1px solid var(--c-rule);
    margin-top: var(--sp-2);
  }

  .cerrar:hover {
    color: var(--c-ink);
  }

  h3 {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-2);
    font-weight: 600;
    margin-bottom: var(--sp-2);
    padding-top: var(--sp-2);
    border-top: 1px solid var(--c-rule);
    display: inline-block;
  }

  .escalera {
    list-style: none;
    margin: 0;
    padding: 0 0 0 var(--sp-3);
    border-left: 1px solid var(--c-rule);
  }

  .escalon {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    width: 100%;
    padding: var(--sp-1) 0;
    text-align: left;
  }

  .nivel {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
    min-width: 44px;
  }

  .escalon .nombre {
    font-family: var(--ff-serif);
    font-size: var(--fz-sm);
    color: var(--c-ink);
  }

  .escalon:hover .nombre {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .nota {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
  }

  .planes {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .plan {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-2);
    width: 100%;
    padding: var(--sp-1) 0;
    text-align: left;
    border-bottom: 1px solid var(--c-rule);
  }

  .plan .nombre {
    font-family: var(--ff-serif);
    font-size: var(--fz-sm);
    color: var(--c-ink);
  }

  .plan .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    text-transform: none;
    letter-spacing: 0.04em;
    margin: 0;
  }

  .plan.resaltada {
    background: var(--c-papel);
  }

  .plan:hover .nombre {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
