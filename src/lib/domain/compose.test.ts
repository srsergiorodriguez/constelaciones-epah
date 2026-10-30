import { describe, expect, it } from 'vitest'
import { compose, propiosOf } from './compose'
import { nucleoOf } from './graph'
import { curriculum } from '../data/types'

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
    expect(figura).toHaveLength(propiosOf(id).length)
    for (const e of nucleo) expect(e.y).toBeGreaterThan(ALTO * 0.8)
    for (const e of figura) {
      expect(e.x).toBeGreaterThanOrEqual(0)
      expect(e.x).toBeLessThanOrEqual(ANCHO)
      expect(e.y).toBeGreaterThanOrEqual(0)
      expect(e.y).toBeLessThanOrEqual(ALTO)
    }
    expect(escena.figuras).toHaveLength(1)
  })

  it('reparte los cursos a lo largo del trazo, en orden de plan', () => {
    const id = 'enf-creacion-arte'
    const escena = compose([id], ANCHO, ALTO)
    const orden = propiosOf(id)
    const posiciones = orden.map((c) => escena.estrellas.find((e) => e.cursoId === c)!)
    // ninguna pareja consecutiva queda encimada: eso era el «amontonamiento»
    for (let i = 1; i < posiciones.length; i++) {
      const d = Math.hypot(posiciones[i].x - posiciones[i - 1].x, posiciones[i].y - posiciones[i - 1].y)
      expect(d, `${orden[i - 1]} → ${orden[i]}`).toBeGreaterThan(18)
    }
    // y el conjunto ocupa buena parte de la figura, no un rincón
    const ancho = Math.max(...posiciones.map((p) => p.x)) - Math.min(...posiciones.map((p) => p.x))
    const alto = Math.max(...posiciones.map((p) => p.y)) - Math.min(...posiciones.map((p) => p.y))
    expect(Math.max(ancho, alto)).toBeGreaterThan(240)
  })

  it('una maestría es la familia de sus énfasis, no una figura estirada', () => {
    const escena = compose(['mae-creacion'], ANCHO, ALTO)
    // cinco figuras, una por énfasis
    expect(escena.figuras).toHaveLength(5)
    expect(curriculum.programas['mae-creacion']).toBeDefined()
    // todos los cursos propios están, repartidos entre figuras y enlaces
    const enConstelacion = escena.estrellas.filter((e) => e.estado === 'figura' || e.estado === 'enlace')
    expect(enConstelacion.length).toBe(propiosOf('mae-creacion').length)
    // los cuatro seminarios que comparten Composición y Producción quedan en el enlace
    const enlaces = escena.estrellas.filter((e) => e.estado === 'enlace').map((e) => e.cursoId)
    expect(enlaces).toContain('cur-musica-intro')
    expect(enlaces).toContain('cur-musica-contexto-1')
  })
})

describe('selector de siluetas', () => {
  it('sin selección hay una silueta por énfasis y por maestría sin énfasis', () => {
    const escena = compose([], ANCHO, ALTO)
    expect(escena.siluetas.length).toBe(15)
    const ids = escena.siluetas.map((s) => s.programaId)
    expect(ids).toContain('enf-creacion-arte')
    expect(ids).toContain('mae-periodismo')
    expect(ids).not.toContain('mae-creacion')
  })

  it('todas las siluetas caben en el escenario', () => {
    const escena = compose([], ANCHO, ALTO)
    for (const s of escena.siluetas) {
      for (const [x, y] of s.puntos) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(ANCHO)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(ALTO)
      }
    }
  })

  it('al elegir un programa las siluetas desaparecen', () => {
    expect(compose(['enf-creacion-arte'], ANCHO, ALTO).siluetas).toHaveLength(0)
  })
})
