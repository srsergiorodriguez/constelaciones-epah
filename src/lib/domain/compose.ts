import { curriculum } from '../data/types'
import { cursosOf, nucleoOf } from './graph'
import { figureOf, placeByPeriod, type Punto } from './figures'
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

/**
 * Transformación rígida (rotación + traslación, sin escalar) que lleva un
 * conjunto de puntos sobre otro minimizando la distancia. Es la forma de que dos
 * figuras conserven su forma y aun así compartan sus estrellas.
 */
export function procrustes(origen: Punto[], destino: Punto[]): (p: Punto) => Punto {
  const n = Math.min(origen.length, destino.length)
  if (n === 0) return (p) => p
  const cO = centro(origen.slice(0, n))
  const cD = centro(destino.slice(0, n))
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const ax = origen[i][0] - cO[0]
    const ay = origen[i][1] - cO[1]
    const bx = destino[i][0] - cD[0]
    const by = destino[i][1] - cD[1]
    num += ax * by - ay * bx
    den += ax * bx + ay * by
  }
  // se acota el giro: una figura girada 90° deja de leerse
  const bruto = Math.atan2(num, den)
  const tope = (25 * Math.PI) / 180
  const ang = Math.max(-tope, Math.min(tope, bruto))
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  return ([x, y]) => {
    const vx = x - cO[0]
    const vy = y - cO[1]
    return [cD[0] + vx * cos - vy * sin, cD[1] + vx * sin + vy * cos]
  }
}

/** Distancia media entre dos nubes de puntos del mismo tamaño. */
export function desvio(a: Punto[], b: Punto[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let suma = 0
  for (let i = 0; i < n; i++) suma += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1])
  return suma / n
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
      const periodoDe = (id: string) =>
        curriculum.ofertas.find(
          (o) => o.cursoId === id && o.programaId === programaId && o.obligatoriedad === 'obligatorio',
        )?.periodo ?? null
      const mapa = placeByPeriod(
        canonica,
        propios.map((id) => ({ id, periodo: periodoDe(id) })),
      )
      return { programaId, propios, canonica, mapa }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // cursos propios compartidos por las dos figuras
  const cuenta = new Map<string, number>()
  for (const p of planes) for (const id of p.propios) cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
  const compartidos = new Set([...cuenta.entries()].filter(([, n]) => n > 1).map(([id]) => id))

  // Alineación rígida: la figura B se gira y se traslada para que sus cursos
  // compartidos caigan sobre los de A. La forma no se deforma; solo cambia de
  // postura.
  let residual = 0
  if (planes.length === 2 && compartidos.size > 0) {
    const [a, b] = planes
    const ids = [...compartidos].filter((id) => a.mapa.has(id) && b.mapa.has(id))
    const deA = ids.map((id) => a.mapa.get(id)!)
    const deB = ids.map((id) => b.mapa.get(id)!)
    const T = procrustes(deB, deA)
    for (const [id, pt] of b.mapa) b.mapa.set(id, T(pt))
    b.canonica = b.canonica.map((pt) => T(pt))
    residual = desvio(
      ids.map((id) => b.mapa.get(id)!),
      deA,
    )
  }

  // centrar el conjunto de figuras entre la cabecera y el tronco
  const todos = planes.flatMap((p) => [...p.mapa.values()])
  if (todos.length) {
    const xs = todos.map((p) => p[0])
    const ys = todos.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const dx = ancho / 2 - (minX + maxX) / 2
    const limInf = 70
    const limSup = baseY - 42
    let dy = 0
    if (maxY > limSup) dy = limSup - maxY
    if (minY + dy < limInf) dy = limInf - minY
    if (dx !== 0 || dy !== 0) {
      for (const p of planes) {
        for (const [id, pt] of p.mapa) p.mapa.set(id, [pt[0] + dx, pt[1] + dy])
        p.canonica = p.canonica.map(([x, y]) => [x + dx, y + dy] as Punto)
      }
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
    const deformada = planes.length === 2 && compartidos.size > 0 && residual > 16
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
