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

---

## 2026-10-29 · Especializados y maestría a secas

**Especializado en dos periodos.** El cuerpo de cuatro cursos heredaba los periodos del énfasis; en la
práctica se cursa en dos. Ahora la casilla es `ceil(i/2)`: dos cursos por periodo.

**La maestría a secas existe.** Faltaba el plan de quien se gradúa sin énfasis: la rejilla del plan
marco, con cursos del tronco y casillas abiertas que se llenan con cursos del énfasis elegido. El
panel muestra ese plan completo y, debajo, los énfasis como rutas opcionales.

---

## 2026-10-30 · La marca y el segundo selector

**Marca de familia.** El color de la maestría, rebajado y usado como fondo de título: nombres en el
selector y títulos de periodo en el plan. Cinco tokens `--hl-*` y una clase `.marca`; nunca texto de
cuerpo, nunca el único portador del significado.

**Siluetas en el cielo.** Sin selección, las quince figuras se dibujan en anillo alrededor del campo,
sin estrellas. Un clic abre el programa: el cielo deja de ser decorado y pasa a ser el otro selector.

---

## 2026-10-30 · Zonas de contacto

**Las siluetas se sueltan.** El anillo era una rejilla con otra forma. Ahora se siembran al azar y se
separan hasta no pisarse: un cielo no ordena sus figuras en círculo.

**El blanco no es el trazo.** Un trazo de 1,6 px no se acierta con el ratón. Cada glifo lleva un disco
transparente de casi el doble de su radio y cada silueta un relleno transparente más un círculo de
46 px en el centro. Es una regla del sistema de diseño, no un parche: toda forma interactiva tiene
zona de contacto.

---

## 2026-10-30 · Universo

**Nombres.** La app es «Constelaciones» y la vista general es el **Universo**. «Cielo» queda como
metáfora en los documentos, no como etiqueta de interfaz.

**Siluetas: más grandes, emparentadas y con roce.** Suben a 128 px, se agrupan por maestría y se
permiten solapes de hasta un 15 %: dos figuras se tocan sin confundirse. El roce es el argumento de
flexibilidad, no un defecto del empaquetado.

**El rótulo se lee.** Era gris, de 12 px y flotaba donde cayera. Ahora va en tinta sobre la marca de
la familia, a 13 px, siempre bajo la figura y acotado al borde del escenario.

---

## 2026-10-30 · 1,5×

**Más grandes.** Las siluetas pasan de 128 a 192 px y se permite un solape de hasta el 16 %: las
figuras se tocan y el roce cuenta la flexibilidad entre programas.

**Dos figuras no pueden coincidir.** La relajación suave dejó Composición y Fotografía exactamente una
sobre otra: la de abajo no se podía seleccionar. Se agregó una segunda fase de separación dura
(`0.84 · lado` entre centros) y una prueba que compara todos los pares. *Por qué:* un solape es una
decisión estética; una coincidencia es un error de accesibilidad.

---

## 2026-10-30 · El título es el camino de vuelta

**Clic en «Constelaciones» vuelve al universo.** El título ya estaba ahí y no hacía nada; ahora es el
botón de inicio, con subrayado al pasar el cursor. *Por qué:* además de «Volver al universo» al pie,
la salida más obvia es la que el ojo busca primero.

---

## 2026-10-30 · El nivel se dice

**Los nombres dicen qué son.** «Creación» pasa a «Maestría en Creación»; «Arte» a «Énfasis en Arte»;
«PE Arte» a «Programa Especializado en Arte». El cambio se hizo en el dato (`nombre_corto`), no en las
etiquetas, para que valga en la lista, el rótulo de la silueta, la cabecera y los CSV a la vez.

**Consecuencia de diseño.** El selector pasa de 240 a 300 px y los nombres envuelven; la cabecera baja
un escalón de tamaño (22 px) y se limita a 34 caracteres por línea. Los nombres largos son el precio
de que nadie tenga que adivinar qué nivel está mirando.

---

## 2026-10-30 · Las escalas

**Cuatro escalones, un solo cielo.** La barra vertical elige el tamaño del compromiso —3, 12, 36
créditos o el doctorado— y no rehace nada: filtra la lista y cambia el peso de lo ya dibujado. La
posición de las figuras es la misma en las cuatro escalas, y eso es lo que hace que se lean como
resoluciones de un mismo universo y no como pantallas distintas.

**La contención es una línea.** Un especializado es un contorno alrededor de cuatro estrellas; una
maestría, uno alrededor de sus figuras. El mismo gesto a dos tamaños. Se descartaron las galaxias:
un cielo con galaxias inventa una segunda cosmología encima de la primera.

