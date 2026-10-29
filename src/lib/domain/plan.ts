import { curriculum } from '../data/types'
import type { Programa } from '../data/types'

export interface Casilla {
  periodo: number
  columna: number
  /** null cuando es una casilla abierta del plan marco. */
  cursoId: string | null
  abierta: string | null
  alternativas: string[]
  nota: string
}

/**
 * Casillas del plan de un programa, en orden cronológico (periodo, columna).
 * Una maestría sin énfasis cursa el plan marco: unos cursos concretos y unas
 * casillas abiertas que se llenan con cursos del énfasis elegido.
 */
export function planDe(programaId: string): Casilla[] {
  const marco = curriculum.planesMarco?.[programaId]
  if (marco) {
    return [...marco]
      .sort((a, b) => a.periodo - b.periodo || a.columna - b.columna)
      .map((c) => ({ ...c, alternativas: [], nota: '' }))
  }

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
      abierta: null,
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
