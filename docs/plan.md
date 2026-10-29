# Plan activo

**Fase actual: 1 completado — datos tipados, dominio y nebulosa.** La app ya dibuja el cielo
completo; todavía no hay selección. Lo que sigue está ordenado para que cada sprint produzca algo
mostrable al comité.

---

## Sprint 0 · Plan y datos ✅

- [x] Analizar el documento maestro (110 pp.) y localizar las 18 tablas de plan de estudios
- [x] Desagregar el currículo a cursos como unidad mínima → `data/cursos.csv` (83)
- [x] Registrar pertenencias curso ↔ programa → `data/curriculo.csv` (236)
- [x] Registrar la jerarquía de programas → `data/programas.csv` (32)
- [x] Derivar los 13 programas especializados (4 cursos / 12 cr cada uno)
- [x] Validar invariantes (36 cr por plan, 12 cr por especializado)
- [x] Documentar arquitectura, sistema de diseño, modelo visual y modelo de datos
- [x] Generar las láminas de validación (`docs/assets/`)
- [x] Derivar tipografías y paleta del sitio de la Facultad
- [x] Definir una figura por constelación (18 siluetas) y su regla de reparto
- [x] Dejar explícito lo que falta: doctorado y menú transversal

**Entregable:** `data/` + `docs/`. Nada de código de aplicación.

---

## Sprint 1 · Datos tipados y dominio ✅

Objetivo: que la app pueda construir el grafo sin tocar CSV y sin adivinar nada.

- [x] `scripts/build-curriculum.mjs`: CSV → `src/lib/data/curriculum.json` + validación de contrato
- [x] `types.ts`: `Curso`, `Programa`, `Oferta`, `CurriculumBundle`
- [x] `data/figures.json`: las 18 siluetas, fuente única para la app y las láminas
- [x] `domain/graph.ts`: cursos de un programa (una maestría es la unión de sus énfasis), núcleo,
      grafo de una selección
- [x] `domain/figures.ts`: `placeOnFigure(polilínea, n)` por longitud de arco
- [x] `domain/nebula.ts`: atlas → viewport
- [x] `domain/compose.ts`: escena para 0, 1 y 2 programas, con bisagra
- [x] `scripts/build-atlas.mjs`: nebulosa determinista (semilla 20261029, sin `Math.random`)
- [x] `styles/tokens.css` y `app.css`
- [x] `SkyStage.svelte`: 83 estrellas, retícula, rótulos de región
- [x] Pruebas: contrato (4), grafo (3), figuras (3), nebulosa (2), composición (3) = **15**

**Aceptación:** ✔ el cielo se renderiza con 83 estrellas en 1200×900; recargar no mueve ninguna;
`vitest` 15/15; `svelte-check` sin errores; build de 137 kB (27 kB gzip).

![La nebulosa](assets/app-nebulosa.png)

*Primer render: cinco regiones, el núcleo de la Escuela en tinta y ninguna figura todavía.*

**Notas de implementación.**

- No se instaló `d3`: el SVG lo resuelve Svelte. `d3-scale`/`d3-zoom` entrarán con la cámara y la
  transición en el sprint 2; `d3-force` no entra nunca (el atlas es determinista).
- El viewBox es fijo (1200×900) y la escena se compone en esas coordenadas: el cielo escala solo.
- Las alternativas cuentan para el ancla de la nebulosa (un curso alternativo sigue siendo de ese
  plan), pero no para el grafo de pertenencias obligatorias.

---

## Sprint 2 · Esqueleto de la constelación

Objetivo: una sola constelación dibujada, con su forma derivada del currículo.

- [ ] `domain/figures.ts`: las 18 siluetas y `placeOnFigure(n)`
- [ ] `domain/nebula.ts`: posición de reposo de los 83 cursos (lee `atlas.json`)
- [ ] `domain/compose.ts`: 0, 1 y 2 figuras sobre el tronco; bisagras y relajación
- [ ] `viz/transition.ts`: interpolación y escalonado del viaje
- [ ] `components/SkyStage.svelte` + `Star.svelte` + `ConstellationPath.svelte`
- [ ] Los 83 cursos siempre montados; la selección mueve solo los del programa elegido
- [ ] Tokens y estilos base (`styles/tokens.css`)
- [ ] Pruebas: determinismo (1), dentro del viewport (1), sin anclas duplicadas (1)

