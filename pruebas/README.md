# Pruebas de la app

Recorren la app del teléfono (`index.html`) en Chromium, en 390 × 844, como en un partido de verdad:

- **los puntos de la tabla**: pick 6, TD de pase, yardas, sacks, banderas.
- **un partido completo**: agregar jugadores, escoger rival, marcar quién vino y luego cada tipo de jugada (pase con yardas, corrida, incompletos, nos pararon, castigos, TD con conversión, bandera, tapado, presión, sack, TD de ellos, intercepciones, pick 6 de los dos lados, safeties). Revisa el marcador y el lado después de cada jugada, y además prueba Deshacer, Corregir, Borrar, recargar a media partida, Terminar y Seguir marcando. Al final revisa los puntos de cada jugador, el récord, Métricas, Partidos y Jugadores.
- **dos celulares**: el segundo se une al partido en vivo, los dos marcan y el que termina cierra el partido en el otro. Usa una nube falsa en memoria: las pruebas nunca tocan la nube del equipo.
- **corregir y eliminar un partido ya jugado**: desde su ficha se borra una jugada, se cambia otra de tipo y de jugador, se agrega un TD que faltó en su lugar, y se cambian rival y fecha; luego se elimina otro partido. Revisa marcador, puntos, récord y Partidos, y que todo sigue al recargar.
- **la corrección y el borrado en el otro celular**: llegan por la nube falsa sin pasar por el partido en vivo, y una copia vieja del partido (como la de un celular con la app de antes) no lo revive.
- **las pantallas**: «¿Quiénes vinieron?» no se reinicia al tocar a alguien, la palomita sin cuadro, sin barrita de arrastre y con ✕ y ✓ de 44 px arriba a la derecha en cada hoja, ninguna pantalla rebota, Marcar con las 6 jugadas más usadas en grande y el resto en «Más opciones», «¿Quién?» con el de la última jugada primero, «¿Cuánto avanzó?» con saltos de −5, +5, +10 y +20, sin la tira «Última» en Marcar y todo sin bajar, sin 1ª y 10 en ningún lado (lo revisa una prueba en todas las pantallas), Ataque/Defensa arriba, los botones de jugada enteros de su color (distinto en cada uno, en dos tonos con el blanco legible al sol, 4.5:1 o más) y que rebotan al tocarlos, «¿Quién?» por grupos (Ataque, Defensa y Los dos, primero el lado de la jugada) con cada quien del color de su lado y las fotos sin aro de color, sin castigos ni «Nos pararon», «Pase tapado» directo, sin textos de ayuda en las hojas, sin «No sé», «Lo que pasó» aparte, a la derecha de Marcar (sin pestañas: deslizando a la izquierda y de regreso a la derecha; la página sigue al dedo, regresa si no alcanza y el punto de arriba se mueve con ella), el aviso de la jugada arriba sobre el marcador sin tapar QB ni Terminar, guardar una jugada no mueve los botones, en defensa el TD de ellos dice solo «Touchdown», la franja de la hora con el color del rival y del encabezado de cada pantalla (también las fichas), regresar de una ficha a donde ibas, sin la tabla de la liga (ni en Inicio ni en Partidos), la tarjeta de Inicio sin balón y Líderes sin brincar hasta arriba.
- **cómo funciona la app**: el recorrido se abre desde «¿Quién es el QB?» (botón arriba a la derecha) a media partida y toca los botones de verdad (pase completo, quién, yardas, lo que pasó, deshacer, defensa) en un partido de práctica; al acabar, el partido en vivo, lo guardado en el teléfono y la nube quedan idénticos y se sigue marcando. También sale solo la primera vez (sin jugadores practica con tres de mentira), no vuelve a salir solo, y desde Ajustes se abre y «Saltar» regresa todo.
- **las animaciones**: en Líderes, al cambiar de categoría, las fotos son las mismas (no se vuelven a cargar) y no se repite la entrada del podio; en la ficha del jugador, «Partido por partido» sin barra; el latido de «En vivo» no empieza de nuevo con cada toque; de una hoja a otra el fondo no parpadea; y la tarjeta del recorrido no vuelve a aparecer cuando la app se repinta.
- **desde el ícono del iPhone**: en un SE, un 15 y un 15 Pro Max, también cuando iOS 26 le da a la página la pantalla menos la franja de la hora, la página le pide a iOS la pantalla entera, la barra de pestañas termina en la orilla de lo que se pinta (nunca más abajo, donde iOS la cortaría) con el aire de la rayita dentro y la píldora pegada abajo, encima de la rayita, como en un iPhone, la página no se arrastra, QB y Terminar de Marcar bajan como el encabezado de las otras pantallas (pegados a la hora, iOS 26 los difumina) y lo último de cada pantalla (Inicio, Partidos, Jugadores, Métricas, las fichas y Marcar) no queda tapado. Que iOS dé la pantalla entera solo se ve en el iPhone.
- **las métricas**: una corrida que se corrige a «Touchdown» sigue siendo TD corriendo (nada para el QB), los partidos de cada quien son los que vino aunque no haya hecho nada (sin «No jugó»), y un receptor que lanzó un pase no sale como QB ni en su tarjeta ni en Jugadores.
- **la barra de pestañas (la Waterline)**: solo íconos (los nombres quedan para el lector de pantalla), el centro con el marcador y el punto de en vivo, la gota llega a la pestaña tocada y deja de dibujar al quedarse quieta; también sin WebGL (la gota de CSS) y con reducir movimiento (cambia de lugar de una vez).
- **abre sin señal**: solo contra la app publicada, porque el service worker necesita https.

## Cómo correrlas

Hace falta Node 20 o más nuevo. La primera vez, dentro de esta carpeta:

```sh
npm install
npx playwright install chromium
```

Y luego, cada vez:

```sh
npm test                                                  # la app de esta carpeta (servidor en el puerto 4710)
URL=https://joosemau-beep.github.io/belugas/ npm test     # la publicada, con la prueba sin señal
NAVEGADOR=webkit npm test                                 # las mismas, en WebKit (el motor del iPhone); la primera vez: npx playwright install webkit
```

Si el puerto 4710 está ocupado, se cambia con `PORT=4711 npm test`. Tardan como un minuto y medio.
