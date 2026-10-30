<script lang="ts">
  type Tabla = 'enfasis' | 'especializados' | 'cursos' | 'planes' | 'marco' | 'cuerpos' | 'estructura'

  interface Fuente {
    estructura: any[]
    programas: any[]
    cursos: Record<string, any>
    planes: any[]
    marco: Record<string, any>
    cuerpos: Record<string, string[]>
  }

  let datos = $state<Fuente | null>(null)
  const desdeUrl = new URLSearchParams(location.search).get('p') as Tabla | null
  let pestana = $state<Tabla>(
    desdeUrl && ['enfasis', 'especializados', 'cursos', 'planes', 'marco', 'cuerpos'].includes(desdeUrl)
      ? desdeUrl
      : 'enfasis',
  )
  let cargando = $state(true)
  let guardando = $state(false)
  let salida = $state('')
  let fallo = $state(false)
  let planElegido = $state('')
  let maestriaNueva = $state('')

  const pestanas: { id: Tabla; nombre: string }[] = [
    { id: 'enfasis', nombre: 'Énfasis' },
    { id: 'especializados', nombre: 'Especializados' },
    { id: 'cursos', nombre: 'Cursos' },
    { id: 'planes', nombre: 'Planes' },
    { id: 'marco', nombre: 'Plan común' },
    { id: 'cuerpos', nombre: 'Cuerpos' },
    { id: 'estructura', nombre: 'Estructura fija' },
  ]

  async function cargar() {
    cargando = true
    const res = await fetch('/api/fuente')
    datos = await res.json()
    planElegido = datos?.planes?.[0]?.id ?? ''
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
  const plan = $derived(datos?.planes.find((p) => p.id === planElegido) ?? null)
  const especializados = $derived(programas.filter((p) => p.tipo === 'programa_especializado'))
  const maestrias = $derived(programas.filter((p) => p.tipo === 'maestria'))

  /** Una casilla del plan marco: curso, o casilla abierta con su etiqueta. */
  const esCurso = (c: any) => typeof c === 'string'
  const celdaMarco = (m: string, i: number, j: number) => datos!.marco[m][i][j]

  function ponerMarco(m: string, i: number, j: number, valor: any) {
    datos!.marco[m][i][j] = valor
  }

  const maestriasFijas = $derived(datos?.estructura.filter((e) => e.tipo === 'maestria') ?? [])
  const enfasis = $derived(programas.filter((p) => p.tipo === 'enfasis'))
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

  <nav class="pestanas">
    {#each pestanas as p (p.id)}
      <button class:activa={pestana === p.id} onclick={() => (pestana = p.id)}>{p.nombre}</button>
    {/each}
  </nav>

  {#if cargando}
    <p class="vacio">Cargando…</p>
  {:else if !datos}
    <p class="vacio">No se pudo leer la fuente. ¿Está corriendo con <code>pnpm edit</code>?</p>
  {:else}
    <section>
      {#if pestana === 'enfasis'}
        <div class="barra">
          <label>
            Maestría
            <select bind:value={maestriaNueva}>
              {#each maestriasFijas as m (m.id)}<option value={m.id}>{m.nombre_corto}</option>{/each}
            </select>
          </label>
          <button onclick={nuevoEnfasis}>＋ Nuevo énfasis</button>
          <span class="meta">{enfasis.length} énfasis · viven en <code>programas.json</code></span>
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
        <p class="nota">
          Un especializado no se declara aparte: nace cuando un énfasis marca cuatro casillas como
          «cuerpo del especializado» (12 créditos). Aquí se revisan, y en «Cuerpos» se puede fijar su
          contenido a mano.
        </p>
        <table>
          <thead><tr><th>deriva de</th><th>nombre</th><th>cuerpo</th></tr></thead>
          <tbody>
            {#each enfasis as e (e.id)}
              {@const propias = (datos!.planes.find((p) => p.id === e.id)?.slots ?? []).flat().filter((s: any) => s.pe)}
              <tr>
                <td class="id">{e.id}</td>
                <td>{e.nombre_corto.replace('Énfasis en ', 'Programa Especializado en ')}</td>
                <td class="cuerpo-lista">
                  {#if propias.length === 0}
                    <em class="falta">sin cuerpo: este énfasis no tiene especializado</em>
                  {:else}
                    {propias.length} casillas · {propias.map((s: any) => s.id).join(', ')}
                  {/if}
                </td>
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
                <td>{e.nombre_corto}</td>
                <td>{e.tipo}</td>
                <td>{e.creditos ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'cursos'}
        <div class="barra">
          <button onclick={nuevoCurso}>＋ Nuevo curso</button>
          <span class="meta">{cursos.length} cursos · viven en <code>cursos.json</code></span>
        </div>
        <table>
          <thead>
            <tr><th>id</th><th>nombre</th><th>eje</th><th>formato</th><th>créd.</th><th>oferta variable</th><th>nota</th><th></th></tr>
          </thead>
          <tbody>
            {#each cursos as [id, c] (id)}
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
          <label>
            Plan
            <select bind:value={planElegido}>
              {#each datos.planes as p (p.id)}<option value={p.id}>{p.id}</option>{/each}
            </select>
          </label>
          {#if plan}
            <span class="meta">
              {plan.slots.flat().length} casillas ·
              {plan.slots.flat().reduce((a: number, s: any) => a + (datos!.cursos[s.id]?.creditos ?? 0), 0)} créditos
            </span>
          {/if}
        </div>
        {#if plan}
          <table class="cuadricula">
            <thead>
              <tr><th>periodo</th><th>1</th><th>2</th><th>3</th></tr>
            </thead>
            <tbody>
              {#each plan.slots as fila, i (i)}
                <tr>
                  <th>{i + 1}º</th>
                  {#each fila as slot, j (j)}
                    <td>
                      <select bind:value={slot.id}>
                        <option value="">— vacía —</option>
                        {#each cursos as [id, c] (id)}
                          <option value={id}>{id} · {c.nombre}</option>
                        {/each}
                      </select>
                      <label class="pe"><input type="checkbox" bind:checked={slot.pe} /> cuerpo del especializado</label>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {:else if pestana === 'marco'}
        {#each Object.keys(datos.marco) as m (m)}
          <h2>{m}</h2>
          <table class="cuadricula">
            <tbody>
              {#each datos!.marco[m] as fila, i (i)}
                <tr>
                  <th>{i + 1}º</th>
                  {#each fila as _celda, j (j)}
                    {@const celda = celdaMarco(m, i, j)}
                    <td>
                      <select
                        value={esCurso(celda) ? celda : '__abierta'}
                        onchange={(e) => {
                          const v = (e.target as HTMLSelectElement).value
                          ponerMarco(m, i, j, v === '__abierta' ? { abierta: 'Nueva casilla' } : v)
                        }}
                      >
                        <option value="__abierta">— casilla abierta —</option>
                        {#each cursos as [id, c] (id)}
                          <option value={id}>{id} · {c.nombre}</option>
                        {/each}
                      </select>
                      {#if !esCurso(celda)}
                        <input
                          value={celda.abierta}
                          oninput={(e) => ponerMarco(m, i, j, { abierta: (e.target as HTMLInputElement).value })}
                        />
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/each}
      {:else if pestana === 'cuerpos'}
        <p class="nota">
          Vacío = el cuerpo se deriva de las casillas marcadas en el plan. Si declarás los cuatro
          cursos, manda lo declarado.
        </p>
        {#each especializados as pe (pe.id)}
          <div class="cuerpo">
            <span class="id">{pe.id}</span>
            {#each datos!.cuerpos[pe.id] ?? ['', '', '', ''] as _c, k (k)}
              <select
                value={datos!.cuerpos[pe.id]?.[k] ?? ''}
                onchange={(e) => {
                  const valor = (e.target as HTMLSelectElement).value
                  const actual = [...(datos!.cuerpos[pe.id] ?? ['', '', '', ''])]
                  actual[k] = valor
                  datos!.cuerpos[pe.id] = actual.some(Boolean) ? actual : []
                }}
              >
                <option value="">—</option>
                {#each cursos as [id, c] (id)}
                  <option value={id}>{id} · {c.nombre}</option>
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
</main>

<style>
  .editor {
    padding: var(--sp-4) var(--sp-5) var(--sp-6);
    max-width: 1500px;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--sp-4);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--c-rule);
  }

  h1 {
    font-family: var(--ff-display);
    font-size: var(--fz-2xl);
    font-weight: 700;
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

  .pestanas {
    display: flex;
    gap: var(--sp-1);
    padding: var(--sp-3) 0;
  }

  .pestanas button {
    border: 0;
    border-bottom: 2px solid transparent;
    text-transform: none;
    letter-spacing: 0.02em;
    font-size: var(--fz-sm);
    padding: 4px 10px;
    color: var(--c-ink-3);
  }

  .pestanas button.activa {
    color: var(--c-ink);
    font-weight: 700;
    border-bottom-color: var(--c-ink);
  }

  section {
    overflow-x: auto;
  }

  .id {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
    white-space: nowrap;
  }

  .barra {
    display: flex;
    align-items: end;
    gap: var(--sp-4);
    padding-bottom: var(--sp-3);
  }

  .barra label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--fz-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-ink-3);
  }

  .meta {
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
  }

  .cuadricula th {
    width: 60px;
  }

  .cuadricula td {
    min-width: 260px;
  }

  .pe {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--ff-sans);
    font-size: var(--fz-xs);
    color: var(--c-ink-3);
    margin-top: 2px;
  }

  .pe input {
    width: auto;
  }

  .cuerpo {
    display: grid;
    grid-template-columns: 260px repeat(4, 1fr);
    gap: var(--sp-2);
    align-items: center;
    padding: var(--sp-1) 0;
    border-bottom: 1px solid var(--c-rule);
  }

  h2 {
    font-family: var(--ff-display);
    font-size: var(--fz-lg);
    font-weight: 700;
    padding: var(--sp-3) 0 var(--sp-1);
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
