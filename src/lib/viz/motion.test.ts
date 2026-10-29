import { describe, expect, it } from 'vitest'
import { finDelPlan, planViaje, posicionEn } from './motion'
import type { Punto } from '../domain/figures'

const punto = (x: number, y: number): Punto => [x, y]
const desde = new Map([['cerca', punto(100, 100)], ['lejos', punto(100, 100)]])
const hasta = new Map([['cerca', punto(110, 100)], ['lejos', punto(400, 100)]])

describe('viaje de las estrellas', () => {
  it('todas aterrizan al mismo tiempo: el movimiento se lee como una reunión', () => {
    const plan = planViaje(desde, hasta)
    const fines = [...plan.values()].map((v) => v.fin)
    expect(new Set(fines).size).toBe(1)
  })

  it('la que viaja más lejos arranca antes', () => {
    const plan = planViaje(desde, hasta)
    expect(plan.get('lejos')!.inicio).toBeLessThan(plan.get('cerca')!.inicio)
  })

  it('en los extremos del tiempo, la estrella está en origen y destino', () => {
    const plan = planViaje(desde, hasta)
    const v = plan.get('lejos')!
    expect(posicionEn(v, v.inicio)).toEqual(v.desde)
    expect(posicionEn(v, v.fin)).toEqual(v.hasta)
    expect(posicionEn(v, finDelPlan(plan) + 1)).toEqual(v.hasta)
  })
})
