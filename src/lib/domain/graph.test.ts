import { describe, expect, it } from 'vitest'
import { buildGraph, cursosOf, nucleoOf, programasOf } from './graph'

describe('grafo de la selección', () => {
  it('un curso compartido es un solo nodo y una arista por programa', () => {
    const a = 'enf-creacion-composicion'
    const b = 'enf-creacion-produccion'
    const { nodos, aristas } = buildGraph([a, b])
    const compartido = 'cur-musica-intro'
    expect(programasOf(compartido)).toEqual(expect.arrayContaining([a, b]))
    expect(nodos.filter((n) => n === compartido)).toHaveLength(1)
    expect(aristas.filter((x) => x.cursoId === compartido)).toHaveLength(2)
  })

  it('una maestría es la unión de sus énfasis, no un plan propio', () => {
    const union = new Set(
      ['enf-creacion-arte', 'enf-creacion-fotografia', 'enf-creacion-composicion', 'enf-creacion-produccion', 'enf-creacion-escritura'].flatMap(
        (id) => cursosOf(id),
      ),
    )
    expect(new Set(cursosOf('mae-creacion'))).toEqual(union)
  })

  it('el núcleo son los cursos que el plan comparte con otro plan', () => {
    const nucleo = nucleoOf('enf-creacion-arte')
    expect(nucleo).toEqual(expect.arrayContaining(['cur-icg', 'cur-transversal', 'cur-lab-cocreacion']))
    expect(nucleo).not.toContain('cur-arte-intro')
  })
})
