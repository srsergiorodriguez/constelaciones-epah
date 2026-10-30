import curriculumJson from '../data/curriculum.json'
import figuresJson from '../data/figures.json'

export type Tipo = 'escuela' | 'doctorado' | 'maestria' | 'enfasis' | 'programa_especializado'
export type Eje = 'tronco' | 'transversal' | 'laboratorio' | 'electiva' | 'disciplinar' | 'trayectoria'
export type Formato =
  | 'introduccion'
  | 'curso'
  | 'seminario'
  | 'taller'
  | 'estudio'
  | 'laboratorio'
  | 'proyecto'
  | 'practica'
export type Alcance = 'escuela' | 'maestria' | 'enfasis'
export type Obligatoriedad = 'obligatorio' | 'alternativa'
export type Estado = 'verificado' | 'derivado' | 'propuesto' | 'pendiente'

export interface Programa {
  id: string
  nombre: string
  nombreCorto: string
  tipo: Tipo
  padreId: string | null
  maestriaId: string | null
  creditos: number | null
  estado: Estado
  nota: string
}

export interface Curso {
  id: string
  nombre: string
  codigo: string
  creditos: number
  eje: Eje
  alcance: Alcance
  nProgramas: number
  maestrias: string[]
  enfasis: string[]
  programasEspecializados: string[]
  /** Se puede tomar solo y homologar después en un programa mayor. */
  umbral: boolean
  /** Programas especializados cuyo cuerpo lo abre. */
  umbralDesde: string[]
  ofertaVariable: boolean
  estado: Estado
  nota: string
}

export interface Oferta {
  programaId: string
  cursoId: string
  periodo: number | null
  columna: number | null
  obligatoriedad: Obligatoriedad
  alternativas: string[]
  repeticiones: number
  estado: Estado
  nota: string
}

export interface CasillaMarco {
  periodo: number
  columna: number
  cursoId: string | null
  abierta: string | null
}

export interface Curriculum {
  version: number
  meta: { escuela: string; fuente: string; programas: number; cursos: number; ofertas: number }
  programas: Record<string, Programa>
  cursos: Record<string, Curso>
  ofertas: Oferta[]
  /** Plan de la maestría "a secas": casillas concretas y casillas abiertas. */
  planesMarco: Record<string, CasillaMarco[]>
}

export interface Figura {
  puntos: [number, number][]
  nombre: string
}

export interface Figuras {
  notas: string
  figuras: Record<string, Figura>
  programa: Record<string, string>
}

export const curriculum = curriculumJson as unknown as Curriculum
export const figuras = figuresJson as unknown as Figuras

export const programa = (id: string): Programa | undefined => curriculum.programas[id]
export const curso = (id: string): Curso | undefined => curriculum.cursos[id]
