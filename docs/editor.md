# Editor de datos

Editor local para `data/source/*.json`. **No se publica**: vive en el servidor de desarrollo y el
build de producción solo empaqueta `index.html`.

```bash
pnpm editar          # http://localhost:5173/editor.html
pnpm editar --port 4310
```

> El comando no se llama `edit` porque pnpm lo reserva para sí mismo (`pnpm edit` es un comando
> propio y falla con «not yet implemented»).

## Dos niveles

La navegación no es una lista de siete pestañas: son dos niveles y una referencia.

| Nivel | Qué contiene | Qué se hace |
|---|---|---|
| **Contenidos** | Énfasis · Especializados · Cursos | crear, editar y borrar |
| **Estructuras** | Planes · Cuerpos | ordenar los contenidos en planes y cuerpos |
| **Referencia** | Estructura fija | solo lectura |

**Un plan común es un plan más.** Vive en la misma pestaña que los planes de énfasis, en un segundo
grupo del selector, y se edita con la misma rejilla 4 × 3. La única diferencia es que sus casillas
pueden quedar **abiertas** —un tipo de curso en lugar de un curso—, porque el comité no ha fijado
cuáles las llenan. Por eso el editor le ofrece la opción *— casilla abierta —* y un campo para su
etiqueta, y el resto de la interfaz la dibuja como círculo punteado.

## Qué edita

| Pestaña | Tabla | Operación |
|---|---|---|
| Énfasis | `programas.json` | crear, editar y borrar; elegir su maestría |
| Especializados | `cuerpos.json` | crear, revisar y borrar; cada uno existe por su cuerpo |
| Cursos | `cursos.json` | crear, editar y borrar; filtros por maestría, eje y texto |
| Estructura fija | `estructura.json` | solo lectura: Escuela y maestrías |
| Planes | `planes.json` · `marco.json` | cuadrícula 4 × 3 de cualquier plan: de énfasis o común (con casillas abiertas) |
| Cuerpos | `cuerpos.json` | los cuatro cursos de cada especializado |

## Cómo guarda

La pestaña **Cursos** filtra por maestría, por eje y por texto (nombre o id). La pertenencia a una
maestría no está en `cursos.json`: se deduce de los planes y del plan común donde aparece el curso,
igual que hace el compilador.

La interfaz usa el nombre del programa, no su id: el selector de planes dice *Énfasis en Arte*, no
`enf-creacion-arte`. Los ids quedan a la vista solo como dato de depuración. Las maestrías llevan su
marca de familia, igual que en la app.

«Guardar y compilar» hace dos cosas, en este orden:

1. `POST /api/fuente` → escribe los cinco JSON.
2. `POST /api/compilar` → corre `build-data.mjs` y `build-curriculum.mjs` y devuelve su salida.

**Es un borrador hasta que compila.** Si la compilación falla, los archivos quedan escritos y el error
se muestra abajo: se corrige y se vuelve a guardar. El sitio publicado no cambia nunca desde aquí —
la publicación es bajo demanda desde Actions.

Los errores son los del compilador, que ya conoce las reglas: 12 casillas y 36 créditos por plan,
4 cursos por especializado, ningún curso huérfano, todo umbral con su programa de origen. El editor no
duplica esas reglas: las usa.

## Piezas compartidas

La interfaz no tiene una barra por pestaña: tiene **una** barra con filtros, acción y conteo, y las
tres pestañas que filtran la usan igual. Lo mismo con el conteo (`N de M`), siempre a la derecha.

`.barra`, `.filtro`, `.conteo` y `.accion` viven en `src/editor/editor.css`; los componentes solo
componen. El filtro de **maestría es único para toda la sesión**: si elegís Humanidades en Énfasis,
Planes ya está acotado a sus énfasis, y el plan elegido se mueve al primero que quede.

## La API (solo desarrollo)

`scripts/editor/api.mjs`, montada por `vite.config.ts` únicamente cuando el comando es `serve`.

| Ruta | Método | Qué hace |
|---|---|---|
| `/api/fuente` | GET | devuelve las cinco tablas |
| `/api/fuente` | POST | escribe las tablas recibidas |
| `/api/compilar` | POST | corre la tubería y devuelve `{ ok, salida }` |

## Crear

- **Énfasis**: «＋ Nuevo énfasis» crea el programa **y su plan vacío**. El compilador lo rechaza
  hasta que las doce casillas tengan curso — es el contrato de borrador que acordamos.
- **Curso**: «＋ Nuevo curso» añade una fila con `cur-nuevo-N`, eje `disciplinar`, 3 créditos.
- **Especializado**: «＋ Nuevo especializado» pide un nombre y crea un cuerpo vacío. Si su id coincide
  con un énfasis (`pe-x` ↔ `enf-x`) hereda nombre y familia; si no, el nombre que le diste es el suyo.
  Los cuatro cursos se cargan en «Cuerpos».
- **Plan común**: si una maestría no tiene, aparece el botón para crearlo. **No se borra**: es parte de
  la estructura de su maestría, igual que su nombre.
- Todo se puede borrar salvo la Escuela y las maestrías, que son estructura fija.

## Estructura fija, y lo que puede dejar de serlo

La Escuela y las maestrías viven en `estructura.json` y no se editan: son el marco. Todo lo demás
—énfasis, especializados, cursos— sí cambia.

Periodismo y Patrimonio Cultural hoy no tienen énfasis; **pueden tenerlos mañana**. El modelo lo
soporta sin tocar código: basta crear sus énfasis desde el editor. Eso sí: una maestría con énfasis
necesita además un **plan común** en `marco.json` (el que cursa quien no elige énfasis), y hoy solo
Creación, Humanidades Experimentales y Gestión lo tienen. Si algún día se agregan énfasis a
Periodismo, hay que agregar su plan común en la pestaña «Plan común»; si no, el panel de la maestría
mostrará cero casillas.

## Lo que todavía no hace

- Editar alternativas (`alt`) de una casilla.
- Reordenar cursos arrastrando dentro de un plan.
- Editar figuras: es la Fase 2, con su propio lienzo.
- Borrar un plan sin borrar su énfasis (hoy van juntos).
- Borrar un plan común (por decisión: no se borra).
