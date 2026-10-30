import type { Foco } from '../domain/niveles'

/**
 * Lleva el contenedor hasta la fila del foco si quedó fuera de vista.
 * Un solo sitio: las tres listas de la interfaz se comportan igual.
 */
export function desplazarAlFoco(contenedor: HTMLElement | null, foco: Foco | null): void {
  if (!contenedor || !foco) return
  const fila = contenedor.querySelector(`[data-foco="${CSS.escape(foco.id)}"]`)
  fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
