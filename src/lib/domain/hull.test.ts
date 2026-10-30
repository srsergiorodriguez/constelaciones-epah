import { describe, expect, it } from 'vitest'
import { envolvente } from './hull'

describe('envolvente', () => {
  it('de un cuadrado devuelve sus cuatro esquinas, no los puntos de adentro', () => {
    const puntos: [number, number][] = [
      [0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [3, 7],
    ]
    expect(envolvente(puntos, 0)).toHaveLength(4)
  })

  it('el margen empuja el contorno hacia afuera', () => {
    const puntos: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
    const sin = envolvente(puntos, 0)
    const con = envolvente(puntos, 10)
    const ancho = (arr: [number, number][]) => Math.max(...arr.map((p) => p[0])) - Math.min(...arr.map((p) => p[0]))
    expect(ancho(con)).toBeGreaterThan(ancho(sin))
  })

  it('con menos de tres puntos no hay área', () => {
    expect(envolvente([[0, 0]], 5)).toHaveLength(1)
    expect(envolvente([[0, 0], [4, 4]], 5)).toHaveLength(2)
  })
})
