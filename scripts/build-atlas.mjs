#!/usr/bin/env node
/**
 * build-atlas.mjs — src/lib/data/curriculum.json → src/lib/data/atlas.json
 *
 * Calcula la nebulosa: la posición de reposo de los 83 cursos. Determinista:
 * semilla fija, sin Math.random, sin fuerzas en runtime. Se corre una vez y se
 * versiona el resultado.
 *
 * Cada curso es atraído hacia la región de su maestría y repelido por los demás,
 * así que la nube queda agrupada por afinidad y no como ruido.
 *
 *   node scripts/build-atlas.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'lib', 'data')

const curriculum = JSON.parse(readFileSync(join(DATA, 'curriculum.json'), 'utf8'))
const { programas, cursos, ofertas } = curriculum

/* ---------- semilla ---------- */
const SEED = 20261029

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(SEED)

/* ---------- regiones ---------- */
const BOX = { w: 1000, h: 1000 }
const CENTRO = [BOX.w / 2, BOX.h / 2]

const maestrias = Object.values(programas).filter((p) => p.tipo === 'maestria')
const regiones = new Map()
maestrias.forEach((m, i) => {
  const ang = (-90 + (360 / maestrias.length) * i) * (Math.PI / 180)
  const r = 372
  regiones.set(m.id, [CENTRO[0] + Math.sin(ang) * r, CENTRO[1] - Math.cos(ang) * r])
})

/* ---------- ancla de cada curso ---------- */
const cursoIds = Object.keys(cursos)
const ancla = new Map()

for (const id of cursoIds) {
  const maestriasDelCurso = new Set()
  for (const o of ofertas) {
    if (o.cursoId !== id) continue // también cuentan las alternativas: el curso es de ese plan
    const p = programas[o.programaId]
    const m = p.maestriaId || (p.tipo === 'maestria' ? p.id : null)
    if (m) maestriasDelCurso.add(m)
  }
  if (maestriasDelCurso.size === 0) {
    ancla.set(id, CENTRO)
    continue
  }
  let x = 0
  let y = 0
  for (const m of maestriasDelCurso) {
    const r = regiones.get(m) ?? CENTRO
    x += r[0]
    y += r[1]
  }
  ancla.set(id, [x / maestriasDelCurso.size, y / maestriasDelCurso.size])
}

/* ---------- relajación ---------- */
const pos = new Map()
for (const id of cursoIds) {
  const a = ancla.get(id)
  const ang = rand() * Math.PI * 2
  const r = 60 + rand() * 120
  pos.set(id, [a[0] + Math.cos(ang) * r, a[1] + Math.sin(ang) * r])
}

const REP = 2600 // repulsión
const K_ANCLA = 0.034 // resorte a la región
const K_CENTRO = 0.0028 // gravedad suave al centro
const MIN_D = 30 // separación mínima
const PASOS = 420
const PASO = 0.55

const ids = cursoIds
for (let paso = 0; paso < PASOS; paso++) {
  const fr = new Map(ids.map((id) => [id, [0, 0]]))

  for (let i = 0; i < ids.length; i++) {
    const a = pos.get(ids[i])
    for (let j = i + 1; j < ids.length; j++) {
      const b = pos.get(ids[j])
      let dx = a[0] - b[0]
      let dy = a[1] - b[1]
      let d2 = dx * dx + dy * dy
      if (d2 < 0.01) {
        dx = (rand() - 0.5) * 2
        dy = (rand() - 0.5) * 2
        d2 = dx * dx + dy * dy
      }
      const d = Math.sqrt(d2)
      let f = REP / d2
      if (d < MIN_D) f += (MIN_D - d) * 1.2
      const ux = dx / d
      const uy = dy / d
      const fa = fr.get(ids[i])
      const fb = fr.get(ids[j])
      fa[0] += ux * f
      fa[1] += uy * f
      fb[0] -= ux * f
      fb[1] -= uy * f
    }
  }

  for (const id of ids) {
    const p = pos.get(id)
    const a = ancla.get(id)
    const f = fr.get(id)
    f[0] += (a[0] - p[0]) * K_ANCLA + (CENTRO[0] - p[0]) * K_CENTRO
    f[1] += (a[1] - p[1]) * K_ANCLA + (CENTRO[1] - p[1]) * K_CENTRO
  }

  const cool = 1 - paso / PASOS / 1.6
  for (const id of ids) {
    const p = pos.get(id)
    const f = fr.get(id)
    p[0] += f[0] * PASO * cool
    p[1] += f[1] * PASO * cool
  }
}

/* ---------- normalización ---------- */
let minX = Infinity
let minY = Infinity
let maxX = -Infinity
let maxY = -Infinity
for (const [x, y] of pos.values()) {
  minX = Math.min(minX, x)
  minY = Math.min(minY, y)
  maxX = Math.max(maxX, x)
  maxY = Math.max(maxY, y)
}

const MARGEN = 0.04 // 4 % de aire en cada borde
const escala = Math.min(
  (BOX.w * (1 - 2 * MARGEN)) / (maxX - minX),
  (BOX.h * (1 - 2 * MARGEN)) / (maxY - minY),
)
const offX = (BOX.w - (maxX - minX) * escala) / 2
const offY = (BOX.h - (maxY - minY) * escala) / 2

const puntos = {}
for (const id of ids) {
  const [x, y] = pos.get(id)
  puntos[id] = [Number(((x - minX) * escala + offX).toFixed(2)), Number(((y - minY) * escala + offY).toFixed(2))]
}

const atlas = {
  version: 1,
  semilla: SEED,
  caja: BOX,
  regiones: Object.fromEntries(
    maestrias.map((m) => {
      const [x, y] = regiones.get(m.id)
      return [m.id, [Number(((x - minX) * escala + offX).toFixed(2)), Number(((y - minY) * escala + offY).toFixed(2))]]
    }),
  ),
  grupos: Object.fromEntries(
    maestrias.map((m) => {
      const miembros = ids.filter((id) => {
        const a = ancla.get(id)
        const r = regiones.get(m.id)
        return Math.hypot(a[0] - r[0], a[1] - r[1]) < 1 // el ancla exacta de esta región
      })
      const pts = miembros.map((id) => puntos[id])
      if (!pts.length) return [m.id, null]
      return [
        m.id,
        [
          pts.reduce((s, p) => s + p[0], 0) / pts.length,
          pts.reduce((s, p) => s + p[1], 0) / pts.length,
        ],
      ]
    }),
  ),
  puntos,
}

writeFileSync(join(DATA, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n')

const distancias = ids.map((id) => {
  const p = puntos[id]
  const a = ancla.get(id)
  return Math.hypot(p[0] - a[0], p[1] - a[1])
})
console.log('✓ src/lib/data/atlas.json')
console.log(`  ${ids.length} estrellas · semilla ${SEED} · caja ${BOX.w}×${BOX.h}`)
console.log(`  desvío medio respecto a su región: ${(distancias.reduce((a, b) => a + b, 0) / distancias.length).toFixed(1)} px`)
