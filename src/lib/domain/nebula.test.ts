import { describe, expect, it } from 'vitest'
import { atlas } from '../data/types'
import { nebulaToViewport } from './nebula'

describe('nebulosa', () => {
  it('es determinista: dos lecturas dan la misma posición', () => {
    const a = nebulaToViewport(1200, 900)
    const b = nebulaToViewport(1200, 900)
    for (const id of Object.keys(atlas.puntos)) expect(a(id)).toEqual(b(id))
  })

  it('todas las estrellas caen dentro del viewport', () => {
    const pos = nebulaToViewport(1200, 900)
    for (const id of Object.keys(atlas.puntos)) {
      const [x, y] = pos(id)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1200)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(900)
    }
  })
})
