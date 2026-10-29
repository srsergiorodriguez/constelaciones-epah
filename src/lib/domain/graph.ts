import { curriculum } from '../data/types'

const ofertasPorCurso = new Map<string, typeof curriculum.ofertas>()
for (const o of curriculum.ofertas) {
  if (o.obligatoriedad !== 'obligatorio') continue
  const arr = ofertasPorCurso.get(o.cursoId) ?? []
  arr.push(o)
  ofertasPorCurso.set(o.cursoId, arr)
}

/** Programas concretos (sin especializados) que incluyen el curso en su plan. */
export function programasOf(cursoId: string): string[] {
  const ids = (ofertasPorCurso.get(cursoId) ?? [])
    .map((o) => o.programaId)
    .filter((id) => curriculum.programas[id]?.tipo !== 'programa_especializado')
  return [...new Set(ids)]
}

/**
 * Cursos del plan de un programa. Una maestría no tiene plan propio: su
 * constelación es la unión de los planes de sus énfasis.
 */
export function cursosOf(programaId: string): string[] {
  const hijos = Object.values(curriculum.programas)
    .filter((p) => p.padreId === programaId && p.tipo === 'enfasis')
    .map((p) => p.id)
  const fuentes = hijos.length ? hijos : [programaId]
  return [
    ...new Set(
      curriculum.ofertas
        .filter((o) => fuentes.includes(o.programaId) && o.obligatoriedad === 'obligatorio')
        .map((o) => o.cursoId),
    ),
  ]
}

/** Planes que comparten la misma malla: los énfasis hermanos, o los hijos de una maestría. */
export function planesHermanos(programaId: string): string[] {
  const p = curriculum.programas[programaId]
  if (!p) return []
  if (p.tipo === 'enfasis') {
    return Object.values(curriculum.programas)
      .filter((x) => x.tipo === 'enfasis' && x.padreId === p.padreId)
      .map((x) => x.id)
  }
  if (p.tipo === 'maestria') {
    return Object.values(curriculum.programas)
      .filter((x) => x.tipo === 'enfasis' && x.padreId === p.id)
      .map((x) => x.id)
  }
  return []
}

/**
 * El tronco: cursos que aparecen en todos los planes hermanos (el tronco de la
 * maestría) más los cursos de alcance escuela. Lo que no está aquí es cuerpo
 * propio del programa y pertenece a su figura.
 */
export function nucleoOf(programaId: string): string[] {
  const propios = cursosOf(programaId)
  const hermanos = planesHermanos(programaId)
  const comunes =
    hermanos.length >= 2 ? propios.filter((c) => hermanos.every((h) => cursosOf(h).includes(c))) : []
  const escuela = propios.filter((c) => curriculum.cursos[c]?.alcance === 'escuela')
  return [...new Set([...comunes, ...escuela])]
}

/**
 * Grafo de una selección: un nodo por curso —nunca dos— y una arista por
 * pertenencia. Si un curso está en dos programas, hay un nodo y dos aristas.
 */
export function buildGraph(programaIds: string[]) {
  const aristas: { programaId: string; cursoId: string }[] = []
  for (const programaId of programaIds) {
    for (const cursoId of cursosOf(programaId)) aristas.push({ programaId, cursoId })
  }
  const nodos = [...new Set(aristas.map((a) => a.cursoId))]
  return { nodos, aristas }
}

/** Programas que comparten al menos un curso con el dado. */
export function vecinosOf(programaId: string): string[] {
  const otros = new Set<string>()
  for (const cursoId of cursosOf(programaId)) {
    for (const p of programasOf(cursoId)) if (p !== programaId) otros.add(p)
  }
  return [...otros]
}
