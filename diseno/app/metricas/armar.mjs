// Arma app/metricas.html (un solo archivo) desde fuente.html + datos.json + los logos de la liga.
// Uso: node armar.mjs   (desde cualquier carpeta). Si cambian los logos en archivos/equipos/, se vuelve a correr.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url)), equipos = join(aqui, '..', '..', 'archivos', 'equipos'), tmp = join(aqui, 'logos');
const datos = JSON.parse(readFileSync(join(aqui, 'datos.json'), 'utf8'));
// solo los logos que salen en el prototipo: Belugas y los rivales de los partidos de ejemplo
const ids = ['belugas', ...new Set(datos.juegos.map((j) => j.rival))];
mkdirSync(tmp, {recursive: true});
const logos = {};
for (const id of ids) {
  const png = join(tmp, `${id}.png`), webp = join(tmp, `${id}.webp`);
  execFileSync('sips', ['-Z', '112', join(equipos, `${id}-256.png`), '--out', png], {stdio: 'ignore'});
  try { execFileSync('cwebp', ['-quiet', '-q', '86', '-alpha_q', '100', png, '-o', webp]); logos[id] = 'data:image/webp;base64,' + readFileSync(webp).toString('base64'); }
  catch { logos[id] = 'data:image/png;base64,' + readFileSync(png).toString('base64'); } // sin cwebp se queda en PNG
}
let html = readFileSync(join(aqui, 'fuente.html'), 'utf8');
const pon = (marca, valor) => { if (!html.includes(marca)) throw new Error(`falta ${marca} en fuente.html`); html = html.replace(marca, () => JSON.stringify(valor)); };
pon('/*__DATOS__*/null', datos);
pon('/*__LOGOS__*/null', logos);
const salida = join(aqui, '..', 'metricas.html');
writeFileSync(salida, html);
console.log(`${salida}: ${(html.length / 1024).toFixed(0)} KB (${datos.filas.length} jugadas, ${ids.length} logos)`);
