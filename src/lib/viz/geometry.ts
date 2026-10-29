/** Geometría de los glifos. Un glifo = un eje curricular. */

export function sparklePath(r = 1, w = 0.17): string {
  const p = (n: number) => Number(n.toFixed(3))
  return [
    `M0,${p(-r)}`,
    `C${p(w * r)},${p(-w * r)} ${p(w * r)},${p(-w * r)} ${p(r)},0`,
    `C${p(w * r)},${p(w * r)} ${p(w * r)},${p(w * r)} 0,${p(r)}`,
    `C${p(-w * r)},${p(w * r)} ${p(-w * r)},${p(w * r)} ${p(-r)},0`,
    `C${p(-w * r)},${p(-w * r)} ${p(-w * r)},${p(-w * r)} 0,${p(-r)}`,
    'Z',
  ].join(' ')
}

export function polygonPath(r = 1, puntos = 8, interior = 0.36): string {
  const n = puntos * 2
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const rad = i % 2 === 0 ? r : interior * r
    out.push(`${i === 0 ? 'M' : 'L'}${(Math.cos(a) * rad).toFixed(2)},${(Math.sin(a) * rad).toFixed(2)}`)
  }
  return out.join(' ') + ' Z'
}

/** Envuelve una polilínea normalizada en un `d` de SVG. */
export function polylinePath(puntos: [number, number][]): string {
  return puntos
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
}
