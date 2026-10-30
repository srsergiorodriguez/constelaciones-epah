import { curriculum } from '../data/types'
import { cursosOf, nucleoOf } from './graph'
import { figureOf, placeOnFigure, type Punto } from './figures'
import { nebulaToViewport } from './nebula'
import { envolvente } from './hull'
import type { Nivel } from './niveles'

export type EstadoEstrella = 'nebulosa' | 'nucleo' | 'figura' | 'enlace'

export interface Estrella {
  cursoId: string
  x: number
  y: number
  estado: EstadoEstrella
  /** Programa al que se atribuye la estrella: el énfasis dueño, o la maestría en el tronco. */
  en: string[]
}

export interface FiguraDibujo {
  programaId: string
  /** Silueta completa, ya ajustada al viewport. */
  puntos: Punto[]
  /** Primer curso de la figura: por ahí se enlaza con el tronco. */
  anclaje: Punto | null
}

export interface Silueta {
  programaId: string
  puntos: Punto[]
  /** Qué programa se elige al hacer clic, si no es la figura misma. */
  objetivo?: string
}

export interface Escena {
  ancho: number
  alto: number
  estrellas: Estrella[]
  figuras: FiguraDibujo[]
  nucleo: Punto[]
  /** Enlace del tronco con la constelación (o con el centro del coro). */
  eje: [Punto, Punto] | null
  /** Sin selección: todas las siluetas alrededor del cielo, como otro selector. */
  siluetas: Silueta[]
  /** Regiones de maestría: la línea que encierra sus figuras. */
  limites: Silueta[]
}

/** Ajusta una polilínea (0..100) a una caja conservando proporción y orientación. */
export function fitFigure(polilinea: Punto[], caja: { x: number; y: number; w: number; h: number }): Punto[] {
  const xs = polilinea.map((p) => p[0])
  const ys = polilinea.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const s = Math.min(caja.w / (maxX - minX || 1), caja.h / (maxY - minY || 1))
  const dx = caja.x + (caja.w - (maxX - minX) * s) / 2
  const dy = caja.y + (caja.h - (maxY - minY) * s) / 2
  return polilinea.map(([x, y]) => [dx + (x - minX) * s, dy + (y - minY) * s])
}

const ordenarPorPlan = (programaId: string, cursos: string[]) => {
  const ofertaDe = (id: string) =>
    curriculum.ofertas.find(
      (o) => o.cursoId === id && o.programaId === programaId && o.obligatoriedad === 'obligatorio',
    )
  return [...cursos].sort((a, b) => {
    const oa = ofertaDe(a)
    const ob = ofertaDe(b)
    return (oa?.periodo ?? 9) - (ob?.periodo ?? 9) || (oa?.columna ?? 9) - (ob?.columna ?? 9)
  })
}

/** Cursos propios de un programa: su plan menos el tronco, en orden de plan. */
export function propiosOf(programaId: string): string[] {
  const nucleo = new Set(nucleoOf(programaId))
  return ordenarPorPlan(programaId, cursosOf(programaId).filter((id) => !nucleo.has(id)))
}

const hijosDe = (programaId: string) =>
  Object.values(curriculum.programas).filter((p) => p.tipo === 'enfasis' && p.padreId === programaId)

const centroDe = (pts: Punto[]): Punto => [
  pts.reduce((a, p) => a + p[0], 0) / pts.length,
  pts.reduce((a, p) => a + p[1], 0) / pts.length,
]

/**
 * Compone la escena: nebulosa o un programa.
 *
 * - Un énfasis (o una maestría sin énfasis) es una figura sola sobre el tronco.
 * - Una maestría con énfasis no tiene silueta propia: es la familia de sus
 *   figuras, cada una con sus cursos exclusivos; lo que comparte un subconjunto
 *   de énfasis se ubica entre sus figuras.
 */
