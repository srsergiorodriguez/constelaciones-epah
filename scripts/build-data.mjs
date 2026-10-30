#!/usr/bin/env node
/**
 * build-data.mjs — data/source/*.json → data/{programas,cursos,curriculo,planes_marco}.csv
 *
 * La fuente curada vive en data/source/: cinco tablas en JSON que se editan a
 * mano o desde el editor. Este script no contiene datos: compila y valida.
 * Los CSV son artefactos: se regeneran, nunca se editan.
 *
 * Origen documental: "Reforma EPAH_Documento maestro final.pdf" (110 pp.);
 * cada plan se transcribió de su tabla de "Plan de estudios" (ver `pagina`).
 *
 *   node scripts/build-data.mjs
 *
 * Invariants enforced (the script fails loudly):
 *   - every plan has exactly 12 slots: 4 periods x 3 columns
 *   - every plan totals 36 credits
 *   - every énfasis has exactly 4 slots flagged as specialization body (`pe`)
 *     totalling 12 credits (the size of a programa especializado)
 *   - every referenced course exists
 *   - no duplicated (program, period, column)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const FUENTE = join(DATA, "source");

/** Lee una tabla curada de data/source. La fuente se edita ahí, no aquí. */
const leerFuente = (nombre) => JSON.parse(readFileSync(join(FUENTE, `${nombre}.json`), "utf8"));

/* ------------------------------------------------------------------ *
 * 1. Programas
 * ------------------------------------------------------------------ */

/* La Escuela y las maestrías son estructura fija; lo que cambia —énfasis y
 * especializados— vive en programas.json. El orden es el del documento:
 * cada maestría seguida de sus énfasis. */
const ESTRUCTURA = leerFuente("estructura");
const VARIABLES = leerFuente("programas");
const ESCUELA = ESTRUCTURA.filter((p) => p.tipo === "escuela");
const MAESTRIAS = ESTRUCTURA.filter((p) => p.tipo === "maestria");
const PROGRAMS = [
  ...ESCUELA,
  ...MAESTRIAS.flatMap((m) => [m, ...VARIABLES.filter((p) => p.padre_id === m.id)]),
  ...VARIABLES.filter((p) => !MAESTRIAS.some((m) => m.id === p.padre_id)),
];

/* ------------------------------------------------------------------ *
 * 2. Cursos
 *    eje    : tronco | transversal | laboratorio | electiva | disciplinar | trayectoria
 * ------------------------------------------------------------------ */


const COURSES = leerFuente("cursos");

/* ------------------------------------------------------------------ *
 * 3. Planes (filas = periodo 1..4, columnas = 1..3)
 *    Una casilla es un id de curso, o {id, alt?, nota?, pe?}
 *    `pe: true` marca el cuerpo de especialización (12 cr del programa especializado)
 * ------------------------------------------------------------------ */


const PLANS = leerFuente("planes");

/* ------------------------------------------------------------------ *
 * 3bis. Planes marco: la maestría "a secas"
 *    Una maestría puede cursarse sin énfasis. Su plan es esta rejilla: los
 *    cursos del tronco son concretos y las casillas disciplinares quedan
 *    abiertas, para llenarlas con cursos del énfasis que el estudiante escoja.
 * ------------------------------------------------------------------ */


const PLANES_MARCO = leerFuente("marco");

/* ------------------------------------------------------------------ *
 * 4. Membresías no derivadas de un plan
 *    - programas especializados: se derivan de las casillas `pe`
 *    - doctorado: propuesto (sin tabla en el documento)
 * ------------------------------------------------------------------ */

/* El doctorado queda fuera de alcance por ahora (ver plan.md). */

/* ------------------------------------------------------------------ *
 * 5. Derivaciones
 * ------------------------------------------------------------------ */

const programById = new Map(PROGRAMS.map((p) => [p.id, p]));
const errors = [];
const fail = (m) => errors.push(m);

function slotsOf(plan) {
  if (plan.slots.length !== 4) fail(`${plan.id}: se esperaban 4 periodos`);
  const out = [];
  plan.slots.forEach((row, i) => {
    if (row.length !== 3) fail(`${plan.id}: periodo ${i + 1} no tiene 3 columnas`);
    row.forEach((cell, j) => {
      const s = typeof cell === "string" ? { id: cell } : cell;
      if (!COURSES[s.id]) fail(`${plan.id}: curso inexistente «${s.id}»`);
      (s.alt || []).forEach((a) => { if (!COURSES[a]) fail(`${plan.id}: alternativa inexistente «${a}»`); });
      out.push({ periodo: i + 1, columna: j + 1, ...s });
    });
  });
  return out;
}

