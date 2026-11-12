# Diseño de la app de Belugas

Prototipos del rediseño. No son la app: la app sigue siendo el `index.html` de la raíz del repo y nada de esta carpeta la cambia.
Los jugadores son inventados y casi todas las jugadas son de ejemplo; solo los tres marcadores de octubre son reales.

## Cómo abrirlo

Doble clic en `index.html`. No necesita servidor ni internet (con internet carga la tipografía Inter).
Si prefieres un servidor: `python3 -m http.server 4710` dentro de esta carpeta y abre http://localhost:4710.

## Qué hay

| Página | Qué es |
|---|---|
| `app/inicio.html` | Prototipo del teléfono: inicio, marcar jugadas, partidos, jugadores y tarjeta de jugador. A la derecha están los controles para cambiar estilo, variante y pestañas. |
| `app/metricas.html` | Métricas: partido, temporada, jugador y guía. Se arma con `node app/metricas/armar.mjs` a partir de `app/metricas/fuente.html` y `datos.json` (que escribe `generar-datos.mjs`); `app/metricas/capturas/` son capturas de cada vista y `app/metricas/logos/` los logos chicos que `armar.mjs` mete en la página. |
| `app/yardas-editor.html` | Editor de yardas: la regla en vivo y todo lo que se le puede cambiar (número, más y menos, barra, colores, zonas de TD, primera y 10, cómo se siente). |
| `app/yardas.html` | Yardas, vuelta 4: número grande, más y menos, y la barra que pinta lo ya avanzado. |
| `app/yardas-3.html`, `yardas-2.html`, `yardas-1.html` | Las vueltas anteriores: diez reglas distintas, pizarrón táctico y cancha con pasto. |
| `app/logos-revision.html`, `logos-comparacion.html`, `logos-tres.html` | Revisión de los logos de los 12 equipos. |
| `archivos/equipos/` | Los 12 logos en 1024 y 256 px con fondo transparente, y `equipos.json` con nombre, nombre corto y color. `recortes/` son los recortes de la captura de la tabla de la liga de donde salieron. |
| `archivos/marca/` | Logo, letras e ícono de Belugas (los mismos de la raíz del repo). |
| `archivos/inicio/` | El balón y la corona 3D del inicio. |
| `archivos/jugadores/` | Tres retratos generados (`nico.jpg`, `rodrigo.jpg`, `mau.jpg`), aprobados para publicarse, que usan la tarjeta de jugador y las métricas. |

## Qué no está aquí

- Las fotos originales de las personas, las variantes de retrato que no se escogieron y sus apellidos. Los demás jugadores son inventados y usan retratos ilustrados.
- Las capturas de las rondas anteriores del prototipo y las hojas de comparación de logos (unos 70 MB entre todo).
- El tablero de ideas con sus referencias de Mobbin, que son de terceros.
