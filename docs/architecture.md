# Arquitectura

Aplicación de una sola página que lee datos curados y dibuja un cielo interactivo.
No hay servidor: los datos se compilan en el bundle. Toda la complejidad está en el dominio
(qué es un curso y a qué programas pertenece) y en la geometría (dónde va cada estrella).

---

## 1. Alcance

| Dentro | Fuera (por ahora) |
|---|---|
| Leer currículo curado, construir grafo, dibujar constelaciones, navegar y comparar | Editar el currículo desde la interfaz |
| Exportar la vista de tabla (CSV) | Autenticación, roles, base de datos |
| Empaquetado web estático | Backend nativo, escritorio, móvil nativo |

La app es **de solo lectura**. El currículo se cambia en `scripts/build-data.mjs`, se revisa en
`git diff data/` y se despliega. Esa es toda la administración de contenidos.

---

## 2. Capas

```
            ┌──────────────────────────────────────────────┐
  build     │ data/*.csv  →  scripts/build-data.mjs         │  fuente curada
            │              →  src/lib/data/*.json          │  artefacto validado
            └──────────────────────────────────────────────┘
                                   │
            ┌──────────────────────▼───────────────────────┐
  dominio   │ src/lib/domain/   (puro: sin DOM, sin d3)    │  grafo, pertenencias, anclas
            └──────────────────────┬───────────────────────┘
                                   │
            ┌──────────────────────▼───────────────────────┐
  estado    │ src/lib/state/    (store único + selectores) │
            └──────────────────────┬───────────────────────┘
                                   │
            ┌──────────────────────▼───────────────────────┐
  vista     │ src/lib/viz/      (d3: escalas, fuerzas)     │
            │ src/lib/components/ (Svelte: SVG y paneles)  │
            └──────────────────────────────────────────────┘
```

Reglas de dependencia, verificables por revisión y por lint:

- `domain` **no** importa `d3`, `svelte`, `fetch`, `window` ni APIs nativas.
- `viz` **no** importa componentes Svelte ni toca el estado global.
- `components` **no** calcula posiciones: las recibe.
- Nadie fuera de `data/` parsea CSV.

---

## 3. Decisiones (ADR)

| # | Decisión | Estado | Motivo |
|---|---|---|---|
| ADR-01 | Cliente web puro, sin backend nativo en v1 | Aceptada | No hay necesidad de sistema de archivos, red privada ni cómputo pesado. Se publica en GitHub Pages como estático y se abre en la sala del comité sin instalar nada. |
| ADR-02 | Svelte 5 + Vite + TypeScript | Aceptada | Componentes pequeños, reactividad por runas, sin runtime de framework pesado. Todo estilo sale de `tokens.css`; ningún componente declara color, fuente ni espacio literales. |
| ADR-03 | D3 modular (`d3-scale`, `d3-shape`, `d3-zoom`) y no `d3-selection` | Aceptada | El SVG lo declara Svelte; d3 solo aporta matemática. Evita dos dueños del DOM. `d3-force` **no** se usa: el atlas es determinista (`constellation.md` §6). |
| ADR-04 | SVG para nodos y líneas; canvas solo para el fondo | Aceptada | ≤120 nodos × ≤400 aristas: SVG permite foco, `aria-label` y hover sin trucos. El fondo (retícula + polvo de estrellas) va en canvas porque nunca es interactivo. |
| ADR-05 | Datos en CSV versionados + generador; JSON en build | Aceptada | El CSV es revisable por el comité y diffeable; el JSON tipado evita parsear en runtime. |
| ADR-06 | Un store y selectores derivados; sin librería de estado | Aceptada | El estado cabe en una pantalla y en un objeto. |
| ADR-07 | Frontera nativa por `DataPort` / `ExportPort` | Propuesta | Si en el futuro se empaqueta con Tauri/Electrobun, solo dos puertos cruzan la frontera. |

### ADR-07 en detalle: la frontera frontend ↔ nativo

Hoy no hay backend nativo. Si se agrega (Tauri, Electrobun o cualquier host), la frontera se define
**antes** de escribirlo:

```ts
interface DataPort {
  loadCurriculum(): Promise<CurriculumBundle>;   // hoy: fetch de JSON; mañana: invoke
  saveExport(name: string, blob: Blob): Promise<void>; // hoy: descarga; mañana: diálogo nativo
}
```

- La implementación web (`WebDataPort`) es la única que conoce `fetch` y `URL.createObjectURL`.
- La implementación nativa (`NativeDataPort`) sería la única que conoce `invoke` o sockets Lua.
- `domain`, `viz` y `components` reciben el puerto por inyección; **ninguna línea de `src/lib/domain`
  puede importar `@tauri-apps/*`, `node:fs` ni similares.** El lint lo prohíbe.
- Qué podría justificar un host nativo: lectura del PDF original en local, caché offline de la
  exhibición, exportación a PDF de la lámina. Ninguna de las tres está en el alcance actual.

---

## 4. Estructura de carpetas