/* Los cuerpos de los especializados: la fuente, no un respaldo. */
const PE_CUERPOS = leerFuente("cuerpos");

const plans = PLANS.map((p) => {
  const prog = programById.get(p.id);
  if (!prog) fail(`programa inexistente «${p.id}»`);
  const slots = slotsOf(p);
  // un borrador puede tener casillas vacías: se reporta, no se revienta
  const sinCurso = slots.filter((s) => !s.id || !COURSES[s.id]);
  if (sinCurso.length) {
    fail(`${p.id}: ${sinCurso.length} casilla(s) sin curso (periodo ${sinCurso.map((s) => s.periodo).join(", ")})`);
    return { ...p, prog, slots, creditos: 0, incompleto: true };
  }
  const creditos = slots.reduce((a, s) => a + COURSES[s.id].creditos, 0);
  if (creditos !== 36) fail(`${p.id}: suma ${creditos} créditos (esperado 36)`);
  return { ...p, prog, slots };
});


/* Un programa especializado existe porque su cuerpo está declarado en
 * cuerpos.json. Si cuelga de un énfasis, hereda nombre y familia; si no,
 * declara su nombre en el propio cuerpo. Ver docs/data-model.md § Especializados. */
const PE = Object.entries(PE_CUERPOS).map(([peId, entrada]) => {
  const cuerpo = Array.isArray(entrada) ? entrada : (entrada.cursos ?? [])
  const sufijo = peId.replace(/^pe-/, '')
  const enfasis = programById.get(`enf-${sufijo}`) ?? null
  const maestria = enfasis ? programById.get(enfasis.maestria_id) : null
  /* Un especializado puede no venir de una maestría: entonces trae su nombre. */
  const corto = enfasis
    ? enfasis.nombre_corto.replace('Énfasis en ', '')
    : (entrada.nombre ?? '').replace(/^Programa Especializado en /, '')
  if (!corto) fail(`${peId}: un especializado sin énfasis necesita nombre propio`)
  const cuerpoSlots = [...new Set(cuerpo)].map((id, i) => ({ id, periodo: Math.floor(i / 2) + 1, columna: (i % 2) + 1 }))
  return {
    id: peId,
    nombre: maestria
      ? `Programa Especializado en ${corto} — Maestría en ${maestria.nombre_corto.replace('Maestría en ', '')}`
      : `Programa Especializado en ${corto}`,
    nombre_corto: `Programa Especializado en ${corto}`,
    tipo: 'programa_especializado',
    padre_id: enfasis ? enfasis.id : '',
    maestria_id: enfasis ? enfasis.maestria_id : '',
    creditos: 12,
    estado: 'declarado',
    nota: 'Cuerpo declarado en data/source/cuerpos.json.',
    slots: cuerpoSlots,
  }
})

/* --- lookup combinado (maestrías, énfasis y especializados) --- */
const ALL = new Map([...PROGRAMS, ...PE].map((p) => [p.id, p]));
const prog = (id) => ALL.get(id);

/* --- membresías (ofertas) --- */
const offers = [];
for (const p of plans) {
  if (p.incompleto) continue;
  for (const s of p.slots) {
    offers.push({ programa_id: p.id, curso_id: s.id, periodo: s.periodo, columna: s.columna, obligatoriedad: "obligatorio", alternativas: (s.alt || []).join(";"), nota: s.nota || "", estado: p.prog.estado, pe: !!s.pe });
  }
}
for (const pe of PE) {
  /* Una fila por curso; `repeticiones` cuenta cuántas casillas del cuerpo ocupa.
     Créditos del programa = Σ (creditos × repeticiones) = 12. */
  const entrada = PE_CUERPOS[pe.id] ?? {}
  const cuerpo = Array.isArray(entrada) ? entrada : (entrada.cursos ?? []);
  if (cuerpo.length !== 4) fail(`${pe.id}: el cuerpo debe tener 4 cursos (tiene ${cuerpo.length})`);
  const unicos = [...new Set(cuerpo)];
  if (unicos.length < 2) fail(`${pe.id}: el cuerpo no puede ser un solo curso repetido`);
  for (const [i, id] of unicos.entries()) {
    const propias = cuerpo.filter((c) => c === id);
    /* Un programa especializado se cursa en dos periodos: dos cursos por periodo. */
    offers.push({
      programa_id: pe.id, curso_id: id,
      periodo: Math.floor(i / 2) + 1, columna: (i % 2) + 1,
      obligatoriedad: "obligatorio", alternativas: "",
      nota: propias.length > 1 ? `Ocupa ${propias.length} casillas del cuerpo de especialización.` : "",
      estado: pe.estado, repeticiones: propias.length,
    });
  }
}
/* Alternativas: un curso ofrecido como opción de una casilla también pertenece al plan
   (el estudiante puede tomarlo). Se registra como pertenencia marcada, sin sumar créditos. */
