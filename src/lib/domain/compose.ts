import { curriculum, figuras } from '../data/types'
import { cursosOf, nucleoOf } from './graph'
import { figureOf, placeOnFigure, type Punto } from './figures'
import { nebulaToViewport } from './nebula'

export type EstadoEstrella = 'nebulosa' | 'nucleo' | 'figura' | 'bisagra'

export interface Estrella {
  cursoId: string
  x: number
  y: number
  estado: EstadoEstrella
  /** Programas seleccionados a los que pertenece. */
  en: string[]
  /** Pertenece a más de una constelación de la selección. */
  compartida: boolean
}

export interface Escena {
  ancho: number
  alto: number
  estrellas: Estrella[]
  figuras: { programaId: string; puntos: Punto[] }[]
  nucleo: Punto[]
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

const propioOf = (programaId: string) => cursosOf(programaId).filter((id) => !nucleoOf(programaId).includes(id))

/**
 * Compone la escena para una selección de 0, 1 o 2 programas.
 *
 * - 0: todo en la nebulosa.
 * - 1: los cursos propios viajan a su figura; el núcleo se queda de base; el
 *      resto del cielo no se mueve.
 * - 2: dos figuras a lado y lado del tronco; los cursos propios compartidos
 *      caen en la bisagra (punto medio).
 */
export function compose(seleccion: string[], ancho: number, alto: number): Escena {
  const aNebulosa = nebulaToViewport(ancho, alto)
  const estrellas = new Map<string, Estrella>()

  for (const id of Object.keys(curriculum.cursos)) {
    const [x, y] = aNebulosa(id)
    estrellas.set(id, { cursoId: id, x, y, estado: 'nebulosa', en: [], compartida: false })
  }

  const activos = seleccion.filter((id) => curriculum.programas[id]).slice(0, 2)
  if (activos.length === 0) {
    return { ancho, alto, estrellas: [...estrellas.values()], figuras: [], nucleo: [] }
  }

  // tronco: cursos compartidos por los programas activos (o por cualquiera, si es uno)
  const nucleo = [...new Set(activos.flatMap((id) => nucleoOf(id)))].filter((cursoId) =>
    activos.every((p) => cursosOf(p).includes(cursoId)),
  )
  const baseY = alto - Math.max(80, alto * 0.1)
  const nucleoPts: Punto[] = nucleo.map((_, i) => [
    ancho / 2 + (i - (nucleo.length - 1) / 2) * Math.min(110, ancho / (nucleo.length + 2)),
    baseY,
  ])
  nucleo.forEach((cursoId, i) => {
    const e = estrellas.get(cursoId)!
    e.x = nucleoPts[i][0]
    e.y = nucleoPts[i][1]
    e.estado = 'nucleo'
    e.en = activos.filter((p) => cursosOf(p).includes(cursoId))
  })

  const figurasSalida: { programaId: string; puntos: Punto[] }[] = []
  const colocadas = new Map<string, Map<string, Punto>>()

  const cajaAlto = Math.min(alto * 0.62, ancho * 0.5)
  const cajaAncho = Math.min(ancho * 0.42, alto * 0.6)

  activos.forEach((programaId, idx) => {
    const silueta = figureOf(programaId)
    const propios = propioOf(programaId)
    if (!silueta || propios.length === 0) return

    const centroX = activos.length === 1 ? ancho / 2 : ancho / 2 + (idx === 0 ? -1 : 1) * (ancho * 0.24)
    const caja = {
      x: centroX - cajaAncho / 2,
      y: Math.max(60, baseY - cajaAlto - 70),
      w: cajaAncho,
      h: cajaAlto,
    }
    const puntos = fitFigure(silueta, caja)
    figurasSalida.push({ programaId, puntos })

    const posiciones = placeOnFigure(puntos, propios.length)
    const mapa = new Map<string, Punto>()
    propios.forEach((cursoId, i) => mapa.set(cursoId, posiciones[i]))
    colocadas.set(programaId, mapa)
  })

  // cursos propios compartidos: bisagra en el punto medio
  const conteo = new Map<string, Punto[]>()
  for (const [, mapa] of colocadas) {
    for (const [cursoId, p] of mapa) {
      const arr = conteo.get(cursoId) ?? []
      arr.push(p)
      conteo.set(cursoId, arr)
    }
  }

  for (const [cursoId, puntos] of conteo) {
    const e = estrellas.get(cursoId)!
    const [x, y] = [
      puntos.reduce((s, p) => s + p[0], 0) / puntos.length,
      puntos.reduce((s, p) => s + p[1], 0) / puntos.length,
    ]
    e.x = x
    e.y = y
    e.estado = puntos.length > 1 ? 'bisagra' : 'figura'
    e.en = activos.filter((p) => cursosOf(p).includes(cursoId))
    e.compartida = puntos.length > 1 || e.en.length > 1
  }

  return { ancho, alto, estrellas: [...estrellas.values()], figuras: figurasSalida, nucleo: nucleoPts }
}

export const figureKeyOf = (programaId: string) => figuras.programa[programaId] ?? null
