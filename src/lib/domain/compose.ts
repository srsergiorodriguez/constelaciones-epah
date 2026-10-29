import { curriculum } from '../data/types'
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

export interface FiguraDibujo {
  programaId: string
  /** Trazo a dibujar: la silueta completa, o la ruta por las estrellas si se deformó. */
  puntos: Punto[]
  /** true si el trazo pasa por las estrellas (dos figuras que comparten cursos). */
  deformada: boolean
  /** Primer curso de la figura: por ahí se enlaza con el tronco. */
  anclaje: Punto | null
}

export interface Escena {
  ancho: number
  alto: number
  estrellas: Estrella[]
  figuras: FiguraDibujo[]
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

const centro = (pts: Punto[]): Punto => [
  pts.reduce((a, p) => a + p[0], 0) / pts.length,
  pts.reduce((a, p) => a + p[1], 0) / pts.length,
]

/** Cursos propios: los del plan que no son tronco. */
export function propiosOf(programaId: string): string[] {
  const nucleo = new Set(nucleoOf(programaId))
  return cursosOf(programaId).filter((id) => !nucleo.has(id))
}

/**
 * Compone la escena para una selección de 0, 1 o 2 programas.
 *
 * - 0: todo en la nebulosa.
 * - 1: los cursos propios viajan a su figura; el núcleo se queda de base.
 * - 2: las dos figuras se corren para que sus cursos propios compartidos caigan
 *   en una bisagra común; el trazo pasa entonces por las estrellas, para que la
 *   línea y los nodos nunca se separen.
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

  // tronco: cursos de la intersección de los planes activos
  const nucleo = [...new Set(activos.flatMap((id) => nucleoOf(id)))].filter((cursoId) =>
    activos.every((p) => cursosOf(p).includes(cursoId)),
  )
  const baseY = alto - Math.max(70, alto * 0.085)
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

  const escala = activos.length === 2 ? 1.28 : 1
  const cajaAlto = Math.min(alto * 0.46 * escala, ancho * 0.4 * escala)
  const cajaAncho = Math.min(ancho * 0.34 * escala, alto * 0.42 * escala)
  const bisagra: Punto = [ancho / 2, alto * (activos.length === 2 ? 0.5 : 0.44)]

  const planes = activos
    .map((programaId) => {
      const silueta = figureOf(programaId, curriculum.programas[programaId]?.padreId ?? null)
      const propios = propiosOf(programaId)
      if (!silueta || propios.length === 0) return null

      const centroX =
        activos.length === 1 ? ancho / 2 : ancho / 2 + (activos.indexOf(programaId) === 0 ? -1 : 1) * (ancho * 0.2)
      const caja = {
        x: centroX - cajaAncho / 2,
        y: Math.max(48, baseY - cajaAlto - 56),
        w: cajaAncho,
        h: cajaAlto,
      }
      const canonica = fitFigure(silueta, caja)
      const posiciones = placeOnFigure(canonica, propios.length)
      return {
        programaId,
        propios,
        canonica,
        mapa: new Map(propios.map((id, i) => [id, posiciones[i]])),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // cursos propios compartidos por las dos figuras
  const cuenta = new Map<string, number>()
  for (const p of planes) for (const id of p.propios) cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
  const compartidos = new Set([...cuenta.entries()].filter(([, n]) => n > 1).map(([id]) => id))

  // cada figura se corre para que su grupo compartido caiga en la bisagra
  if (planes.length === 2 && compartidos.size > 0) {
    for (const [idx, p] of planes.entries()) {
      const propias = [...compartidos].filter((id) => p.mapa.has(id)).map((id) => p.mapa.get(id)!)
      if (!propias.length) continue
      const c = centro(propias)
      const dx = bisagra[0] - c[0]
      const dy = bisagra[1] - c[1]
      // se inclina cada figura alrededor de la bisagra: A hacia la izquierda, B hacia la derecha
      const giro = ((idx === 0 ? -1 : 1) * 15 * Math.PI) / 180
      const cos = Math.cos(giro)
      const sin = Math.sin(giro)
      const mover = ([x, y]: Punto): Punto => {
        const vx = x + dx - bisagra[0]
        const vy = y + dy - bisagra[1]
        return [bisagra[0] + vx * cos - vy * sin, bisagra[1] + vx * sin + vy * cos]
      }
      for (const [id, pt] of p.mapa) p.mapa.set(id, mover(pt))
      p.canonica = p.canonica.map((pt) => mover(pt))
    }
  }

  const copias = new Map<string, Punto[]>()
  for (const p of planes) {
    for (const [id, pt] of p.mapa) {
      const arr = copias.get(id) ?? []
      arr.push(pt)
      copias.set(id, arr)
    }
  }

  for (const [cursoId, puntos] of copias) {
    const e = estrellas.get(cursoId)!
    const [x, y] = centro(puntos)
    e.x = x
    e.y = y
    e.estado = puntos.length > 1 ? 'bisagra' : 'figura'
    e.en = activos.filter((p) => cursosOf(p).includes(cursoId))
    e.compartida = puntos.length > 1 || e.en.length > 1
  }

  const figuras: FiguraDibujo[] = planes.map((p) => {
    const deformada = planes.length === 2 && compartidos.size > 0
    const puntos = deformada
      ? p.propios.map((id) => {
          const e = estrellas.get(id)!
          return [e.x, e.y] as Punto
        })
      : p.canonica
    const primera = estrellas.get(p.propios[0])
    return {
      programaId: p.programaId,
      puntos,
      deformada,
      anclaje: primera ? ([primera.x, primera.y] as Punto) : null,
    }
  })

  return { ancho, alto, estrellas: [...estrellas.values()], figuras, nucleo: nucleoPts }
}
