<script lang="ts">
  import { curriculum } from '../data/types'
  import { figureNameOf } from '../domain/figures'
  import { colorDe, vivoDe } from '../viz/palette'

  interface Props {
    seleccion: string[]
    onQuitar: (id: string) => void
  }

  let { seleccion, onQuitar }: Props = $props()

  const items = $derived(
    seleccion.map((id, i) => {
      const p = curriculum.programas[id]
      const figura = figureNameOf(id, p.padreId)
      return { id, nombre: p.nombreCorto, figura, color: colorDe(id, i), vivo: vivoDe(id) }
    }),
  )
</script>

{#if items.length > 0}
  <ul class="leyenda">
    {#each items as it, i (it.id)}
      <li>
        <svg class="marca" viewBox="0 0 18 2" aria-hidden="true"><line x1="0" y1="1" x2="18" y2="1" stroke={it.vivo} stroke-width="2" /></svg>
        <span class="nivel">{i + 1}</span>
        <span class="nombre">{it.nombre}</span>
        {#if it.figura}<span class="figura">· {it.figura}</span>{/if}
        <button class="quitar" onclick={() => onQuitar(it.id)} aria-label="Quitar {it.nombre}">×</button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .leyenda {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-4);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-family: var(--ff-sans);
    font-size: var(--fz-125);
  }

  .marca {
    width: 18px;
    height: 2px;
    align-self: center;
  }

  .nivel {
    font-size: var(--fz-11);
    color: var(--c-ink-3);
  }

  .nombre {
    font-weight: 700;
    color: var(--c-ink);
  }

  .figura {
    font-family: var(--ff-serif);
    font-style: italic;
    color: var(--c-ink-3);
  }

  .quitar {
    font-size: var(--fz-14);
    line-height: 1;
    color: var(--c-ink-3);
    padding: 0 var(--sp-1);
    align-self: center;
  }

  .quitar:hover {
    color: var(--c-ink);
  }
</style>
