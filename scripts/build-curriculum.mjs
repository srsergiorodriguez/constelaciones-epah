#!/usr/bin/env node
/**
 * build-curriculum.mjs — data/*.csv → src/lib/data/curriculum.json
 *
 * Valida el contrato antes de escribir. Si una invariante se rompe, falla y no
 * escribe nada: la app nunca arranca con datos inconsistentes.
 *
 *   node scripts/build-curriculum.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'data')
const OUT = join(ROOT, 'src', 'lib', 'data')

/* ---------- CSV ---------- */
function readCsv(name) {
  const text = readFileSync(join(DATA, name), 'utf8').trim()
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const num = (v) => (v === '' || v == null ? null : Number(v))
const list = (v) => (v ? String(v).split(';').filter(Boolean) : [])

/* ---------- lectura ---------- */
const programasCsv = readCsv('programas.csv')
const cursosCsv = readCsv('cursos.csv')
const curriculoCsv = readCsv('curriculo.csv')
const marcosCsv = readCsv('planes_marco.csv')

const programas = programasCsv.map((r) => ({
  id: r.id,
  nombre: r.nombre,
  nombreCorto: r.nombre_corto,
  tipo: r.tipo,
  padreId: r.padre_id || null,
  maestriaId: r.maestria_id || null,
  creditos: num(r.creditos),
  estado: r.estado,
  nota: r.nota || '',
}))

const cursos = cursosCsv.map((r) => ({
  id: r.curso_id,
  nombre: r.nombre,
  codigo: r.nombre_corto,
  creditos: Number(r.creditos),
  eje: r.eje_curricular,
  formato: r.formato,
  alcance: r.alcance,
  nProgramas: Number(r.n_programas),
  maestrias: list(r.maestrias),
  enfasis: list(r.enfasis),
  programasEspecializados: list(r.programas_especializados),
  ofertaVariable: r.oferta_variable === 'si',
  estado: r.estado,
  pagina: num(r.fuente_pagina),
  nota: r.nota || '',
}))

const ofertas = curriculoCsv.map((r) => ({
  programaId: r.programa_id,
  cursoId: r.curso_id,
  periodo: num(r.periodo),
  columna: num(r.columna),
  obligatoriedad: r.obligatoriedad,
  alternativas: list(r.alternativas),
  repeticiones: Number(r.repeticiones || 1),
  estado: r.estado,
  pagina: num(r.fuente_pagina),
  nota: r.nota || '',
}))

const planesMarco = {}
for (const r of marcosCsv) {
  const lista = planesMarco[r.maestria_id] ?? (planesMarco[r.maestria_id] = [])
  lista.push({
    periodo: Number(r.periodo),
    columna: Number(r.columna),
    cursoId: r.curso_id || null,
    abierta: r.abierta || null,
  })
}

/* ---------- invariantes ---------- */
const errores = []
const fail = (m) => errores.push(m)

const programById = new Map(programas.map((p) => [p.id, p]))
const cursoById = new Map(cursos.map((c) => [c.id, c]))

if (programById.size !== programas.length) fail('ids de programa duplicados')
if (cursoById.size !== cursos.length) fail('ids de curso duplicados')

for (const o of ofertas) {
  if (!programById.has(o.programaId)) fail(`oferta con programa inexistente: ${o.programaId}`)
  if (!cursoById.has(o.cursoId)) fail(`oferta con curso inexistente: ${o.cursoId}`)
  for (const a of o.alternativas) if (!cursoById.has(a)) fail(`alternativa inexistente: ${a}`)
}

const creditosDe = (programaId) =>
  ofertas
    .filter((o) => o.programaId === programaId && o.obligatoriedad === 'obligatorio')
    .reduce((acc, o) => acc + cursoById.get(o.cursoId).creditos * o.repeticiones, 0)

const signatura = (propias) =>
  propias.reduce((acc, o) => acc + cursoById.get(o.cursoId).creditos * o.repeticiones, 0)

/* Un plan vive en los énfasis; una maestría con énfasis no tiene plan propio
   (su constelación es la unión de los planes de sus énfasis). */
const conPlanPropio = programas.filter(
  (x) =>
    x.tipo === 'enfasis' ||
    (x.tipo === 'maestria' && !programas.some((y) => y.tipo === 'enfasis' && y.padreId === x.id)),
)

for (const p of conPlanPropio) {
  const casillas = ofertas.filter(
    (o) => o.programaId === p.id && o.obligatoriedad === 'obligatorio' && o.periodo !== null,
  )
  if (casillas.length !== 12) fail(`${p.id}: ${casillas.length} casillas (esperado 12)`)
  const cr = creditosDe(p.id)
  if (cr !== 36) fail(`${p.id}: ${cr} créditos (esperado 36)`)
}

for (const p of programas.filter((x) => x.tipo === 'programa_especializado')) {
  const propias = ofertas.filter((o) => o.programaId === p.id && o.obligatoriedad === 'obligatorio')
  const cr = signatura(propias)
  const casillas = propias.reduce((acc, o) => acc + o.repeticiones, 0)
  if (cr !== 12) fail(`${p.id}: ${cr} créditos (esperado 12)`)
  if (casillas !== 4) fail(`${p.id}: ${casillas} casillas (esperado 4)`)
}

for (const c of cursos) {
  const n = ofertas.filter((o) => o.cursoId === c.id).length
  if (n === 0) fail(`${c.id}: curso sin ningún programa`)
}

for (const [maestriaId, casillas] of Object.entries(planesMarco)) {
  if (!programById.has(maestriaId)) fail(`plan marco de programa inexistente: ${maestriaId}`)
  if (casillas.length !== 12) fail(`plan marco ${maestriaId}: ${casillas.length} casillas`)
  for (const c of casillas) {
    if (c.cursoId && !cursoById.has(c.cursoId)) fail(`plan marco ${maestriaId}: curso inexistente ${c.cursoId}`)
  }
}

// un curso solo puede estar una vez por casilla y programa
const casillas = new Set()
for (const o of ofertas) {
  if (o.periodo === null) continue
  const key = `${o.programaId}|${o.periodo}|${o.columna}`
  if (casillas.has(key)) fail(`casilla repetida: ${key}`)
  casillas.add(key)
}

if (errores.length) {
  console.error('✗ Contrato roto:\n' + errores.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}

/* ---------- salida ---------- */
const bundle = {
  version: 1,
  meta: {
    escuela: 'Escuela de Posgrados · Facultad de Artes y Humanidades',
    fuente: 'Reforma EPAH — Documento maestro final (110 pp.)',
    programas: programas.length,
    cursos: cursos.length,
    ofertas: ofertas.length,
  },
  programas: Object.fromEntries(programas.map((p) => [p.id, p])),
  cursos: Object.fromEntries(cursos.map((c) => [c.id, c])),
  ofertas,
  planesMarco,
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'curriculum.json'), JSON.stringify(bundle, null, 2) + '\n')

const maestrias = programas.filter((p) => p.tipo === 'maestria').length
const enfasis = programas.filter((p) => p.tipo === 'enfasis').length
const pe = programas.filter((p) => p.tipo === 'programa_especializado').length
console.log('✓ src/lib/data/curriculum.json')
console.log(`  ${programas.length} programas (${maestrias} maestrías · ${enfasis} énfasis · ${pe} especializados)`)
console.log(`  ${cursos.length} cursos · ${ofertas.length} pertenencias`)