**El énfasis no es una escala.** Es una variante de la maestría, y vive dentro de su región.

**El detalle del curso llega con la escalera.** «Cuenta para» muestra el camino de 12 → 36 →
título, que es lo que la reforma promete cuando dice que todo es apilable. Un curso del tronco no
tiene escalera y lo dice: cuenta para cualquier plan, pero no forma cuerpo.

---

## 2026-10-30 · El contorno que sobraba

**Fuera el contorno del especializado.** Envolver con una línea las cuatro estrellas de un
especializado dibujaba un polígono sobre la figura que no decía nada nuevo: la constelación ya
muestra qué cuatro cursos son. La contención con línea queda solo donde aporta —las regiones de
maestría en el universo— y el detalle se queda con la forma desnuda.

**La barra recupera el nombre.** «Especializado» era una abreviación, y ya acordamos que el nivel no
se abrevia. La barra pasa a 190 px para que quepa «Programa Especializado».

---

## 2026-10-30 · Una sola columna

**La escala y la lista comparten columna.** La barra pasa arriba y la lista debajo, separadas por una
regla. Se recuperan 190 px de ancho para el cielo sin tocar ninguna tipografía. *Por qué:* la escala
y la lista son la misma navegación —qué mirar y a qué resolución— y estaban ocupando dos columnas
para decir una cosa.

---

## 2026-10-30 · Toda maestría se nombra

**Periodismo y Patrimonio cultural no tenían región.** La regla era «una región por maestría con
énfasis», así que las dos de plan único solo se nombraban al pasar el cursor. Ahora cada maestría
recibe su envolvente: la de sus énfasis si los tiene, la de su única figura si no. El contorno de una
sola figura es una cápsula apretada, y está bien: dice que ese título y ese plan son la misma cosa.

---

## 2026-10-30 · El fragmento

**A doce créditos, el cielo muestra fragmentos.** Cada programa especializado se dibuja sobre la
figura de su énfasis, en fantasma, con solo sus cuatro estrellas encendidas. *Por qué:* un
especializado es literalmente un trozo del plan —cuatro de sus doce cursos—, y esa es la única forma
de que el cielo muestre a la vez de dónde sale y hacia dónde homologa.

**Periodismo y Patrimonio cultural desaparecen a esa escala.** No tienen puerta de doce créditos. La
ausencia es información, no un olvido: el escalón dice cuáles son las puertas que existen.

**Tres escalas, tres estados del mismo cielo:** estrellas sueltas (un curso), fragmentos (doce
créditos), figuras y regiones (el título). Ninguna posición cambia entre una y otra.

---

## 2026-10-30 · Las constelaciones como contexto

**A la escala del curso, las constelaciones no se tocan.** Se ven al 12 %, sin foco, sin rótulo y sin
clic. Sabes que están ahí —son una posibilidad— pero para explorarlas hay que subir de escala. La
pista del pie lo dice con palabras distintas en cada escalón.

**El título vuelve al universo entero.** Antes limpiaba la selección pero dejaba la escala donde
estaba; ahora devuelve también a maestría, que es la vista por defecto.

---

## 2026-10-30 · Umbral

**Umbral no es «curso».** La escala más baja dice «Cursos umbrales» y muestra 41, no 83: los que se
pueden tomar solos y homologar después. El resto sigue existiendo en el universo; simplemente no son
puertas.

**La propiedad está en el curso.** `umbral` y `umbral_desde` en `cursos.csv`, con validación: todo
umbral declara qué programa abre. Si mañana el comité agrega umbrales sueltos, el campo los acepta.

**El especializado se declara, no se calcula.** Hoy se deriva del énfasis, pero esa regla quedó
aislada en `PE_CUERPOS`: un programa puede traer su propio cuerpo y su `padre_id` puede ser nulo. El
modelo tolera lo que la derivación prohíbe, que es lo que pedía el cambio.

---

## 2026-10-30 · Leer el cielo

**Los rótulos no se leían.** Los nombres de las maestrías iban en 10 px gris; los de las figuras, en
12 px. Ahora van en negrita, 12 y 14 px, sobre la marca de familia. El rótulo de una región es parte
del sistema de diseño, no un detalle del dibujo.

**Pasar el cursor por el cielo mueve la lista.** No solo la resalta: la desplaza hasta la fila. Sin
eso, la lista y el cielo se señalaban sin encontrarse.

**Los umbrales se pueden tocar.** En la escala más baja los puntos son botones: el cursor enciende la
fila y el clic abre el detalle del curso.

**Deslizadores de depuración.** Con `?debug`, dos controles escriben `--stroke-const` y
`--stroke-region` en la raíz. Es la manera de decidir el grosor mirándolo, no adivinándolo.
