<script lang="ts">
  import { curriculum } from '../data/types'
  import { figureNameOf } from '../domain/figures'
  import { vivoDe } from '../viz/palette'

  interface Props {
    seleccion: string[]
    onToggle: (id: string) => void
  }

  let { seleccion, onToggle }: Props = $props()

  interface Fila {
    id: string
    nombre: string
    nivel: 0 | 1 | 2
    figura: string | null
  }

  const filas = $derived.by(() => {
    const out: Fila[] = []
    const maestrias = Object.values(curriculum.programas).filter((p) => p.tipo === 'maestria')
    for (const m of maestrias) {
      out.push({ id: m.id, nombre: m.nombreCorto, nivel: 0, figura: figureNameOf(m.id) })
      const enfasis = Object.values(curriculum.programas).filter(
        (p) => p.tipo === 'enfasis' && p.padreId === m.id,
      )
      for (const e of enfasis) {
        out.push({ id: e.id, nombre: e.nombreCorto, nivel: 1, figura: figureNameOf(e.id) })
        const pes = Object.values(curriculum.programas).filter(
          (p) => p.tipo === 'programa_especializado' && p.padreId === e.id,
        )
        for (const pe of pes) {
          out.push({
            id: pe.id,
            nombre: pe.nombreCorto,
            nivel: 2,
            figura: figureNameOf(pe.id, e.id),
          })
        }
      }
    }
    return out
  })

  const indiceDe = (id: string) => seleccion.indexOf(id)
</script>

<nav class="selector" aria-label="Programas de la Escuela">
  <p class="cabecera">Programas</p>
  <ul>
    {#each filas as fila (fila.id)}
      {@const idx = indiceDe(fila.id)}
      {@const activo = idx >= 0}
      <li>
        <button
          class="fila nivel-{fila.nivel}"
          class:activo
          aria-pressed={activo}
          title={fila.figura ? `figura: ${fila.figura}` : ''}
          onclick={() => onToggle(fila.id)}
        >
          <svg class="punto" viewBox="0 0 8 8" aria-hidden="true">
            <circle
              cx="4"
              cy="4"
              r="3"
              fill={activo ? vivoDe(fila.id) : 'none'}
              stroke="var(--c-ink-3)"
              stroke-width="1"
            />
          </svg>
          <span class="nombre">{fila.nombre}</span>
          {#if activo}
            <span class="numero">{idx + 1}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
  <p class="nota">Máximo dos. La tercera apaga la primera.</p>
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
    font-size: var(--fz-11);
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

  .fila {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    width: 100%;
    padding: 5px var(--sp-2);
    border-radius: 2px;
    text-align: left;
    line-height: 1.2;
    color: var(--c-ink-2);
    transition: background-color var(--t-fast) var(--ease);
  }

  .fila:hover {
    background: var(--c-papel);
  }

  .nivel-0 {
    font-family: var(--ff-sans);
    font-size: var(--fz-125);
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--c-ink);
    margin-top: var(--sp-2);
  }

  .nivel-1 {
    font-family: var(--ff-serif);
    font-size: var(--fz-14);
    padding-left: var(--sp-4);
  }

  .nivel-2 {
    font-family: var(--ff-sans);
    font-size: var(--fz-11);
    padding-left: var(--sp-8);
    color: var(--c-ink-3);
  }

  .activo {
    color: var(--c-ink);
  }

  .activo .nombre {
    font-weight: 700;
  }

  .punto {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
  }

  .nombre {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .numero {
    margin-left: auto;
    font-family: var(--ff-sans);
    font-size: var(--fz-11);
    color: var(--c-ink-3);
  }

  .nota {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-11);
    color: var(--c-ink-3);
    padding-top: var(--sp-2);
    border-top: 1px solid var(--c-rule);
  }

  @media (max-width: 900px) {
    .selector {
      height: auto;
      max-height: 40vh;
      border-right: 0;
      border-bottom: 1px solid var(--c-rule);
      padding: 0 0 var(--sp-2);
    }
  }
</style>
