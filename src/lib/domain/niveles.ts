import { curriculum } from '../data/types'

/** Las cuatro escalas de entrada. No son tipos: son tamaños de compromiso. */
export type Nivel = 'curso' | 'especializado' | 'maestria' | 'doctorado'

export interface Escalon {
  nivel: Nivel
  etiqueta: string
  detalle: string
  cuenta: number
  activo: boolean
}

const cuantos = (tipo: string) =>
  Object.values(curriculum.programas).filter((p) => p.tipo === tipo).length

export function escalones(): Escalon[] {
  return [
    {
      nivel: 'curso',
      etiqueta: 'Cursos umbrales',
      detalle: 'un curso solo, homologable',
      cuenta: Object.values(curriculum.cursos).filter((c) => c.umbral).length,
      activo: true,
    },
    {
      nivel: 'especializado',
      etiqueta: 'Programas Especializados',
      detalle: 'cuatro cursos en dos periodos',
      cuenta: cuantos('programa_especializado'),
      activo: true,
    },
    {
      nivel: 'maestria',
      etiqueta: 'Maestrías',
      detalle: 'con o sin énfasis',
      cuenta: cuantos('maestria'),
      activo: true,
    },
    {
      nivel: 'doctorado',
      etiqueta: 'Doctorado',
      detalle: 'pendiente de tabla',
      cuenta: 0,
      activo: false,
    },
  ]
}

/** Lo que el cursor está señalando en cualquier superficie: un curso o un programa. */
export interface Foco {
  tipo: 'curso' | 'programa'
  id: string
}
