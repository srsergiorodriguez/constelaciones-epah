<script lang="ts">
  import { marcaDe } from '../lib/viz/palette'

  type Tabla = 'enfasis' | 'especializados' | 'cursos' | 'planes' | 'cuerpos' | 'estructura'

  interface Fuente {
    estructura: any[]
    programas: any[]
    cursos: Record<string, any>
    planes: any[]
    marco: Record<string, any>
    cuerpos: Record<string, { nombre?: string; cursos: string[] }>
  }

  let datos = $state<Fuente | null>(null)
  const desdeUrl = new URLSearchParams(location.search).get('p') as Tabla | null
  let pestana = $state<Tabla>(
    desdeUrl && ['enfasis', 'especializados', 'cursos', 'planes', 'cuerpos', 'estructura'].includes(desdeUrl)
      ? desdeUrl
      : 'enfasis',
  )
  let cargando = $state(true)
  let guardando = $state(false)
  let salida = $state('')
  let fallo = $state(false)
  let planElegido = $state('')
  let planComun = $state('')
  let maestriaNueva = $state('')
  let maestriaFiltro = $state('todas')
  let maestriaCurso = $state('todas')
  let ejeCurso = $state('todos')
  let busqueda = $state('')
  let nombrePE = $state('')

  /* Dos niveles: lo que se crea (contenidos) y cómo se organiza (estructuras).
     La estructura fija solo se consulta. */
  const grupos: { nombre: string; pestanas: { id: Tabla; nombre: string }[] }[] = [
    {
      nombre: 'Contenidos',
      pestanas: [
        { id: 'enfasis', nombre: 'Énfasis' },
        { id: 'especializados', nombre: 'Especializados' },
        { id: 'cursos', nombre: 'Cursos' },
      ],
    },
    {
      nombre: 'Estructuras',
      pestanas: [
        { id: 'planes', nombre: 'Planes' },
        { id: 'cuerpos', nombre: 'Cuerpos' },
      ],
    },
    { nombre: 'Referencia', pestanas: [{ id: 'estructura', nombre: 'Estructura fija' }] },
  ]

  async function cargar() {
    cargando = true
    const res = await fetch('/api/fuente')
    datos = await res.json()
    planElegido = datos?.planes?.[0]?.id ?? ''
    maestriaNueva = datos?.estructura?.find((e: any) => e.tipo === 'maestria')?.id ?? ''
    cargando = false
  }

  async function guardar() {
    if (!datos) return
    guardando = true
    salida = ''
    fallo = false
    await fetch('/api/fuente', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const res = await fetch('/api/compilar', { method: 'POST' })
    const r = await res.json()
    salida = r.salida ?? ''
    fallo = !r.ok
    guardando = false
  }

  $effect(() => {
    cargar()
  })

  const cursos = $derived(
    datos ? Object.entries(datos.cursos).sort(([a], [b]) => a.localeCompare(b)) : [],
  )
  const programas = $derived(
    datos ? [...datos.programas].sort((a, b) => a.id.localeCompare(b.id)) : [],
  )
  /** Un solo filtro de maestría para toda la sesión: elegirla acota énfasis y planes. */
  const planesFiltrados = $derived(
    (datos?.planes ?? []).filter(
      (p) =>
        maestriaFiltro === 'todas' ||
        (datos?.programas.find((x) => x.id === p.id)?.padre_id ?? '') === maestriaFiltro,
    ),
  )
  const marcosFiltrados = $derived(
    Object.keys(datos?.marco ?? {}).filter(
      (m) => maestriaFiltro === 'todas' || m === maestriaFiltro,
    ),
  )
  const plan = $derived(datos?.planes.find((p) => p.id === planElegido) ?? null)
  const esComun = $derived(planComun !== '')
  const filasComun = $derived(esComun ? (datos?.marco?.[planComun] ?? null) : null)

  // si el filtro deja fuera el plan elegido, se pasa al primero que quede
  $effect(() => {
    if (!planesFiltrados.length) return
    if (!planesFiltrados.some((p) => p.id === planElegido)) planElegido = planesFiltrados[0].id
  })
  const maestrias = $derived(programas.filter((p) => p.tipo === 'maestria'))

  /** Una casilla del plan marco: curso, o casilla abierta con su etiqueta. */
  const esCurso = (c: any) => typeof c === 'string'
  const celdaMarco = (m: string, i: number, j: number) => datos!.marco[m][i][j]

  function ponerMarco(m: string, i: number, j: number, valor: any) {
    datos!.marco[m][i][j] = valor
  }

  const maestriasFijas = $derived(datos?.estructura.filter((e) => e.tipo === 'maestria') ?? [])
  /** El énfasis se nombra por su nombre corto; el id queda como dato secundario. */
  const nombreDe = (id: string) =>
    datos?.programas.find((p) => p.id === id)?.nombre_corto ??
    datos?.estructura.find((p: any) => p.id === id)?.nombre_corto ??
    id

  /** A qué maestrías pertenece cada curso, según los planes donde aparece. */
  const membresia = $derived.by(() => {
    const mapa = new Map<string, Set<string>>()
    const marcar = (cursoId: string, maestriaId: string | null | undefined) => {
      if (!cursoId || !maestriaId) return
      const set = mapa.get(cursoId) ?? new Set<string>()
      set.add(maestriaId)
      mapa.set(cursoId, set)
    }
    const maestriaDePlan = (planId: string) => {
      const prog =
        datos?.programas.find((p) => p.id === planId) ?? datos?.estructura.find((p: any) => p.id === planId)
      return prog?.maestria_id ?? prog?.padre_id ?? null
    }
    for (const plan of datos?.planes ?? []) {
      const mid = maestriaDePlan(plan.id)
      for (const slot of plan.slots.flat()) marcar(slot.id, mid)
    }
    for (const [mid, filas] of Object.entries(datos?.marco ?? {})) {
      for (const fila of filas as any[]) {
        for (const celda of fila) if (typeof celda === 'string') marcar(celda, mid)
      }
    }
    return mapa
  })

  const cursosFiltrados = $derived(
    cursos.filter(([id, c]) => {
      if (ejeCurso !== 'todos' && c.eje !== ejeCurso) return false
      if (maestriaCurso !== 'todas' && !membresia.get(id)?.has(maestriaCurso)) return false
      if (busqueda) {
        const t = busqueda.toLowerCase()
        if (!c.nombre.toLowerCase().includes(t) && !id.includes(t)) return false
      }
      return true
    }),
  )

  const todosEnfasis = $derived(programas.filter((p) => p.tipo === 'enfasis'))

  /** Los especializados no están en la fuente: se derivan de las casillas `pe`. */
  const especializados = $derived(
    Object.entries(datos?.cuerpos ?? {}).map(([id, entrada]) => {
      const cuerpo = entrada.cursos ?? []
      const enfasis = todosEnfasis.find((e) => `pe-${e.id.replace(/^enf-/, '')}` === id)
      const nombre =
        enfasis?.nombre_corto.replace('Énfasis en ', 'Programa Especializado en ') ??
        (entrada as any).nombre ??
        id
      return { id, nombre_corto: nombre, cuerpo }
    }),
  )

  const enfasis = $derived(
    maestriaFiltro === 'todas'
      ? todosEnfasis
      : todosEnfasis.filter((p) => p.padre_id === maestriaFiltro),
  )
  const versionCorta = (n: string) => n.replace(/^Énfasis en /, '')

  /** Un énfasis nuevo nace con su plan vacío: el compilador no deja publicarlo
   *  hasta que las doce casillas tengan curso. */
  function nuevoEnfasis() {
    if (!datos) return
    const maestria = maestriasFijas.find((m) => m.id === maestriaNueva) ?? maestriasFijas[0]
    if (!maestria) return
    const n = enfasis.length + 1
    const id = `enf-${maestria.id.replace('mae-', '')}-nuevo-${n}`
    datos.programas.push({
      id,
      nombre: `${maestria.nombre} — Énfasis en Nuevo ${n}`,
      nombre_corto: `Énfasis en Nuevo ${n}`,
      tipo: 'enfasis',
      padre_id: maestria.id,
      maestria_id: maestria.id,
      creditos: 36,
      estado: 'borrador',
    })
    datos.planes.push({
      id,
      slots: [0, 1, 2, 3].map(() => [0, 1, 2].map(() => ({ id: '' }))),
    })
    planElegido = id
  }

  function borrarEnfasis(id: string) {
    if (!datos) return
    if (!confirm(`¿Borrar ${id} y su plan?`)) return
    datos.programas = datos.programas.filter((p) => p.id !== id)
    datos.planes = datos.planes.filter((p) => p.id !== id)
    delete datos.cuerpos[id]
  }

  function nuevoCurso() {
    if (!datos) return
    const n = Object.keys(datos.cursos).length + 1
    datos.cursos[`cur-nuevo-${n}`] = {
      nombre: `Curso nuevo ${n}`,
      eje: 'disciplinar',
      formato: 'curso',
      creditos: 3,
    }
  }

  function nuevoEspecializado() {
    if (!datos) return
    const n = Object.keys(datos.cuerpos).length + 1
    const nombre = nombrePE.trim() || `Nuevo ${n}`
    const id = `pe-nuevo-${n}`
    datos.cuerpos[id] = {
      nombre: `Programa Especializado en ${nombre}`,
      cursos: ['', '', '', ''],
    }
    nombrePE = ''
  }

  /** Maestría sin plan común: se le puede crear uno vacío. */
  const sinMarco = $derived(maestriasFijas.filter((m) => !datos?.marco?.[m.id]))

  function crearMarco(id: string) {
    if (!datos) return
    datos.marco[id] = [0, 1, 2, 3].map((i) =>
      [0, 1, 2].map((j) => ({ abierta: `Casilla ${i + 1}.${j + 1}` })),
    )
  }

  function borrarEspecializado(id: string) {
    if (!datos) return
    if (!confirm(`¿Borrar ${id}?`)) return
    delete datos.cuerpos[id]
  }

  function borrarCurso(id: string) {
    if (!datos) return
    if (!confirm(`¿Borrar ${id}?`)) return
    delete datos.cursos[id]
  }
</script>

<main class="editor">
  <header>
    <div>
      <h1>Editor de datos</h1>
      <p class="nota">
        Edita <code>data/source/*.json</code>. «Guardar» escribe los archivos y compila; si la
        compilación falla, el repositorio queda con el borrador y el sitio publicado no cambia.
      </p>
    </div>
    <div class="acciones">
      <button onclick={cargar} disabled={guardando}>Recargar</button>
      <button class="principal" onclick={guardar} disabled={guardando || cargando}>
        {guardando ? 'Guardando…' : 'Guardar y compilar'}
      </button>
    </div>
  </header>

  <div class="marco-dos-columnas">
    <nav class="lateral" aria-label="Secciones del editor">
      {#each grupos as g (g.nombre)}
        <div class="grupo">
          <p class="grupo-titulo">{g.nombre}</p>
          <ul>
            {#each g.pestanas as p (p.id)}
              <li>
                <button class="item" class:activo={pestana === p.id} onclick={() => (pestana = p.id)}>
                  {p.nombre}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>

    <div class="principal">

  {#if cargando}
    <p class="vacio">Cargando…</p>
  {:else if !datos}
    <p class="vacio">No se pudo leer la fuente. ¿Está corriendo con <code>pnpm edit</code>?</p>
  {:else}
    <section>
      {#if pestana === 'enfasis'}
        <div class="barra">
          <label class="filtro">
            Maestría
            <select bind:value={maestriaFiltro}>
              <option value="todas">Todas</option>
              {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
            </select>
          </label>
          <label class="filtro">
            Nueva en
            <select bind:value={maestriaNueva}>
              {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
            </select>
          </label>
          <button class="accion" onclick={nuevoEnfasis}>＋ Nuevo énfasis</button>
          <span class="conteo">{enfasis.length} de {todosEnfasis.length} énfasis</span>
        </div>
        <table>
          <thead>
            <tr><th>id</th><th>nombre</th><th>nombre corto</th><th>maestría</th><th>créd.</th><th>estado</th><th></th></tr>
          </thead>
          <tbody>
            {#each enfasis as p (p.id)}
              <tr>
                <td class="id">{p.id}</td>
                <td><input bind:value={p.nombre} /></td>
                <td><input bind:value={p.nombre_corto} /></td>
                <td>
                  <select bind:value={p.padre_id} onchange={() => (p.maestria_id = p.padre_id)}>
                    {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
                  </select>
                </td>
                <td><input type="number" bind:value={p.creditos} /></td>
                <td>
                  <select bind:value={p.estado}>
                    {#each ['verificado', 'borrador', 'propuesto'] as e (e)}<option value={e}>{e}</option>{/each}
                  </select>
                </td>
                <td><button class="borrar" onclick={() => borrarEnfasis(p.id)} title="Borrar">✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'especializados'}
        <div class="barra">
          <label class="filtro">
            Nombre
            <input placeholder="Arte, Edición…" bind:value={nombrePE} />
          </label>
          <button class="accion" onclick={nuevoEspecializado}>＋ Nuevo especializado</button>
          <span class="conteo">{especializados.length} programas</span>
        </div>
        <p class="nota">
          Un especializado existe por su cuerpo: cuatro cursos y 12 créditos. Si su id coincide con un
          énfasis, hereda nombre y familia; si no, usa el nombre que le des aquí.
        </p>
        <table>
          <thead><tr><th>id</th><th>nombre</th><th>cuerpo</th><th></th></tr></thead>
          <tbody>
            {#each especializados as pe (pe.id)}
              <tr>
                <td class="id">{pe.id}</td>
                <td>{pe.nombre_corto}</td>
                <td class="cuerpo-lista">
                  {#if pe.cuerpo.length === 4 && pe.cuerpo.every(Boolean)}
                    {pe.cuerpo.map((c: string) => datos!.cursos[c]?.nombre ?? c).join(' · ')}
                  {:else}
                    <em class="falta">cuerpo incompleto: {pe.cuerpo.filter(Boolean).length} de 4 cursos</em>
                  {/if}
                </td>
                <td><button class="borrar" onclick={() => borrarEspecializado(pe.id)} title="Borrar">✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'estructura'}
        <p class="nota">
          La Escuela y las maestrías se asumen fijas: viven en <code>estructura.json</code> y acá solo
          se leen. Lo que cambia son los énfasis, los especializados y los cursos.
        </p>
        <table>
          <thead><tr><th>id</th><th>nombre</th><th>nombre corto</th><th>tipo</th><th>créd.</th></tr></thead>
          <tbody>
            {#each datos.estructura as e (e.id)}
              <tr>
                <td class="id">{e.id}</td>
                <td>{e.nombre}</td>
                <td><span class="marca {marcaDe(e.id)}">{e.nombre_corto}</span></td>
                <td>{e.tipo}</td>
                <td>{e.creditos ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'cursos'}
        <div class="barra">
          <label class="filtro">
            Maestría
            <select bind:value={maestriaCurso}>
              <option value="todas">Todas</option>
              {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
            </select>
          </label>
          <label class="filtro">
            Eje
            <select bind:value={ejeCurso}>
              <option value="todos">Todos</option>
              {#each ['tronco', 'transversal', 'laboratorio', 'electiva', 'disciplinar', 'trayectoria'] as e (e)}
                <option value={e}>{e}</option>
              {/each}
            </select>
          </label>
          <label class="filtro">
            Buscar
            <input placeholder="nombre o id" bind:value={busqueda} />
          </label>
          <button class="accion" onclick={nuevoCurso}>＋ Nuevo curso</button>
          <span class="conteo">{cursosFiltrados.length} de {cursos.length} cursos</span>
        </div>
        <table>
          <thead>
            <tr><th>id</th><th>nombre</th><th>eje</th><th>formato</th><th>créd.</th><th>oferta variable</th><th>nota</th><th></th></tr>
          </thead>
          <tbody>
            {#each cursosFiltrados as [id, c] (id)}
              <tr>
                <td class="id">{id}</td>
                <td><input bind:value={c.nombre} /></td>
                <td>
                  <select bind:value={c.eje}>
                    {#each ['tronco', 'transversal', 'laboratorio', 'electiva', 'disciplinar', 'trayectoria'] as e (e)}
                      <option value={e}>{e}</option>
                    {/each}
                  </select>
                </td>
                <td>
                  <select bind:value={c.formato}>
                    {#each ['introduccion', 'curso', 'seminario', 'taller', 'estudio', 'laboratorio', 'proyecto', 'practica'] as f (f)}
                      <option value={f}>{f}</option>
                    {/each}
                  </select>
                </td>
                <td><input type="number" bind:value={c.creditos} /></td>
                <td class="centro"><input type="checkbox" bind:checked={c.oferta_variable} /></td>
                <td><input bind:value={c.nota} /></td>
                <td><button class="borrar" onclick={() => borrarCurso(id)} title="Borrar">✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'planes'}
        <div class="barra">
          <label class="filtro">
            Maestría
            <select bind:value={maestriaFiltro}>
              <option value="todas">Todas</option>
              {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
            </select>
          </label>
          <label class="filtro">
            Plan
            <select
              value={esComun ? `comun:${planComun}` : `enfasis:${planElegido}`}
              onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value
                if (v.startsWith('comun:')) {
                  planComun = v.slice(6)
                } else {
                  planComun = ''
                  planElegido = v.slice(8)
                }
              }}
            >
              <optgroup label="Planes de énfasis">
                {#each planesFiltrados as p (p.id)}
                  <option value={`enfasis:${p.id}`}>{nombreDe(p.id)}</option>
                {/each}
              </optgroup>
              <optgroup label="Planes comunes">
                {#each marcosFiltrados as m (m)}
                  <option value={`comun:${m}`}>{nombreDe(m)}</option>
                {/each}
              </optgroup>
            </select>
          </label>
          {#if esComun && filasComun}
            <span class="conteo">
              plan común · 12 casillas · {filasComun.flat().filter((c: any) => !esCurso(c)).length} abiertas
            </span>
          {:else if plan}
            <span class="conteo">
              {plan.slots.flat().length} casillas ·
              {plan.slots.flat().reduce((a: number, s: any) => a + (datos!.cursos[s.id]?.creditos ?? 0), 0)} créditos
            </span>
          {/if}
        </div>

        <p class="contexto">
          {#if esComun}
            {nombreDe(planComun)}
            <span class="id">{planComun}</span>
            <span class="nota-corta">quien cursa la maestría sin énfasis</span>
          {:else}
            {nombreDe(datos!.programas.find((p) => p.id === planElegido)?.padre_id ?? '')}
            <span class="id">{planElegido}</span>
          {/if}
        </p>

        {#if esComun && filasComun}
          <table class="cuadricula">
            <thead><tr><th>periodo</th><th>1</th><th>2</th><th>3</th></tr></thead>
            <tbody>
              {#each filasComun as fila, i (i)}
                <tr>
                  <th>{i + 1}º</th>
                  {#each fila as _c, j (j)}
                    {@const celda = celdaMarco(planComun, i, j)}
                    <td>
                      <select
                        value={esCurso(celda) ? celda : '__abierta'}
                        onchange={(e) => {
                          const v = (e.target as HTMLSelectElement).value
                          ponerMarco(planComun, i, j, v === '__abierta' ? { abierta: 'Nueva casilla' } : v)
                        }}
                      >
                        <option value="__abierta">— casilla abierta —</option>
                        {#each cursos as [id, c] (id)}<option value={id}>{c.nombre}</option>{/each}
                      </select>
                      {#if !esCurso(celda)}
                        <input
                          value={celda.abierta}
                          oninput={(e) =>
                            ponerMarco(planComun, i, j, { abierta: (e.target as HTMLInputElement).value })}
                        />
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if plan}
          <table class="cuadricula">
            <thead><tr><th>periodo</th><th>1</th><th>2</th><th>3</th></tr></thead>
            <tbody>
              {#each plan.slots as fila, i (i)}
                <tr>
                  <th>{i + 1}º</th>
                  {#each fila as slot, j (j)}
                    <td>
                      <select bind:value={slot.id}>
                        <option value="">— vacía —</option>
                        {#each cursos as [id, c] (id)}<option value={id}>{c.nombre}</option>{/each}
                      </select>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}

      {:else if pestana === 'cuerpos'}
        <p class="nota">
          El cuerpo es la fuente: un programa especializado existe porque aquí tiene sus cuatro
          cursos. Los planes ya no lo marcan.
        </p>
        {#each especializados as pe (pe.id)}
          <div class="cuerpo">
            <span class="cuerpo-nombre">{pe.nombre_corto}<span class="id">{pe.id}</span></span>
            {#each (datos!.cuerpos[pe.id]?.cursos ?? ['', '', '', '']) as _c, k (k)}
              <select
                value={datos!.cuerpos[pe.id]?.cursos?.[k] ?? ''}
                onchange={(e) => {
                  const valor = (e.target as HTMLSelectElement).value
                  const entrada = datos!.cuerpos[pe.id] ?? { cursos: ['', '', '', ''] }
                  const actual = [...(entrada.cursos ?? ['', '', '', ''])]
                  actual[k] = valor
                  datos!.cuerpos[pe.id] = { ...entrada, cursos: actual }
                }}
              >
                <option value="">—</option>
                {#each cursos as [id, c] (id)}
                  <option value={id}>{c.nombre}</option>
                {/each}
              </select>
            {/each}
          </div>
        {/each}
      {/if}
    </section>

    {#if salida}
      <pre class:fallo>{salida}</pre>
    {/if}
  {/if}
    </div>
  </div>
</main>

<style>
  .editor {
    padding: 48px clamp(24px, 5vw, 88px) 96px;
    max-width: 1400px;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--sp-6);
    padding-bottom: var(--sp-4);
    border-bottom: 1px solid var(--c-rule);
  }

  h1 {
    font-family: var(--ff-display);
    font-size: var(--fz-3xl);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .nota {
    font-family: var(--ff-serif);
    font-style: italic;
    color: var(--c-ink-3);
    max-width: 70ch;
    margin-top: 2px;
  }

  .acciones {
    display: flex;
    gap: var(--sp-2);
    flex: 0 0 auto;
  }

  button {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 12px;
    border: 1px solid var(--c-rule);
    border-radius: 2px;
  }

  button.principal {
    background: var(--c-ink);
    color: var(--c-paper);
    border-color: var(--c-ink);
  }

  button:disabled {
    opacity: 0.5;
  }

  .marco-dos-columnas {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: var(--sp-6);
    align-items: start;
    padding-top: var(--sp-5);
  }

  .lateral {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    position: sticky;
    top: var(--sp-5);
    padding-right: var(--sp-3);
    border-right: 1px solid var(--c-rule);
  }

  .grupo-titulo {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c-ink-3);
    padding-bottom: var(--sp-1);
    border-bottom: 1px solid var(--c-rule);
    margin-bottom: var(--sp-1);
  }

  .grupo ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .item {
    display: block;
    width: 100%;
    text-align: left;
    font-family: var(--ff-sans);
    font-size: var(--fz-sm);
    letter-spacing: 0;
    text-transform: none;
    color: var(--c-ink-2);
    padding: 5px 0 5px var(--sp-2);
    border: 0;
    border-left: 2px solid transparent;
    background: none;
  }

  .item:hover {
    color: var(--c-ink);
  }

  .item.activo {
    color: var(--c-ink);
    font-weight: 700;
    border-left-color: var(--c-ink);
  }

  .principal {
    min-width: 0;
  }



  section {
    overflow-x: auto;
    padding-bottom: var(--sp-4);
  }

  .id {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
    white-space: nowrap;
  }

  .nota-corta {
    font-style: normal;
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
  }

  .contexto {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-family: var(--ff-serif);
    font-style: italic;
    font-size: var(--fz-sm);
    color: var(--c-ink-3);
    padding-bottom: var(--sp-3);
  }

  .cuadricula th {
    width: 60px;
  }

  .cuadricula td {
    min-width: 260px;
  }

  .cuerpo {
    display: grid;
    grid-template-columns: 320px repeat(4, 1fr);
    gap: var(--sp-2);
    align-items: center;
    padding: var(--sp-1) 0;
    border-bottom: 1px solid var(--c-rule);
  }

  pre {
    margin-top: var(--sp-4);
    padding: var(--sp-3);
    background: var(--c-papel);
    border: 1px solid var(--c-rule);
    font-family: var(--ff-mono, ui-monospace, monospace);
    font-size: var(--fz-xs);
    white-space: pre-wrap;
    max-height: 320px;
    overflow: auto;
  }

  pre.fallo {
    border-color: var(--c-creacion-2, #c41a72);
    color: #8a1b4f;
  }

  .centro {
    text-align: center;
  }

  .borrar {
    border: 0;
    color: var(--c-ink-3);
    padding: 2px 6px;
    font-size: var(--fz-sm);
  }

  .borrar:hover {
    color: #8a1b4f;
  }

  .cuerpo-nombre {
    display: flex;
    flex-direction: column;
    font-family: var(--ff-serif);
    font-size: var(--fz-sm);
    color: var(--c-ink);
  }

  .cuerpo-lista {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-2);
  }

  .falta {
    color: #8a1b4f;
  }

  .centro input {
    width: auto;
  }

  .vacio {
    font-family: var(--ff-serif);
    font-style: italic;
    color: var(--c-ink-3);
    padding: var(--sp-4) 0;
  }
</style>
