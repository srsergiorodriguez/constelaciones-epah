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

  it('un especializado son cuatro casillas, una por periodo', () => {
    const plan = planDe('pe-creacion-arte')
    expect(plan).toHaveLength(4)
    expect(periodosDe(plan)).toEqual([1, 2, 3, 4])
  })

  it('una maestría no tiene plan propio: tiene énfasis', () => {
    expect(planDe('mae-creacion')).toHaveLength(0)
    expect(hijosDe('mae-creacion')).toHaveLength(5)
    expect(hijosDe('enf-creacion-arte')).toHaveLength(0)
  })
})
