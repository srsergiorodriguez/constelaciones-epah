import { describe, expect, it } from 'vitest'
import { figureOf, placeOnFigure } from './figures'

const mano = figureOf('enf-creacion-arte')!

describe('reparto de estrellas sobre la figura', () => {
  it('devuelve exactamente n puntos', () => {
    for (const n of [4, 7, 11]) expect(placeOnFigure(mano, n)).toHaveLength(n)
  })

  it('el primero y el último caen en los extremos del trazo', () => {
    const pts = placeOnFigure(mano, 7)
    expect(pts[0][0]).toBeCloseTo(mano[0][0], 6)
    expect(pts[0][1]).toBeCloseTo(mano[0][1], 6)
    expect(pts[pts.length - 1][0]).toBeCloseTo(mano[mano.length - 1][0], 6)
    expect(pts[pts.length - 1][1]).toBeCloseTo(mano[mano.length - 1][1], 6)
  })

  it('cambiar el número de cursos no cambia la silueta', () => {
    // todo punto cae sobre algún segmento de la polilínea canónica
    const sobre = (p: [number, number]) =>
      mano.some((q, i) => {
        if (i === 0) return false
        const a = mano[i - 1]
        const b = q
        const vx = b[0] - a[0]
        const vy = b[1] - a[1]
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)))
        return Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]) < 0.01
      })
    for (const n of [4, 7, 11]) for (const p of placeOnFigure(mano, n)) expect(sobre(p), `n=${n}`).toBe(true)
  })
})
