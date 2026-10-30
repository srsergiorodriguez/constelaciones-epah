# Modelo de datos

El currículo se describe con tres tablas. Todo lo demás —constelaciones, listas, comparaciones—
se deriva de ellas en tiempo de ejecución. **Un curso es la unidad mínima del proyecto.**

Fuente: `Reforma EPAH_Documento maestro final.pdf` (110 pp., tablas de plan de estudios en
pp. 1, 4–5, 11, 20–21, 26–27, 31, 41, 46, 51, 55, 58, 62, 70, 75–76, 80, 85–86, 93–94, 106).

---

## 1. Entidades

```
Programa (escuela | maestria | enfasis | programa_especializado)
   │ 1..n
   └── Oferta ────────────── n..1 ── Curso
        (pertinencia: periodo, columna, alternativas, repeticiones)
```

- **Programa** tiene jerarquía (`padre_id`) y una maestría de referencia (`maestria_id`) que se
  hereda hacia los énfasis y los especializados.
- **Curso** existe una sola vez aunque lo compartan veinte planes. Su identidad es el curso, no
  la casilla.
- **Oferta** es la arista. Guarda *dónde* aparece el curso dentro de un plan (periodo y columna),
  si es obligatorio o alternativa, y cuántas casillas ocupa.

### Regla de oro

> Si un curso aparece en dos planes, hay **un** curso y **dos** ofertas. Nunca dos cursos.

Esa regla es la que produce las estrellas compartidas, que son el argumento de la reforma.

---

## 2. Archivos

### 1.0 La fuente: `data/source/`

Cinco tablas en JSON, editables a mano o desde un editor:

| Archivo | Contenido |
|---|---|
| `estructura.json` | **fija**: la Escuela y las 5 maestrías |
| `programas.json` | 13 énfasis: id, nombre, padre (maestría), créditos |
| `cursos.json` | 83 cursos: créditos, eje, formato, estado |
| `planes.json` | 15 planes × 12 casillas |
| `marco.json` | plan común de cada maestría (casillas abiertas incluidas) |
| `cuerpos.json` | el cuerpo de cada especializado: **la fuente**, cuatro cursos |

Los programas especializados **no** están en `programas.json`: existen porque tienen cuerpo declarado
en `cuerpos.json`. Un cuerpo de cuatro cursos crea el programa; sin cuerpo, no hay programa. `figures.json` vive aparte, con la app, porque la dibuja ella.

La Escuela y las maestrías son estructura fija por decisión de diseño: son el marco del currículo y no
se editan. Que una maestría tenga o no énfasis **no** está fijado: hoy Periodismo y Patrimonio no
tienen, mañana pueden tenerlos.

Los CSV **se generan** desde ahí con `pnpm data`. Se edita el JSON, nunca el CSV: el próximo
`pnpm data` los sobrescribe. La CI corre `pnpm data` y falla si el resultado difiere de lo versionado,
así que un JSON editado sin recompilar no llega a producción.

### 1.1 Los CSV

Los tres CSV se generan desde `scripts/build-data.mjs`. Tienen cabecera y codificación UTF-8.
Los campos con comas van entre comillas; las listas internas usan `;`.

### 2.1 `data/programas.csv` — 32 filas

| Columna | Tipo | Valores / notas |
|---|---|---|
| `id` | string | Slug estable. Ej. `enf-he-literatura`, `pe-gepc-edicion`. |
| `nombre` | string | Nombre completo y único. |
| `nombre_corto` | string | Etiqueta de interfaz. No es única: hay dos «Arte». |
| `tipo` | enum | `escuela` · `maestria` · `enfasis` · `programa_especializado`. `doctorado` queda reservado para cuando exista su tabla. |
| `padre_id` | string | Vacío en la escuela. Un énfasis cuelga de su maestría; un especializado, de su énfasis. |
| `maestria_id` | string | Maestría de referencia (para un especializado, la de su énfasis). |
| `creditos` | int | 36 en maestrías y énfasis, 12 en especializados, vacío en el resto. |
| `estado` | enum | `verificado` · `derivado` · `propuesto` · `pendiente` |
| `nota` | string | Aclaraciones, incluida la procedencia de los datos propuestos. |

### 2.2 `data/cursos.csv` — 83 filas

