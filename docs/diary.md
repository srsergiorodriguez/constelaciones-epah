# Bitácora

Registro corto de lo hecho y **por qué**. Se lee al empezar la siguiente tarea.
Reglas: una entrada por tarea terminada, máximo 4 líneas, sin adjetivos. Si pasa de 10 entradas,
las resueltas se podan; lo que hay que recordar de ellas se mueve a `architecture.md` o
`data-model.md`, que son los documentos que no caducan.

---

## 2026-10-29 · Fase 0: datos y documentación

**Análisis del documento maestro.** 110 páginas, 18 tablas de plan de estudios. Las tres tablas sin
énfasis son plantillas: declaran columnas, no cursos. Sus casillas genéricas se instancian con
nombres propios en cada énfasis; el tronco real se obtiene por intersección. *Por qué:* tratarlas
como oferta habría creado cursos fantasma y aristas falsas.

**Desagregación a cursos.** 83 cursos únicos y 236 registros de pertenencia, generados por
`scripts/build-data.mjs` con seis invariantes que fallan el build. *Por qué:* a mano, 180 casillas
son imposibles de auditar.

**Programas especializados.** Se derivan de las 4 casillas de especialización de cada énfasis
(12 cr). La regla general —«los cursos que no son electivas ni se comparten»— falla en Clásicos
(comparte el seminario de teoría) y en Gestión (solo tiene tres cursos propios), así que el cuerpo
está marcado casilla a casilla. *Por qué:* es la única definición que suma 12 cr en los 13 casos.

---

## 2026-10-29 · Identidad y figuras

**Decisiones del comité.** El curso umbral es un curso del cuerpo de un especializado, no una
entidad nueva; el doctorado queda fuera de alcance; cada constelación lleva una figura propia
relacionada con su campo. *Por qué:* las tres decisiones eliminan nodos y reglas que se habrían
inventado.

**Tipografía y color.** Se tomaron del sitio de la Facultad: Mikrobe, Palast y Area (kit de Adobe
Fonts) y los cinco colores institucionales. Como el color de marca no pasa contraste en una línea
fina, cada familia se ramificó en cuatro tonos oscurecidos verificados. *Por qué:* la app debe
parecer de la Facultad sin volverse ilegible.

**Figuras.** Dieciocho siluetas dibujadas como polilíneas y un reparto de estrellas por longitud de
arco. *Por qué:* la silueta es el argumento visual de la Escuela.

**El cielo se pliega.** Se probaron dos atlas de posiciones fijas con cámara; ninguno era legible: a
escala de cielo una figura mide el 8 % del ancho. El comité propuso lo contrario —las estrellas viajan
a su figura al elegir— y gana: la figura se lee al 100 % sin zoom. Se asume que las posiciones
dependen de la selección; la mitad estable es la nebulosa.

**Máximo dos.** Con tres o más figuras sobre el mismo tronco no se lee. Además el núcleo es común a
todos los planes, así que «dejar que se solapen» habría solapado las figuras por completo: el núcleo
deja de pertenecer a las figuras y pasa a ser el tronco del que crecen.

---

## 2026-10-29 · Sprint 1: el cielo quieto

**Datos tipados.** `build-curriculum.mjs` valida seis invariantes y escribe `curriculum.json`
(83 cursos, 236 pertenencias). Las siluetas salieron de la lámina a `figures.json` para que la app y
las figuras de `docs/` no puedan divergir. *Por qué:* dos copias de una silueta terminan distintas.

**Nebulosa.** `build-atlas.mjs` relaja 83 estrellas con semilla fija y atracción por maestría; el
resultado se versiona. Se probaron dos juegos de fuerzas: el primero amontonaba Creación sobre
Patrimonio. *Por qué:* sin estructura la nube es ruido y el viaje a la figura no cuenta nada.

**Núcleo.** Costó una definición: «compartido con otro plan» metía los cuatro seminarios de música en
el tronco de Composición. La regla correcta es la intersección de los planes hermanos más los cursos
de alcance escuela. *Por qué:* el tronco es lo que comparten todos, no lo que comparten algunos.

**Estado.** 15 pruebas en verde, `svelte-check` limpio, build de 27 kB gzip. La app dibuja el cielo y
no se mueve.

