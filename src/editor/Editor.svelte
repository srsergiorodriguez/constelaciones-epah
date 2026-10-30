<script lang="ts">
  type Tabla = 'programas' | 'cursos' | 'planes' | 'marco' | 'cuerpos'

  interface Fuente {
    programas: any[]
    cursos: Record<string, any>
    planes: any[]
    marco: Record<string, any>
    cuerpos: Record<string, string[]>
  }

  let datos = $state<Fuente | null>(null)
  const desdeUrl = new URLSearchParams(location.search).get('p') as Tabla | null
  let pestana = $state<Tabla>(
    desdeUrl && ['programas', 'cursos', 'planes', 'marco', 'cuerpos'].includes(desdeUrl)
      ? desdeUrl
      : 'programas',
  )
  let cargando = $state(true)
  let guardando = $state(false)
  let salida = $state('')
  let fallo = $state(false)
  let planElegido = $state('')

  const pestanas: { id: Tabla; nombre: string }[] = [
    { id: 'programas', nombre: 'Programas' },
    { id: 'cursos', nombre: 'Cursos' },
    { id: 'planes', nombre: 'Planes' },
    { id: 'marco', nombre: 'Plan común' },
    { id: 'cuerpos', nombre: 'Cuerpos' },
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
      {#if pestana === 'programas'}
        <table>
          <thead>
            <tr>
              <th>id</th><th>nombre</th><th>nombre corto</th><th>tipo</th><th>padre</th>
              <th>maestría</th><th>créd.</th><th>pág.</th><th>nota</th>
            </tr>
          </thead>
          <tbody>
            {#each programas as p (p.id)}
              <tr>
                <td class="id">{p.id}</td>
                <td><input bind:value={p.nombre} /></td>
                <td><input bind:value={p.nombre_corto} /></td>
                <td>
                  <select bind:value={p.tipo}>
                    {#each ['escuela', 'maestria', 'enfasis', 'programa_especializado', 'doctorado'] as t (t)}
                      <option value={t}>{t}</option>
                    {/each}
                  </select>
                </td>
                <td>
                  <select bind:value={p.padre_id}>
                    <option value="">—</option>
                    {#each programas as q (q.id)}<option value={q.id}>{q.id}</option>{/each}
                  </select>
                </td>
                <td>
                  <select bind:value={p.maestria_id}>
                    <option value="">—</option>
                    {#each maestrias as m (m.id)}<option value={m.id}>{m.id}</option>{/each}
                  </select>
                </td>
                <td><input type="number" bind:value={p.creditos} /></td>
                <td><input type="number" bind:value={p.pagina} /></td>
                <td><input bind:value={p.nota} /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if pestana === 'cursos'}
        <table>
          <thead>
            <tr>
              <th>id</th><th>nombre</th><th>eje</th><th>formato</th><th>créd.</th>
              <th>pág.</th><th>oferta variable</th><th>nota</th>
            </tr>
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
                <td><input type="number" bind:value={c.pagina} /></td>
                <td class="centro"><input type="checkbox" bind:checked={c.oferta_variable} /></td>
                <td><input bind:value={c.nota} /></td>
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
          Vacío = el cuerpo se deriva del énfasis (regla provisional). Si declarás los cuatro cursos,
          manda lo declarado.
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