| Columna | Tipo | Valores / notas |
|---|---|---|
| `curso_id` | string | Slug estable. |
| `nombre` | string | Nombre oficial de la tabla, normalizado. |
| `nombre_corto` | string | Código de carta estelar, autorado (`ICG`, `E2`, `PYC1`). Es la etiqueta del nodo. |
| `creditos` | int | 3 en todos los cursos del documento. |
| `eje_curricular` | enum | `tronco` · `transversal` · `laboratorio` · `electiva` · `disciplinar` · `trayectoria` |
| `formato` | enum | `introduccion` · `curso` · `seminario` · `taller` · `estudio` · `laboratorio` · `proyecto` · `practica` |
| `alcance` | enum | `escuela` · `maestria` · `enfasis` (derivado, ver §4). |
| `n_programas` | int | Programas concretos que lo incluyen (excluye especializados). Máximo 15. |
| `maestrias` | list | Nombres cortos separados por `;`. |
| `enfasis` | list | Idem. |
| `programas_especializados` | list | Idem. |
| `oferta_variable` | `si`/`no` | Curso-familia con temas rotativos. |
| `estado` | enum | `verificado` · `derivado` · `propuesto` |
| `nota` | string | Ej. «el plan lo ofrece tres veces». |

### 2.2a Umbral: una propiedad del curso

`cursos.csv` lleva `umbral` (`si`/`no`) y `umbral_desde` (los programas especializados cuyo cuerpo lo
abre). **Un umbral es un curso que se puede tomar solo y homologar después**, no «cualquier curso»:
hoy son 41 de los 83, porque son los que forman cuerpo de un especializado.

Que sea propiedad del curso —y no de la relación curso-programa— es una decisión: se puede tomar solo
o no, con independencia de dónde aparezca. La procedencia queda en `umbral_desde`, y el validador
exige que todo umbral tenga al menos un programa de origen.

### 2.2b `data/planes_marco.csv` — 36 filas

El plan de la maestría **a secas**: una rejilla de 12 casillas donde unas son cursos concretos del
tronco y otras quedan abiertas (`abierta` = nombre de la casilla, `curso_id` vacío) para llenarlas con
cursos del énfasis que el estudiante escoja. Tres maestrías, 12 casillas cada una.

### 2.3 `data/curriculo.csv` — 236 filas (la tabla larga)

Una fila por pertenencia curso ↔ programa.

| Columna | Tipo | Notas |
|---|---|---|
| `programa_id` | string | FK a `programas.csv`. |
| `programa_nombre` | string | Desnormalizado para lectura directa. |
| `programa_tipo` | enum | Idem a `programas.tipo`. |
| `maestria_id` | string | FK. |
| `periodo` | int 1–4 | Vacío en las alternativas; el del énfasis en los especializados. |
| `columna` | int 1–3 | Columna de la tabla original. Solo descriptiva. |
| `curso_id` | string | FK a `cursos.csv`. |
| `curso_nombre` | string | Desnormalizado. |
| `creditos` | int | Créditos del curso (3). |
| `eje_curricular` | enum | Idem a `cursos.csv`. |
| `formato` | enum | Idem. |
| `obligatoriedad` | enum | `obligatorio` · `alternativa` |
| `alternativas` | list | Cursos que pueden ocupar la misma casilla, listados en la fila titular. |
| `repeticiones` | int | Casillas que ocupa el curso dentro del programa. |
| `estado` | enum | `verificado` · `derivado` · `propuesto` |
| `nota` | string | Texto original cuando hay ambigüedad. |

> **Programa especializado**: 12 créditos en **dos periodos**, dos cursos por periodo. La casilla
> hereda el orden del cuerpo, no el periodo del énfasis donde aparecía.

### Especializados: declarados

Un especializado **es** su cuerpo. `data/source/cuerpos.json` declara los cuatro cursos de cada uno, y
el compilador crea el programa a partir de ahí:

```json
{ "pe-creacion-arte": ["cur-arte-intro", "cur-arte-est-1", ...] }
```

Los planes ya **no** marcan casillas como cuerpo: esa marca se retiró de `planes.json`. Editar el
cuerpo de un especializado es editar esta tabla, y solo esta.

El modelo ya tolera lo que la derivación prohíbe:

