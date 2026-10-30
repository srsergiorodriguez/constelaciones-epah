<script lang="ts">
  /** Panel de depuración: ajusta los trazos del cielo sin tocar los tokens. */
  let constelacion = $state(3.8)
  let region = $state(2.2)

  const aplicar = (nombre: string, valor: number) =>
    document.documentElement.style.setProperty(nombre, String(valor))
</script>

<aside class="debug" aria-label="Ajustes de depuración">
  <p class="titulo">Depuración · trazos</p>

  <label>
    <span>Constelaciones <b>{constelacion.toFixed(1)}</b></span>
    <input
      type="range"
      min="0.6"
      max="6"
      step="0.2"
      bind:value={constelacion}
      oninput={() => {
        aplicar('--stroke-const', constelacion)
        aplicar('--stroke-silueta', constelacion * 0.68)
      }}
    />
  </label>

  <label>
    <span>Envolventes <b>{region.toFixed(1)}</b></span>
    <input
      type="range"
      min="0.4"
      max="4"
      step="0.2"
      bind:value={region}
      oninput={() => aplicar('--stroke-region', region)}
    />
  </label>
</aside>

<style>
  .debug {
    position: fixed;
    right: var(--sp-4);
    bottom: var(--sp-4);
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-3);
    background: var(--c-paper);
    border: 1px solid var(--c-rule);
    width: 220px;
  }

  .titulo {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-3);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-2);
  }

  b {
    font-weight: 700;
    color: var(--c-ink);
  }

  input {
    width: 100%;
    accent-color: var(--c-ink);
  }
</style>