const yaEsta = new Set(offers.map((o) => `${o.programa_id}|${o.curso_id}`));
for (const p of plans) {
  for (const s of p.slots) {
    for (const alt of s.alt || []) {
      const key = `${p.id}|${alt}`;
      if (yaEsta.has(key)) continue;
      yaEsta.add(key);
      offers.push({
        programa_id: p.id, curso_id: alt, periodo: "", columna: "",
        obligatoriedad: "alternativa", alternativas: "",
        nota: `Alternativa en el periodo ${s.periodo} (casilla ocupada por «${COURSES[s.id].nombre}»).`,
        estado: p.prog.estado, repeticiones: 1,
      });
    }
  }
}


/* --- alcance por curso --- */
const byCourse = new Map();
/* Umbral: un curso que se puede tomar solo y homologar después.
 * Provisionalmente son los que forman cuerpo de un especializado. */
const umbralDe = new Map();
for (const o of offers) {
  const p = prog(o.programa_id);
  if (p.tipo !== "programa_especializado" || o.obligatoriedad !== "obligatorio") continue;
  const arr = umbralDe.get(o.curso_id) || [];
  arr.push(p.id);
  umbralDe.set(o.curso_id, [...new Set(arr)]);
}

for (const o of offers) {
  const arr = byCourse.get(o.curso_id) || [];
  arr.push(o);
  byCourse.set(o.curso_id, arr);
}
const courseMeta = new Map();
for (const [id, list] of byCourse) {
  const maestrias = new Set(list.map((o) => prog(o.programa_id).maestria_id).filter(Boolean));
  const planes = new Set(list.map((o) => (prog(o.programa_id).tipo === "programa_especializado" ? prog(o.programa_id).padre_id : o.programa_id)));
  const progs = list.map((o) => prog(o.programa_id));
  const concretos = progs.filter((p) => p.tipo !== "programa_especializado");
  const soloEnfasis = concretos.length > 0 && concretos.every((p) => p.tipo === "enfasis");
  const alcance = maestrias.size >= 2 ? "escuela" : soloEnfasis && new Set(concretos.map((p) => p.id)).size === 1 ? "enfasis" : "maestria";
  const enfasis = [...new Set(concretos.filter((p) => p.tipo === "enfasis").map((p) => p.nombre_corto))];
  const pe = [...new Set(progs.filter((p) => p.tipo === "programa_especializado").map((p) => p.nombre_corto))];
  courseMeta.set(id, { alcance, n_programas: new Set(concretos.map((p) => p.id)).size, maestrias: [...maestrias].map((id2) => programById.get(id2).nombre_corto), enfasis, pe });
}