- `padre_id` es **opcional**: un especializado puede colgar de un énfasis, de una maestría o de nada.
- `maestria_id` se mantiene: de ahí salen el color y la familia. Sin él, el programa tendría familia
  neutra.
- El cuerpo declarado se valida (4 cursos, 12 créditos) pero **no** se exige que sea subconjunto del
  énfasis: si cuelga de otro sitio, la homologación es otra pregunta.

**El especializado suelto se registra como polígono.** Sin énfasis no hay silueta que heredar, así que
`compose` le dibuja un **polígono neutro** (`poligonoNeutro` en `hull.ts`) y coloca sus cuatro
estrellas encima. No es una figura: es la marca de «este programa existe y aún no tiene forma». Cuando
alguien le dibuje una silueta, entra en `figures.json` y el polígono desaparece. Hoy no hay ninguno,
así que no se ve; la rama está probada por construcción, no por uso.

> **Créditos de un programa** = Σ (`creditos` × `repeticiones`) **solo de las filas
> `obligatorio`**. Las alternativas no suman: son caminos posibles, no simultáneos. La suma
> excluye también las filas `propuesto`. Gracias a `repeticiones`, un especializado donde el mismo
> seminario ocupa tres casillas suma 12 y no 6.

---

## 3. Convenciones

- **Ids**: `mae-<slug>` · `enf-<maestria>-<slug>` · `pe-<maestria>-<slug>` · `doc-literatura` ·
  `umbral` · `cur-<slug>`. Estables, en minúsculas, sin tildes.
- **Nombres**: se conserva la ortografía del documento (`Investigación, creación y gestión`),
  sin numeración de sección.
- **Órdenes**: `periodo` y `columna` reflejan la tabla impresa, aunque la columna no siempre
  signifique lo mismo entre maestrías (en Gestión, el curso de énfasis ocupa a veces la columna 3).
  Por eso el eje curricular se guarda como atributo del curso y **no** se infiere de la columna.

---

## 4. Reglas de derivación

| # | Regla | Implementación |
|---|---|---|
| R1 | **Alcance.** `escuela` si el curso vive en ≥2 maestrías; `enfasis` si solo lo usa un plan de énfasis; `maestria` en el resto. Las alternativas cuentan: un laboratorio ofrecido como opción en otra maestría es de alcance escuela. | `build-data.mjs` §5 |
| R2 | **Programa especializado.** Los 4 cursos del cuerpo de especialización de un énfasis, marcados con `pe`. 4 × 3 = 12 créditos. | ídem |
| R3 | **Alternativas.** Una casilla «Seminario teoría 1, 2 o 3» registra el primer curso como titular y los demás en `alternativas`; cada alternativa produce además **una fila propia** con `obligatoriedad = alternativa`, sin periodo ni columna, porque el estudiante puede tomarla dentro del plan. | ídem |
| R4 | **Repeticiones.** Un curso que ocupa varias casillas del mismo programa (p. ej. `Seminario de historia del arte` ×3) conserva `repeticiones` y una sola fila en el especializado. | ídem |
| R5 | **Núcleo.** No se almacena: es la intersección de los planes de los énfasis de una maestría. En Creación son cuatro cursos; en Humanidades Experimentales, seis. | dominio (runtime) |
| R6 | **Plan marco.** Las tres tablas sin énfasis (pp. 1, 41, 70) se usan como plantilla, no como oferta. Sus casillas genéricas («Introducción disciplinar», «Seminario disciplinar») no son cursos. | decisión D-1 |

### El cuerpo de especialización (R2 en detalle)

La regla general: **los cursos del énfasis que no son electivas ni se comparten con otro énfasis**.
Funciona en once de los trece casos. Las dos excepciones están marcadas a mano con `pe`:

- **Estudios Clásicos** incluye `Seminario teoría 1`, que comparte con Literatura e Historia del
  arte. Sin él, el cuerpo sumaría 9 créditos y no 12.
- **Gestión Estratégica** solo tiene tres cursos propios por énfasis; el cuarto es el seminario
  electivo del campo (`Seminario electivo en proyectos de arte`, etc.). Se marca porque su oferta se
  elige dentro de un menú acotado, no en la bolsa general de electivas.

En ambos casos el cuerpo suma exactamente 12 créditos y el generador lo verifica.

### Por qué el plan marco no produce datos

