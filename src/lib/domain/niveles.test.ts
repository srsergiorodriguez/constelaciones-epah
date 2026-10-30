import { describe, expect, it } from 'vitest'
import { escalones } from './niveles'

describe('escalones', () => {
  it('son cuatro y el doctorado aún no está disponible', () => {
    const pasos = escalones()
    expect(pasos).toHaveLength(4)
    expect(pasos.filter((p) => p.activo)).toHaveLength(3)
    expect(pasos[3].nivel).toBe('doctorado')
    expect(pasos[3].activo).toBe(false)
  })

  it('cada escalón dice cuántos objetos hay en esa escala', () => {
    const [curso, especializado, maestria] = escalones()
    expect(curso.cuenta).toBe(41) // los umbrales, no los 83 cursos
    expect(especializado.cuenta).toBe(13)
    expect(maestria.cuenta).toBe(5)
  })
})
