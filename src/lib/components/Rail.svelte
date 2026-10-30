<script lang="ts">
  import { escalones, type Nivel } from '../domain/niveles'
  import { marcaDe } from '../viz/palette'

  interface Props {
    nivel: Nivel
    onNivel: (n: Nivel) => void
    programaId: string | null
  }

  let { nivel, onNivel, programaId }: Props = $props()

  const pasos = $derived(escalones())
</script>

<nav class="rail" aria-label="Escala de entrada">
  {#each pasos as paso (paso.nivel)}
    <button
      class="paso"
      class:activo={nivel === paso.nivel}
      class:marca={programaId ? marcaDe(programaId) : ''}
      disabled={!paso.activo}
      aria-current={nivel === paso.nivel ? 'step' : undefined}
      title={paso.activo ? `${paso.etiqueta} · ${paso.cuenta}` : paso.detalle}
      onclick={() => onNivel(paso.nivel)}
    >
      <span class="credito">{paso.credito}</span>
      <span class="punto" aria-hidden="true"></span>
      <span class="texto">{paso.etiqueta}</span>
    </button>
  {/each}
</nav>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0;
    position: relative;
    padding: 0 0 var(--sp-2) 2px;
    border-bottom: 1px solid var(--c-rule);
    flex: 0 0 auto;
  }

  /* la línea que une los pasos: es una escala, no una decoración */
  .rail::before {
    content: '';
    position: absolute;
    left: 33px;
    top: 14px;
    bottom: 14px;
    width: 1px;
    background: var(--c-rule);
  }

  .paso {
    display: grid;
    grid-template-columns: 24px 10px 1fr;
    align-items: center;
    gap: var(--sp-2);
    padding: 3px 0;
    text-align: left;
    color: var(--c-ink-3);
    position: relative;
  }

  .paso:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .credito {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    text-align: right;
    letter-spacing: 0.02em;
  }

  .punto {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1px solid var(--c-ink-3);
    background: var(--c-paper);
    z-index: 1;
  }

  .texto {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .paso:hover:not(:disabled) .texto {
    color: var(--c-ink);
  }

  .activo {
    color: var(--c-ink);
  }

  .activo .punto {
    background: var(--c-ink);
    border-color: transparent;
  }

  .activo .texto {
    font-weight: 700;
  }

  @media (max-width: 900px) {
    .rail {
      flex-direction: row;
      gap: var(--sp-4);
      padding: 0;
    }

    .rail::before {
      left: 14px;
      right: 14px;
      top: 50%;
      bottom: auto;
      width: auto;
      height: 1px;
    }

    .paso {
      grid-template-columns: auto auto;
      gap: var(--sp-1);
    }

    .credito {
      display: none;
    }

    .texto {
      font-size: var(--fz-xs);
    }
  }
</style>
