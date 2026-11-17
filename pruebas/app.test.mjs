// node --test: un partido completo en el teléfono, los puntos, recargar a media partida, dos celulares y sin señal
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { servidor, nubeFalsa, telefono, toca, marcador, lado, texto, cerrarNavegador } from './apoyo.mjs';

const srv = await servidor();
after(async () => { await cerrarNavegador(); srv.cerrar(); });

test('los puntos de la tabla', async () => {
  const pg = await telefono(srv.url);
  const pts = (x) => pg.evaluate((x) => puntosDe(x), x); // eslint-disable-line no-undef
  assert.equal(await pts({ intn: 1, td: 1 }), 11); // pick 6
  assert.equal(await pts({ rec: 2, ryd: 8, pd: 1, td: 1, saf: 1 }), 11.8);
  assert.equal(await pts({ pyd: 8, tdp: 1, convp: 1, intl: 2, tap: 1, safc: 1 }), 1.8);
  assert.equal(await pts({ drop: 1, band: 1, bandx: 1 }), 1.5);
  assert.equal(await pts({ skyd: 3 }), -0.3);
  await pg.context().close();
});

test('un partido completo: cada jugada, deshacer, recargar, terminar y las cuentas', async () => {
  const pg = await telefono(srv.url);
  // sin el link del equipo los jugadores se agregan a mano
  await toca(pg, 'ir', 'jugadores');
  for (const n of ['Mau', 'Nico', 'Rodrigo', 'Pepe', 'Luis']) { await toca(pg, 'escribe', 'nuevo'); await pg.fill('#escribe', n); await toca(pg, 'escribeya'); }
  await toca(pg, 'ir', 'inicio');
  await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies');
  assert.match(await texto(pg), /Marca quién vino/); // al empezar nadie está marcado
  for (const id of ['mau', 'nico', 'rodrigo', 'pepe']) await toca(pg, 'vantoggle', id);
  await toca(pg, 'vanlisto');
  assert.equal(await marcador(pg), '0–0');
  assert.match(await pg.locator('.qbchip').innerText(), /Mau/);

  const paso = async (esperado, ladoEsperado) => { assert.equal(await marcador(pg), esperado); if (ladoEsperado) assert.match(await lado(pg), ladoEsperado); };
  // ataque
  await toca(pg, 'res', 'pase'); await toca(pg, 'pdt'); await toca(pg, 'quien', 'nico');
  for (let i = 0; i < 8; i++) await pg.locator('.rg-b[data-pm="1"]').click();
  await pg.waitForTimeout(3300); // la regla se cierra sola 3 s después del último toque
  await paso('0–0', /Ataque/);
  await toca(pg, 'res', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'cayo'); await toca(pg, 'quien', 'pepe');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'mal');
  await toca(pg, 'res', 'parada');
  await toca(pg, 'castigo', 'favor'); await toca(pg, 'castigo', 'contra');
  await paso('0–0', /Ataque/);
  await toca(pg, 'res', 'td'); await toca(pg, 'como', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd');
  await toca(pg, 'conv', '1-1'); await toca(pg, 'convq', 'rodrigo');
  await paso('7–0', /Defensa/); // el TD pasa el balón
  // defensa
  await toca(pg, 'res', 'bandera'); await toca(pg, 'quien', 'pepe'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'tapado'); await toca(pg, 'inc', 'tapo'); await toca(pg, 'quien', 'mau');
  await toca(pg, 'res', 'tapado'); await toca(pg, 'inc', 'tapo'); await toca(pg, 'tapo', 'presion');
  assert.equal(await pg.locator('#tel [data-a="quien"][data-v="luis"]').count(), 0); // Luis no vino: no sale
  await toca(pg, 'quien', 'nico');
  await toca(pg, 'res', 'tapado'); await toca(pg, 'inc', 'fallo');
  await toca(pg, 'res', 'sack'); await toca(pg, 'quien', 'rodrigo');
  await toca(pg, 'tdr'); await toca(pg, 'conv', '2-1');
  await paso('7–8', /Ataque/);
  await toca(pg, 'res', 'int');
  await paso('7–8', /Defensa/);
  await toca(pg, 'res', 'pick6'); await toca(pg, 'quien', 'mau'); await toca(pg, 'conv', '0');
  await paso('13–8', /Defensa/); // después del pick 6 ellos vuelven a atacar
  await toca(pg, 'res', 'safety'); await toca(pg, 'quien', 'nico');
  await paso('15–8', /Ataque/);
  await toca(pg, 'res', 'safetyc');
  await paso('15–10', /Defensa/);
  await toca(pg, 'lado', 'O'); // el lado a mano
  await paso('15–10', /Ataque/);
  await toca(pg, 'res', 'pick6c'); await toca(pg, 'conv', '1-0');
  await paso('15–16', /Ataque/);
  // sack a nuestro QB con yardas perdidas, y se deshace
  await toca(pg, 'res', 'sackr'); await pg.locator('.rg-b[data-pm="-1"]').click(); await pg.locator('.rg-b[data-pm="-1"]').click(); await pg.waitForTimeout(3300);
  const n = await pg.evaluate(() => st.partido.jugadas.length); // eslint-disable-line no-undef
  await toca(pg, 'deshacer', 'aviso');
  assert.equal(await pg.evaluate(() => st.partido.jugadas.length), n - 1); // eslint-disable-line no-undef
  // corregir: el castigo en contra pasa a ser corrida de Nico, y se borra la corrida de Rodrigo (con Deshacer del borrado)
  const idx = (k, v) => pg.evaluate(([k, v]) => st.partido.jugadas.findIndex((j) => j.k === k && (!v || j.v === v || j.id === v)), [k, v]); // eslint-disable-line no-undef
  // tocar el renglón de una jugada (las series viejas están cerradas en la lista)
  const fila = (i) => pg.evaluate((i) => { A.fila(i); pintar(); }, i); // eslint-disable-line no-undef
  await fila(await idx('castigo', 'contra')); await toca(pg, 'cqp'); await toca(pg, 'cqpya', 'corrida'); await toca(pg, 'cquien', 'nico');
  await fila(await idx('corrida', 'rodrigo')); await toca(pg, 'borrar'); await toca(pg, 'deshacer', 'aviso');
  assert.notEqual(await idx('corrida', 'rodrigo'), -1);
  await paso('15–16');

  // cerrar la app a media partida: regresa a Marcar con todo
  await pg.reload(); await pg.waitForSelector('.mk-marc');
  await paso('15–16', /Ataque/);

  // terminar, seguir marcando sin querer y terminar otra vez
  await toca(pg, 'terminar');
  assert.match(await texto(pg), /Perdimos.*15 – 16/i);
  await toca(pg, 'seguir'); await paso('15–16'); await toca(pg, 'terminar');

  // las cuentas del partido, cada jugador
  const st = await pg.evaluate(() => { const g = JUEGOS[JUEGOS.length - 1]; return Object.fromEntries(Object.entries(g.st).map(([id, x]) => [id, { ...x, pts: puntosDe(x) }])); }); // eslint-disable-line no-undef
  assert.deepEqual(st.mau, { comp: 2, att: 6, pyd: 8, tdp: 1, convp: 1, intl: 2, tap: 1, td: 1, intn: 1, safc: 1, pts: 12.8 });
  assert.deepEqual(st.nico, { rec: 2, ryd: 8, pd: 1, td: 1, pres: 1, saf: 1, car: 1, pts: 12.8 });
  assert.deepEqual(st.rodrigo, { car: 1, conv: 1, sack: 1, pts: 4 });
  assert.deepEqual(st.pepe, { drop: 1, band: 1, pts: 0.5 });
  assert.equal(await pg.evaluate(() => RECORD), '5–2'); // eslint-disable-line no-undef

  // Métricas, Partidos y Jugadores
  await toca(pg, 'ir', 'metricas');
  const met = await texto(pg);
  assert.match(met, /Puntos a favor 126/); assert.match(met, /Puntos en contra 103/);
  assert.match(met, /Pases completos 33% 2 de 6/); assert.match(met, /Conversiones De 1: 1 de 1/);
  await toca(pg, 'met', 'defensa');
  assert.match(await texto(pg), /Series frenadas 67% 2 de 3/);
  await toca(pg, 'ir', 'partidos');
  assert.match(await texto(pg), /Kaffies Hoy P 15–16/);
  await toca(pg, 'ir', 'jugadores');
  assert.match(await texto(pg), /Mau .*12\.8 pts/);
  // y sigue ahí al volver a abrir
  await pg.reload(); await pg.waitForSelector('#tel .nav');
  assert.equal(await pg.evaluate(() => RECORD), '5–2'); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('dos celulares marcan el mismo partido', async () => {
  const clave = 'prueba-0123456789abcdefghij', nube = nubeFalsa(clave, ['Mau', 'Nico', 'Rodrigo']);
  const a = await telefono(srv.url, { nube, clave });
  await a.waitForFunction(() => PLANTEL.length === 3); // eslint-disable-line no-undef
  await toca(a, 'empezar'); await toca(a, 'rival', 'panini');
  for (const id of ['mau', 'nico', 'rodrigo']) await toca(a, 'vantoggle', id);
  await toca(a, 'vanlisto');
  await toca(a, 'res', 'td'); await toca(a, 'como', 'corrida'); await toca(a, 'quien', 'nico'); await toca(a, 'sinyd'); await toca(a, 'conv', '0');
  await a.waitForTimeout(1000);
  const b = await telefono(srv.url, { nube, clave });
  await b.waitForSelector('text=lo marca otro celular');
  await toca(b, 'marcar');
  assert.equal(await marcador(b), '6–0');
  await toca(b, 'tdr'); await toca(b, 'conv', '1-1');
  await a.waitForFunction(() => st.partido && st.partido.ellos === 7, null, { timeout: 10000 }); // eslint-disable-line no-undef
  await toca(a, 'terminar');
  await b.waitForFunction(() => !st.partido && st.pant === 'resumen', null, { timeout: 10000 }); // eslint-disable-line no-undef
  assert.match(await texto(b), /Lo terminó el otro celular/);
  assert.equal(Object.keys(nube.db[clave + '-cel'].datos.juegos).length, 1);
  assert.deepEqual([...a.errores, ...b.errores], []);
  await a.context().close(); await b.context().close();
});

// el service worker solo corre en https: con URL=https://joosemau-beep.github.io/belugas/
test('abre sin señal', { skip: !srv.url.startsWith('https:') && 'solo con URL=https://…' }, async () => {
  const pg = await telefono(srv.url);
  await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(2000);
  await pg.context().setOffline(true);
  await pg.reload(); await pg.waitForSelector('#tel .nav');
  assert.deepEqual(await pg.$$eval('img', (xs) => xs.filter((x) => x.complete && !x.naturalWidth).map((x) => x.src)), []);
  await pg.context().close();
});