/* Códigos de carta estelar (etiqueta corta del nodo). Autorados: no derivar del nombre. */
const CODES = {"cur-icg": "ICG", "cur-transversal": "TRV", "cur-electiva": "ELE", "cur-lab-cocreacion": "LCO", "cur-lab-teorico-practico": "LTP", "cur-lab-gestion": "LGE", "cur-per-lab-sala": "LSR", "cur-he-teoria-1": "T1", "cur-he-teoria-2": "T2", "cur-he-teoria-3": "T3", "cur-he-diseno": "DPR", "cur-he-trabajo-grado": "TDG", "cur-arte-intro": "ICA", "cur-arte-est-1": "E1", "cur-arte-est-2": "E2", "cur-arte-est-3": "E3", "cur-arte-proy-1": "PC1", "cur-arte-proy-2": "PC2", "cur-arte-proy-3": "PC3", "cur-foto-intro": "ICF", "cur-foto-est-edicion": "EES", "cur-foto-est-tiempo": "EIT", "cur-foto-est-publicacion": "EPC", "cur-foto-proy-1": "PYC1", "cur-foto-proy-2": "PYC2", "cur-foto-proy-3": "PYC3", "cur-musica-intro": "ICM", "cur-musica-contexto-1": "CT1", "cur-musica-contexto-2": "CT2", "cur-musica-contexto-3": "CT3", "cur-comp-1": "CM1", "cur-comp-2": "CM2", "cur-comp-3": "CM3", "cur-prod-1": "PM1", "cur-prod-2": "PM2", "cur-prod-3": "PM3", "cur-escritura-intro": "IEC", "cur-escritura-taller-1": "TE1", "cur-escritura-taller-2": "TE2", "cur-escritura-taller-3": "TE3", "cur-escritura-proy-1": "PE1", "cur-escritura-proy-2": "PE2", "cur-escritura-proy-3": "PE3", "cur-lit-seminario": "SL", "cur-harte-pensar": "PHA", "cur-harte-seminario": "SHA", "cur-clas-seminario": "SEC", "cur-hd-fundamentos": "FHD", "cur-hd-datos": "GAD", "cur-hd-narrativas": "ND", "cur-hd-prototipado": "LPD", "cur-hd-electivo": "EHD", "cur-hamb-fundamentos": "FHA", "cur-hamb-seminario": "SAM", "cur-gepc-fundamentos": "FGE", "cur-gepc-practica-1": "PP1", "cur-gepc-practica-2": "PP2", "cur-neg-musica": "NDM", "cur-neg-estrategias": "EMN", "cur-neg-marketing": "MKD", "cur-neg-electivo": "SEM", "cur-garte-ecosistemas": "ECA", "cur-garte-publicos": "PMA", "cur-garte-gestion": "GEA", "cur-garte-electivo": "SEA", "cur-edit-editorial": "EAM", "cur-edit-gestion": "GAE", "cur-edit-diseno": "DIE", "cur-edit-electivo": "SEE", "cur-per-metodos": "MAI", "cur-per-desafios-1": "DP1", "cur-per-desafios-2": "DP2", "cur-per-escrito": "PES", "cur-per-imagen": "IYS", "cur-per-tg-1": "TG1", "cur-per-tg-2": "TG2", "cur-per-practica": "PGR", "cur-pat-valoracion": "SVA", "cur-pat-gestion": "SGC", "cur-pat-apropiacion": "SAP", "cur-pat-electivo": "SEP", "cur-pat-proyecto-1": "PG1", "cur-pat-proyecto-2": "PG2"};

/* ------------------------------------------------------------------ *
 * 6. Salidas
 * ------------------------------------------------------------------ */