La tabla marco describe columnas, no cursos: cada énfasis las instancia con nombres propios
(`Introducción a la creación artística`, `Composición musical 1`, `Práctica de profundización 1`).
Tratarlas como cursos crearía nodos fantasma y aristas falsas. El tronco real de cada maestría
se obtiene por intersección de sus énfasis (R5) y coincide con lo que el marco anuncia.

---

## 5. Invariantes (el generador falla si se rompen)

1. Cada plan tiene exactamente 4 periodos × 3 columnas = 12 casillas.
2. Cada plan suma 36 créditos.
3. Cada énfasis tiene 4 casillas de especialización que suman 12 créditos.
4. Todo curso referenciado existe en el registro.
5. No hay dos casillas con el mismo (programa, periodo, columna).
6. Toda alternativa apunta a un curso existente.

```
$ node scripts/build-data.mjs
✓ data/ generado
  programas        32  (5 maestrías · 13 énfasis · 13 especializados · 1 escuela)
  planes           15  → 180 ofertas de curso (36 cr cada plan)
  cursos únicos    83
  ofertas          236
  alcance          escuela 6 · maestría 28 · énfasis 49
```

---

## 6. Cobertura del documento fuente

| Tabla | Página | Tipo | Nodo |
|---|---|---|---|
| Maestría en Creación | 1 | marco (plantilla) | — |
| Énfasis en Arte | 4–5 | plan | `enf-creacion-arte` |
| Énfasis en Fotografía, Imagen y Medios | 11 | plan | `enf-creacion-fotografia` |
| Énfasis en Composición Musical | 20–21 | plan | `enf-creacion-composicion` |
| Énfasis en Producción Musical | 26–27 | plan | `enf-creacion-produccion` |
| Énfasis en Escritura Creativa | 31 | plan | `enf-creacion-escritura` |
| Maestría en Humanidades Experimentales | 41 | marco (plantilla) | — |
| Énfasis en Literatura | 46 | plan | `enf-he-literatura` |
| Énfasis en Historia y Teoría del Arte | 51 | plan | `enf-he-historia-arte` |
| Énfasis en Estudios Clásicos | 55 | plan | `enf-he-clasicos` |
| Énfasis en Humanidades Digitales | 58 | plan | `enf-he-humanidades-digitales` |
| Énfasis en Humanidades Ambientales | 62 | plan | `enf-he-humanidades-ambientales` |
| Maestría en Gestión Estratégica | 70 | marco (plantilla) | — |
| Énfasis en Negocios de la Música | 75–76 | plan | `enf-gepc-negocios-musica` |
| Énfasis en Arte | 80 | plan | `enf-gepc-arte` |
| Énfasis en Edición | 85–86 | plan | `enf-gepc-edicion` |
| Maestría en Periodismo | 93–94 | plan único | `mae-periodismo` |
| Maestría en Patrimonio Cultural | 106 | plan único | `mae-patrimonio` |

**Lo que el documento no trae** (y por eso está marcado, no inventado):

- **Doctorado en Literatura** — fuera de alcance por decisión del comité (D-3). No hay nodo; cuando
  llegue su tabla se agrega un programa `tipo: doctorado` y sus pertenencias, sin cambiar el esquema.
- **Cursos umbrales** — resueltos por definición del comité: **un curso umbral es un curso del
  cuerpo de un programa especializado**. No son una entidad nueva; son la escala mínima de esa
  estrella y se ofrecen con la acción «ver como umbral».
- **Menú de cursos transversales** — el documento menciona un solo caso nombrado
  («Seminario: lo que hacen las imágenes», p. 12). La casilla se modela como un único nodo
  `oferta_variable`.
- **Seminarios electivos** — se listan ejemplos por énfasis (pp. 71, 74, 79, 87, 106); se modelan
  como las familias nombradas en el plan, no como cursos sueltos.

---

## 7. Cómo se actualiza

```bash
node scripts/build-data.mjs      # regenera los tres CSV
node scripts/make-figures.mjs    # regenera las láminas de docs/assets
```

1. Se edita el registro `COURSES` y las tablas `PLANS` de `build-data.mjs`.
2. Se corre el generador: si una invariante se rompe, falla y no escribe nada.
3. Se revisa `git diff data/` — el diff es legible porque hay una fila por pertenencia.
4. **Nunca** se edita un CSV a mano: el siguiente build lo sobrescribe.
