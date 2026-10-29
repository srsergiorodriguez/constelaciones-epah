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

/**
 * Silueta de un programa. Un programa especializado no tiene figura propia:
 * hereda la del énfasis al que pertenece, porque es un subconjunto de él.
 */
export function figureKeyOf(programaId: string, padreId: string | null): string | null {
  if (figuras.programa[programaId]) return figuras.programa[programaId]
  if (padreId && figuras.programa[padreId]) return figuras.programa[padreId]
  return null
}

export function figureOf(programaId: string, padreId: string | null = null): Punto[] | null {
  const clave = figureKeyOf(programaId, padreId)
  return clave ? (figuras.figuras[clave]?.puntos ?? null) : null
}

export function figureNameOf(programaId: string, padreId: string | null = null): string | null {
  const clave = figureKeyOf(programaId, padreId)
  return clave ? (figuras.figuras[clave]?.nombre ?? null) : null
}

/** Caja de la silueta en sus propias coordenadas (0..100 por convención). */
export function figureBounds(polilinea: Punto[]) {
  const xs = polilinea.map((p) => p[0])
  const ys = polilinea.map((p) => p[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/**
 * Coloca las estrellas por periodo: el plan se lee de la base a la punta.
 * Dos programas que comparten un curso lo ven en la misma franja de su figura,
 * así que sus formas se pueden alinear casi sin deformarlas.
 */
export function placeByPeriod(
  polilinea: Punto[],
  cursos: { id: string; periodo: number | null }[],
): Map<string, Punto> {
  const porPeriodo = new Map<number, { id: string }[]>()
  for (const c of cursos) {
    const p = c.periodo && c.periodo >= 1 && c.periodo <= 4 ? c.periodo : 4
    const arr = porPeriodo.get(p) ?? []
    arr.push(c)
    porPeriodo.set(p, arr)
  }

  const puntos = new Map<string, Punto>()
  const ancho = 1 / 4
  for (const [periodo, lista] of porPeriodo) {
    const inicio = (periodo - 1) * ancho
    lista.forEach((c, i) => {
      const t = inicio + ((i + 1) / (lista.length + 1)) * ancho
      puntos.set(c.id, puntoEn(polilinea, t))
    })
  }
  return puntos
}

/** Punto a una fracción t de la longitud de la polilínea. */
export function puntoEn(polilinea: Punto[], t: number): Punto {
  let total = 0
  const tramos: { a: Punto; b: Punto; len: number; inicio: number }[] = []
  for (let i = 1; i < polilinea.length; i++) {
    const a = polilinea[i - 1]
    const b = polilinea[i]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    tramos.push({ a, b, len, inicio: total })
    total += len
  }
  if (total === 0) return [...polilinea[0]] as Punto
  const d = Math.max(0, Math.min(1, t)) * total
  const s = tramos.find((x) => d <= x.inicio + x.len) ?? tramos[tramos.length - 1]
  const u = s.len ? (d - s.inicio) / s.len : 0
  return [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u]
}
