<script lang="ts">
  import { untrack } from 'svelte'
  import { curriculum } from '../data/types'
  import type { Escena } from '../domain/compose'
  import type { Foco, Nivel } from '../domain/niveles'
  import type { Punto } from '../domain/figures'
  import { polylinePath } from '../viz/geometry'
  import { envolventePath } from '../domain/hull'
  import { finDelPlan, planViaje, posicionEn, prefiereMenosMovimiento } from '../viz/motion'
  import { colorDe, marcaDe, radioDe } from '../viz/palette'
  import StarGlyph from './StarGlyph.svelte'

  interface Props {
    escena: Escena
    seleccion: string[]
    foco: Foco | null
    nivel: Nivel
    onHover: (cursoId: string | null) => void
    onHoverPrograma: (programaId: string | null) => void
    onElegir: (programaId: string) => void
    onAbrirCurso: (cursoId: string) => void
  }

  let { escena, seleccion, foco, nivel, onHover, onHoverPrograma, onElegir, onAbrirCurso }: Props = $props()

  const resaltado = $derived(foco?.tipo === 'curso' ? foco.id : null)
  const siluetaHover = $derived(foco?.tipo === 'programa' ? foco.id : null)

  /** Parte un nombre largo en líneas cortas para rotular una región sin desbordar. */
  function partirEtiqueta(texto: string, max = 26): string[] {
    const palabras = texto.split(' ')
    const lineas: string[] = []
    let actual = ''
    for (const palabra of palabras) {
      const prueba = actual ? `${actual} ${palabra}` : palabra
      if (prueba.length > max && actual) {
        lineas.push(actual)
        actual = palabra
      } else actual = prueba
    }
    if (actual) lineas.push(actual)
    return lineas
  }

  let pos = $state<Record<string, Punto>>({})
  let viajando = $state(false)
  let raf = 0

  const FAMILIA: Record<string, string> = {
    'mae-creacion': 'creacion',
    'mae-he': 'he',
    'mae-gepc': 'gepc',
    'mae-periodismo': 'perio',
    'mae-patrimonio': 'patrim',
  }

  function familiaDe(cursoId: string): string {
    const c = curriculum.cursos[cursoId]
    if (!c || c.alcance === 'escuela') return 'ink'
    for (const [id, fam] of Object.entries(FAMILIA)) {
      const p = curriculum.programas[id]
      if (c.maestrias.includes(p.nombreCorto)) return fam
    }
    return 'ink'
  }

  const colorEstrella = (en: string[]) => (en.length ? colorDe(en[0]) : 'var(--c-ink)')

  $effect(() => {
    const objetivo = new Map<string, Punto>(escena.estrellas.map((e) => [e.clave, [e.x, e.y] as Punto]))
    const desde = untrack(() => new Map<string, Punto>(Object.entries(pos) as [string, Punto][]))

    cancelAnimationFrame(raf)

    if (desde.size === 0 || prefiereMenosMovimiento()) {
      const directo: Record<string, Punto> = {}
      for (const [id, p] of objetivo) directo[id] = p
      pos = directo
      viajando = false
      return
    }

    const plan = planViaje(desde, objetivo)
    const fin = finDelPlan(plan)
    const t0 = performance.now()
    viajando = true

    const tick = () => {
      const ahora = performance.now() - t0
      const nuevo: Record<string, Punto> = {}
      for (const [id, v] of plan) nuevo[id] = posicionEn(v, ahora)
      pos = nuevo
      if (ahora < fin) raf = requestAnimationFrame(tick)
      else viajando = false
    }

    tick()
    return () => cancelAnimationFrame(raf)
  })

  const anillos = [180, 280, 380, 480, 580]
  const sinPrograma = $derived(seleccion.length === 0)
  /** En la escala del especializado el cielo se lee como fragmentos, no como nebulosa. */
  const enFragmento = $derived(sinPrograma && nivel === 'especializado')
  const enNebulosa = $derived(sinPrograma && !enFragmento)
</script>

