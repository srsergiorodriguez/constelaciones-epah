import { atlas } from '../data/types'
import type { Punto } from './figures'

/** Lleva un punto de la caja del atlas al viewport, conservando proporción y centrado. */
export function atlasToViewport(ancho: number, alto: number, margen = 0.06) {
  const { w, h } = atlas.caja
  const s = Math.min((ancho * (1 - 2 * margen)) / w, (alto * (1 - 2 * margen)) / h)
  const ox = (ancho - w * s) / 2
  const oy = (alto - h * s) / 2
  return (p: Punto): Punto => [p[0] * s + ox, p[1] * s + oy]
}

/** Posición de reposo de un curso en el viewport. */
export function nebulaToViewport(ancho: number, alto: number, margen = 0.06) {
  const map = atlasToViewport(ancho, alto, margen)
  return (cursoId: string): Punto => {
    const p = atlas.puntos[cursoId] ?? [atlas.caja.w / 2, atlas.caja.h / 2]
    return map(p as Punto)
  }
}

export const atlasBox = atlas.caja
export const grupoPos = (id: string) => atlas.grupos[id] ?? null
