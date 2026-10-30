<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { curriculum } from '../data/types'
  import { hijosDe } from '../domain/plan'
  import type { Nivel } from '../domain/niveles'
  import { marcaDe, vivoDe } from '../viz/palette'

  interface Props {
    nivel: Nivel
    seleccion: string[]
    cursoAbierto: string | null
    resaltado: string | null
    onToggle: (id: string) => void
    onCurso: (id: string) => void
  }

  let { nivel, seleccion, cursoAbierto, resaltado, onToggle, onCurso }: Props = $props()

  let lista = $state<HTMLUListElement | null>(null)

  // al pasar el cursor por el cielo, la lista va hasta esa fila
  $effect(() => {
    const id = resaltado
    if (!id || !lista) return
    const fila = lista.querySelector(`[data-curso="${CSS.escape(id)}"]`)
    fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })

  const maestrias = Object.values(curriculum.programas).filter((p) => p.tipo === 'maestria')
  const maestriaDe = (id: string) => curriculum.programas[id]?.maestriaId ?? id

  const abiertas = new SvelteSet<string>()

  $effect(() => {
    for (const id of seleccion) abiertas.add(maestriaDe(id))
  })

  interface Fila {
    clave: string
    tipo: 'maestria' | 'enfasis' | 'pe' | 'curso' | 'grupo'
    id: string
    nombre: string
    nivel: 0 | 1 | 2
    meta?: string
    familia: string
  }

  const filas = $derived.by(() => {
    const out: Fila[] = []

    if (nivel === 'curso') {
      // los del tronco, que no son de nadie en particular
      const escuela = Object.values(curriculum.cursos)
        .filter((c) => c.umbral && c.alcance === 'escuela')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      if (escuela.length) {
        out.push({ clave: 'g-escuela', tipo: 'grupo', id: 'escuela', nombre: 'Escuela', nivel: 0, familia: '' })
      }
      for (const c of escuela) {
        out.push({ clave: `escuela-${c.id}`, tipo: 'curso', id: c.id, nombre: c.nombre, nivel: 1, meta: `${c.codigo} · ${c.creditos} cr`, familia: '' })
      }

      for (const m of maestrias) {
        const cursos = Object.values(curriculum.cursos)
          .filter((c) => c.umbral && c.maestrias.length === 1 && c.maestrias[0] === m.nombreCorto)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        if (!cursos.length) continue
        out.push({ clave: `g-${m.id}`, tipo: 'grupo', id: m.id, nombre: m.nombreCorto, nivel: 0, familia: m.id })
        for (const c of cursos) {
          out.push({
            clave: `${m.id}-${c.id}`,
            tipo: 'curso',
            id: c.id,
            nombre: c.nombre,
            nivel: 1,
            meta: `${c.codigo} · ${c.creditos} cr`,
            familia: m.id,
          })
        }
      }
      return out
    }

    if (nivel === 'especializado') {
      for (const m of maestrias) {
        const pes = hijosDe(m.id).flatMap((h) =>
          Object.values(curriculum.programas).filter(
            (p) => p.tipo === 'programa_especializado' && p.padreId === h.id,
          ),
        )
        if (!pes.length) continue
        out.push({ clave: `g-${m.id}`, tipo: 'grupo', id: m.id, nombre: m.nombreCorto, nivel: 0, familia: m.id })
        for (const pe of pes) out.push({ clave: pe.id, tipo: 'pe', id: pe.id, nombre: pe.nombreCorto, nivel: 1, familia: m.id })
      }
      return out
    }

    if (nivel === 'maestria') {
      for (const m of maestrias) {
        const hijos = hijosDe(m.id)
        out.push({
          clave: m.id,
          tipo: 'maestria',
          id: m.id,
          nombre: m.nombreCorto,
          nivel: 0,
          meta: hijos.length ? `${hijos.length} énfasis` : 'plan único',
          familia: m.id,
        })
        if (!abiertas.has(m.id)) continue
        for (const e of hijos) {
          out.push({
            clave: e.id,
            tipo: 'enfasis',
            id: e.id,
            nombre: e.nombreCorto,
            nivel: 1,
            familia: m.id,
          })
        }
      }
      return out
    }

    return out
  })

  function alternarCarpeta(id: string) {
    if (abiertas.has(id)) abiertas.delete(id)
    else abiertas.add(id)
  }

  const titulo = $derived(
    nivel === 'curso'
      ? `Cursos umbrales · ${Object.values(curriculum.cursos).filter((c) => c.umbral).length}`
      : nivel === 'especializado'
        ? `Especializados · ${filas.filter((f) => f.tipo === 'pe').length}`
        : nivel === 'maestria'
          ? `Maestrías · ${maestrias.length}`
          : 'Doctorado',
  )