**Aceptación:** el Énfasis en Arte crece del tronco con 7 estrellas propias; recargar produce la misma
figura; ninguna estrella sale del encuadre a 1280×800 y a 480×900. La nebulosa no se mueve.

---

## Sprint 3 · Comparación y lectura

Objetivo: el caso de uso del comité — «especializado + maestría, ¿qué comparten?».

- [ ] `ProgramPicker` con las tres escalas y límite de 2
- [ ] Segunda selección: figura simétrica al otro lado del tronco
- [ ] Estrellas compartidas con doble anillo y su línea por programa
- [ ] Bisagra: dos figuras inclinadas, compartidas en el punto medio
- [ ] `Sheet` con lista de cursos (modo programa) y detalle (modo curso)
- [ ] Modo Cielo (83 estrellas, sin aristas) y transición desde/hacia constelación
- [ ] Rótulos con evitación de colisiones por prioridad

**Aceptación:** seleccionar «PE Arte (Creación)» y «Maestría en Creación» produce dos colores, la
línea larga del especializado dentro de la figura de Arte y las estrellas comunes con doble anillo.

---

## Sprint 4 · Pulido y publicación

- [ ] Vista Tabla accesible + exportación CSV de la selección
- [ ] Navegación por teclado completa y región `aria-live`
- [ ] `prefers-reduced-motion` y `prefers-contrast`
- [ ] Responsive (selector como chips, panel como hoja inferior)
- [ ] Despliegue en GitHub Pages: `base: '/constelacion-epah/'`, `gh-pages` o Actions
- [ ] Prueba en la sala del comité (proyector, sin internet)
- [ ] Revisión de la metáfora con el comité y ajuste de `constellation.md`

**Aceptación:** la app funciona sin conexión, con teclado, y una persona ajena entiende en menos de
un minuto qué comparten dos programas.

### Publicación

| Pieza | Decisión |
|---|---|
| Repo | `constelacion-epah` (sin tilde: el nombre del repo se vuelve parte de la URL) |
| Build | `vite build` → `dist/`, sin SSR, sin router |
| Base | `/constelacion-epah/` vía `base` en `vite.config.ts` |
| Hosting | GitHub Pages desde Actions, rama `gh-pages` o `main`/`docs` |
| Local | `pnpm dev` y `pnpm preview` funcionan igual, sin base |

---

## Decisiones abiertas

| # | Decisión | Impacto | Dueño | Estado |
|---|---|---|---|---|
| D-1 | ¿El plan marco (sin énfasis) es una oferta real o solo una plantilla? | Si es oferta, hay 3 planes más y sus casillas genéricas se vuelven cursos | Comité | **Resuelta: plantilla** (ver `data-model.md` §4) |
| D-2 | ¿Qué es un curso umbral? | Define la escala de entrada | Comité | **Resuelta: un curso del cuerpo de un especializado** |
| D-3 | ¿Existe una tabla del Doctorado en Literatura? | Añade un programa y sus pertenencias | Coordinación doctorado | **Resuelta: fuera de alcance por ahora** |
| D-4 | ¿El programa especializado se define por el cuerpo de 4 cursos? | Pertenencia de 13 programas | Comité | **Resuelta: cuerpo fijo de 4** (con dos excepciones documentadas) |
| D-5 | ¿El núcleo incluye transversales y electiva? | Brillo y tamaño del centro | Comité | **Asumida: sí** |
| D-6 | ¿Figura por constelación o forma derivada del plan? | Determina el lenguaje visual | Comité | **Resuelta: una figura por constelación**, relacionada con su campo |

Las decisiones asumidas están implementadas y documentadas; cambiarlas es editar una tabla en
`scripts/build-data.mjs`, no reescribir la app.

---

## Fuera de alcance

- Edición del currículo desde la interfaz.
- Prerrequisitos, cupos, horarios y docentes (aunque el PDF los mencione).
- Autenticación, base de datos, API.
- Modo oscuro, 3D, animación de partículas.
- Comparación de las cinco maestrías completas en una sola vista.

---

## Definición de «terminado»

Una tarea está terminada cuando: el dato o la función pura está cubierta por una prueba, la
documentación afectada se actualizó en el mismo cambio, y `node scripts/build-data.mjs` sigue
pasando sin advertencias.
