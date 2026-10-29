#!/usr/bin/env node
/**
 * make-figures.mjs — láminas de validación para docs/constellation.md
 *
 * No es la aplicación: genera figuras estáticas con el modelo real (data/*.csv)
 * y la gramática visual del design system (tipografías y colores de la Facultad).
 *
 *   node scripts/make-figures.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "assets");

/* ---------- CSV ---------- */
function readCsv(name) {
  const text = readFileSync(join(ROOT, "data", name), "utf8").trim();
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const cursos = readCsv("cursos.csv");
const curriculo = readCsv("curriculo.csv");
const programas = readCsv("programas.csv");
const curso = new Map(cursos.map((c) => [c.curso_id, c]));
const programa = new Map(programas.map((p) => [p.id, p]));

/* ---------- tokens (docs/design-system.md) ---------- */
const T = {
  paper: "#FFFFFF",
  papel: "#EFEEE8",
  ink: "#070707",
  ink2: "#3A3A38",
  ink3: "#5A5A58",
  rule: "#D9D7CF",
  grid: "#F1F0EA",
  // La app carga el kit de Adobe Fonts de la Facultad; aquí usamos la pila de respaldo.
  display: "'Helvetica Neue', 'Archivo', Arial, sans-serif",
  serif: "'Iowan Old Style', Baskerville, Georgia, serif",
  sans: "'Helvetica Neue', 'Archivo', Arial, sans-serif",
};

/* Paleta institucional. `vivo` = color de marca; tonos 1–4 para líneas y rótulos. */
const FAMILIA = {
  "mae-creacion": { vivo: "#DD1D80", tonos: ["#6A0E3E", "#931355", "#C41A72", "#DD1D80"], nombre: "magenta" },
  "mae-he": { vivo: "#007FE1", tonos: ["#003864", "#004E8B", "#0069BB", "#007FE1"], nombre: "azul" },
  "mae-gepc": { vivo: "#A40B9F", tonos: ["#640761", "#8A0986", "#A40B9F", "#B80CB3"], nombre: "morado" },
  "mae-periodismo": { vivo: "#00CC55", tonos: ["#00401B", "#005925", "#007832", "#009E42"], nombre: "verde" },
  "mae-patrimonio": { vivo: "#DCA70A", tonos: ["#453403", "#614904", "#826306", "#AC8208"], nombre: "ocre" },
};

const hermanos = (id) => programas.filter((x) => x.tipo === "enfasis" && x.padre_id === programa.get(id).padre_id);
const colorEnfasis = (id) => {
  const p = programa.get(id);
  const i = hermanos(id).findIndex((x) => x.id === id) % 4;
  return FAMILIA[p.padre_id].tonos[i];
};

/* ---------- glifos (centrados, radio en px) ---------- */
const sparkle = (r = 1, w = 0.17) =>
  `M0,${-r} C${w * r},${-w * r} ${w * r},${-w * r} ${r},0 C${w * r},${w * r} ${w * r},${w * r} 0,${r} ` +
  `C${-w * r},${w * r} ${-w * r},${w * r} ${-r},0 C${-w * r},${-w * r} ${-w * r},${-w * r} 0,${-r} Z`;

function starPoly(r = 1, points = 8, inner = 0.36) {
  let d = "";
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner * r;
    d += `${i === 0 ? "M" : "L"}${(Math.cos(a) * rad).toFixed(2)},${(Math.sin(a) * rad).toFixed(2)} `;
  }
  return d + "Z";
}

const GLIFO = {
  tronco: (r) => `<path d="${starPoly(r * 1.4, 8, 0.34)}" fill="${T.ink}"/>`,
  transversal: (r) => `<circle r="${(r * 1.62).toFixed(2)}" fill="none" stroke="${T.ink}" stroke-width="1"/><path d="${sparkle(1)}" fill="${T.ink}" transform="scale(${(r * 0.58).toFixed(2)})"/>`,
  laboratorio: (r) => `<circle r="${(r * 1.5).toFixed(2)}" fill="none" stroke="${T.ink}" stroke-width="1"/>`,
  electiva: (r) => `<path d="${sparkle(r * 1.18, 0.09)}" fill="none" stroke="${T.ink}" stroke-width="1.15"/>`,
  disciplinar: (r, c) => `<path d="${sparkle(r * 1.2)}" fill="${c || T.ink}"/>`,
  trayectoria: (r, c) => `<path d="${starPoly(r * 1.3, 6, 0.44)}" fill="${c || T.ink}"/>`,
};

/* ---------- figuras de constelación (0..100, y hacia abajo, raíz al pie) ----------
   Cada constelación tiene una silueta propia; las estrellas se reparten sobre el
   trazo por longitud de arco, como cuentas en un alambre. */
