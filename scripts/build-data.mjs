#!/usr/bin/env node
/**
 * build-data.mjs — generates data/{programas,cursos,curriculo}.csv
 *
 * Source of truth: "Reforma EPAH_Documento maestro final.pdf" (110 pp.)
 * Every plan below was transcribed from the "Plan de estudios" table of the
 * corresponding énfasis (page numbers in `pagina`).
 *
 * The script is the single place where the curriculum is curated. The CSVs are
 * build artefacts: regenerate them, never edit them by hand.
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

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

/* ------------------------------------------------------------------ *
 * 1. Programas
 * ------------------------------------------------------------------ */

const PROGRAMS = [
  { id: "escuela-epah", nombre: "Escuela de Posgrados · Artes y Humanidades", nombre_corto: "Escuela", tipo: "escuela", padre_id: "", maestria_id: "", creditos: "", estado: "derivado", pagina: "" },


  { id: "mae-creacion", nombre: "Maestría en Creación", nombre_corto: "Maestría en Creación", tipo: "maestria", padre_id: "escuela-epah", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 1, nota: "El plan marco (p. 1) es la plantilla curricular; cada énfasis la instancia con sus propios cursos." },
  { id: "enf-creacion-arte", nombre: "Maestría en Creación — Énfasis en Arte", nombre_corto: "Énfasis en Arte", tipo: "enfasis", padre_id: "mae-creacion", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 4 },
  { id: "enf-creacion-fotografia", nombre: "Maestría en Creación — Énfasis en Fotografía, Imagen y Medios", nombre_corto: "Énfasis en Fotografía e imagen", tipo: "enfasis", padre_id: "mae-creacion", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 11 },
  { id: "enf-creacion-composicion", nombre: "Maestría en Creación — Énfasis en Composición Musical", nombre_corto: "Énfasis en Composición musical", tipo: "enfasis", padre_id: "mae-creacion", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 20 },
  { id: "enf-creacion-produccion", nombre: "Maestría en Creación — Énfasis en Producción Musical", nombre_corto: "Énfasis en Producción musical", tipo: "enfasis", padre_id: "mae-creacion", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 26 },
  { id: "enf-creacion-escritura", nombre: "Maestría en Creación — Énfasis en Escritura Creativa", nombre_corto: "Énfasis en Escritura creativa", tipo: "enfasis", padre_id: "mae-creacion", maestria_id: "mae-creacion", creditos: 36, estado: "verificado", pagina: 31 },

  { id: "mae-he", nombre: "Maestría en Humanidades Experimentales", nombre_corto: "Maestría en Humanidades Experimentales", tipo: "maestria", padre_id: "escuela-epah", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 41 },
  { id: "enf-he-literatura", nombre: "Maestría en Humanidades Experimentales — Énfasis en Literatura", nombre_corto: "Énfasis en Literatura", tipo: "enfasis", padre_id: "mae-he", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 46 },
  { id: "enf-he-historia-arte", nombre: "Maestría en Humanidades Experimentales — Énfasis en Historia y Teoría del Arte", nombre_corto: "Énfasis en Historia y teoría del arte", tipo: "enfasis", padre_id: "mae-he", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 51 },
  { id: "enf-he-clasicos", nombre: "Maestría en Humanidades Experimentales — Énfasis en Estudios Clásicos", nombre_corto: "Énfasis en Estudios clásicos", tipo: "enfasis", padre_id: "mae-he", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 55 },
  { id: "enf-he-humanidades-digitales", nombre: "Maestría en Humanidades Experimentales — Énfasis en Humanidades Digitales", nombre_corto: "Énfasis en Humanidades digitales", tipo: "enfasis", padre_id: "mae-he", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 58 },
  { id: "enf-he-humanidades-ambientales", nombre: "Maestría en Humanidades Experimentales — Énfasis en Humanidades Ambientales", nombre_corto: "Énfasis en Humanidades ambientales", tipo: "enfasis", padre_id: "mae-he", maestria_id: "mae-he", creditos: 36, estado: "verificado", pagina: 62 },

  { id: "mae-gepc", nombre: "Maestría en Gestión Estratégica de Proyectos Culturales", nombre_corto: "Maestría en Gestión Estratégica de Proyectos Culturales", tipo: "maestria", padre_id: "escuela-epah", maestria_id: "mae-gepc", creditos: 36, estado: "verificado", pagina: 70 },
  { id: "enf-gepc-negocios-musica", nombre: "Maestría en Gestión Estratégica de Proyectos Culturales — Énfasis en Negocios de la Música", nombre_corto: "Énfasis en Negocios de la música", tipo: "enfasis", padre_id: "mae-gepc", maestria_id: "mae-gepc", creditos: 36, estado: "verificado", pagina: 75 },
  { id: "enf-gepc-arte", nombre: "Maestría en Gestión Estratégica de Proyectos Culturales — Énfasis en Arte", nombre_corto: "Énfasis en Arte", tipo: "enfasis", padre_id: "mae-gepc", maestria_id: "mae-gepc", creditos: 36, estado: "verificado", pagina: 80 },
  { id: "enf-gepc-edicion", nombre: "Maestría en Gestión Estratégica de Proyectos Culturales — Énfasis en Edición", nombre_corto: "Énfasis en Edición", tipo: "enfasis", padre_id: "mae-gepc", maestria_id: "mae-gepc", creditos: 36, estado: "verificado", pagina: 85 },

  { id: "mae-periodismo", nombre: "Maestría en Periodismo", nombre_corto: "Maestría en Periodismo", tipo: "maestria", padre_id: "escuela-epah", maestria_id: "mae-periodismo", creditos: 36, estado: "verificado", pagina: 93, nota: "Sin énfasis: su plan es único." },
  { id: "mae-patrimonio", nombre: "Maestría en Patrimonio Cultural", nombre_corto: "Maestría en Patrimonio Cultural", tipo: "maestria", padre_id: "escuela-epah", maestria_id: "mae-patrimonio", creditos: 36, estado: "verificado", pagina: 106, nota: "Sin énfasis: su plan es único." },

];

