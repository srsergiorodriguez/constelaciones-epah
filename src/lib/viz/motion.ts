import type { Punto } from '../domain/figures'

export interface Viaje {
  desde: Punto
  hasta: Punto
  inicio: number
  fin: number
}

export interface OpcionesViaje {
  duracion?: number
  escalon?: number
  bisagras?: Set<string>
  ahora?: number
}

/** Curva de entrada y salida suave. */
export function ease(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Plan de viaje de todas las estrellas.
 *
 * Las que recorren más distancia arrancan antes; todas aterrizan al mismo
 * tiempo, así que el movimiento se lee como una reunión y no como una estampida.
 * Las bisagras (cursos compartidos) salen al final: son el punto de encuentro
 * de las dos figuras y deben llegar juntas.
 */
export function planViaje(
  desde: Map<string, Punto>,
  hasta: Map<string, Punto>,
  { duracion = 600, escalon = 120, bisagras = new Set<string>(), ahora = 0 }: OpcionesViaje = {},
): Map<string, Viaje> {
  let maxD = 0
  const distancias = new Map<string, number>()
  for (const [id, b] of hasta) {
    const a = desde.get(id) ?? b
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    distancias.set(id, d)
    if (d > maxD) maxD = d
  }

  const plan = new Map<string, Viaje>()
  for (const [id, b] of hasta) {
    const a = desde.get(id) ?? b
    const norm = maxD > 0 ? (distancias.get(id) ?? 0) / maxD : 0
    const esBisagra = bisagras.has(id)
    const inicio = ahora + (1 - norm) * escalon + (esBisagra ? escalon * 0.8 : 0)
    const fin = ahora + duracion + (esBisagra ? escalon * 0.6 : 0)
    plan.set(id, { desde: a, hasta: b, inicio, fin })
  }
  return plan
}

/** Posición de una estrella en el instante `ahora`. */
export function posicionEn(v: Viaje, ahora: number): Punto {
  if (ahora <= v.inicio) return v.desde
  if (ahora >= v.fin) return v.hasta
  const t = (ahora - v.inicio) / (v.fin - v.inicio)
  const e = ease(t)
  return [v.desde[0] + (v.hasta[0] - v.desde[0]) * e, v.desde[1] + (v.hasta[1] - v.desde[1]) * e]
}

/** Duración total del plan, para saber cuándo parar el reloj. */
export function finDelPlan(plan: Map<string, Viaje>): number {
  let fin = 0
  for (const v of plan.values()) if (v.fin > fin) fin = v.fin
  return fin
}

export const prefiereMenosMovimiento = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
