import type { Punto } from './figures'

/**
 * Envolvente convexa (Andrew, cadena monótona) y un margen hacia afuera.
 * Es el único gesto nuevo del universo: una línea que encierra un grupo.
 */
export function envolvente(puntos: Punto[], margen = 14): Punto[] {
  if (puntos.length === 0) return []
  if (puntos.length === 1) return [puntos[0]]
  if (puntos.length === 2) return [puntos[0], puntos[1]]

  const orden = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cruz = (o: Punto, a: Punto, b: Punto) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const mitad = (arr: Punto[]) => {
    const pila: Punto[] = []
    for (const p of arr) {
      while (pila.length >= 2 && cruz(pila[pila.length - 2], pila[pila.length - 1], p) <= 0) pila.pop()
      pila.push(p)
    }
    return pila
  }

  const hull = [...mitad(orden).slice(0, -1), ...mitad([...orden].reverse()).slice(0, -1)]
  if (hull.length < 3) return hull

  const cx = hull.reduce((a, p) => a + p[0], 0) / hull.length
  const cy = hull.reduce((a, p) => a + p[1], 0) / hull.length
  return hull.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy) || 1
    return [x + (dx / d) * margen, y + (dy / d) * margen] as Punto
  })
}

/** `d` de SVG para una envolvente suavizada: cierra el contorno con curvas. */
export function envolventePath(puntos: Punto[]): string {
  if (puntos.length < 3) return ''
  const n = puntos.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const actual = puntos[i]
    const siguiente = puntos[(i + 1) % n]
    const medio: Punto = [(actual[0] + siguiente[0]) / 2, (actual[1] + siguiente[1]) / 2]
    if (i === 0) {
      const anterior = puntos[n - 1]
      d += `M${((anterior[0] + actual[0]) / 2).toFixed(1)},${((anterior[1] + actual[1]) / 2).toFixed(1)}`
    }
    d += ` Q${actual[0].toFixed(1)},${actual[1].toFixed(1)} ${medio[0].toFixed(1)},${medio[1].toFixed(1)}`
  }
  return d + ' Z'
}

/**
 * Polígono regular: el contorno de un programa que todavía no tiene figura.
 * Un especializado puede existir sin colgar de un énfasis (ver data-model.md);
 * hasta que alguien le dibuje una silueta, se registra como polígono.
 */
export function poligonoNeutro(cx: number, cy: number, lado: number, lados = 4): Punto[] {
  const r = lado / 2
  return Array.from({ length: lados }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / lados
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Punto
  })
}