/* ------------------------------------------------------------------ *
 * 2. Cursos
 *    eje    : tronco | transversal | laboratorio | electiva | disciplinar | trayectoria
 *    formato: introduccion | curso | seminario | taller | estudio | laboratorio | proyecto | practica
 * ------------------------------------------------------------------ */

const C = (nombre, eje, formato, opts = {}) => ({ nombre, eje, formato, creditos: 3, ...opts });

const COURSES = {
  /* --- tronco común de la escuela --- */
  "cur-icg": C("Investigación, creación y gestión", "tronco", "curso", { pagina: 1, nota: "Presente en los 15 planes: el centro del cielo." }),
  "cur-transversal": C("Curso transversal", "transversal", "seminario", { pagina: 1, oferta_variable: true, nota: "Menú abierto de la Escuela; el documento solo nombra un caso: «Seminario: lo que hacen las imágenes» (p. 12)." }),
  "cur-electiva": C("Electiva", "electiva", "curso", { pagina: 1, oferta_variable: true, nota: "Casilla abierta; se homologa desde cualquier programa de la Escuela." }),

  /* --- laboratorios --- */
  "cur-lab-cocreacion": C("Laboratorio de cocreación", "laboratorio", "laboratorio", { pagina: 2 }),
  "cur-lab-teorico-practico": C("Laboratorio teórico-práctico", "laboratorio", "laboratorio", { pagina: 42 }),
  "cur-lab-gestion": C("Laboratorio de gestión estratégica", "laboratorio", "laboratorio", { pagina: 70 }),
  "cur-per-lab-sala": C("Laboratorio: sala de redacción", "laboratorio", "laboratorio", { pagina: 93, nota: "«u otro laboratorio de la Escuela»." }),

  /* --- tronco de Humanidades Experimentales --- */
  "cur-he-teoria-1": C("Seminario teoría 1: de la Antigüedad a la Modernidad", "disciplinar", "seminario", { pagina: 47 }),
  "cur-he-teoria-2": C("Seminario teoría 2: teorías contemporáneas sobre arte y sociedad", "disciplinar", "seminario", { pagina: 47 }),
  "cur-he-teoria-3": C("Seminario teoría 3: pensamiento latinoamericano sobre arte y sociedad", "disciplinar", "seminario", { pagina: 48 }),
  "cur-he-diseno": C("Diseño de proyectos", "trayectoria", "curso", { pagina: 45 }),
  "cur-he-trabajo-grado": C("Trabajo de grado", "trayectoria", "proyecto", { pagina: 46, nota: "Puede ser colectivo e inter-énfasis (p. 46)." }),

  /* --- Creación · Arte --- */
  "cur-arte-intro": C("Introducción a la creación artística", "disciplinar", "introduccion", { pagina: 5 }),
  "cur-arte-est-1": C("Estudio 1", "disciplinar", "estudio", { pagina: 5, nota: "Temas rotativos: información y forma, abstracción remanufacturada, arte y contexto, acciones y medios (p. 71)." }),
  "cur-arte-est-2": C("Estudio 2", "disciplinar", "estudio", { pagina: 5 }),
  "cur-arte-est-3": C("Estudio 3", "disciplinar", "estudio", { pagina: 5 }),
  "cur-arte-proy-1": C("Proyecto de creación 1", "trayectoria", "proyecto", { pagina: 5 }),
  "cur-arte-proy-2": C("Proyecto de creación 2", "trayectoria", "proyecto", { pagina: 5 }),
  "cur-arte-proy-3": C("Proyecto de creación 3", "trayectoria", "proyecto", { pagina: 5 }),

  /* --- Creación · Fotografía, imagen y medios --- */
  "cur-foto-intro": C("Introducción a la creación fotográfica", "disciplinar", "introduccion", { pagina: 11 }),
  "cur-foto-est-edicion": C("Estudio: edición y secuencia", "disciplinar", "estudio", { pagina: 11 }),
  "cur-foto-est-tiempo": C("Estudio: imagen, tiempo y sonido", "disciplinar", "estudio", { pagina: 11 }),
  "cur-foto-est-publicacion": C("Estudio: publicación, puesta en escena y circulación", "disciplinar", "estudio", { pagina: 11 }),
  "cur-foto-proy-1": C("Proyecto y crítica 1", "trayectoria", "proyecto", { pagina: 11 }),
  "cur-foto-proy-2": C("Proyecto y crítica 2", "trayectoria", "proyecto", { pagina: 11 }),
  "cur-foto-proy-3": C("Proyecto y crítica 3", "trayectoria", "proyecto", { pagina: 11 }),

  /* --- Creación · Composición y Producción musical (comparten introducción y seminarios de contexto) --- */
  "cur-musica-intro": C("Introducción a la creación musical", "disciplinar", "introduccion", { pagina: 20, nota: "Compartido por Composición y Producción musical." }),
  "cur-musica-contexto-1": C("Seminario de contexto histórico-teórico 1", "disciplinar", "seminario", { pagina: 21, nota: "Compartido por Composición y Producción musical." }),
  "cur-musica-contexto-2": C("Seminario de contexto histórico-teórico 2", "disciplinar", "seminario", { pagina: 21 }),
  "cur-musica-contexto-3": C("Seminario de contexto histórico-teórico 3", "disciplinar", "seminario", { pagina: 21 }),
  "cur-comp-1": C("Composición musical 1", "trayectoria", "proyecto", { pagina: 21 }),
  "cur-comp-2": C("Composición musical 2", "trayectoria", "proyecto", { pagina: 21 }),
  "cur-comp-3": C("Composición musical 3", "trayectoria", "proyecto", { pagina: 21 }),
  "cur-prod-1": C("Producción musical 1: técnicas en producción", "trayectoria", "proyecto", { pagina: 27 }),
  "cur-prod-2": C("Producción musical 2: producción musical avanzada", "trayectoria", "proyecto", { pagina: 27 }),
  "cur-prod-3": C("Producción musical 3: proyecto", "trayectoria", "proyecto", { pagina: 27 }),

  /* --- Creación · Escritura creativa --- */
  "cur-escritura-intro": C("Introducción a la escritura creativa", "disciplinar", "introduccion", { pagina: 31 }),
  "cur-escritura-taller-1": C("Taller de escritura 1", "disciplinar", "taller", { pagina: 31, oferta_variable: true, nota: "Oferta rotativa: crónica, poesía, cuento, autoficción… (p. 34)." }),
  "cur-escritura-taller-2": C("Taller de escritura 2", "disciplinar", "taller", { pagina: 31, oferta_variable: true }),
  "cur-escritura-taller-3": C("Taller de escritura 3", "disciplinar", "taller", { pagina: 31, oferta_variable: true }),
  "cur-escritura-proy-1": C("Proyecto de escritura 1", "trayectoria", "proyecto", { pagina: 31 }),
  "cur-escritura-proy-2": C("Proyecto de escritura 2", "trayectoria", "proyecto", { pagina: 31 }),
  "cur-escritura-proy-3": C("Proyecto de escritura 3", "trayectoria", "proyecto", { pagina: 31 }),

  /* --- HE · Literatura --- */
  "cur-lit-seminario": C("Seminario de literatura", "disciplinar", "seminario", { pagina: 49, oferta_variable: true, nota: "Familia de seminarios; el plan lo ofrece dos veces (p. 1 y p. 4)." }),

  /* --- HE · Historia y teoría del arte --- */
  "cur-harte-pensar": C("Pensar la historia del arte", "disciplinar", "curso", { pagina: 51 }),
  "cur-harte-seminario": C("Seminario de historia del arte", "disciplinar", "seminario", { pagina: 51, oferta_variable: true, nota: "El plan lo ofrece tres veces (p. 2, 3 y 4)." }),

  /* --- HE · Estudios clásicos --- */
  "cur-clas-seminario": C("Seminario de estudios clásicos", "disciplinar", "seminario", { pagina: 55, oferta_variable: true, nota: "El plan lo ofrece tres veces (p. 2, 3 y 4)." }),

  /* --- HE · Humanidades digitales --- */
  "cur-hd-fundamentos": C("Fundamentos en humanidades digitales", "disciplinar", "introduccion", { pagina: 58 }),
  "cur-hd-datos": C("Gestión y análisis de datos e imágenes", "disciplinar", "curso", { pagina: 58 }),
  "cur-hd-narrativas": C("Narrativas digitales: del concepto a la interfaz", "disciplinar", "curso", { pagina: 58 }),
  "cur-hd-prototipado": C("Laboratorio de prototipado y creación digital", "disciplinar", "laboratorio", { pagina: 58 }),
  "cur-hd-electivo": C("Seminario electivo en humanidades digitales", "electiva", "seminario", { pagina: 58, oferta_variable: true }),

  /* --- HE · Humanidades ambientales --- */
  "cur-hamb-fundamentos": C("Fundamentos en humanidades ambientales", "disciplinar", "introduccion", { pagina: 62 }),
  "cur-hamb-seminario": C("Seminario en humanidades ambientales", "disciplinar", "seminario", { pagina: 62, oferta_variable: true, nota: "El plan lo ofrece tres veces (p. 2, 3 y 4)." }),

  /* --- GEPC · tronco --- */
  "cur-gepc-fundamentos": C("Fundamentos de la gestión estratégica en proyectos culturales", "disciplinar", "introduccion", { pagina: 70 }),
  "cur-gepc-practica-1": C("Práctica de profundización 1", "trayectoria", "practica", { pagina: 72 }),
  "cur-gepc-practica-2": C("Práctica de profundización 2", "trayectoria", "practica", { pagina: 72 }),

  /* --- GEPC · Negocios de la música --- */
  "cur-neg-musica": C("Negocios de la música", "disciplinar", "curso", { pagina: 75 }),
  "cur-neg-estrategias": C("Estrategias y modelos de negocio de la música", "disciplinar", "curso", { pagina: 75 }),
  "cur-neg-marketing": C("Marketing y desarrollo de proyectos en la industria de la música", "disciplinar", "curso", { pagina: 76 }),
  "cur-neg-electivo": C("Seminario electivo en proyectos de música", "electiva", "seminario", { pagina: 76, oferta_variable: true }),

  /* --- GEPC · Arte --- */
  "cur-garte-ecosistemas": C("Ecosistemas y circuitos del arte", "disciplinar", "curso", { pagina: 80 }),
  "cur-garte-publicos": C("Públicos, mediación y circulación del arte", "disciplinar", "curso", { pagina: 80 }),
  "cur-garte-gestion": C("Gestión estratégica en proyectos de arte", "disciplinar", "curso", { pagina: 80 }),
  "cur-garte-electivo": C("Seminario electivo en proyectos de arte", "electiva", "seminario", { pagina: 80, oferta_variable: true }),

  /* --- GEPC · Edición --- */
  "cur-edit-editorial": C("Editorial, autores, mesa y libro", "disciplinar", "curso", { pagina: 85 }),
  "cur-edit-gestion": C("Gestión y autogestión de proyectos editoriales", "disciplinar", "curso", { pagina: 86 }),
  "cur-edit-diseno": C("Diseño editorial", "disciplinar", "curso", { pagina: 86 }),
  "cur-edit-electivo": C("Seminario electivo en proyectos de edición", "electiva", "seminario", { pagina: 86, oferta_variable: true }),

  /* --- Periodismo --- */
  "cur-per-metodos": C("Métodos avanzados de investigación periodística", "disciplinar", "curso", { pagina: 93 }),
  "cur-per-desafios-1": C("Desafíos periodísticos 1", "disciplinar", "seminario", { pagina: 93, oferta_variable: true }),
  "cur-per-desafios-2": C("Desafíos periodísticos 2", "disciplinar", "seminario", { pagina: 94, oferta_variable: true }),
  "cur-per-escrito": C("Periodismo escrito", "disciplinar", "taller", { pagina: 93 }),
  "cur-per-imagen": C("Imagen y sonido", "disciplinar", "taller", { pagina: 93 }),
  "cur-per-tg-1": C("Trabajo de grado 1", "trayectoria", "proyecto", { pagina: 94 }),
  "cur-per-tg-2": C("Trabajo de grado 2", "trayectoria", "proyecto", { pagina: 94 }),
  "cur-per-practica": C("Práctica de grado", "trayectoria", "practica", { pagina: 94, nota: "6 créditos; reemplaza Trabajo de grado 1 y 2." }),

  /* --- Patrimonio cultural --- */
  "cur-pat-valoracion": C("Seminario de valoración", "disciplinar", "seminario", { pagina: 106 }),
  "cur-pat-gestion": C("Seminario de gestión, conservación y salvaguardia", "disciplinar", "seminario", { pagina: 106 }),
  "cur-pat-apropiacion": C("Seminario de apropiación", "disciplinar", "seminario", { pagina: 106 }),
  "cur-pat-electivo": C("Seminario electivo en patrimonio", "electiva", "seminario", { pagina: 106, oferta_variable: true, nota: "El plan lo ofrece dos veces (p. 1 y p. 4)." }),
  "cur-pat-proyecto-1": C("Proyecto de grado 1", "trayectoria", "proyecto", { pagina: 106 }),
  "cur-pat-proyecto-2": C("Proyecto de grado 2", "trayectoria", "proyecto", { pagina: 106 }),
};