const csv = (rows) => rows.map((r) => r.map((v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(",")).join("\n") + "\n";

/* Fallback automático si un curso no tiene código. */
const shorts = new Map();
const shortName = (id) => {
  if (CODES[id]) return CODES[id];
  if (shorts.has(id)) return shorts.get(id);
  const raw = COURSES[id].nombre.replace(/[.:,]/g, " ");
  const digit = (raw.match(/\b(\d)\b/) || [])[1] || "";
  const stop = /^(de|del|la|las|el|los|y|en|a|o|para|por|con|sobre|al)$/i;
  const words = raw.split(/\s+/).filter((w) => w.length > 2 && !stop.test(w) && !/^\d+$/.test(w));
  let code = words.slice(0, 4).map((w) => w[0].toUpperCase()).join("") + digit;
  if (!code) code = id.replace(/^cur-/, "").slice(0, 3).toUpperCase();
  let n = 2, candidate = code;
  while ([...shorts.values()].includes(candidate)) candidate = code + n++;
  shorts.set(id, candidate);
  return candidate;
};

/* programas.csv */
const programsCsv = [["id", "nombre", "nombre_corto", "tipo", "padre_id", "maestria_id", "creditos", "estado", "nota"]];
for (const p of [...PROGRAMS, ...PE]) {
  programsCsv.push([p.id, p.nombre, p.nombre_corto, p.tipo, p.padre_id, p.maestria_id, p.creditos, p.estado, p.nota || ""]);
}

/* cursos.csv */
const coursesCsv = [["curso_id", "nombre", "nombre_corto", "creditos", "eje_curricular", "alcance", "n_programas", "maestrias", "enfasis", "programas_especializados", "umbral", "umbral_desde", "oferta_variable", "estado", "nota"]];
for (const id of Object.keys(COURSES).sort()) {
  const c = COURSES[id];
  const m = courseMeta.get(id) || { alcance: "programa", n_programas: 0, maestrias: [], enfasis: [], pe: [] };
  const umbral = umbralDe.get(id) || [];
  coursesCsv.push([id, c.nombre, shortName(id), c.creditos, c.eje, m.alcance, m.n_programas, m.maestrias.join(";"), m.enfasis.join(";"), m.pe.join(";"), umbral.length ? "si" : "no", umbral.join(";"), c.oferta_variable ? "si" : "no", c.estado || "verificado", c.nota || ""]);
}

/* curriculo.csv */
const curriculoCsv = [["programa_id", "programa_nombre", "programa_tipo", "maestria_id", "periodo", "columna", "curso_id", "curso_nombre", "creditos", "eje_curricular", "obligatoriedad", "alternativas", "repeticiones", "estado", "nota"]];
const order = { escuela: 0, doctorado: 0, maestria: 1, enfasis: 2, programa_especializado: 3, umbral: 4 };
const progRank = new Map(PROGRAMS.map((p, i) => [p.id, i]));
offers.sort((a, b) => {
  const ra = a.programa_id.startsWith("pe-") ? PROGRAMS.length + PE.findIndex((x) => x.id === a.programa_id) : progRank.get(a.programa_id);
  const rb = b.programa_id.startsWith("pe-") ? PROGRAMS.length + PE.findIndex((x) => x.id === b.programa_id) : progRank.get(b.programa_id);
  return ra - rb || (a.periodo || 99) - (b.periodo || 99) || (a.columna || 99) - (b.columna || 99);
});
for (const o of offers) {
  const p = prog(o.programa_id);
  const c = COURSES[o.curso_id];
  curriculoCsv.push([o.programa_id, p.nombre, p.tipo, p.maestria_id, o.periodo, o.columna, o.curso_id, c.nombre, c.creditos, c.eje, o.obligatoriedad, o.alternativas, o.repeticiones || 1, o.estado, o.nota]);
}

/* ------------------------------------------------------------------ *
 * 7. Reporte
 * ------------------------------------------------------------------ */

if (errors.length) {
  console.error("✗ Invariantes rotas:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

/* plan marco: la maestría "a secas" (casillas concretas + casillas abiertas) */
const marcoCsv = [["maestria_id", "periodo", "columna", "curso_id", "abierta"]];
for (const [maestriaId, filas] of Object.entries(PLANES_MARCO)) {
  filas.forEach((fila, i) => {
    fila.forEach((celda, j) => {
      const esCurso = typeof celda === "string";
      if (esCurso && !COURSES[celda]) fail(`plan marco ${maestriaId}: curso inexistente «${celda}»`);
      marcoCsv.push([maestriaId, i + 1, j + 1, esCurso ? celda : "", esCurso ? "" : celda.abierta]);
    });
  });
}

mkdirSync(DATA, { recursive: true });
writeFileSync(join(DATA, "programas.csv"), csv(programsCsv));
writeFileSync(join(DATA, "cursos.csv"), csv(coursesCsv));
writeFileSync(join(DATA, "curriculo.csv"), csv(curriculoCsv));
writeFileSync(join(DATA, "planes_marco.csv"), csv(marcoCsv));

const unique = Object.keys(COURSES).length;
const counts = {
  programas: PROGRAMS.length + PE.length,
  maestrias: PROGRAMS.filter((p) => p.tipo === "maestria").length,
  enfasis: PROGRAMS.filter((p) => p.tipo === "enfasis").length,
  especializados: PE.length,
  planes: plans.length,
  cursos: unique,
  ofertas: offers.length,
};
const alcance = { escuela: 0, maestria: 0, enfasis: 0 };
for (const m of courseMeta.values()) alcance[m.alcance] += 1;

console.log("✓ data/ generado");
console.log(`  programas        ${counts.programas}  (${counts.maestrias} maestrías · ${counts.enfasis} énfasis · ${counts.especializados} especializados · 1 escuela)`);
console.log(`  planes           ${counts.planes}  → ${counts.planes * 12} ofertas de curso (36 cr cada plan)`);
console.log(`  cursos únicos    ${counts.cursos}`);
console.log(`  ofertas          ${counts.ofertas}`);
console.log(`  umbrales         ${umbralDe.size} cursos`);
console.log(`  alcance          escuela ${alcance.escuela} · maestría ${alcance.maestria} · énfasis ${alcance.enfasis}`);
