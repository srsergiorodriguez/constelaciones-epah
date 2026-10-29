import { curriculum } from '../data/types'
import type { Programa } from '../data/types'

export interface Casilla {
  periodo: number
  columna: number
  cursoId: string
  alternativas: string[]
  nota: string
}

/** Casillas del plan de un programa, en orden cronológico (periodo, columna). */
export function planDe(programaId: string): Casilla[] {
  return curriculum.ofertas
    .filter(
      (o) =>
        o.programaId === programaId &&
        o.obligatoriedad === 'obligatorio' &&
        o.periodo !== null &&
        o.columna !== null,
    )
    .sort((a, b) => (a.periodo! - b.periodo!) || (a.columna! - b.columna!))
    .map((o) => ({
      periodo: o.periodo!,
      columna: o.columna!,
      cursoId: o.cursoId,
      alternativas: o.alternativas,
      nota: o.nota,
    }))
}

/** Énfasis de una maestría. Si no tiene, el programa es su propio plan. */
export function hijosDe(programaId: string): Programa[] {
  return Object.values(curriculum.programas).filter(
    (p) => p.tipo === 'enfasis' && p.padreId === programaId,
  )
}

/** Periodos presentes en un plan, ordenados. */
export function periodosDe(casillas: Casilla[]): number[] {
  return [...new Set(casillas.map((c) => c.periodo))].sort((a, b) => a - b)
}
