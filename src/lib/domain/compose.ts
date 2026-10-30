import { curriculum } from '../data/types'
import { cursosOf, nucleoOf } from './graph'
import { figureOf, placeOnFigure, type Punto } from './figures'
import { nebulaToViewport } from './nebula'

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
export function compose(seleccion: string[], ancho: number, alto: number): Escena {
  const aNebulosa = nebulaToViewport(ancho, alto)
  const estrellas = new Map<string, Estrella>()

  for (const id of Object.keys(curriculum.cursos)) {
    const [x, y] = aNebulosa(id)
    estrellas.set(id, { cursoId: id, x, y, estado: 'nebulosa', en: [] })
  }

  const activo = seleccion.find((id) => curriculum.programas[id])
  if (!activo) {
    return {
      ancho,
      alto,
      estrellas: [...estrellas.values()],
      figuras: [],
      nucleo: [],
      eje: null,
      siluetas: siluetasDelCielo(ancho, alto),
    }
  }

  const hijos = hijosDe(activo)
  return hijos.length >= 2
    ? componerFamilia(activo, hijos, estrellas, ancho, alto)
    : componerFigura(activo, estrellas, ancho, alto)
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
  }
}

/**
 * Sin selección, el cielo muestra todas las siluetas en un anillo: son otro
 * selector. Se dibujan sin estrellas: la figura, no el plan.
 */
function siluetasDelCielo(ancho: number, alto: number): Silueta[] {
  const ids = Object.values(curriculum.programas)
    .filter((p) => p.tipo === 'enfasis' || (p.tipo === 'maestria' && hijosDe(p.id).length === 0))
    .map((p) => p.id)
    .filter((id) => figureOf(id, curriculum.programas[id]?.padreId ?? null))

  const cx = ancho / 2
  const cy = alto / 2
  const radio = Math.min(ancho, alto) * 0.43
  const lado = 86

  return ids.map((id, i) => {
    const ang = (-90 + (360 / ids.length) * i) * (Math.PI / 180)
    const x = cx + Math.sin(ang) * radio
    const y = cy - Math.cos(ang) * radio
    const silueta = figureOf(id, curriculum.programas[id]?.padreId ?? null)!
    return {
      programaId: id,
      puntos: fitFigure(silueta, { x: x - lado / 2, y: y - lado / 2, w: lado, h: lado }),
    }
  })
}

/** Fila de puntos centrada. */
function fila(ids: string[], ancho: number, y: number): Punto[] {
  const sep = Math.min(132, ancho / (ids.length + 2))
  return ids.map((_, i) => [ancho / 2 + (i - (ids.length - 1) / 2) * sep, y] as Punto)
}
