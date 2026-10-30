# Editor de datos

Editor local para `data/source/*.json`. **No se publica**: vive en el servidor de desarrollo y el
build de producción solo empaqueta `index.html`.

```bash
pnpm editar          # http://localhost:5173/editor.html
pnpm editar --port 4310
```

> El comando no se llama `edit` porque pnpm lo reserva para sí mismo (`pnpm edit` es un comando
> propio y falla con «not yet implemented»).

## Qué edita

| Pestaña | Tabla | Operación |
|---|---|---|
| Programas | `programas.json` | nombre, tipo, padre, maestría, créditos, página |
| Cursos | `cursos.json` | nombre, eje, formato, créditos, oferta variable |
| Planes | `planes.json` | cuadrícula 4 × 3: un curso por casilla, marca de cuerpo de especializado |
| Plan común | `marco.json` | las 12 casillas de cada maestría; curso concreto o casilla abierta |
| Cuerpos | `cuerpos.json` | cuatro cursos por especializado; vacío = derivado del énfasis |

## Cómo guarda

«Guardar y compilar» hace dos cosas, en este orden:

1. `POST /api/fuente` → escribe los cinco JSON.
2. `POST /api/compilar` → corre `build-data.mjs` y `build-curriculum.mjs` y devuelve su salida.

**Es un borrador hasta que compila.** Si la compilación falla, los archivos quedan escritos y el error
se muestra abajo: se corrige y se vuelve a guardar. El sitio publicado no cambia nunca desde aquí —
la publicación es bajo demanda desde Actions.

Los errores son los del compilador, que ya conoce las reglas: 12 casillas y 36 créditos por plan,
4 cursos por especializado, ningún curso huérfano, todo umbral con su programa de origen. El editor no
duplica esas reglas: las usa.

## La API (solo desarrollo)

`scripts/editor/api.mjs`, montada por `vite.config.ts` únicamente cuando el comando es `serve`.

| Ruta | Método | Qué hace |
|---|---|---|
| `/api/fuente` | GET | devuelve las cinco tablas |
| `/api/fuente` | POST | escribe las tablas recibidas |
| `/api/compilar` | POST | corre la tubería y devuelve `{ ok, salida }` |

## Lo que todavía no hace

- Crear o borrar programas y cursos (hoy se edita lo existente).
- Editar alternativas (`alt`) de una casilla.
- Reordenar arrastrando.
- Editar figuras: es la Fase 2, con su propio lienzo.