<svg
  class="cielo"
  viewBox="0 0 {escena.ancho} {escena.alto}"
  role="img"
  aria-label="Universo de cursos de la Escuela: {escena.estrellas.length} cursos, {seleccion.length} programas seleccionados"
  preserveAspectRatio="xMidYMid meet"
>
  <g class="retícula" aria-hidden="true">
    {#each anillos as r}
      <ellipse cx={escena.ancho / 2} cy={escena.alto / 2} rx={r} ry={r * 0.86} />
    {/each}
    {#each Array.from({ length: 36 }, (_, i) => i * 10) as a}
      {@const t = (a * Math.PI) / 180}
      {@const cx = escena.ancho / 2}
      {@const cy = escena.alto / 2}
      <line
        x1={cx + Math.sin(t) * 600}
        y1={cy - Math.cos(t) * 516}
        x2={cx + Math.sin(t) * 616}
        y2={cy - Math.cos(t) * 530}
        class={a % 30 === 0 ? 'marca-fuerte' : 'marca'}
      />
    {/each}
  </g>

  <g class="regiones" class:ver={nivel === 'maestria'}>
    {#each escena.limites as l (l.programaId)}
      {@const p = curriculum.programas[l.programaId]}
      {@const arriba = l.puntos.reduce((a, q) => (q[1] < a[1] ? q : a), l.puntos[0])}
      {@const lineas = partirEtiqueta(p.nombreCorto)}
      {@const xEt = Math.min(Math.max(arriba[0], 110), escena.ancho - 110)}
      <path d={envolventePath(l.puntos)} fill="none" stroke={colorDe(l.programaId)} class="region" />
      <g
        class="rotulo-region"
        role="button"
        tabindex="0"
        aria-label="Ver {p.nombreCorto}"
        onmouseenter={() => onHoverPrograma(l.programaId)}
        onmouseleave={() => onHoverPrograma(null)}
        onclick={() => onElegir(l.programaId)}
        onkeydown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault()
            onElegir(l.programaId)
          }
        }}
      >
        <!-- área de clic del rótulo; el texto se dibuja arriba de todo -->
        <rect
          x={xEt - 90}
          y={arriba[1] - 24 - (lineas.length - 1) * 15}
          width="180"
          height={lineas.length * 15 + 4}
          fill="transparent"
        />
      </g>
    {/each}
  </g>

  {#if sinPrograma}
    <g class="selector-siluetas nivel-{nivel}" class:inactivas={nivel === 'curso'}>
      {#each escena.siluetas as s (s.programaId)}
        {@const objetivo = s.objetivo ?? s.programaId}
        {@const p = curriculum.programas[objetivo]}
        {@const bx = s.puntos.reduce((a, q) => a + q[0], 0) / s.puntos.length}
        {@const by = Math.max(...s.puntos.map((q) => q[1]))}
        {@const anchoEt = Math.max(72, p.nombreCorto.length * 7.4 + 22)}
        {@const etY = Math.min(by + 12, escena.alto - 26)}
        {@const etX = Math.min(Math.max(bx, anchoEt / 2 + 8), escena.ancho - anchoEt / 2 - 8)}
        <g
          class="silueta-selector"
          class:activa={nivel !== 'curso' && siluetaHover === objetivo}
          role="button"
          tabindex={nivel === 'curso' ? -1 : 0}
          aria-disabled={nivel === 'curso'}
          aria-label={`Ver ${p.nombreCorto}`}
          onmouseenter={() => nivel !== 'curso' && onHoverPrograma(objetivo)}
          onmouseleave={() => onHoverPrograma(null)}
          onfocus={() => nivel !== 'curso' && onHoverPrograma(objetivo)}
          onblur={() => onHoverPrograma(null)}
          onclick={() => nivel !== 'curso' && onElegir(objetivo)}
          onkeydown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault()
              onElegir(objetivo)
            }
          }}
        >
          <path d={polylinePath(s.puntos)} fill="transparent" stroke="none" class="zona" />
          <circle
            cx={s.puntos.reduce((a, q) => a + q[0], 0) / s.puntos.length}
            cy={s.puntos.reduce((a, q) => a + q[1], 0) / s.puntos.length}
            r="46"
            fill="transparent"
          />
          <path d={polylinePath(s.puntos)} fill="none" stroke={colorDe(objetivo)} />
        </g>
      {/each}
    </g>
  {/if}

  <g class="figuras">
    {#if escena.eje}
      <line
        x1={escena.eje[0][0]}
        y1={escena.eje[0][1]}
        x2={escena.eje[1][0]}
        y2={escena.eje[1][1]}
        stroke="var(--c-ink-3)"
        class="enlace"
        class:visible={!enNebulosa}
      />
    {/if}
    {#each escena.figuras as f (f.programaId)}
      {@const activa = foco?.tipo === 'programa' && foco.id === f.programaId}
      {@const nombreFig = curriculum.programas[f.programaId]?.nombreCorto ?? ''}
      {@const etiquetaFija = escena.figuras.length > 1}
      {#if escena.figuras.length > 1}
        <!-- una maestría con énfasis: cada figura es una puerta a su plan -->
        <g
          class="figura"
          class:activa
          role="button"
          tabindex="0"
          aria-label="Ver {curriculum.programas[f.programaId]?.nombreCorto ?? ''}"
          onmouseenter={() => onHoverPrograma(f.programaId)}
          onmouseleave={() => onHoverPrograma(null)}
          onfocus={() => onHoverPrograma(f.programaId)}
          onblur={() => onHoverPrograma(null)}
          onclick={() => onElegir(f.programaId)}
          onkeydown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault()
              onElegir(f.programaId)
            }
          }}
        >
          <path d={polylinePath(f.puntos)} fill="transparent" stroke="none" class="zona-figura" />
          <path
            d={polylinePath(f.puntos)}
            fill="none"
            stroke={colorDe(f.programaId)}
            class="silueta"
            class:visible={!enNebulosa}
          />
        </g>
      {:else}
        <path
          d={polylinePath(f.puntos)}
          fill="none"
          stroke={colorDe(f.programaId)}
          class="silueta"
          class:visible={!enNebulosa}
        />
      {/if}
    {/each}
  </g>

  <g class="estrellas">
    {#each escena.estrellas as e (e.clave)}
      {@const c = curriculum.cursos[e.cursoId]}
      {@const p = pos[e.clave] ?? [e.x, e.y]}
      {@const senalada = foco?.tipo === 'curso' && foco.id === e.cursoId}
      {@const r = enFragmento || !enNebulosa ? radioDe(c.nProgramas) : 6.6}
      {@const color = colorEstrella(e.en)}
      {#if e.estado !== 'oculto'}
        <g
          transform="translate({p[0]},{p[1]})"
          class="estrella"
          class:resaltada={senalada}
          class:apagada={!enNebulosa && e.estado === 'nebulosa'}
          class:inerte={enNebulosa && nivel !== 'curso'}
          role="button"
          tabindex={!enNebulosa || nivel === 'curso' ? 0 : -1}
          aria-disabled={enNebulosa && nivel !== 'curso'}
          aria-label="{c.nombre}, {c.creditos} créditos"
          onmouseenter={() => (!enNebulosa || nivel === 'curso') && onHover(e.cursoId)}
          onmouseleave={() => onHover(null)}
          onfocus={() => (!enNebulosa || nivel === 'curso') && onHover(e.cursoId)}
          onblur={() => onHover(null)}
          onclick={() => (!enNebulosa || nivel === 'curso') && onAbrirCurso(e.cursoId)}
          onkeydown={(ev) => {
            if ((ev.key === 'Enter' || ev.key === ' ') && (!enNebulosa || nivel === 'curso')) {
              ev.preventDefault()
              onAbrirCurso(e.cursoId)
            }
          }}
        >
          {#if senalada}
            <circle r={r * 2.6} class="halo" />
          {/if}
          <StarGlyph eje={c.eje} r={r} {color} />
        </g>
        <text
          x={p[0] + r + 7}
          y={p[1] - r - 2}
          class="código"
          class:visible={!viajando &&
            (!sinPrograma
              ? e.estado === 'figura' || e.estado === 'nucleo' || senalada
              : nivel === 'curso' && senalada)}
        >{c.codigo}</text>
      {/if}
    {/each}
  </g>

  <!-- rótulos: siempre encima de las estrellas -->
  <g class="rotulos">
    {#each escena.limites as l (l.programaId)}
      {#if nivel === 'maestria'}
        {@const p = curriculum.programas[l.programaId]}
        {@const arriba = l.puntos.reduce((a, q) => (q[1] < a[1] ? q : a), l.puntos[0])}
        {@const lineas = partirEtiqueta(p.nombreCorto)}
        {@const xEt = Math.min(Math.max(arriba[0], 110), escena.ancho - 110)}
        <g class="rotulo-region" role="button" tabindex="0" aria-label="Ver {p.nombreCorto}"
          onmouseenter={() => onHoverPrograma(l.programaId)}
          onmouseleave={() => onHoverPrograma(null)}
          onclick={() => onElegir(l.programaId)}
          onkeydown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onElegir(l.programaId) }
          }}>
          {#each lineas as linea, i (linea)}
            <rect
              x={xEt - (linea.length * 8.4 + 20) / 2}
              y={arriba[1] - 26 - (lineas.length - 1 - i) * 16}
              width={linea.length * 8.4 + 20}
              height="18"
              class="fondo-region {marcaDe(l.programaId)}"
            />
          {/each}
          {#each lineas as linea, i (linea)}
            <text x={xEt} y={arriba[1] - 13 - (lineas.length - 1 - i) * 16} class="nombre-region">{linea}</text>
          {/each}
        </g>
      {/if}
    {/each}

    {#each escena.siluetas as s (s.programaId)}
      {#if sinPrograma && siluetaHover === (s.objetivo ?? s.programaId) && nivel !== 'curso'}
        {@const p = curriculum.programas[s.objetivo ?? s.programaId]}
        {@const bx = s.puntos.reduce((a, q) => a + q[0], 0) / s.puntos.length}
        {@const by = Math.max(...s.puntos.map((q) => q[1]))}
        {@const anchoEt = Math.max(78, p.nombreCorto.length * 8.8 + 24)}
        {@const etX = Math.min(Math.max(bx, anchoEt / 2 + 8), escena.ancho - anchoEt / 2 - 8)}
        <g class="etiqueta">
          <rect
            x={etX - anchoEt / 2}
            y={Math.min(by + 12, escena.alto - 28)}
            width={anchoEt}
            height="26"
            class="fondo-figura-visible {marcaDe(s.programaId)}"
          />
          <text x={etX} y={Math.min(by + 12, escena.alto - 28) + 18} class="nombre-silueta">{p.nombreCorto}</text>
        </g>
      {/if}
    {/each}

    {#each escena.figuras as f (f.programaId)}
      {@const activa = foco?.tipo === 'programa' && foco.id === f.programaId}
      {#if activa}
        {@const nombre = curriculum.programas[f.programaId]?.nombreCorto ?? ''}
        {@const cx = f.puntos.reduce((a, q) => a + q[0], 0) / f.puntos.length}
        {@const abajo = Math.max(...f.puntos.map((q) => q[1]))}
        <rect
          x={cx - (nombre.length * 8.4 + 20) / 2}
          y={abajo + 8}
          width={nombre.length * 8.4 + 20}
          height="19"
          class="fondo-figura {marcaDe(f.programaId)}"
        />
        <text x={cx} y={abajo + 22} class="nombre-figura">{nombre}</text>
      {/if}
    {/each}
  </g>

</svg>

<style>
  .cielo {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .retícula ellipse {
    fill: none;
    stroke: var(--c-grid);
    stroke-width: var(--stroke-grid);
  }

  .marca,
  .marca-fuerte {
    stroke: var(--c-grid);
    stroke-width: 0.8;
  }

  .marca-fuerte {
    stroke-width: 1.4;
  }

  .enlace {
    stroke-width: var(--stroke-link);
    stroke-dasharray: 3 6;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .enlace.visible {
    opacity: 0.4;
  }

  .regiones {
    opacity: 0;
    transition: opacity var(--t-base) var(--ease);
  }

  .regiones.ver {
    opacity: 1;
  }

  .region {
    stroke-width: var(--stroke-region);
    stroke-dasharray: 6 6;
    opacity: 0.5;
  }

  .rotulo-region {
    cursor: pointer;
    outline: none;
  }

  .rotulo-region:hover .nombre-region {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .rotulo-region:focus-visible .fondo-region {
    stroke: var(--c-focus);
    stroke-width: 2;
  }

  .nombre-region {
    font-family: var(--ff-sans);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    fill: var(--c-ink);
    text-anchor: middle;
  }

  /* el relleno lo pone la clase hl-* de app.css, para no pisarla con el scope */

  .silueta-selector {
    cursor: pointer;
    outline: none;
  }

  .silueta-selector .zona {
    pointer-events: all;
  }

  .silueta-selector path:not(.zona) {
    stroke-width: 1.6;
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0.22;
    transition: opacity var(--t-fast) var(--ease), stroke-width var(--t-fast) var(--ease);
  }

  .silueta-selector.activa path:not(.zona),
  .silueta-selector:focus-visible path:not(.zona) {
    opacity: 0.85;
    stroke-width: 2.2;
  }

  .etiqueta {
    opacity: 0;
    transition: opacity var(--t-fast) var(--ease);
    pointer-events: none;
  }

  .nombre-silueta {
    font-family: var(--ff-sans);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.03em;
    fill: var(--c-ink);
    text-anchor: middle;
  }

  /* el relleno lo pone la clase hl-* de app.css, para no pisarla con el scope */

  .figura {
    cursor: pointer;
    outline: none;
  }

  .zona-figura {
    pointer-events: all;
  }

  .figura.activa .silueta {
    stroke-width: calc(var(--stroke-const) + 1.2);
    opacity: 1;
  }

  .figura:focus-visible .silueta {
    stroke: var(--c-focus);
  }

  .nombre-figura {
    font-family: var(--ff-sans);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    fill: var(--c-ink);
    text-anchor: middle;
    opacity: 0;
    transition: opacity var(--t-fast) var(--ease);
    pointer-events: none;
  }

  .nombre-figura.visible,
  .fondo-figura.visible,
  .etiqueta.visible {
    opacity: 1;
  }

  .fondo-figura,
  .fondo-figura-visible {
    opacity: 1;
  }

  .etiqueta {
    opacity: 1;
  }

  .silueta {
    stroke-width: var(--stroke-const);
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0;
    transition: opacity var(--d-move) var(--ease);
  }

  .silueta.visible {
    opacity: 0.5;
  }

  .punto-umbral {
    cursor: pointer;
    outline: none;
  }

  .punto-umbral.resaltada circle:last-of-type {
    stroke: var(--c-ink);
    stroke-width: 1.5;
  }

  .punto-umbral:focus-visible circle:last-of-type {
    stroke: var(--c-focus);
    stroke-width: 2;
  }

  .estrella {
    cursor: pointer;
    outline: none;
    opacity: 0.85;
    transition: opacity var(--t-fast) var(--ease);
  }

  .estrella.apagada {
    opacity: 0.13;
  }

  .estrella.inerte {
    cursor: default;
    pointer-events: none;
  }

  .estrella:focus-visible .halo {
    stroke: var(--c-focus);
  }

  .halo {
    fill: none;
    stroke: var(--c-ink);
    stroke-width: 1;
    opacity: 0.55;
  }

  .código {
    font-family: var(--ff-sans);
    font-size: 12px;
    letter-spacing: 0.08em;
    fill: var(--c-ink-2);
    opacity: 0;
    transition: opacity var(--t-base) var(--ease) 240ms;
    pointer-events: none;
  }

  .código.fragmento {
    font-size: 9.5px;
    fill: var(--c-ink-3);
  }

  .código.visible {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .silueta,
    .código,
    .enlace {
      transition: none;
    }
  }
</style>
