import { curriculum } from '../data/types'

/** Las cuatro escalas de entrada. No son tipos: son tamaños de compromiso. */
export type Nivel = 'curso' | 'especializado' | 'maestria' | 'doctorado'

export interface Escalon {
  nivel: Nivel
  credito: string
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
      credito: '3',
      etiqueta: 'Un curso',
      detalle: 'una estrella, homologable',
      cuenta: Object.keys(curriculum.cursos).length,
      activo: true,
    },
    {
      nivel: 'especializado',
      credito: '12',
      etiqueta: 'Programa Especializado',
      detalle: 'cuatro cursos en dos periodos',
      cuenta: cuantos('programa_especializado'),
      activo: true,
    },
    {
      nivel: 'maestria',
      credito: '36',
      etiqueta: 'Maestría',
      detalle: 'con o sin énfasis',
      cuenta: cuantos('maestria'),
      activo: true,
    },
    {
      nivel: 'doctorado',
      credito: '—',
      etiqueta: 'Doctorado',
      detalle: 'pendiente de tabla',
      cuenta: 0,
      activo: false,
    },
  ]
}