export function compose(
  seleccion: string[],
  ancho: number,
  alto: number,
  nivel: Nivel = 'maestria',
): Escena {
  const aNebulosa = nebulaToViewport(ancho, alto)
  const estrellas = new Map<string, Estrella>()

  for (const id of Object.keys(curriculum.cursos)) {
    const [x, y] = aNebulosa(id)
    estrellas.set(id, { cursoId: id, x, y, estado: 'nebulosa', en: [] })
  }

  const activo = seleccion.find((id) => curriculum.programas[id])
  if (!activo) {
    const siluetas = siluetasDelCielo(ancho, alto)
    if (nivel === 'especializado') return componerFragmentos(siluetas, estrellas, ancho, alto)
    return {
      ancho,
      alto,
      estrellas: [...estrellas.values()],
      figuras: [],
      nucleo: [],
      eje: null,
      siluetas,
      limites: limitesDeMaestria(siluetas),
    }
  }

  const hijos = hijosDe(activo)
  return hijos.length >= 2
    ? componerFamilia(activo, hijos, estrellas, ancho, alto)
    : componerFigura(activo, estrellas, ancho, alto)
}

/* ------------------------------------------------------------------ */
/* La escala del especializado: trece fragmentos                        */
/* ------------------------------------------------------------------ */

/**
 * A doce créditos, cada programa especializado es un fragmento de su énfasis:
 * la figura queda de fantasma y se encienden solo sus cuatro estrellas.
 * Las maestrías de plan único no tienen puerta de doce créditos y no aparecen.
 */
function componerFragmentos(
  siluetas: Silueta[],
  estrellas: Map<string, Estrella>,
  ancho: number,
  alto: number,
): Escena {
  const pes = Object.values(curriculum.programas).filter((p) => p.tipo === 'programa_especializado')
  const porPadre = new Map(siluetas.map((s) => [s.programaId, s.puntos]))
  const dibujadas: Silueta[] = []

  for (const pe of pes) {
    const padreId = pe.padreId
    const figura = padreId ? porPadre.get(padreId) : null
    if (!figura) continue
    const cursos = ordenarPorPlan(pe.id, cursosOf(pe.id))
    const posiciones = placeOnFigure(figura, cursos.length)
    cursos.forEach((cursoId, i) => {
      const e = estrellas.get(cursoId)
      if (!e) return
      e.x = posiciones[i][0]
      e.y = posiciones[i][1]
      e.estado = 'figura'
      e.en = [pe.id]
    })
    dibujadas.push({ programaId: padreId!, puntos: figura, objetivo: pe.id })
  }

  const enFragmento = new Set(dibujadas.map((s) => s.objetivo))
  for (const e of estrellas.values()) {
    if (!enFragmento.has(e.en[0])) e.estado = 'nebulosa'
  }

  return {
    ancho,
    alto,
    estrellas: [...estrellas.values()],
    figuras: [],
    nucleo: [],
    eje: null,
    siluetas: dibujadas,
    limites: [],
  }
}

/* ------------------------------------------------------------------ */
/* Una figura sola                                                     */
/* ------------------------------------------------------------------ */

