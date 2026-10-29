import { describe, expect, it } from 'vitest'
import { hijosDe, periodosDe, planDe } from './plan'

describe('plan de estudios', () => {
  it('un énfasis tiene doce casillas en cuatro periodos, en orden', () => {
    const plan = planDe('enf-creacion-arte')
    expect(plan).toHaveLength(12)
    expect(periodosDe(plan)).toEqual([1, 2, 3, 4])
    const periodos = plan.map((c) => c.periodo)
    expect([...periodos].sort((a, b) => a - b)).toEqual(periodos)
  })

  it('un especializado son cuatro casillas en dos periodos, dos por periodo', () => {
    const plan = planDe('pe-creacion-arte')
    expect(plan).toHaveLength(4)
    expect(periodosDe(plan)).toEqual([1, 2])
    expect(plan.filter((c) => c.periodo === 1)).toHaveLength(2)
    expect(plan.filter((c) => c.periodo === 2)).toHaveLength(2)
  })

  it('una maestría a secas cursa el plan marco, con casillas abiertas', () => {
    const plan = planDe('mae-creacion')
    expect(plan).toHaveLength(12)
    expect(periodosDe(plan)).toEqual([1, 2, 3, 4])
    const abiertas = plan.filter((c) => c.cursoId === null)
    expect(abiertas.length).toBeGreaterThan(0)
    expect(abiertas.every((c) => c.abierta)).toBe(true)
    // y conserva sus énfasis como rutas posibles
    expect(hijosDe('mae-creacion')).toHaveLength(5)
    expect(hijosDe('enf-creacion-arte')).toHaveLength(0)
  })

})