</script>

<nav class="selector" aria-label="Programas por escala">
  <p class="cabecera">{titulo}</p>

  {#if nivel === 'doctorado'}
    <p class="vacio">El doctorado aún no tiene tabla en el documento maestro. La escala existe; los datos no.</p>
  {:else}
    <ul bind:this={lista}>
      {#each filas as fila (fila.clave)}
        {#if fila.tipo === 'grupo'}
          <li><p class="grupo"><span class="marca {marcaDe(fila.id)}">{fila.nombre}</span></p></li>
        {:else}
          {@const activo = fila.tipo === 'curso' ? cursoAbierto === fila.id : seleccion[0] === fila.id}
          <li>
            <div class="fila">
              {#if fila.tipo === 'maestria'}
                <button
                  class="chevron"
                  aria-expanded={abiertas.has(fila.id)}
                  aria-label={abiertas.has(fila.id) ? `Cerrar ${fila.nombre}` : `Abrir ${fila.nombre}`}
                  onclick={() => alternarCarpeta(fila.id)}
                >
                  <svg viewBox="0 0 10 10" aria-hidden="true" class:girado={abiertas.has(fila.id)}>
                    <path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" stroke-width="1.2" />
                  </svg>
                </button>
              {:else}
                <span class="guion"></span>
              {/if}

              <button
                class="nombre"
                class:activo
                class:resaltada={resaltado === fila.id}
                data-curso={fila.tipo === 'curso' ? fila.id : undefined}
                aria-pressed={activo}
                onclick={() => (fila.tipo === 'curso' ? onCurso(fila.id) : onToggle(fila.id))}
              >
                <svg class="punto" viewBox="0 0 8 8" aria-hidden="true">
                  <circle
                    cx="4"
                    cy="4"
                    r="3"
                    fill={activo ? vivoDe(fila.familia) : 'none'}
                    stroke="var(--c-ink-3)"
                    stroke-width="1"
                  />
                </svg>
                <span class="texto">
                  {#if fila.tipo === 'maestria'}
                    <span class="marca {marcaDe(fila.id)}">{fila.nombre}</span>
                  {:else}
                    {fila.nombre}
                  {/if}
                  {#if fila.meta}<span class="meta">{fila.meta}</span>{/if}
                </span>
              </button>
            </div>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
</nav>

<style>
  .selector {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
    padding-right: 0;
  }

  .cabecera {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    padding-bottom: var(--sp-2);
  }

  .vacio {
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
    padding-top: var(--sp-2);
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

  .grupo {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.06em;
    color: var(--c-ink-2);
    padding: var(--sp-3) 0 var(--sp-1) 2px;
    border-bottom: 1px solid var(--c-rule);
    margin-bottom: 2px;
  }

  .fila {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-1);
    width: 100%;
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

  .guion {
    flex: 0 0 auto;
    width: 18px;
    height: 24px;
  }

  .nombre {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex: 1 1 auto;
    padding: 4px var(--sp-2) 4px 0;
    font-family: var(--ff-sans);
    font-size: var(--fz-sm);
    line-height: 1.25;
    color: var(--c-ink-2);
    text-align: left;
  }

  .nombre.activo .texto {
    color: var(--c-ink);
    font-weight: 600;
  }

  .nombre.resaltada {
    background: var(--c-papel);
  }

  .nombre.resaltada .texto {
    color: var(--c-ink);
  }

  .texto {
    display: flex;
    flex-direction: column;
    gap: 1px;
    line-height: 1.25;
  }

  .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    font-weight: 400;
    letter-spacing: 0.04em;
    color: var(--c-ink-3);
  }

  .punto {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    margin-top: 4px;
  }
</style>