function componerFigura(programaId: string, estrellas: Map<string, Estrella>, ancho: number, alto: number): Escena {
  const nucleo = nucleoOf(programaId)
  const baseY = alto - Math.max(64, alto * 0.075)
  const nucleoPts = fila(nucleo, ancho, baseY)
  nucleo.forEach((cursoId, i) => {
    const e = estrellas.get(cursoId)!
    e.x = nucleoPts[i][0]
    e.y = nucleoPts[i][1]
    e.estado = 'nucleo'
    e.en = [programaId]
  })

  const silueta = figureOf(programaId, curriculum.programas[programaId]?.padreId ?? null)
  const propios = propiosOf(programaId)
  if (!silueta || propios.length === 0) {
    return {
      ancho,
      alto,
      estrellas: [...estrellas.values()],
      figuras: [],
      nucleo: nucleoPts,
      eje: null,
      siluetas: [],
      limites: [],
    }
  }

  const cajaAlto = Math.min(alto * 0.66, ancho * 0.56)
  const cajaAncho = Math.min(ancho * 0.52, alto * 0.68)
  const caja = { x: ancho / 2 - cajaAncho / 2, y: Math.max(40, baseY - cajaAlto - 48), w: cajaAncho, h: cajaAlto }
  const canonica = fitFigure(silueta, caja)
  const posiciones = placeOnFigure(canonica, propios.length)

  propios.forEach((cursoId, i) => {
    const e = estrellas.get(cursoId)!
    e.x = posiciones[i][0]
    e.y = posiciones[i][1]
    e.estado = 'figura'
    e.en = [programaId]
  })

  const primera = estrellas.get(propios[0])
  const centroTronco = centroDe(nucleoPts)
  return {
    ancho,
    alto,
    estrellas: [...estrellas.values()],
    figuras: [{ programaId, puntos: canonica, anclaje: null }],
    nucleo: nucleoPts,
    eje: primera ? [centroTronco, [primera.x, primera.y]] : null,
    siluetas: [],
    limites: [],
  }
}

/* ------------------------------------------------------------------ */
/* Una maestría: la familia de sus figuras                             */
/* ------------------------------------------------------------------ */

function componerFamilia(
  maestriaId: string,
  hijos: ReturnType<typeof hijosDe>,
  estrellas: Map<string, Estrella>,
  ancho: number,
  alto: number,
): Escena {
  const planes = hijos.map((h) => ({ id: h.id, cursos: new Set(cursosOf(h.id)) }))
  const todos = new Set<string>()
  for (const p of planes) for (const c of p.cursos) todos.add(c)

  const enCuantos = new Map<string, number>()
  for (const c of todos) enCuantos.set(c, planes.filter((p) => p.cursos.has(c)).length)

  const nucleo = [...todos].filter((c) => enCuantos.get(c) === hijos.length)
  const compartidos = [...todos].filter((c) => {
    const n = enCuantos.get(c) ?? 0
    return n > 1 && n < hijos.length
  })

  const baseY = alto - Math.max(58, alto * 0.055)
  const nucleoPts = fila([...nucleo], ancho, baseY)
  ;[...nucleo].forEach((cursoId, i) => {
    const e = estrellas.get(cursoId)!
    e.x = nucleoPts[i][0]
    e.y = nucleoPts[i][1]
    e.estado = 'nucleo'
    e.en = [maestriaId]
  })

  // las figuras de los énfasis, en dos filas: es la única forma de que cinco
  // siluetas y sus estrellas quepan sin pisarse
  const k = hijos.length
  const filas: number[][] = k <= 3 ? [hijos.map((_, i) => i)] : [hijos.map((_, i) => i).slice(0, Math.ceil(k / 2)), hijos.map((_, i) => i).slice(Math.ceil(k / 2))]
  const lado = Math.min(ancho / 4.4, (baseY - 90) / 2.15)
  const yFilas = [92, 92 + lado + 96]
  const figuras: FiguraDibujo[] = []
  const centrosHijo = new Map<string, Punto>()

  filas.forEach((indices, f) => {
    const n = indices.length
    const sep = Math.min(lado * 1.35, (ancho * 0.82) / Math.max(n, 1))
    indices.forEach((i, j) => {
      const h = hijos[i]
      const x = ancho / 2 + (j - (n - 1) / 2) * sep
      const y = yFilas[f] + lado / 2
      centrosHijo.set(h.id, [x, y])

      const silueta = figureOf(h.id, h.padreId)
      const exclusivos = ordenarPorPlan(
        h.id,
        [...planes[i].cursos].filter((c) => enCuantos.get(c) === 1),
      )
      if (!silueta || exclusivos.length === 0) return

      const caja = { x: x - lado / 2, y: y - lado / 2, w: lado, h: lado }
      const canonica = fitFigure(silueta, caja)
      const posiciones = placeOnFigure(canonica, exclusivos.length)

      exclusivos.forEach((cursoId, q) => {
        const e = estrellas.get(cursoId)!
        e.x = posiciones[q][0]
        e.y = posiciones[q][1]
        e.estado = 'figura'
        e.en = [h.id]
      })

      figuras.push({ programaId: h.id, puntos: canonica, anclaje: null })
    })
  })

  // lo que comparten algunos énfasis: se agrupan por dueño y se abren en columna
  const porDuenos = new Map<string, string[]>()
  for (const cursoId of compartidos) {
    const duenos = hijos.filter((h, i) => planes[i].cursos.has(cursoId)).map((h) => h.id)
    const clave = duenos.join('|')
    const arr = porDuenos.get(clave) ?? []
    arr.push(cursoId)
    porDuenos.set(clave, arr)
  }
  for (const [clave, cursos] of porDuenos) {
    const duenos = clave.split('|')
    const centros = duenos.map((id) => centrosHijo.get(id)!).filter(Boolean)
    const c = centroDe(centros)
    cursos.forEach((cursoId, i) => {
      const e = estrellas.get(cursoId)!
      e.x = c[0]
      e.y = c[1] + (i - (cursos.length - 1) / 2) * 42
      e.estado = 'enlace'
      e.en = duenos
    })
  }

  return {
    ancho,
    alto,
    estrellas: [...estrellas.values()],
    figuras,
    nucleo: nucleoPts,
    eje: [centroDe(nucleoPts), [ancho / 2, yFilas[0] + lado / 2]],
    siluetas: [],
    limites: [],
  }
}

