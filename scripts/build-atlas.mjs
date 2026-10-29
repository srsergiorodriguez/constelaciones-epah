#!/usr/bin/env node
/**
 * build-atlas.mjs — src/lib/data/curriculum.json → src/lib/data/atlas.json
 *
 * Calcula la nebulosa: la posición de reposo de los 83 cursos cuando no hay
 * constelación encendida. Determinista: semilla fija, sin Math.random.
 *
 * Busca un cielo, no un diagrama: posiciones al azar con una separación mínima
 * que solo evita que dos estrellas se pisen. Nada de cúmulos por maestría: el
 * color distingue la maestría; la posición no codifica estructura.
 *
 *   node scripts/build-atlas.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'lib', 'data')

const curriculum = JSON.parse(readFileSync(join(DATA, 'curriculum.json'), 'utf8'))
const ids = Object.keys(curriculum.cursos)

/* ---------- semilla ---------- */
const SEED = 20261029

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

/* ---------- caja y parámetros ---------- */
const BOX = { w: 1200, h: 900 } // misma proporción que el escenario
const MARGEN = 44
const MIN_D = 17 // solo evita superposiciones: el resto es azar puro
const PASOS = 90

const minX = MARGEN
const maxX = BOX.w - MARGEN
const minY = MARGEN
const maxY = BOX.h - MARGEN

/* ---------- siembra uniforme ---------- */
const n = ids.length
const pos = new Map()
for (const id of ids) {
  pos.set(id, [minX + rand() * (maxX - minX), minY + rand() * (maxY - minY)])
}

/* ---------- relajación: solo repulsión, sin atractores ---------- */
for (let paso = 0; paso < PASOS; paso++) {
  const empuje = new Map(ids.map((id) => [id, [0, 0]]))

  for (let i = 0; i < n; i++) {
    const a = pos.get(ids[i])
    for (let j = i + 1; j < n; j++) {
      const b = pos.get(ids[j])
      let dx = a[0] - b[0]
      let dy = a[1] - b[1]
      const d2 = dx * dx + dy * dy
      if (d2 > MIN_D * MIN_D || d2 === 0) continue
      const d = Math.sqrt(d2) || 0.001
      const f = (MIN_D - d) / d / 2
      dx *= f
      dy *= f
      const ea = empuje.get(ids[i])
      const eb = empuje.get(ids[j])
      ea[0] += dx
      ea[1] += dy
      eb[0] -= dx
      eb[1] -= dy
    }
  }

  for (const id of ids) {
    const p = pos.get(id)
    const e = empuje.get(id)
    p[0] = Math.min(maxX, Math.max(minX, p[0] + e[0] * 0.5))
    p[1] = Math.min(maxY, Math.max(minY, p[1] + e[1] * 0.5))
  }
}

/* ---------- salida ---------- */
const puntos = {}
for (const id of ids) {
  const [x, y] = pos.get(id)
  puntos[id] = [Number(x.toFixed(2)), Number(y.toFixed(2))]
}

const atlas = {
  version: 2,
  semilla: SEED,
  caja: BOX,
  nota: 'Azar sembrado: hay huecos y parejas cercanas. El color distingue la maestría; la posición no codifica nada.',
  puntos,
}

writeFileSync(join(DATA, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n')

/* ---------- control ---------- */
let minDist = Infinity
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) {
    const a = puntos[ids[i]]
    const b = puntos[ids[j]]
    minDist = Math.min(minDist, Math.hypot(a[0] - b[0], a[1] - b[1]))
  }
}
const promedio =
  ids.reduce((acc, id) => {
    const p = puntos[id]
    return acc + Math.hypot(p[0] - BOX.w / 2, p[1] - BOX.h / 2)
  }, 0) / n

console.log('✓ src/lib/data/atlas.json')
console.log(`  ${n} estrellas · semilla ${SEED} · caja ${BOX.w}×${BOX.h}`)
console.log(`  distancia mínima ${minDist.toFixed(1)} px · radio medio ${promedio.toFixed(0)} px`)