---

## 2026-10-29 · Sprint 2: el viaje

**Animación sin d3.** El viaje se resuelve con `requestAnimationFrame` y una función pura
(`planViaje`, `posicionEn`): las lejanas salen antes y todas aterrizan juntas; las bisagras salen al
final. *Por qué:* una transición CSS no permite escalonar por distancia ni interrumpir a mitad sin
saltos.

**El caso incómodo.** Composición y Producción comparten cuatro de siete cursos. Con las figuras
quietas, las estrellas compartidas flotaban lejos del trazo. Se corrigen las dos figuras hacia una
bisagra, se inclinan 15° y el trazo pasa por las estrellas. *Por qué:* el usuario lo dijo: conservar
la forma «en lo posible» y dejar que se solapen.

**Estado en el hash.** La selección vive en la URL. Sirve para compartir un caso con el comité y para
capturar estados sin tocar la interfaz. *Por qué:* sin eso, cada demostración empieza de cero.

---

## 2026-10-29 · Revisión: selector, rótulo y forma

**Selección por periodo.** Las estrellas se repartían por índice a lo largo de la silueta; por eso dos
programas que comparten un curso lo veían en puntos distintos y ninguna alineación podía cuadrarlos.
Ahora cada periodo ocupa una franja de la figura. *Por qué:* el plan se lee de la base a la punta y
los cursos compartidos caen en la misma franja.

**Alineación rígida.** Donde había un giro fijo de 15°, ahora hay Procrustes: rotación y traslación
que acercan los cursos compartidos sin escalar ni deformar, con el giro acotado a ±25° para que una
figura no acabe de cabeza. El trazo solo se dibuja por las estrellas si el desvío supera 16 px.
*Por qué:* la silueta es el argumento; deformarla debe ser el último recurso.

**El cielo respira.** Se bajó la atracción por maestría y se sumó un desplazamiento sembrado: los
cinco cúmulos siguen ahí, pero se tocan y se desdibujan como un cielo de verdad. *Por qué:* cinco
manchas separadas se leían como un organigrama, no como un cielo.

---

## 2026-10-29 · Segunda revisión: una a la vez

**Comparación, aplazada.** Con dos programas que comparten cuatro de siete cursos no hay
transformación rígida que conserve las dos siluetas: o se deforma el trazo o las estrellas se
despegan. Se retira la función entera antes que mostrar una solución a medias.

**La maestría no es una figura.** Treinta y un cursos en una silueta de doce vértices es un nudo. Una
maestría con énfasis se compone como familia: cinco figuras, una por énfasis, con sus cursos
exclusivos; lo compartido va en columna entre las figuras que lo comparten.

**El reparto vuelve al arco.** El reparto por franjas de periodo amontonaba las estrellas en cuatro
anillos. Vuelve el reparto por longitud de arco, en orden de plan.

**El sistema de diseño sube un escalón.** Escala semántica de 12 a 44 px, estrellas de 9 a 20 px y
línea de constelación de 2,4 px. El rótulo superior cambia de sujeto: manda el nombre del programa.

---

## 2026-10-29 · El cielo, por fin cielo

**Fuera el atractor.** La nebulosa atraía cada curso hacia la región de su maestría; el resultado se
leía como un diagrama de clusters, no como un cielo. Se cambió por azar sembrado con separación
mínima: hay huecos, parejas cercanas y ninguna estructura que leer. *Por qué:* en reposo la Escuela no
tiene forma; inventarle una era mentir con la disposición.

**Fuera los rótulos de región.** Sin cúmulos, los nombres flotaban sobre nada. Los reemplaza una
leyenda de color al pie: el color distingue la maestría y la posición no codifica nada.

---

## 2026-10-29 · El plan a la vista

**Panel derecho.** Las iniciales no dicen nada: `PC1` no es «Proyecto de creación 1». El panel muestra
las doce casillas por periodo con nombre completo, código, créditos y el mismo glifo del cielo. En una
maestría, en vez de inventar un plan que no existe, lista sus énfasis y los abre con un clic.

**Hover cruzado.** Pasar el cursor por una estrella enciende su fila; pasar por la fila enciende la
estrella. Las dos vistas son la misma cosa dicha dos veces, y ahora se comportan como tal.
