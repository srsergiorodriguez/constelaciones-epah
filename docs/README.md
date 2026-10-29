# Constelación EPAH — documentación

Reforma curricular de la Escuela de Posgrados de la Facultad de Artes y Humanidades.
Una sola escuela, cinco maestrías, trece énfasis y varias puertas de entrada;
el currículo se lee como un cielo: **cursos que son estrellas, programas que son constelaciones.**

Esta carpeta es la fuente de verdad del proyecto. Se actualiza en el mismo cambio que modifica
el código o los datos; no se deja «para después».

## Mapa de archivos

| Archivo | Propósito | Contenido |
|---|---|---|
| `architecture.md` | Mapa estructural | Dónde va cada cosa. Frontera frontend / backend nativo, capas, estado y bus de eventos. Se refactoriza cuando cambia la estructura; no se anexa a ciegas. |
| `design-system.md` | UI y estética | Tokens, paleta, tipografía, espaciado, glifos y componentes. Reglas estrictas contra estilos inline y contra boilerplate de UI redundante. |
| `constellation.md` | Modelo visual | La metáfora, las escalas de entrada, el algoritmo de constelación y la especificación de interacción. Es el documento que se discute con el comité. |
| `data-model.md` | Modelo de datos | Entidades, esquema de los tres CSV, reglas de derivación, invariantes y cobertura del documento fuente. |
| `testing.md` | Fronteras de prueba | Qué se prueba (funciones puras y datos) y qué no. Prohíbe pruebas frágiles y parches ultra-específicos. |
| `plan.md` | Sprint activo | Checklist de lo planeado y seguimiento del desarrollo, con decisiones abiertas. |
| `diary.md` | Bitácora | Registro de cambios y por qué. Se lee antes de empezar la siguiente tarea y se poda cuando crece. |
| `assets/` | Figuras | Láminas SVG/PNG generadas con `scripts/make-figures.mjs` a partir de los datos reales: una constelación, las dieciocho figuras y la gramática visual. |
| `../data/` | Datos | `programas.csv`, `cursos.csv`, `curriculo.csv`. Artefactos generados: no editar a mano. |
| `../scripts/` | Generadores | `build-data.mjs` (currículo → CSV) y `make-figures.mjs` (CSV → láminas). |

## Glosario

| Término | English | Qué es en este proyecto |
|---|---|---|
| Escuela | School | Unidad que agrupa todas las escalas de formación. Es el cielo completo. |
| Maestría | Master's programme | Título de 36 créditos. Tiene plan marco y, si aplica, énfasis. |
| Énfasis | Track / emphasis | Ruta de especialización dentro de una maestría. Su plan instancia el plan marco. |
| Programa especializado | Specialized programme | 12 créditos (4 cursos) del cuerpo de especialización de un énfasis. Homologable hacia la maestría. |
| Curso umbral | Threshold course | **Un curso del cuerpo de un programa especializado.** No es una entidad aparte: es la escala mínima de esa estrella. |
| Tronco | Core | `Investigación, creación y gestión`: el único curso presente en los quince planes. |
| Trayectoria | Trajectory | Secuencia individual de proyecto, composición, producción, práctica o trabajo de grado. |
| Homologación | Credit transfer | Reconocimiento de créditos entre escalas. Es la razón de ser de las estrellas compartidas. |
| Investigación-creación | Research-creation | Paradigma articulador de la Escuela. No es solo investigación sobre arte. |

## Estado

- **Fase 0 (este entregable):** datos derivados del documento maestro + documentación de arquitectura, diseño y visualización. Sin aplicación.
- **Datos verificados:** 15 planes, 83 cursos, 180 casillas de plan, 236 registros de pertenencia.
- **Fuera de alcance por ahora:** el doctorado. Sus cursos y su tabla se agregarán cuando el comité los entregue (D-3 en `plan.md`).

## Cómo se actualiza

1. Si cambia el currículo → se edita `scripts/build-data.mjs` y se regeneran los CSV.
2. Si cambia la estructura del código → se refactoriza `architecture.md` (no se agrega una sección nueva al final).
3. Si cambia un token o un componente → `design-system.md`.
4. Si cambia la metáfora o el algoritmo → `constellation.md`.
5. Toda tarea terminada deja una línea en `diary.md`; toda tarea planeada vive en `plan.md`.