const FIG = JSON.parse(readFileSync(join(ROOT, "src", "lib", "data", "figures.json"), "utf8"));
const FIGS = Object.fromEntries(Object.entries(FIG.figuras).map(([k, v]) => [k, v.puntos]));
const FIGURA_DE = FIG.programa;
const NOMBRE_FIGURA = Object.fromEntries(Object.entries(FIG.figuras).map(([k, v]) => [k, v.nombre]));

/* Coloca n estrellas sobre la figura: primero en los vértices (como un asterismo
   real) y, si faltan, reparte sobre los tramos más largos. */
function starPositions(points, n) {
  const verts = [];
  for (const p of points) {
    if (!verts.some((v) => Math.hypot(v[0] - p[0], v[1] - p[1]) < 2)) verts.push(p);
  }
  if (n <= verts.length) {
    if (n === 1) return [verts[0]];
    return Array.from({ length: n }, (_, k) => verts[Math.round((k * (verts.length - 1)) / (n - 1))]);
  }
  // n > vértices: se subdividen los tramos más largos
  const out = verts.map((v) => [...v]);
  let guard = 0;
  while (out.length < n && guard++ < 60) {
    let best = 0, bestLen = -1;
    for (let i = 1; i < out.length; i++) {
      const d = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      if (d > bestLen) { bestLen = d; best = i; }
    }
    const a = out[best - 1], b = out[best];
    out.splice(best, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

/* Reparte n puntos por longitud de arco sobre el trazo completo. */
function resample(points, n) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    segs.push({ a: points[i - 1], b: points[i], len: d, start: total });
    total += d;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : (k / (n - 1)) * total;
    const sg = segs.find((x) => t <= x.start + x.len) || segs[segs.length - 1];
    const u = sg.len ? (t - sg.start) / sg.len : 0;
    out.push([sg.a[0] + (sg.b[0] - sg.a[0]) * u, sg.a[1] + (sg.b[1] - sg.a[1]) * u]);
  }
  return out;
}

/* ---------- layout ---------- */
const D2R = Math.PI / 180;
const polar = (cx, cy, ang, r) => [cx + Math.sin(ang * D2R) * r, cy - Math.cos(ang * D2R) * r];
const f = (n) => n.toFixed(1);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function layout(maestriaId, { cx, cy, r0 = 145, alto = 290, ancho = 168 }) {
  const enfasis = programas.filter((p) => p.tipo === "enfasis" && p.padre_id === maestriaId);
  const ofertas = curriculo.filter((r) => enfasis.some((e) => e.id === r.programa_id) && r.obligatoriedad === "obligatorio");
  const cuenta = new Map();
  for (const r of ofertas) {
    if (!cuenta.has(r.curso_id)) cuenta.set(r.curso_id, new Set());
    cuenta.get(r.curso_id).add(r.programa_id);
  }
  for (const [id, set] of cuenta) cuenta.set(id, set.size);
  const core = [...cuenta.entries()].filter(([, n]) => n === enfasis.length).map(([id]) => id);

  const k = enfasis.length;
  const arms = enfasis.map((e, i) => {
    const base = -90 + (360 / k) * i;
    // Riel primero (cuerpo y luego trayectoria): evita zigzag entre estrellas compartidas
    const riel = (r) => (["disciplinar", "electiva"].includes(r.eje_curricular) ? 0 : 1);
    const items = curriculo
      .filter((r) => r.programa_id === e.id && r.obligatoriedad === "obligatorio" && !core.includes(r.curso_id))
      .sort((a, b) => riel(a) - riel(b) || (+a.periodo - +b.periodo) || (+a.columna - +b.columna));
    const pts = starPositions(FIGS[FIGURA_DE[e.id]], items.length);
    const th = base * D2R, cos = Math.cos(th), sin = Math.sin(th);
    const root = polar(cx, cy, base, r0);
    const placed = pts.map(([x, y]) => {
      const lx = ((x - 50) / 100) * ancho;
      const ly = ((y - 100) / 100) * alto;
      return [root[0] + lx * cos - ly * sin, root[1] + lx * sin + ly * cos];
    });
    return { enfasis: e, base, color: FAMILIA[maestriaId].tonos[2], items, placed };
  });

  const acc = new Map();
  arms.forEach((a) => a.items.forEach((it, i) => {
    if (!acc.has(it.curso_id)) acc.set(it.curso_id, []);
    acc.get(it.curso_id).push(a.placed[i]);
  }));
  const pos = new Map([["cur-icg", [cx, cy]]]);
  for (const [id, pts] of acc) pos.set(id, [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]);
  arms.forEach((arm) => { arm.ents = ["cur-icg", ...arm.items.map((i) => i.curso_id)]; });

  const ring = core.filter((c) => c !== "cur-icg");
  const gaps = arms.map((a) => a.base + 180 / k);
  ring.forEach((id, i) => pos.set(id, polar(cx, cy, gaps[i % gaps.length], 62)));

  return { core, arms, pos, cuenta };
}

/* ---------- láminas ---------- */
function figureEnfasis() {
  const W = 1240, H = 940;
  const id = "enf-creacion-arte";
  const p = programa.get(id);
  const color = FAMILIA[p.padre_id].tonos[2];
  const items = curriculo
    .filter((r) => r.programa_id === id && r.obligatoriedad === "obligatorio")
    .sort((a, b) => (+a.periodo - +b.periodo) || (+a.columna - +b.columna));
  const propias = items.filter((r) => curso.get(r.curso_id).alcance === "enfasis" || curso.get(r.curso_id).n_programas === "1");
  const core = items.filter((r) => !propias.includes(r));

  // la figura se normaliza a su caja real para ocupar el área disponible
  const raw = resample(FIGS.mano, propias.length);
  const xs = raw.map((q) => q[0]), ys = raw.map((q) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const x0 = 620, boxW = 470, boxH = 520, topY = 200;
  const sx = boxW / (maxX - minX), sy = boxH / (maxY - minY);
  const sc = Math.min(sx, sy);
  const offX = x0 - ((minX + maxX) / 2) * sc;
  const offY = topY + boxH - maxY * sc;
  const pts = raw.map(([x, y]) => [offX + x * sc, offY + y * sc]);
  const cxF = x0, cyF = topY + boxH / 2;

  // núcleo: cuatro estrellas en arco bajo la figura
  const corePos = core.map((r, i) => [x0 + (i - (core.length - 1) / 2) * 104, topY + boxH + 120]);

  const full = FIGS.mano.map(([x, y]) => [offX + x * sc, offY + y * sc]);
  let out = `<path d="${full.map((q, i) => `${i ? "L" : "M"}${f(q[0])},${f(q[1])}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round" opacity=".55"/>`;
  out += `<line x1="${f(corePos[Math.floor(corePos.length / 2)][0])}" y1="${f(corePos[Math.floor(corePos.length / 2)][1])}" x2="${f(pts[0][0])}" y2="${f(pts[0][1])}" stroke="${color}" stroke-width="1.5"/>`;
  for (let i = 1; i < corePos.length; i++) {
    out += `<line x1="${f(corePos[i - 1][0])}" y1="${f(corePos[i - 1][1])}" x2="${f(corePos[i][0])}" y2="${f(corePos[i][1])}" stroke="${T.ink}" stroke-width="1" stroke-dasharray="2 4"/>`;
  }

  let stars = "", labels = "";
  const draw = (r, x, y, c, full) => {
    const k = curso.get(r.curso_id);
    const rr = 5.4 + 1.6 * Math.sqrt(+k.n_programas || 1);
    stars += `<g transform="translate(${f(x)},${f(y)})">${GLIFO[k.eje_curricular](rr, c)}</g>`;
    const packed = [];
    let line = "";
    for (const w of k.nombre.split(" ")) {
      if ((line + " " + w).trim().length > 20) { packed.push(line.trim()); line = w; }
      else line += " " + w;
    }
    if (line.trim()) packed.push(line.trim());
    const dx = x - cxF, dy = y - cyF, dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const anchor = Math.abs(ux) < 0.28 ? "middle" : ux > 0 ? "start" : "end";
    const lx = x + ux * (rr + 8) + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0);
    const ly = y + uy * (rr + 8) + 3;
    labels += packed.map((ln, li) =>
      `<text x="${f(lx)}" y="${f(ly + li * 12)}" text-anchor="${anchor}" font-family="${T.sans}" font-size="9.4" fill="${T.ink2}">${esc(ln)}</text>`).join("");
    labels += `<text x="${f(lx)}" y="${f(ly + packed.length * 12)}" text-anchor="${anchor}" font-family="${T.sans}" font-size="7.8" fill="${T.ink3}" letter-spacing=".1em">${esc(k.nombre_corto)} · ${k.creditos} CR</text>`;
  };

  propias.forEach((r, i) => draw(r, pts[i][0], pts[i][1], color, true));
  core.forEach((r, i) => draw(r, corePos[i][0], corePos[i][1], T.ink, true));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${T.paper}"/>
<text x="72" y="76" font-family="${T.display}" font-size="30" font-weight="700" fill="${T.ink}" letter-spacing="-0.02em">La mano</text>
<text x="72" y="100" font-family="${T.serif}" font-style="italic" font-size="13.5" fill="${T.ink3}">Maestría en Creación · Énfasis en Arte · 36 créditos en cuatro periodos</text>
<line x1="72" y1="120" x2="470" y2="120" stroke="${T.rule}"/>
<g>${out}${stars}${labels}</g>
<text x="72" y="${H - 54}" font-family="${T.sans}" font-size="8.4" fill="${T.ink3}">Estrellas de tinta: los cuatro cursos del núcleo, comunes a los cinco énfasis. Estrellas de color: los siete cursos propios.</text>
<text x="72" y="${H - 40}" font-family="${T.sans}" font-size="8.4" fill="${T.ink3}">El tamaño codifica cuántos programas comparten el curso; el glifo, su eje curricular.</text>
</svg>`;
}

function figureMotivos() {
  const W = 1280, H = 900;
  const ids = [
    "mae-creacion", "enf-creacion-arte", "enf-creacion-fotografia", "enf-creacion-composicion", "enf-creacion-produccion", "enf-creacion-escritura",
    "mae-he", "enf-he-literatura", "enf-he-historia-arte", "enf-he-clasicos", "enf-he-humanidades-digitales", "enf-he-humanidades-ambientales",
    "mae-gepc", "enf-gepc-negocios-musica", "enf-gepc-arte", "enf-gepc-edicion",
    "mae-periodismo", "mae-patrimonio",
  ];
  const cols = 6, cellW = 198, cellH = 198;

  const cell = (id, i) => {
    const x0 = 86 + (i % cols) * cellW;
    const y0 = 172 + Math.floor(i / cols) * (cellH + 30);
    const p = programa.get(id);
    const color = p.tipo === "enfasis" ? colorEnfasis(id) : FAMILIA[id].tonos[2];
    const fig = FIGS[FIGURA_DE[id]];
    const pts = resample(fig, 9);
    const s = 1.28;
    const P = pts.map(([x, y]) => [x0 + (x - 50) * s, y0 + (y - 50) * s]);
    const F = fig.map(([x, y]) => [x0 + (x - 50) * s, y0 + (y - 50) * s]);
    const path = F.map((q, j) => `${j ? "L" : "M"}${f(q[0])},${f(q[1])}`).join(" ");
    const stars = P.map((q, j) => `<g transform="translate(${f(q[0])},${f(q[1])})">${GLIFO[j % 3 === 0 ? "trayectoria" : "disciplinar"](j % 4 === 0 ? 4.6 : 3.8, color)}</g>`).join("");
    return `<g>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linejoin="round" opacity=".85"/>
      ${stars}
      <text x="${x0}" y="${y0 + 92}" text-anchor="middle" font-family="${T.sans}" font-size="10" fill="${T.ink}">${esc(p.nombre_corto)}</text>
      <text x="${x0}" y="${y0 + 106}" text-anchor="middle" font-family="${T.serif}" font-style="italic" font-size="9.6" fill="${T.ink3}">${NOMBRE_FIGURA[FIGURA_DE[id]]}</text>
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${T.paper}"/>
<text x="86" y="74" font-family="${T.display}" font-size="30" font-weight="700" fill="${T.ink}" letter-spacing="-0.02em">Un cielo con figuras</text>
<text x="86" y="98" font-family="${T.serif}" font-style="italic" font-size="13" fill="${T.ink3}">dieciocho constelaciones, cada una con una silueta tomada de su campo</text>
<line x1="86" y1="118" x2="640" y2="118" stroke="${T.rule}"/>
${ids.map(cell).join("")}
<text x="86" y="${H - 24}" font-family="${T.sans}" font-size="8.2" fill="${T.ink3}">Las estrellas se reparten sobre el trazo por longitud de arco: el número de cursos cambia la densidad, no la figura.</text>
</svg>`;
}

function figureGramatica() {
  const W = 1280, H = 800;
  const g = [
    ["tronco", "tronco", "Investigación, creación y gestión", "8 puntas · el eje de los 15 planes"],
    ["transversal", "transversal", "Curso transversal", "anillo + destello · menú de la Escuela"],
    ["laboratorio", "laboratorio", "Laboratorio de cocreación", "anillo vacío · codocencia"],
    ["electiva", "electiva", "Electiva", "destello hueco · casilla abierta"],
    ["disciplinar", "disciplinar", "Estudio 1", "destello lleno · cuerpo del énfasis"],
    ["trayectoria", "trayectoria", "Proyecto de creación 1", "estrella de 6 puntas · secuencia"],
  ].map(([k, eje, nombre, desc], i) => {
    const y = 178 + i * 86;
    return `<g transform="translate(92,${y})">
      ${GLIFO[k](9, T.ink)}
      <text x="56" y="-6" font-family="${T.sans}" font-size="9" fill="${T.ink}" letter-spacing=".14em">${eje.toUpperCase()}</text>
      <text x="56" y="11" font-family="${T.serif}" font-style="italic" font-size="13.5" fill="${T.ink2}">${nombre}</text>
      <text x="56" y="26" font-family="${T.sans}" font-size="8.4" fill="${T.ink3}">${desc}</text>
    </g>`;
  }).join("");

  const fams = [
    ["Creación", "mae-creacion"],
    ["Humanidades Experimentales", "mae-he"],
    ["Gestión Estratégica", "mae-gepc"],
    ["Periodismo", "mae-periodismo"],
    ["Patrimonio Cultural", "mae-patrimonio"],
  ];
  let pal = "";
  fams.forEach(([nombre, id], i) => {
    const y = 236 + i * 78;
    pal += `<text x="530" y="${y - 16}" font-family="${T.serif}" font-style="italic" font-size="13" fill="${T.ink2}">${nombre}</text>`;
    FAMILIA[id].tonos.forEach((t, j) => {
      pal += `<g transform="translate(${530 + j * 96},${y})"><rect width="80" height="32" fill="${t}"/>
        <text x="6" y="20" font-family="${T.sans}" font-size="7.6" fill="#fff" letter-spacing=".04em">${t.toUpperCase()}</text></g>`;
    });
    if (!FAMILIA[id].tonos.includes(FAMILIA[id].vivo)) {
      pal += `<g transform="translate(${530 + 4 * 96},${y})"><rect width="80" height="32" fill="${FAMILIA[id].vivo}"/>
        <text x="6" y="20" font-family="${T.sans}" font-size="7.6" fill="${T.ink}" letter-spacing=".04em">${FAMILIA[id].vivo.toUpperCase()}</text></g>`;
    }
  });

  const patterns = [
    ["solid", "", "obligatorio"],
    ["dash", "7 4", "alternativa · puente"],
    ["dot", "1.2 3.6", "referencia"],
    ["long", "16 3 2 3", "programa especializado"],
  ].map(([k, dash, desc], i) => {
    const y = 686 + i * 26;
    return `<line x1="530" y1="${y}" x2="612" y2="${y}" stroke="${T.ink}" stroke-width="1.6" stroke-dasharray="${dash}"/>
      <text x="624" y="${y + 3.6}" font-family="${T.sans}" font-size="8.4" fill="${T.ink3}">${k} — ${desc}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${T.paper}"/>
<text x="92" y="72" font-family="${T.display}" font-size="30" font-weight="700" fill="${T.ink}" letter-spacing="-0.02em">Gramática visual</text>
<text x="92" y="96" font-family="${T.serif}" font-style="italic" font-size="13" fill="${T.ink3}">glifos por eje · paleta institucional · patrones de línea</text>
<line x1="92" y1="118" x2="470" y2="118" stroke="${T.rule}"/>
<text x="92" y="152" font-family="${T.sans}" font-size="8" fill="${T.ink3}" letter-spacing=".16em">GLIFO · EJE CURRICULAR</text>
${g}
<line x1="480" y1="118" x2="480" y2="${H - 44}" stroke="${T.rule}"/>
<text x="530" y="152" font-family="${T.sans}" font-size="8" fill="${T.ink3}" letter-spacing=".16em">TONOS 1–4 + COLOR VIVO · FAMILIA DE MAESTRÍA</text>
${pal}
<line x1="530" y1="650" x2="${W - 92}" y2="650" stroke="${T.rule}"/>
<text x="530" y="672" font-family="${T.sans}" font-size="8" fill="${T.ink3}" letter-spacing=".16em">PATRÓN DE LÍNEA</text>
${patterns}
<text x="92" y="${H - 26}" font-family="${T.sans}" font-size="8.2" fill="${T.ink3}">Los tonos 1–4 verifican ≥ 3:1 sobre blanco; el color vivo se usa solo en rellenos con texto en tinta.</text>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "constelacion-arte.svg"), figureEnfasis());
writeFileSync(join(OUT, "constelaciones-figuras.svg"), figureMotivos());
writeFileSync(join(OUT, "gramatica-visual.svg"), figureGramatica());
console.log("✓ docs/assets/constelacion-arte.svg");
console.log("✓ docs/assets/constelaciones-figuras.svg");
console.log("✓ docs/assets/gramatica-visual.svg");
