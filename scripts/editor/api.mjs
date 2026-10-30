/**
 * API local del editor. Solo existe en `pnpm edit` (servidor de desarrollo):
 * el build de producción no la incluye.
 *
 *   GET  /api/fuente    → las cinco tablas de data/source
 *   POST /api/fuente    → las escribe (una o varias)
 *   POST /api/compilar  → corre la tubería y devuelve la salida del compilador
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TABLAS = ['estructura', 'programas', 'cursos', 'planes', 'marco', 'cuerpos']

const ruta = (nombre) => join(RAIZ, 'data', 'source', `${nombre}.json`)

const leer = (nombre) => JSON.parse(readFileSync(ruta(nombre), 'utf8'))
const escribir = (nombre, valor) =>
  writeFileSync(ruta(nombre), JSON.stringify(valor, null, 2) + '\n')

const cuerpo = (req) =>
  new Promise((ok, mal) => {
    let datos = ''
    req.on('data', (trozo) => (datos += trozo))
    req.on('end', () => {
      try {
        ok(JSON.parse(datos || '{}'))
      } catch (e) {
        mal(e)
      }
    })
    req.on('error', mal)
  })

const responder = (res, estado, valor) => {
  res.statusCode = estado
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(valor))
}

/** Corre un script y devuelve su salida; no lanza: el error es un resultado. */
const correr = (script) =>
  new Promise((ok) => {
    execFile(process.execPath, [join('scripts', script)], { cwd: RAIZ }, (error, stdout, stderr) =>
      ok({ ok: !error, salida: `${stdout}${stderr}`.trim() }),
    )
  })

export function apiEditor() {
  return {
    name: 'api-editor',
    configureServer(servidor) {
      servidor.middlewares.use('/api/fuente', async (req, res) => {
        try {
          if (req.method === 'GET') {
            responder(res, 200, Object.fromEntries(TABLAS.map((n) => [n, leer(n)])))
            return
          }
          if (req.method === 'POST') {
            const datos = await cuerpo(req)
            for (const [nombre, valor] of Object.entries(datos)) {
              if (!TABLAS.includes(nombre)) return responder(res, 400, { error: `tabla desconocida: ${nombre}` })
              escribir(nombre, valor)
            }
            responder(res, 200, { ok: true })
            return
          }
          responder(res, 405, { error: 'método no permitido' })
        } catch (e) {
          responder(res, 500, { error: String(e?.message ?? e) })
        }
      })

      servidor.middlewares.use('/api/compilar', async (req, res) => {
        if (req.method !== 'POST') return responder(res, 405, { error: 'método no permitido' })
        const datos = await correr('build-data.mjs')
        if (!datos.ok) return responder(res, 200, datos)
        responder(res, 200, await correr('build-curriculum.mjs'))
      })
    },
  }
}
