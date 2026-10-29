# Testing

**Se prueba lo que puede romperse en silencio: los datos y la geometría pura.**
No se prueba lo que el compilador ya garantiza ni lo que solo un ojo humano puede juzgar.

Objetivo realista: entre 12 y 18 pruebas. Si la suite pasa de 25, algo se está probando dos veces.

---

## 1. Qué se prueba

| Unidad | Prueba | Por qué |
|---|---|---|
| `build-data.mjs` | Cada plan suma 36 cr y 12 casillas; cada énfasis tiene 4 casillas `pe` = 12 cr; no hay cursos ni alternativas inexistentes | Un error de transcripción es el fallo más caro del proyecto |
| `curriculum.json` | Contrato de tipos: campos obligatorios, enums válidos, ids únicos, `padre_id` resoluble | Evita que la app arranque con datos rotos |
| `graph.ts` · `buildGraph` | Un curso compartido aparece **una vez** como nodo y con una arista por programa; el conteo de aristas coincide con las ofertas | Es la regla de oro del modelo |
| `graph.ts` · `buildGraph` | Seleccionar una maestría incluye todos los cursos de sus énfasis; seleccionar un especializado incluye exactamente 4 cursos | Define qué es «pertenecer» |
| `programs.ts` | `ancestors(curso)`, `siblings(enfasis)`, `maestriaOf(pe)` devuelven lo esperado para 3 casos canónicos | La jerarquía sostiene paneles y colores |
| `figures.ts` | Una figura con `n` cursos devuelve `n` puntos sobre la polilínea, en orden y sin repetir | Es la base de toda la geometría |
| `figures.ts` | Cambiar `n` no cambia la silueta: los puntos siguen cayendo sobre el mismo trazo | Es la promesa del lenguaje visual |
| `nebula.ts` | La nebulosa es idéntica entre ejecuciones y no cambia al seleccionar | Es la mitad estable del cielo |
| `compose.ts` | Con dos programas, las estrellas compartidas caen en el mismo punto y el resto conserva su silueta (desvío < 10 %) | Es la promesa de «las figuras se deforman lo mínimo» |
| `compose.ts` | Con un programa, la figura no se solapa con el tronco y queda dentro del viewport | Legibilidad |
| `palette.ts` | Dos programas activos nunca reciben el mismo par (color, patrón) | Distinguibilidad |
| `palette.ts` | Todo tono asignado tiene contraste ≥ 3:1 sobre blanco | Accesibilidad medible, no opinable |

## 2. Qué no se prueba

- **No** se hacen pruebas de instantáneas de SVG ni de HTML. Cambiar un rótulo no debe romper CI.
- **No** se prueba CSS, layout, tamaños de fuente ni posiciones de píxel.
- **No** se hacen pruebas de componentes con DOM simulado (`jsdom`) ni de interacción con
  `testing-library`. Lo que hay que verificar de la interacción es el estado, y el estado se prueba
  a través de las funciones puras.
- **No** se mockea la cámara ni se prueban los cuadros intermedios de la animación. Se prueba el
  recuadro final y que dos ejecuciones den el mismo resultado.
- **No** se persigue cobertura. La cobertura de líneas no dice nada sobre si la constelación
  comunica.
- **No** se prueba el generador de figuras (`make-figures.mjs`): es una herramienta de
  documentación, no producto.

## 3. Regla ante un fallo

Si una prueba falla, se corrige **el modelo o el dato**. Nunca se ajusta la aserción para que
pase, ni se parchea el caso concreto. Un `if (id === 'enf-he-clasicos')` dentro del dominio es una
señal de que la regla está mal formulada.

Un caso especial legítimo se resuelve con un dato (`en_pe`, `repeticiones`, `alternativas`), no con
código condicional.

## 4. Contrato de datos en CI

```bash
node scripts/build-data.mjs        # invariantes del currículo
node --test src/lib/**/*.test.ts   # dominio y contrato
```

Si el primero falla, no se ejecuta nada más: los datos son la base.

## 5. Estructura

```
src/lib/domain/graph.test.ts       # 4–5 pruebas
src/lib/domain/figures.test.ts     # 3 pruebas
src/lib/domain/palette.test.ts     # 2 pruebas
src/lib/data/contract.test.ts      # 2 pruebas
scripts/build-data.test.mjs        # 2 pruebas (invariantes)
```

Nombres en español, en forma de afirmación: `un curso compartido es un solo nodo`,
`cada plan suma treinta y seis créditos`. La prueba se lee como la regla que protege.

## 6. Lo que se verifica a mano

La forma de la constelación, la legibilidad de los rótulos, el equilibrio del cielo y la sensación
de «carta estelar». Eso se revisa con capturas en `docs/assets/`, no con aserciones.
