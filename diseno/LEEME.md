# Diseño de la app de Belugas

Prototipos del rediseño. No son la app: la app sigue siendo el `index.html` de la raíz del repo y nada de esta carpeta la cambia.
Los jugadores son inventados y casi todas las jugadas son de ejemplo; solo los tres marcadores de octubre son reales.

## Cómo abrirlo

Doble clic en `index.html`. No necesita servidor ni internet (con internet carga la tipografía Inter).
Si prefieres un servidor: `python3 -m http.server 4710` dentro de esta carpeta y abre http://localhost:4710.

## Qué hay

| Página | Qué es |
|---|---|
| `app/inicio.html` | Prototipo del teléfono, tocable de principio a fin: Inicio con podio, empezar un partido con un toque, marcar jugadas («¿Qué pasó?» en tiras, «¿Cuánto avanzó?» con la regla del editor, la oportunidad «2ª y 6»), el aviso de cada jugada en el renglón de «¿Qué pasó?», la 4ª fallada que pasa sola el balón, corregir cualquier jugada desde la lista por series, terminar y seguir, «Lo que marcamos», partidos (con la franja de Equipo y los números de cada quien), jugadores, tarjeta de jugador y Métricas. La primera vez sale la bienvenida y, al marcar, una jugada de práctica (se repiten desde el engrane de Inicio). El relevo entre celulares necesita un servidor que aquí no hay: en esta copia está apagado y lo demás funciona igual. Los conmutadores de prueba están en las notas junto al teléfono (en pantalla ancha). |
| `app/metricas.html` | Métricas: partido, temporada, jugador y guía. Se arma con `node app/metricas/armar.mjs` a partir de `app/metricas/fuente.html` y `datos.json` (que escribe `generar-datos.mjs`); `app/metricas/capturas/` son capturas de cada vista y `app/metricas/logos/` los logos chicos que `armar.mjs` mete en la página. |
| `app/yardas-editor.html` | Editor de yardas: la regla en vivo y todo lo que se le puede cambiar (número, más y menos, barra, colores, zonas de TD, primera y 10, cómo se siente). |
| `app/yardas.html` | Yardas, vuelta 4: número grande, más y menos, y la barra que pinta lo ya avanzado. |
| `app/yardas-3.html`, `yardas-2.html`, `yardas-1.html` | Las vueltas anteriores: diez reglas distintas, pizarrón táctico y cancha con pasto. |
| `app/logos-revision.html`, `logos-comparacion.html`, `logos-tres.html` | Revisión de los logos de los 12 equipos. |
| `archivos/equipos/` | Los 12 logos en 1024 y 256 px con fondo transparente, y `equipos.json` con nombre, nombre corto y color. `recortes/` son los recortes de la captura de la tabla de la liga de donde salieron. |
| `archivos/marca/` | Logo, letras e ícono de Belugas (los mismos de la raíz del repo). |
| `archivos/inicio/` | El balón y la corona 3D del inicio, y 11 capturas de la última vuelta: los toques al marcar, el editor de yardas, las zonas de TD y las vueltas 3 y 4 de yardas. |
| `archivos/jugadores/` | Tres retratos generados (`nico.jpg`, `rodrigo.jpg`, `mau.jpg`), aprobados para publicarse, que usan la tarjeta de jugador y las métricas. |

## Qué no está aquí

- Las fotos originales de las personas, las variantes de retrato que no se escogieron y sus apellidos. Los demás jugadores son inventados y usan retratos ilustrados.
- Las capturas de las rondas anteriores del prototipo (las de `archivos/inicio/` que sí están son solo las de la última vuelta) y las hojas de comparación de logos (unos 70 MB entre todo).
- El tablero de ideas con sus referencias de Mobbin, que son de terceros.
