// lo que comparten las pruebas: un servidor de la carpeta del repo, el teléfono (Chromium en 390 × 844) y una nube falsa
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' };

// URL=https://joosemau-beep.github.io/belugas/ prueba la app publicada; sin URL, la de esta carpeta
export async function servidor() {
  if (process.env.URL) return { url: process.env.URL, cerrar: () => {} };
  const srv = http.createServer(async (req, res) => {
    const ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const f = join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta);
    try { const cuerpo = await readFile(f); res.writeHead(200, { 'Content-Type': TIPOS[extname(f)] || 'application/octet-stream' }); res.end(cuerpo); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => srv.listen(+process.env.PORT || 4710, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${srv.address().port}/`, cerrar: () => srv.close() };
}

// la nube de Supabase, en memoria: las dos funciones que usa la app (leer y guardar si nadie guardó en medio)
export function nubeFalsa(clave, jugadores) {
  const db = { [clave]: { datos: { players: jugadores, lines: {} }, actualizado: 't0' }, [clave + '-vivo']: { datos: {}, actualizado: 't0' }, [clave + '-cel']: { datos: {}, actualizado: 't0' } };
  let n = 0;
  const ruta = (route) => {
    const f = route.request().url().split('/rpc/')[1], b = JSON.parse(route.request().postData() || '{}'), r = db[b.p_clave];
    if (f === 'tochito_leer') return route.fulfill({ json: r ? [{ datos: r.datos, actualizado: r.actualizado }] : [] });
    if (f === 'tochito_guardar') { if (!r || r.actualizado !== b.p_base) return route.fulfill({ json: null }); r.datos = b.p_datos; r.actualizado = 't' + ++n; return route.fulfill({ json: r.actualizado }); }
    return route.abort();
  };
  return { db, ruta };
}

let nav;
export const navegador = async () => (nav = nav || (await chromium.launch()));
export const cerrarNavegador = () => nav && nav.close();

// un teléfono nuevo, sin la bienvenida ni la práctica; con nube, abre con el link del equipo
export async function telefono(url, { nube, clave } = {}) {
  const ctx = await (await navegador()).newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('belugas.visto.ver', '1'); localStorage.setItem('belugas.visto.marcar', '1'); });
  // la nube de verdad nunca se toca desde las pruebas
  await ctx.route(/supabase\.co/, nube ? nube.ruta : (r) => r.abort());
  const pg = await ctx.newPage();
  pg.errores = []; pg.on('pageerror', (e) => pg.errores.push(e.message));
  await pg.goto(url + (clave ? '#k=' + clave : ''));
  await pg.waitForSelector('#tel .nav');
  return pg;
}

// tocar un botón de la app por su acción (data-a) y su valor (data-v)
export async function toca(pg, a, v) {
  await pg.locator(`#tel [data-a="${a}"]` + (v === undefined ? '' : `[data-v="${v}"]`)).first().click();
  await pg.waitForTimeout(150);
}
export const marcador = async (pg) => (await pg.locator('.mk-marc strong').innerText()).replace(/\s/g, '');
export const lado = (pg) => pg.locator('.mk-lado').innerText();
export const texto = async (pg) => (await pg.locator('#tel').innerText()).replace(/\s+/g, ' ');
