import { describe, expect, it } from 'vitest'
import { compose } from './compose'
import { nucleoOf } from './graph'

const ANCHO = 1200
const ALTO = 900

describe('composición de la escena', () => {
  it('sin selección, todos los cursos están en la nebulosa y nadie se mueve', () => {
    const escena = compose([], ANCHO, ALTO)
    expect(escena.estrellas).toHaveLength(83)
    expect(escena.estrellas.every((e) => e.estado === 'nebulosa')).toBe(true)
    expect(escena.figuras).toHaveLength(0)
  })

  it('con un programa, sus propios cursos van a la figura y el núcleo a la base', () => {
    const id = 'enf-creacion-arte'
    const escena = compose([id], ANCHO, ALTO)
    const nucleo = escena.estrellas.filter((e) => e.estado === 'nucleo')
    const figura = escena.estrellas.filter((e) => e.estado === 'figura')
    expect(nucleo).toHaveLength(nucleoOf(id).length)
    expect(figura.length).toBeGreaterThan(0)
    for (const e of nucleo) expect(e.y).toBeGreaterThan(ALTO * 0.8)
    for (const e of figura) {
      expect(e.x).toBeGreaterThanOrEqual(0)
      expect(e.x).toBeLessThanOrEqual(ANCHO)
    }
    expect(escena.figuras).toHaveLength(1)
  })

  it('con dos programas que comparten cursos propios, la bisagra es un solo punto', () => {
    const escena = compose(['enf-creacion-composicion', 'enf-creacion-produccion'], ANCHO, ALTO)
    const bisagras = escena.estrellas.filter((e) => e.estado === 'bisagra')
    expect(bisagras.length).toBeGreaterThan(0)
    for (const b of bisagras) {
      const copias = escena.estrellas.filter((e) => e.cursoId === b.cursoId)
      expect(copias).toHaveLength(1)
    }
    expect(escena.figuras).toHaveLength(2)
  })
})
