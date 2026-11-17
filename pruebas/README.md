# Pruebas de la app

Recorren la app del teléfono (`index.html`) en Chromium, en 390 × 844, como en un partido de verdad:

- **los puntos de la tabla**: pick 6, TD de pase, yardas, sacks, banderas.
- **un partido completo**: agregar jugadores, escoger rival, marcar quién vino y luego cada tipo de jugada (pase con yardas, corrida, incompletos, nos pararon, castigos, TD con conversión, bandera, tapado, presión, sack, TD de ellos, intercepciones, pick 6 de los dos lados, safeties). Revisa el marcador y el lado después de cada jugada, y además prueba Deshacer, Corregir, Borrar, recargar a media partida, Terminar y Seguir marcando. Al final revisa los puntos de cada jugador, el récord, Métricas, Partidos y Jugadores.
- **dos celulares**: el segundo se une al partido en vivo, los dos marcan y el que termina cierra el partido en el otro. Usa una nube falsa en memoria: las pruebas nunca tocan la nube del equipo.
- **corregir y eliminar un partido ya jugado**: desde su ficha se borra una jugada, se cambia otra de tipo y de jugador, se agrega un TD que faltó en su lugar, y se cambian rival y fecha; luego se elimina otro partido. Revisa marcador, puntos, récord y Partidos, y que todo sigue al recargar.
- **la corrección y el borrado en el otro celular**: llegan por la nube falsa sin pasar por el partido en vivo, y una copia vieja del partido (como la de un celular con la app de antes) no lo revive.
- **las pantallas**: «¿Quiénes vinieron?» no se reinicia al tocar a alguien, la palomita sin cuadro, sin barrita de arrastre y con ✕ y ✓ de 44 px arriba a la derecha en cada hoja, ninguna pantalla rebota, Marcar con las 6 jugadas más usadas en grande y el resto en «Más opciones», «¿Quién?» con el de la última jugada primero, «¿Cuánto avanzó?» con saltos de −5, +5, +10 y +20, sin la tira «Última» en Marcar y todo sin bajar, sin 1ª y 10 en ningún lado, Ataque/Defensa grande, sin «No sé», «Lo que pasó» aparte (sin pestañas: deslizando a la derecha y de regreso a la izquierda), la franja de la hora con el color del rival, la tarjeta de Inicio sin balón y Líderes sin brincar hasta arriba.
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
```

Si el puerto 4710 está ocupado, se cambia con `PORT=4711 npm test`. Tardan como un minuto y medio.
