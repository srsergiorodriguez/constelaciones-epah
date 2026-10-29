import { figuras } from '../data/types'

export type Punto = [number, number]

/**
 * Coloca `n` estrellas sobre la silueta, equidistantes por longitud de arco.
 * La figura se dibuja completa; las estrellas se reparten por su trazo, de modo
 * que un plan con 7 cursos y otro con 11 comparten silueta y cambian densidad.
 */
export function placeOnFigure(polilinea: Punto[], n: number): Punto[] {
  if (n <= 0) return []
  if (polilinea.length < 2) return Array.from({ length: n }, () => [...polilinea[0]] as Punto)

  const segmentos: { a: Punto; b: Punto; len: number; inicio: number }[] = []
  let total = 0
  for (let i = 1; i < polilinea.length; i++) {
    const a = polilinea[i - 1]
    const b = polilinea[i]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    segmentos.push({ a, b, len, inicio: total })
    total += len
  }
  if (total === 0) return Array.from({ length: n }, () => [...polilinea[0]] as Punto)

  const salida: Punto[] = []
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : (k / (n - 1)) * total
    const s = segmentos.find((x) => t <= x.inicio + x.len) ?? segmentos[segmentos.length - 1]
    const u = s.len ? (t - s.inicio) / s.len : 0
    salida.push([s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u])
  }
  return salida
}

/** Silueta de un programa, o null si no tiene (la escuela o un umbral no la tienen). */
export function figureOf(programaId: string): Punto[] | null {
  const clave = figuras.programa[programaId]
  if (!clave) return null
  const figura = figuras.figuras[clave]
  return figura ? figura.puntos : null
}

export function figureNameOf(programaId: string): string | null {
  const clave = figuras.programa[programaId]
  return clave ? (figuras.figuras[clave]?.nombre ?? null) : null
}

/** Caja de la silueta en sus propias coordenadas (0..100 por convención). */
export function figureBounds(polilinea: Punto[]) {
  const xs = polilinea.map((p) => p[0])
  const ys = polilinea.map((p) => p[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}