```
src/
  main.ts
  App.svelte
  lib/
    data/
      curriculum.json        # generado: cursos, programas, ofertas
      types.ts               # tipos del bundle
    domain/
      graph.ts               # buildGraph(programIds) → nodos + aristas
      programs.ts            # índice de pertenencias, ancestros, hermanos
      figures.ts             # las 18 siluetas y placeOnFigure(n)
      nebula.ts              # posición de reposo de los 83 cursos (lee atlas.json)
      compose.ts             # 0, 1 o 2 figuras sobre el tronco; bisagras y relajación
      palette.ts             # familia → tono, patrón por orden de selección
    state/
      sky.svelte.ts          # store único (runas)
      selectors.ts           # derivaciones memoizadas
    viz/
      transition.ts          # interpolación de posiciones y escalonado
      scales.ts              # tamaño por n_programas, color por familia
      geometry.ts            # polar, rotación, longitud de arco
    components/
      SkyStage.svelte
      Star.svelte
      ConstellationPath.svelte
      ProgramPicker.svelte
      ProgramChip.svelte
      Sheet.svelte
      CourseList.svelte
      CourseDetail.svelte
      Legend.svelte
      StatusBadge.svelte
      EmptySky.svelte
      Toolbar.svelte
  styles/
    tokens.css               # única fuente de color, tipo y espacio (docs/design-system.md §7)
    base.css                 # reset y estilos de elemento
```

---

## 5. Estado

Un único objeto, propiedad de `sky.svelte.ts`:

```ts
type SkyState = {
  mode: "cielo" | "constelacion" | "tabla";
  selectedPrograms: string[];      // máx. 2, en orden de selección
  selectedCourse: string | null;
  hoveredCourse: string | null;
  hoveredProgram: string | null;
  showAlternatives: boolean;
  panel: "ninguno" | "programa" | "curso";
  focusIndex: number;              // navegación por teclado
};
```

**Invariantes de estado**

1. `selectedPrograms.length ≤ 2`; al agregar un tercero se expulsa el primero.
2. `mode === "cielo"` ⇒ `selectedPrograms` vacío y `panel === "ninguno"`.
3. `panel === "curso"` ⇒ `selectedCourse !== null`.
4. `selectedCourse` puede no pertenecer a ningún programa seleccionado (se resalta su pertenencia).
5. El estado nunca guarda posiciones: se derivan de los datos y de la simulación.

**Derivaciones** (funciones puras, memoizadas por `selectedPrograms` y `showAlternatives`):

- `graph` → nodos y aristas a dibujar.
- `legend` → color, patrón y número de cada programa activo.
- `shared` → cursos que pertenecen a más de un programa activo.
- `panelData` → contenido del panel lateral.

---

## 6. Bus de eventos

No hay bus para el flujo de datos: el flujo es unidireccional y pasa por el store.
Existe un canal **solo para intenciones efímeras** que no son estado, con tres eventos y nada más:

| Evento | Emisor | Receptor | Efecto |
|---|---|---|---|
| `sky:fit` | Toolbar, cambio de modo | SkyStage | Reencuadra sin cambiar el estado |
| `sky:focus-star` | CourseDetail → «ver constelación» | SkyStage | Lleva el foco de teclado a una estrella |
| `sky:announce` | Selector al expulsar un programa | Región `aria-live` | Anuncia el cambio a lectores de pantalla |

Reglas: los eventos son **notificaciones**, nunca órdenes de mutación; si un evento necesita cambiar
estado, el cambio se hace en el store y el evento solo describe el resultado.

---

## 7. Flujo de datos y validación

1. `build-data.mjs` valida invariantes (ver `data-model.md` §5) y escribe los CSV. Falla el build
   si algo no cuadra.
2. `scripts/build-curriculum.ts` (sprint 1) convierte los CSV a `curriculum.json` tipado y
   **vuelve a validar** en el bundle: ninguna app arranca con datos inconsistentes.
3. En runtime los objetos son inmutables: `Object.freeze` en desarrollo.
4. Los datos llevan su `estado` (`verificado`, `derivado`, `propuesto`, `pendiente`) y la interfaz
   lo muestra; nunca se presenta un dato propuesto como definitivo.

---

## 8. Rendimiento

| Escenario | Presupuesto |
|---|---|
| Cielo completo (83 nodos, 0 aristas) | primer render < 80 ms |
| Una maestría (≈35 nodos) | simulación < 100 ms, 180 ticks |
| Dos constelaciones (≈45 nodos, ≈90 aristas) | viaje completo < 700 ms, 60 fps en hover |
| Cambio de selección | viaje 600 ms, escalonado; la nebulosa no se recalcula |

Si un día se superan los 400 nodos visibles, se cambia la capa de nodos a canvas **solo** si se
mantiene una tabla accesible equivalente. No se anticipa.

---

## 9. Accesibilidad

- El SVG es navegable por teclado; cada estrella es un `button` con etiqueta completa.
- Región `aria-live="polite"` para anunciar selección, expulsión y recuento.
- La vista Tabla es un componente de primera clase, no un consuelo.
- Se respeta `prefers-reduced-motion` y `prefers-contrast`.
- El foco nunca se pierde al cambiar de modo: vuelve a la estrella o al chip de origen.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El comité cambia el currículo a mitad del sprint | Los datos viven en un archivo; regenerar es un comando. |
| La metáfora se vuelve decorativa y pierde rigor | `constellation.md` fija qué codifica cada atributo; si algo no codifica, se borra. |
| Demasiadas constelaciones a la vez | Límite duro de 4 y modo Cielo para la vista completa. |
| Cursos del menú transversal o electivo presentados como si fueran cursos fijos | Campo `oferta_variable` y rótulo «oferta variable» en la ficha. |
| Sobrecarga de la capa visual | SVG con una `path` por programa, no por segmento; listeners delegados en el escenario. |
