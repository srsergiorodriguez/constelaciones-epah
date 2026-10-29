import { curriculum } from '../data/types'

/** Familia cromática de cada maestría, resuelta contra los tokens CSS. */
const FAMILIA: Record<string, string> = {
  'mae-creacion': 'creacion',
  'mae-he': 'he',
  'mae-gepc': 'gepc',
  'mae-periodismo': 'perio',
  'mae-patrimonio': 'patrim',
}

export function familiaDe(programaId: string): string | null {
  const p = curriculum.programas[programaId]
  if (!p) return null
  const maestria = p.tipo === 'maestria' ? p.id : p.maestriaId
  return maestria ? (FAMILIA[maestria] ?? null) : null
}

/** Tono 1–4 de la familia. El tono 2 es el color de la maestría. */
export function tono(familia: string, n = 2): string {
  return `var(--c-${familia}-${n})`
}

export function vivo(familia: string): string {
  return `var(--c-${familia}-vivo)`
}

/** Familia de un curso: la de su primera maestría; tinta si es de toda la Escuela. */
export function familiaDelCurso(cursoId: string): string | null {
  const c = curriculum.cursos[cursoId]
  if (!c) return null
  if (c.alcance === 'escuela') return null // los cursos de toda la Escuela son tinta
  const maestrias = Object.entries(FAMILIA)
  for (const [id, fam] of maestrias) {
    const p = curriculum.programas[id]
    if (c.maestrias.includes(p.nombreCorto)) return fam
  }
  return null
}

/** Radio del glifo según cuántos programas comparten el curso. */
export function radioDe(nProgramas: number): number {
  return Math.min(15, Math.max(6, 6 + 2.1 * Math.sqrt(Math.max(0, nProgramas))))
}

/** Color de un programa dentro de una selección: primero tono 2, segundo tono 4. */
export function colorDe(programaId: string, indice: number): string {
  const fam = familiaDe(programaId)
  if (!fam) return 'var(--c-ink)'
  return tono(fam, indice === 0 ? 2 : 4)
}

/** Marca viva para la leyenda y los chips. */
export function vivoDe(programaId: string): string {
  const fam = familiaDe(programaId)
  return fam ? vivo(fam) : 'var(--c-ink)'
}
