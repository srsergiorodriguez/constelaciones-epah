<script lang="ts">
  interface Props {
    texto: string
    x: number
    y: number
    clase: string
    marca: string
  }

  let { texto, x, y, clase, marca }: Props = $props()

  let nodo = $state<SVGTextElement | null>(null)
  let ancho = $state(0)

  // la marca se mide sobre el texto dibujado: nada de estimar por caracteres
  $effect(() => {
    if (nodo) ancho = nodo.getBBox().width + 18
  })
</script>

<rect x={x - ancho / 2} y={y - 14} width={ancho} height="18" class="fondo-etiqueta {marca}" />
<text bind:this={nodo} {x} {y} class={clase}>{texto}</text>

<style>
  /* el color lo pone la clase hl-* de app.css; aquí solo el aire */
  .fondo-etiqueta {
    rx: 1;
  }
</style>