/**
 * Sin selección, el universo muestra todas las siluetas: las de una misma
 * maestría se agrupan —son parientes— y el conjunto queda sembrado al azar.
 * Se permite un solape pequeño: las figuras se tocan sin confundirse.
 */
function siluetasDelCielo(ancho: number, alto: number): Silueta[] {
  const programas = Object.values(curriculum.programas).filter(
    (p) => p.tipo === 'enfasis' || (p.tipo === 'maestria' && hijosDe(p.id).length === 0),
  )
  const ids = programas.map((p) => p.id).filter((id) => figureOf(id, curriculum.programas[id]?.padreId ?? null))

  const lado = 192
  const margen = 26
  const minD = lado * 0.84 // se solapan un 16 %, pero nunca se tapan
  const anclaD = 420

  let semilla = 20261031
  const azar = () => {
    semilla |= 0
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const minX = margen + lado / 2
  const maxX = ancho - margen - lado / 2
  const minY = margen + lado / 2
  const maxY = alto - margen - lado / 2

  // una ancla por maestría, separadas entre sí
  const familias = [...new Set(programas.map((p) => (p.tipo === 'enfasis' ? p.padreId! : p.id)))]
  const anclas = new Map<string, Punto>()
  const libres: Punto[] = familias.map(() => [
    minX + azar() * (maxX - minX),
    minY + azar() * (maxY - minY),
  ])
  for (let paso = 0; paso < 220; paso++) {
    for (let i = 0; i < libres.length; i++) {
      for (let j = i + 1; j < libres.length; j++) {
        const a = libres[i]
        const b = libres[j]
        const dx = a[0] - b[0]
        const dy = a[1] - b[1]
        const d = Math.hypot(dx, dy) || 0.01
        if (d >= anclaD) continue
        const f = ((anclaD - d) / d) * 0.2
        a[0] += dx * f
        a[1] += dy * f
        b[0] -= dx * f
        b[1] -= dy * f
      }
    }
    for (const c of libres) {
      c[0] = Math.min(maxX, Math.max(minX, c[0]))
      c[1] = Math.min(maxY, Math.max(minY, c[1]))
    }
  }
  familias.forEach((f, i) => anclas.set(f, libres[i]))

  // cada figura arranca cerca de su ancla
  const centros: Punto[] = programas.map((p) => {
    const a = anclas.get(p.tipo === 'enfasis' ? p.padreId! : p.id)!
    return [
      Math.min(maxX, Math.max(minX, a[0] + (azar() - 0.5) * 170)),
      Math.min(maxY, Math.max(minY, a[1] + (azar() - 0.5) * 150)),
    ]
  })

  // Fase 1: se separan sin alejarse de su familia
  for (let paso = 0; paso < 320; paso++) {
    for (let i = 0; i < centros.length; i++) {
      for (let j = i + 1; j < centros.length; j++) {
        const a = centros[i]
        const b = centros[j]
        const dx = a[0] - b[0]
        const dy = a[1] - b[1]
        const d = Math.hypot(dx, dy) || 0.01
        if (d >= minD) continue
        const f = ((minD - d) / d) * 0.3
        a[0] += dx * f
        a[1] += dy * f
        b[0] -= dx * f
        b[1] -= dy * f
      }
    }
    for (let i = 0; i < centros.length; i++) {
      const p = programas[i]
      const a = anclas.get(p.tipo === 'enfasis' ? p.padreId! : p.id)!
      const c = centros[i]
      c[0] += (a[0] - c[0]) * 0.012
      c[1] += (a[1] - c[1]) * 0.012
      c[0] = Math.min(maxX, Math.max(minX, c[0]))
      c[1] = Math.min(maxY, Math.max(minY, c[1]))
    }
  }

  // Fase 2: separación dura. Ninguna figura puede quedar encima de otra:
  // dos siluetas superpuestas dejan una imposible de seleccionar.
  for (let paso = 0; paso < 600; paso++) {
    let movido = false
    for (let i = 0; i < centros.length; i++) {
      for (let j = i + 1; j < centros.length; j++) {
        const a = centros[i]
        const b = centros[j]
        let dx = a[0] - b[0]
        let dy = a[1] - b[1]
        let d = Math.hypot(dx, dy)
        if (d >= minD) continue
        if (d < 0.01) {
          // dos centros exactos: se abren en una dirección fija, no al azar
          const ang = ((i * 7 + j * 13) % 360) * (Math.PI / 180)
          dx = Math.cos(ang)
          dy = Math.sin(ang)
          d = 1
        }
        const empuje = (minD - d) / d / 2
        a[0] += dx * empuje
        a[1] += dy * empuje
        b[0] -= dx * empuje
        b[1] -= dy * empuje
        movido = true
      }
    }
    for (const c of centros) {
      c[0] = Math.min(maxX, Math.max(minX, c[0]))
      c[1] = Math.min(maxY, Math.max(minY, c[1]))
    }
    if (!movido) break
  }

  return ids.map((id, i) => {
    const [x, y] = centros[i]
    const silueta = figureOf(id, curriculum.programas[id]?.padreId ?? null)!
    return {
      programaId: id,
      puntos: fitFigure(silueta, { x: x - lado / 2, y: y - lado / 2, w: lado, h: lado }),
    }
  })
}

/**
 * Región de cada maestría: la envolvente de las figuras que le pertenecen.
 * Las que no tienen énfasis tienen una sola figura —su plan único— y también
 * la reciben: toda maestría se nombra, tenga variantes o no.
 */
function limitesDeMaestria(siluetas: Silueta[]): Silueta[] {
  const salida: Silueta[] = []
  for (const m of Object.values(curriculum.programas).filter((p) => p.tipo === 'maestria')) {
    const hijos = hijosDe(m.id).map((h) => h.id)
    const propias = hijos.length > 0 ? hijos : [m.id]
    const puntos = siluetas.filter((s) => propias.includes(s.programaId)).flatMap((s) => s.puntos)
    if (puntos.length < 4) continue
    salida.push({ programaId: m.id, puntos: envolvente(puntos, 24) })
  }
  return salida
}

/** Fila de puntos centrada. */
function fila(ids: string[], ancho: number, y: number): Punto[] {
  const sep = Math.min(132, ancho / (ids.length + 2))
  return ids.map((_, i) => [ancho / 2 + (i - (ids.length - 1) / 2) * sep, y] as Punto)
}
