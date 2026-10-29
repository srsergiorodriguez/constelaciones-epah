import { describe, expect, it } from 'vitest'
import { curriculum } from './types'

const obligatorias = curriculum.ofertas.filter((o) => o.obligatoriedad === 'obligatorio')
const cursos = Object.values(curriculum.cursos)
const programas = Object.values(curriculum.programas)

describe('contrato del currículo', () => {
  it('trae los ochenta y tres cursos y treinta y dos programas que salieron del PDF', () => {
    expect(cursos).toHaveLength(83)
    expect(programas).toHaveLength(32)
    expect(curriculum.ofertas).toHaveLength(236)
  })

  it('no deja referencias rotas ni cursos huérfanos', () => {
    for (const o of curriculum.ofertas) {
      expect(curriculum.programas[o.programaId], o.programaId).toBeDefined()
      expect(curriculum.cursos[o.cursoId], o.cursoId).toBeDefined()
    }
    for (const c of cursos) {
      const n = curriculum.ofertas.filter((o) => o.cursoId === c.id).length
      expect(n, `${c.id} sin programa`).toBeGreaterThan(0)
    }
  })

  it('cada plan de énfasis suma doce casillas y treinta y seis créditos', () => {
    for (const p of programas.filter((x) => x.tipo === 'enfasis')) {
      const propias = obligatorias.filter((o) => o.programaId === p.id)
      expect(propias.filter((o) => o.periodo !== null), p.id).toHaveLength(12)
      const cr = propias.reduce((a, o) => a + curriculum.cursos[o.cursoId].creditos * o.repeticiones, 0)
      expect(cr, p.id).toBe(36)
    }
  })

  it('cada especializado son cuatro cursos y doce créditos', () => {
    for (const p of programas.filter((x) => x.tipo === 'programa_especializado')) {
      const propias = obligatorias.filter((o) => o.programaId === p.id)
      const casillas = propias.reduce((a, o) => a + o.repeticiones, 0)
      expect(casillas, p.id).toBe(4)
      const cr = propias.reduce((a, o) => a + curriculum.cursos[o.cursoId].creditos * o.repeticiones, 0)
      expect(cr, p.id).toBe(12)
    }
  })
})
