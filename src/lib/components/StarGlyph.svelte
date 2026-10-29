<script lang="ts">
  import type { Eje } from '../data/types'
  import { polygonPath, sparklePath } from '../viz/geometry'

  interface Props {
    eje: Eje
    r: number
    color: string
  }

  let { eje, r, color }: Props = $props()

  const sparkle = $derived(sparklePath(r * 1.2))
  const sparkleHueco = $derived(sparklePath(r * 1.18, 0.09))
  const rosa = $derived(polygonPath(r * 1.4, 8, 0.34))
  const seis = $derived(polygonPath(r * 1.3, 6, 0.44))
</script>

{#if eje === 'tronco'}
  <path d={rosa} fill="var(--c-ink)" />
{:else if eje === 'transversal'}
  <circle r={r * 1.62} fill="none" stroke="var(--c-ink)" stroke-width="1" />
  <path d={sparklePath(r * 0.58)} fill="var(--c-ink)" />
{:else if eje === 'laboratorio'}
  <circle r={r * 1.5} fill="none" stroke="var(--c-ink)" stroke-width="1" />
{:else if eje === 'electiva'}
  <path d={sparkleHueco} fill="none" stroke="var(--c-ink)" stroke-width="1.15" />
{:else if eje === 'trayectoria'}
  <path d={seis} fill={color} />
{:else}
  <path d={sparkle} fill={color} />
{/if}