/* ------------------------------------------------------------------ *
 * 3. Planes (filas = periodo 1..4, columnas = 1..3)
 *    Una casilla es un id de curso, o {id, alt?, nota?, pe?}
 *    `pe: true` marca el cuerpo de especialización (12 cr del programa especializado)
 * ------------------------------------------------------------------ */

const S = (id, opts = {}) => ({ id, ...opts });

const PLANS = [
  {
    id: "enf-creacion-arte", pagina: 4,
    slots: [
      [S("cur-icg"), S("cur-arte-intro", { pe: true }), S("cur-transversal")],
      [S("cur-arte-proy-1"), S("cur-arte-est-1", { pe: true }), S("cur-lab-cocreacion")],
      [S("cur-arte-proy-2"), S("cur-arte-est-2", { pe: true }), S("cur-electiva")],
      [S("cur-arte-proy-3"), S("cur-arte-est-3", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-creacion-fotografia", pagina: 11,
    slots: [
      [S("cur-icg"), S("cur-foto-intro", { pe: true }), S("cur-transversal", { nota: "Se ofrece «Seminario: lo que hacen las imágenes» (p. 12)." })],
      [S("cur-foto-proy-1"), S("cur-foto-est-edicion", { pe: true }), S("cur-lab-cocreacion")],
      [S("cur-foto-proy-2"), S("cur-foto-est-tiempo", { pe: true }), S("cur-electiva")],
      [S("cur-foto-proy-3"), S("cur-foto-est-publicacion", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-creacion-composicion", pagina: 20,
    slots: [
      [S("cur-icg"), S("cur-musica-intro", { pe: true }), S("cur-transversal")],
      [S("cur-comp-1"), S("cur-musica-contexto-1", { pe: true }), S("cur-lab-cocreacion")],
      [S("cur-comp-2"), S("cur-musica-contexto-2", { pe: true }), S("cur-electiva")],
      [S("cur-comp-3"), S("cur-musica-contexto-3", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-creacion-produccion", pagina: 26,
    slots: [
      [S("cur-icg"), S("cur-musica-intro", { pe: true }), S("cur-transversal")],
      [S("cur-prod-1"), S("cur-musica-contexto-1", { pe: true }), S("cur-lab-cocreacion", { alt: ["cur-lab-gestion"], nota: "«Laboratorio cocreación o gestión estratégica»." })],
      [S("cur-prod-2"), S("cur-musica-contexto-2", { pe: true }), S("cur-electiva")],
      [S("cur-prod-3"), S("cur-musica-contexto-3", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-creacion-escritura", pagina: 31,
    slots: [
      [S("cur-icg"), S("cur-escritura-intro", { pe: true }), S("cur-transversal")],
      [S("cur-escritura-proy-1"), S("cur-escritura-taller-1", { pe: true }), S("cur-lab-cocreacion")],
      [S("cur-escritura-proy-2"), S("cur-escritura-taller-2", { pe: true }), S("cur-electiva")],
      [S("cur-escritura-proy-3"), S("cur-escritura-taller-3", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-he-literatura", pagina: 46,
    slots: [
      [S("cur-icg"), S("cur-he-teoria-1", { pe: true }), S("cur-lit-seminario", { pe: true })],
      [S("cur-lab-teorico-practico"), S("cur-he-teoria-2", { pe: true }), S("cur-transversal")],
      [S("cur-he-diseno"), S("cur-he-teoria-3", { pe: true }), S("cur-electiva")],
      [S("cur-he-trabajo-grado"), S("cur-lit-seminario"), S("cur-transversal")],
    ],
  },
  {
    id: "enf-he-historia-arte", pagina: 51,
    slots: [
      [S("cur-icg"), S("cur-harte-pensar", { pe: true }), S("cur-transversal")],
      [S("cur-lab-teorico-practico"), S("cur-harte-seminario", { pe: true }), S("cur-electiva")],
      [S("cur-he-diseno"), S("cur-harte-seminario", { pe: true }), S("cur-he-teoria-1", { alt: ["cur-he-teoria-2", "cur-he-teoria-3"], nota: "«Seminario teoría 1, 2 o 3»." })],
      [S("cur-he-trabajo-grado"), S("cur-harte-seminario", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-he-clasicos", pagina: 55,
    slots: [
      [S("cur-icg"), S("cur-he-teoria-1", { pe: true }), S("cur-transversal")],
      [S("cur-lab-teorico-practico"), S("cur-clas-seminario", { pe: true }), S("cur-electiva")],
      [S("cur-he-diseno"), S("cur-clas-seminario", { pe: true }), S("cur-he-teoria-2", { alt: ["cur-he-teoria-3"], nota: "«Seminario teoría 2 o 3»." })],
      [S("cur-he-trabajo-grado"), S("cur-clas-seminario", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-he-humanidades-digitales", pagina: 58,
    slots: [
      [S("cur-icg"), S("cur-hd-fundamentos", { pe: true }), S("cur-transversal")],
      [S("cur-lab-teorico-practico"), S("cur-hd-datos", { pe: true }), S("cur-hd-electivo")],
      [S("cur-he-diseno"), S("cur-hd-narrativas", { pe: true }), S("cur-electiva")],
      [S("cur-he-trabajo-grado"), S("cur-hd-prototipado", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-he-humanidades-ambientales", pagina: 62,
    slots: [
      [S("cur-icg"), S("cur-hamb-fundamentos", { pe: true }), S("cur-transversal")],
      [S("cur-lab-teorico-practico"), S("cur-hamb-seminario", { pe: true }), S("cur-he-teoria-1", { alt: ["cur-he-teoria-2", "cur-he-teoria-3", "cur-hd-electivo"], nota: "«Seminario teoría 1, 2 o 3, o seminario electivo en humanidades digitales»." })],
      [S("cur-he-diseno"), S("cur-hamb-seminario", { pe: true }), S("cur-electiva")],
      [S("cur-he-trabajo-grado"), S("cur-hamb-seminario", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-gepc-negocios-musica", pagina: 75,
    slots: [
      [S("cur-icg"), S("cur-gepc-fundamentos"), S("cur-neg-musica", { pe: true })],
      [S("cur-lab-gestion"), S("cur-neg-estrategias", { pe: true }), S("cur-transversal")],
      [S("cur-gepc-practica-1"), S("cur-neg-marketing", { pe: true }), S("cur-electiva")],
      [S("cur-gepc-practica-2"), S("cur-neg-electivo", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-gepc-arte", pagina: 80,
    slots: [
      [S("cur-icg"), S("cur-gepc-fundamentos"), S("cur-garte-ecosistemas", { pe: true })],
      [S("cur-lab-gestion", { nota: "«Laboratorio de gestión estratégica / cocreación»." }), S("cur-garte-publicos", { pe: true }), S("cur-transversal")],
      [S("cur-gepc-practica-1"), S("cur-garte-gestion", { pe: true }), S("cur-electiva")],
      [S("cur-gepc-practica-2"), S("cur-garte-electivo", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "enf-gepc-edicion", pagina: 85,
    slots: [
      [S("cur-icg"), S("cur-gepc-fundamentos"), S("cur-edit-editorial", { pe: true })],
      [S("cur-lab-gestion", { nota: "«Laboratorio de gestión estratégica / cocreación»." }), S("cur-edit-gestion", { pe: true }), S("cur-transversal")],
      [S("cur-gepc-practica-1"), S("cur-edit-diseno", { pe: true }), S("cur-electiva")],
      [S("cur-gepc-practica-2"), S("cur-edit-electivo", { pe: true }), S("cur-transversal")],
    ],
  },
  {
    id: "mae-periodismo", pagina: 93,
    slots: [
      [S("cur-icg"), S("cur-per-metodos"), S("cur-transversal")],
      [S("cur-per-desafios-1"), S("cur-per-escrito"), S("cur-per-lab-sala")],
      [S("cur-per-tg-1", { alt: ["cur-per-practica"], nota: "«Trabajo de grado 1 o Práctica de grado»." }), S("cur-per-imagen"), S("cur-transversal")],
      [S("cur-per-tg-2", { alt: ["cur-per-practica"], nota: "«Trabajo de grado 2 o Práctica de grado»." }), S("cur-per-desafios-2"), S("cur-electiva")],
    ],
  },
  {
    id: "mae-patrimonio", pagina: 106,
    slots: [
      [S("cur-icg"), S("cur-pat-valoracion"), S("cur-pat-electivo")],
      [S("cur-lab-gestion", { alt: ["cur-lab-teorico-practico", "cur-lab-cocreacion"], nota: "«Laboratorio de gestión estratégica, teórico práctico o cocreación»." }), S("cur-pat-gestion"), S("cur-transversal")],
      [S("cur-pat-proyecto-1"), S("cur-pat-apropiacion"), S("cur-electiva")],
      [S("cur-pat-proyecto-2"), S("cur-pat-electivo"), S("cur-transversal")],
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 3bis. Planes marco: la maestría "a secas"
 *    Una maestría puede cursarse sin énfasis. Su plan es esta rejilla: los
 *    cursos del tronco son concretos y las casillas disciplinares quedan
 *    abiertas, para llenarlas con cursos del énfasis que el estudiante escoja.
 * ------------------------------------------------------------------ */

const A = (abierta) => ({ abierta });

const PLANES_MARCO = {
  "mae-creacion": [
    ["cur-icg", A("Introducción disciplinar"), "cur-transversal"],
    [A("Proyecto / Composición / Producción 1"), A("Seminario disciplinar 1"), "cur-lab-cocreacion"],
    [A("Proyecto / composición / producción 2"), A("Seminario disciplinar 2"), "cur-electiva"],
    [A("Proyecto / composición / producción 3"), A("Seminario disciplinar 3"), "cur-transversal"],
  ],
  "mae-he": [
    ["cur-icg", A("Introducción disciplinar"), "cur-transversal"],
    ["cur-lab-teorico-practico", A("Seminario disciplinar 1"), "cur-electiva"],
    ["cur-he-diseno", A("Seminario disciplinar 2"), A("Seminario teoría 1, 2 o 3")],
    ["cur-he-trabajo-grado", A("Seminario disciplinar 3"), "cur-transversal"],
  ],
  "mae-gepc": [
    ["cur-icg", "cur-gepc-fundamentos", A("Seminario disciplinar 1")],
    ["cur-lab-gestion", A("Seminario disciplinar 2"), "cur-transversal"],
    ["cur-gepc-practica-1", A("Seminario disciplinar 3"), "cur-electiva"],
    ["cur-gepc-practica-2", A("Seminario disciplinar 4"), "cur-transversal"],
  ],
};

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

const plans = PLANS.map((p) => {
  const prog = programById.get(p.id);
  if (!prog) fail(`programa inexistente «${p.id}»`);
  const slots = slotsOf(p);
  const creditos = slots.reduce((a, s) => a + COURSES[s.id].creditos, 0);
  if (creditos !== 36) fail(`${p.id}: suma ${creditos} créditos (esperado 36)`);
  const peSlots = slots.filter((s) => s.pe);
  if (prog.tipo === "enfasis") {
    if (peSlots.length !== 4) fail(`${p.id}: ${peSlots.length} casillas pe (esperado 4)`);
    const peCr = peSlots.reduce((a, s) => a + COURSES[s.id].creditos, 0);
    if (peCr !== 12) fail(`${p.id}: cuerpo de especialización suma ${peCr} cr (esperado 12)`);
  }
  return { ...p, prog, slots };
});

/* --- programas especializados: uno por énfasis, 12 cr --- */
/* Cuerpos de los programas especializados.
 * Hoy se derivan del énfasis —regla provisional del comité—, pero un
 * especializado podrá declarar su propio cuerpo aquí, incluso si cuelga de otro
 * sitio o de ninguno. Ver docs/data-model.md § Especializados. */
const PE_CUERPOS = {};

const PE = plans
  .filter((p) => p.prog.tipo === "enfasis")
  .map((p) => {
    const suffix = p.id.replace(/^enf-/, "");
    const corto = p.prog.nombre_corto.replace('Énfasis en ', '')
    return { id: `pe-${suffix}`, nombre: `Programa Especializado en ${corto} — Maestría en ${programById.get(p.prog.maestria_id).nombre_corto.replace('Maestría en ', '')}`, nombre_corto: `Programa Especializado en ${corto}`, tipo: "programa_especializado", padre_id: p.id, maestria_id: p.prog.maestria_id, creditos: 12, estado: "derivado", pagina: p.pagina, nota: "Se deriva de las 4 casillas de especialización del énfasis (12 cr). Ver docs/data-model.md § Derivation rules.", slots: p.slots.filter((s) => s.pe) };
  });

/* --- lookup combinado (maestrías, énfasis y especializados) --- */
const ALL = new Map([...PROGRAMS, ...PE].map((p) => [p.id, p]));
const prog = (id) => ALL.get(id);

/* --- membresías (ofertas) --- */
const offers = [];
for (const p of plans) {
  for (const s of p.slots) {
    offers.push({ programa_id: p.id, curso_id: s.id, periodo: s.periodo, columna: s.columna, obligatoriedad: "obligatorio", alternativas: (s.alt || []).join(";"), nota: s.nota || "", estado: p.prog.estado, pagina: p.pagina, pe: !!s.pe });
  }
}
for (const pe of PE) {
  /* Una fila por curso; `repeticiones` cuenta cuántas casillas del cuerpo ocupa.
     Créditos del programa = Σ (creditos × repeticiones) = 12. */
  const explicito = PE_CUERPOS[pe.id];
  if (explicito && explicito.length !== 4) fail(`${pe.id}: el cuerpo declarado debe tener 4 cursos`);
  const cuerpo = explicito ?? [...new Set(pe.slots.map((s) => s.id))];
  for (const [i, id] of cuerpo.entries()) {
    const propias = pe.slots.filter((s) => s.id === id);
    /* Un programa especializado se cursa en dos periodos: dos cursos por periodo. */
    offers.push({
      programa_id: pe.id, curso_id: id,
      periodo: Math.floor(i / 2) + 1, columna: (i % 2) + 1,
      obligatoriedad: "obligatorio", alternativas: "",
      nota: propias.length > 1 ? `Ocupa ${propias.length} casillas del cuerpo de especialización.` : "",
      estado: pe.estado, pagina: pe.pagina, pe: true, repeticiones: propias.length,
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
        estado: p.prog.estado, pagina: p.pagina, pe: false, repeticiones: 1,
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
const coursesCsv = [["curso_id", "nombre", "nombre_corto", "creditos", "eje_curricular", "formato", "alcance", "n_programas", "maestrias", "enfasis", "programas_especializados", "umbral", "umbral_desde", "oferta_variable", "estado", "fuente_pagina", "nota"]];
for (const id of Object.keys(COURSES).sort()) {
  const c = COURSES[id];
  const m = courseMeta.get(id) || { alcance: "programa", n_programas: 0, maestrias: [], enfasis: [], pe: [] };
  const umbral = umbralDe.get(id) || [];
  coursesCsv.push([id, c.nombre, shortName(id), c.creditos, c.eje, c.formato, m.alcance, m.n_programas, m.maestrias.join(";"), m.enfasis.join(";"), m.pe.join(";"), umbral.length ? "si" : "no", umbral.join(";"), c.oferta_variable ? "si" : "no", c.estado || "verificado", c.pagina, c.nota || ""]);
}

/* curriculo.csv */
const curriculoCsv = [["programa_id", "programa_nombre", "programa_tipo", "maestria_id", "periodo", "columna", "curso_id", "curso_nombre", "creditos", "eje_curricular", "formato", "obligatoriedad", "alternativas", "repeticiones", "estado", "fuente_pagina", "nota"]];
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
  curriculoCsv.push([o.programa_id, p.nombre, p.tipo, p.maestria_id, o.periodo, o.columna, o.curso_id, c.nombre, c.creditos, c.eje, c.formato, o.obligatoriedad, o.alternativas, o.repeticiones || 1, o.estado, o.pagina, o.nota]);
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
