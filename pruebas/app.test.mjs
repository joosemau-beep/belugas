// node --test: un partido completo en el teléfono, los puntos, recargar a media partida, dos celulares, corregir y eliminar un partido, las pantallas y sin señal
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { servidor, nubeFalsa, telefono, toca, marcador, lado, texto, cerrarNavegador } from './apoyo.mjs';

const srv = await servidor();
after(async () => { await cerrarNavegador(); srv.cerrar(); });

test('los puntos de la tabla', async () => {
  const pg = await telefono(srv.url);
  const pts = (x) => pg.evaluate((x) => puntosDe(x), x); // eslint-disable-line no-undef
  assert.equal(await pts({ intn: 1, td: 1 }), 11); // pick 6
  assert.equal(await pts({ rec: 2, ryd: 8, pd: 1, td: 1, saf: 1 }), 11.8); // la 1ª y 10 ya no da puntos
  assert.equal(await pts({ pyd: 8, tdp: 1, convp: 1, intl: 2, tap: 1, safc: 1 }), 1.3); // yarda de pase 0.04: 8 yd = 0.32
  assert.equal(await pts({ drop: 1, band: 3, bandx: 1 }), 5.5); // bandera +2; ya no hay extra por «sin avance»
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
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico');
  for (let i = 0; i < 8; i++) await pg.locator('.rg-b[data-pm="1"]').click();
  // la hoja no se cierra ni guarda sola (Iker, 17-nov): sigue abierta y sin yardas hasta la ✓
  await pg.waitForTimeout(3300);
  assert.deepEqual(await pg.evaluate(() => [st.hoja, st.partido.jugadas[0].yd ?? null]), ['cuanto', null]); // eslint-disable-line no-undef
  await pg.locator('.velo').click({ position: { x: 20, y: 20 } }); await pg.waitForTimeout(150);
  assert.equal(await pg.evaluate(() => st.hoja), 'cuanto'); // eslint-disable-line no-undef
  await toca(pg, 'rgok');
  assert.equal(await pg.evaluate(() => st.partido.jugadas[0].yd), 8); // eslint-disable-line no-undef
  await paso('0–0', /Ataque/);
  await toca(pg, 'res', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'cayo'); await toca(pg, 'quien', 'pepe');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'mal');
  // «Nos pararon», castigos, presión y «no la atraparon» ya no se marcan (Iker, 17-nov), pero los de partidos viejos siguen contando: se ponen como antes
  const vieja = (j) => pg.evaluate((j) => { guarda(j); pintar(); }, j); // eslint-disable-line no-undef
  await vieja({ k: 'parada' }); // «Nos pararon» ya no se marca, pero el de un partido viejo cuenta
  await vieja({ k: 'castigo', v: 'favor' }); await vieja({ k: 'castigo', v: 'contra' });
  await paso('0–0', /Ataque/);
  await toca(pg, 'res', 'td'); await toca(pg, 'como', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd');
  await toca(pg, 'conv', '1-1'); await toca(pg, 'convq', 'rodrigo');
  await paso('7–0', /Defensa/); // el TD pasa el balón
  // defensa
  await toca(pg, 'res', 'bandera'); await toca(pg, 'quien', 'pepe'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'tapado'); // «Pase tapado» va directo a quién lo tapó
  assert.equal(await pg.locator('#tel [data-a="quien"][data-v="luis"]').count(), 0); // Luis no vino: no sale
  await toca(pg, 'quien', 'mau');
  await vieja({ k: 'presion', id: 'nico' }); await vieja({ k: 'fallo' });
  await toca(pg, 'res', 'sack'); await toca(pg, 'quien', 'rodrigo');
  await toca(pg, 'tdr'); await toca(pg, 'conv', '2-1');
  await paso('7–8', /Ataque/);
  await toca(pg, 'res', 'int');
  await paso('7–8', /Defensa/);
  await toca(pg, 'res', 'pick6'); await toca(pg, 'quien', 'mau'); await toca(pg, 'conv', '0');
  await paso('13–8', /Defensa/); // después del pick 6 ellos vuelven a atacar
  await toca(pg, 'res', 'safety'); await toca(pg, 'quien', 'nico');
  await paso('15–8', /Ataque/);
  await toca(pg, 'mas'); await toca(pg, 'res', 'safetyc');
  await paso('15–10', /Defensa/);
  await toca(pg, 'lado', 'O'); // el lado a mano
  await paso('15–10', /Ataque/);
  await toca(pg, 'mas'); await toca(pg, 'res', 'pick6c'); await toca(pg, 'conv', '1-0');
  await paso('15–16', /Ataque/);
  // sack a nuestro QB con yardas perdidas, y se deshace
  await toca(pg, 'res', 'sackr'); await pg.locator('.rg-b[data-pm="-1"]').click(); await pg.locator('.rg-b[data-pm="-1"]').click(); await toca(pg, 'rgok');
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
  assert.match(await texto(pg), /Derrota.*15 – 16/i);
  // textos como en una transmisión de la NFL, sin los coloquiales de antes (Iker, 17-nov)
  const coloquial = /nos (la |pararon|hicieron|cayeron)|agarr|Los paramos|se le cayó|Balones (robados|perdidos)|Lo que marcamos/i;
  assert.doesNotMatch(await texto(pg), coloquial);
  await toca(pg, 'seguir'); await paso('15–16'); await toca(pg, 'terminar');

  // las cuentas del partido, cada jugador
  const st = await pg.evaluate(() => { const g = JUEGOS[JUEGOS.length - 1]; return Object.fromEntries(Object.entries(g.st).map(([id, x]) => [id, { ...x, pts: puntosDe(x) }])); }); // eslint-disable-line no-undef
  assert.deepEqual(st.mau, { comp: 2, att: 6, pyd: 8, tdp: 1, convp: 1, intl: 2, tap: 1, td: 1, intn: 1, safc: 1, pts: 12.3 });
  assert.deepEqual(st.nico, { rec: 2, tgt: 2, ryd: 8, td: 1, pres: 1, saf: 1, car: 1, pts: 12.8 }); // sin 1ª y 10: ya no se marca
  assert.deepEqual(st.rodrigo, { car: 1, conv: 1, sack: 1, pts: 4 });
  assert.deepEqual(st.pepe, { tgt: 1, drop: 1, band: 1, pts: 1.5 }); // tgt: le lanzaron 1 y lo soltó; // bandera +2
  assert.equal(await pg.evaluate(() => RECORD), '5–2'); // eslint-disable-line no-undef

  // Métricas, Partidos y Jugadores
  await toca(pg, 'ir', 'metricas');
  const met = await texto(pg);
  assert.match(met, /Puntos a favor 126/); assert.match(met, /Puntos en contra 103/);
  assert.match(met, /Pases completos 33% 2 de 6/); assert.match(met, /Conversiones De 1: 1 de 1/);
  await toca(pg, 'met', 'defensa');
  assert.match(await texto(pg), /Series detenidas 67% 2 de 3/);
  assert.match(await texto(pg), /Puntos en contra por partido/); assert.doesNotMatch(met + await texto(pg), coloquial);
  await toca(pg, 'ir', 'partidos');
  assert.match(await texto(pg), /Kaffies Hoy P 15–16/);
  // sin la tabla de la liga (Iker, 17-nov): ni pestaña de Posiciones en Partidos ni tarjeta en Inicio
  assert.doesNotMatch(await texto(pg), /Posiciones|Tabla de la liga/);
  await toca(pg, 'ir', 'inicio'); assert.doesNotMatch(await texto(pg), /Tabla de la liga|Ver la tabla|equipos/);
  await toca(pg, 'ir', 'jugadores');
  assert.match(await texto(pg), /Mau .*29\.3 pts/); // 12.3 del partido + 17 de antes de la app (3 rec ya valen 1)
  // la 1ª y 10 ya no se muestra en ningún lado (ni en Métricas, ni en la tabla de puntos, ni en la ficha de un jugador)
  assert.doesNotMatch(met, /1ª y 10/);
  assert.doesNotMatch(await pg.evaluate(() => document.querySelector('#tel').textContent), /Primero y diez|1ª y 10/);
  await toca(pg, 'jug', 'nico'); assert.doesNotMatch(await texto(pg), /Primeros y diez|1ª y 10/);
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
  await b.waitForSelector('text=desde otro celular');
  await toca(b, 'marcar');
  assert.equal(await marcador(b), '6–0');
  await toca(b, 'tdr'); await toca(b, 'conv', '1-1');
  await a.waitForFunction(() => st.partido && st.partido.ellos === 7, null, { timeout: 10000 }); // eslint-disable-line no-undef
  await toca(a, 'terminar');
  await b.waitForFunction(() => !st.partido && st.pant === 'resumen', null, { timeout: 10000 }); // eslint-disable-line no-undef
  assert.match(await texto(b), /Lo terminó otro celular/);
  assert.equal(Object.keys(nube.db[clave + '-cel'].datos.juegos).length, 1);
  assert.deepEqual([...a.errores, ...b.errores], []);
  await a.context().close(); await b.context().close();
});

// los ajustes de Iker (17-nov): corregir y eliminar un partido ya jugado, en este celular y en los demás
const agrega = async (pg, nombres) => { await toca(pg, 'ir', 'jugadores'); for (const n of nombres) { await toca(pg, 'escribe', 'nuevo'); await pg.fill('#escribe', n); await toca(pg, 'escribeya'); } await toca(pg, 'ir', 'inicio'); };
const juega = async (pg, rival, ids, jugadas) => { await toca(pg, 'marcar'); await toca(pg, 'rival', rival); for (const id of ids) await toca(pg, 'vantoggle', id); await toca(pg, 'vanlisto'); await jugadas(); await toca(pg, 'terminar'); };
const gid = (pg, rival) => pg.evaluate((r) => JUEGOS.find((g) => !g.solo && g.rival === r).id, rival); // eslint-disable-line no-undef
const idxDe = (pg, k) => pg.evaluate((k) => st.partido.jugadas.findIndex((j) => j.k === k), k); // eslint-disable-line no-undef
const fila = (pg, i) => pg.evaluate((i) => { A.fila(i); pintar(); }, i); // eslint-disable-line no-undef
const td = async (pg, como, quien) => { await toca(pg, 'res', 'td'); await toca(pg, 'como', como); await toca(pg, 'quien', quien); await toca(pg, 'sinyd'); await toca(pg, 'conv', '0'); };

test('corregir un partido que ya se jugó (borrar, cambiar, agregar en su lugar, rival y fecha) y eliminar otro', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico', 'Rodrigo']);
  await juega(pg, 'kaffies', ['mau', 'nico', 'rodrigo'], async () => {
    await td(pg, 'pase', 'nico'); await toca(pg, 'lado', 'O');
    await toca(pg, 'res', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd');
    await toca(pg, 'lado', 'D'); await toca(pg, 'tdr'); await toca(pg, 'conv', '0');
  });
  await juega(pg, 'panini', ['mau', 'nico', 'rodrigo'], () => td(pg, 'corrida', 'rodrigo'));
  assert.equal(await pg.evaluate(() => RECORD), '6–1–1'); // eslint-disable-line no-undef

  // desde la ficha: Corregir abre Marcar con ese partido, sin que salga «En vivo»
  const g1 = await gid(pg, 'kaffies');
  await toca(pg, 'ir', 'partidos'); await toca(pg, 'juego', g1);
  assert.match(await texto(pg), /Corregir Eliminar partido/); // «Corregir» va al pie de la ficha, junto a «Eliminar partido»
  await toca(pg, 'corregirp', g1);
  assert.equal(await marcador(pg), '6–6');
  assert.match(await texto(pg), /Editando/i);
  assert.equal(await pg.locator('.centro2.vivo').count(), 0);
  // borrar el TD de ellos y cambiar la corrida de Rodrigo por un pase a Nico
  await fila(pg, await idxDe(pg, 'tdr')); await toca(pg, 'borrar');
  assert.equal(await marcador(pg), '6–0');
  await fila(pg, await idxDe(pg, 'corrida')); await toca(pg, 'cqp'); await toca(pg, 'cqpya', 'pase');
  await fila(pg, await idxDe(pg, 'pase')); await toca(pg, 'cquien', 'nico');
  // el TD que faltó va después de la primera jugada, no al final
  await fila(pg, 0); await toca(pg, 'insaqui');
  assert.match(await texto(pg), /Insertar después de: TD de Nico/);
  await td(pg, 'corrida', 'rodrigo');
  assert.deepEqual(await pg.evaluate(() => st.partido.jugadas.map((j) => j.k + ':' + j.id)), ['td:nico', 'td:rodrigo', 'pase:nico']); // eslint-disable-line no-undef
  assert.equal(await marcador(pg), '12–0');
  // rival y fecha, desde el marcador
  await toca(pg, 'editar'); await toca(pg, 'rivalver', 'editar'); await toca(pg, 'rival', 'bucaneros');
  await toca(pg, 'fechaver'); await pg.fill('#fecha', '2026-11-09'); await toca(pg, 'fechaya');
  assert.match(await pg.locator('.hoja').innerText(), /Bucaneros[\s\S]*Fecha\s+9 nov/);
  await pg.locator('.hoja .op[data-a="cerrar"]').click();
  assert.match(await texto(pg), /Editando · 9 nov/i);
  await toca(pg, 'listocorr');
  assert.match(await texto(pg), /Victoria · 9 nov.*12 – 0/i);
  assert.equal(await pg.evaluate(() => RECORD), '7–1'); // eslint-disable-line no-undef
  const pts = await pg.evaluate((id) => { const g = JUEGOS.find((x) => x.id === id); return Object.fromEntries(Object.entries(g.st).map(([k, x]) => [k, puntosDe(x)])); }, g1); // eslint-disable-line no-undef
  assert.deepEqual([pts.nico, pts.rodrigo], [12.5, 10.5]); // los TD suman las yardas que faltaban (45)
  await toca(pg, 'ir', 'partidos');
  assert.match(await texto(pg), /Bucaneros 9 nov G 12–0/);
  // sigue así al volver a abrir, y no quedó un partido abierto
  await pg.reload(); await pg.waitForSelector('#tel .nav');
  assert.equal(await pg.evaluate(() => [RECORD, !!st.partido].join()), '7–1,false'); // eslint-disable-line no-undef

  // eliminar el de Panini: confirmación con rival y fecha, y las cuentas sin él
  const g2 = await gid(pg, 'panini');
  await toca(pg, 'ir', 'partidos'); await toca(pg, 'juego', g2); await toca(pg, 'eliminarver', g2);
  assert.match(await texto(pg), /¿Eliminar el partido\? vs Panini · Hoy · 6–0/);
  await toca(pg, 'eliminarp', g2);
  assert.equal(await pg.evaluate(() => RECORD), '6–1'); // eslint-disable-line no-undef
  assert.equal(await pg.evaluate(() => JUEGOS.some((g) => g.rival === 'panini')), false); // eslint-disable-line no-undef
  assert.equal(await pg.evaluate(() => TEMP.rodrigo.pts), 14.5); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'jugadores');
  // + lo de antes de la app (ANTES: 1 TD corriendo y 1 INT lanzada de Rodrigo): suma al TD, a la corrida y a los puntos (+6 −2)
  assert.match(await texto(pg), /Rodrigo 2 TD · 2 corridas 14\.5 pts/);
  // en su ficha, lo de antes sale como un renglón más de «Partido por partido», con sus puntos
  await toca(pg, 'jug', 'rodrigo');
  assert.match(await texto(pg), /Antes de la app · 6 partidos 1 TD · 1 corrida 4 pts/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('la corrección y el borrado llegan al otro celular, y una copia vieja no lo revive', async () => {
  const clave = 'prueba-corrige-0123456789ab', nube = nubeFalsa(clave, ['Mau', 'Nico', 'Rodrigo']);
  const a = await telefono(srv.url, { nube, clave });
  await a.waitForFunction(() => PLANTEL.length === 3); // eslint-disable-line no-undef
  await juega(a, 'panini', ['mau', 'nico', 'rodrigo'], async () => { await td(a, 'corrida', 'nico'); await toca(a, 'lado', 'O'); await td(a, 'pase', 'rodrigo'); });
  const g = await gid(a, 'panini');
  const enNube = async (ok) => { for (let i = 0; i < 100 && !ok(); i++) await a.waitForTimeout(100); assert.ok(ok()); };
  await enNube(() => (nube.db[clave + '-cel'].datos.juegos || {})[g]);
  const b = await telefono(srv.url, { nube, clave });
  await b.waitForFunction(() => JUEGOS.some((x) => !x.solo), null, { timeout: 10000 }); // eslint-disable-line no-undef
  const viejo = JSON.parse(JSON.stringify(nube.db[clave + '-cel'].datos.juegos[g]));
  const vivo = JSON.stringify(nube.db[clave + '-vivo'].datos);
  // A corrige: borra el TD de Rodrigo
  await toca(a, 'ir', 'partidos'); await toca(a, 'juego', g); await toca(a, 'corregirp', g);
  await fila(a, 1); await toca(a, 'borrar'); await toca(a, 'listocorr');
  await a.waitForTimeout(1500);
  assert.equal(JSON.stringify(nube.db[clave + '-vivo'].datos), vivo); // la corrección no pasa por el partido en vivo
  await b.reload(); await b.waitForSelector('#tel .nav');
  await b.waitForFunction(() => { const x = JUEGOS.find((y) => !y.solo); return x && x.nos === 6; }, null, { timeout: 10000 }); // eslint-disable-line no-undef
  assert.doesNotMatch(await texto(b), /lo marca otro celular/);
  // A lo elimina; luego un celular con la app de antes sube su copia sin el borrado: no regresa
  await toca(a, 'ir', 'partidos'); await toca(a, 'juego', g); await toca(a, 'eliminarver', g); await toca(a, 'eliminarp', g);
  await a.waitForTimeout(1500);
  nube.db[clave + '-cel'].datos.juegos[g] = viejo; nube.db[clave + '-cel'].actualizado = 'viejo';
  await a.evaluate(() => sinc(filas.temp)); await a.waitForTimeout(1500); // eslint-disable-line no-undef
  assert.equal(await a.evaluate(() => JUEGOS.some((x) => !x.solo)), false); // eslint-disable-line no-undef
  assert.equal(viejo.jugadas.every((j) => nube.db[clave + '-cel'].datos.juegos[g].borradas[j.uid]), true);
  await b.reload(); await b.waitForSelector('#tel .nav');
  await b.waitForFunction(() => !JUEGOS.some((x) => !x.solo), null, { timeout: 10000 }); // eslint-disable-line no-undef
  assert.deepEqual([...a.errores, ...b.errores], []);
  await a.context().close(); await b.context().close();
});

test('las pantallas: quiénes vinieron, sin rebote, Marcar con guantes, ✓ y ✕, la franja y los líderes', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico', 'Rodrigo', 'Pepe', 'Luis', 'Beto', 'Chuy', 'Dani', 'Emilio', 'Fer', 'Gabo', 'Hugo', 'Iván']);
  // tocar a alguien no rehace la hoja: no vuelve a subir, no regresa arriba, y la palomita es redonda (SVG)
  await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await pg.waitForTimeout(300);
  await pg.locator('.hoja').evaluate((h) => { h.scrollTop = 200; });
  await toca(pg, 'vantoggle', 'hugo');
  assert.deepEqual(await pg.locator('.hoja').evaluate((h) => [h.scrollTop, h.classList.contains('quieta')]), [200, true]);
  assert.equal(await pg.locator('.van-f.si .ck svg').count(), 1);
  // la palomita es un solo SVG (círculo y marca, colores planos): ni la caja ni nada adentro pinta fondo, degradado, borde, contorno
  // ni sombra, no hay checkbox debajo y no hay otra figura que pueda verse como un cuadro (así se veía antes, con el degradado)
  const ck = await pg.locator('.van-f .ck').evaluateAll((xs) => xs.map((e) => [e, ...e.querySelectorAll('*')].map((x) => { const c = getComputedStyle(x);
    return [x.tagName.toLowerCase(), c.backgroundImage, c.backgroundColor, c.borderTopWidth + c.borderRightWidth + c.borderBottomWidth + c.borderLeftWidth, c.outlineStyle, c.boxShadow].join(' '); })));
  assert.ok(ck.length >= 13);
  for (const partes of ck) {
    assert.ok(['span svg circle', 'span svg circle path'].includes(partes.map((x) => x.split(' ')[0]).join(' ')), partes.join(' | '));
    for (const x of partes.slice(0, 2)) assert.equal(x.split(' ').slice(1).join(' '), 'none rgba(0, 0, 0, 0) 0px0px0px0px none none', x);
  }
  // sin la barrita de arrastre: la hoja se cierra con su ✕ de 44 px, arriba a la izquierda, y el título va al centro (como en todos los pasos)
  assert.equal(await pg.locator('.hoja').evaluate((h) => getComputedStyle(h, '::before').content), 'none');
  assert.deepEqual(await pg.locator('.hoja .hbar').evaluate((b) => { const no = b.querySelector('.hb.no').getBoundingClientRect(), t = b.querySelector('h3');
    return [[...b.children].map((x) => x.className || x.tagName), Math.round(no.height), no.left < 40, getComputedStyle(t).textAlign]; }), [['hb no', 'H3', 'SPAN'], 44, true, 'center']);
  // abajo del botón fijo no se asoman los renglones
  assert.equal(await pg.evaluate(() => Math.round(document.querySelector('.hoja').getBoundingClientRect().bottom - document.querySelector('.ops.fijo').getBoundingClientRect().bottom)), 0);
  for (const id of ['mau', 'nico', 'rodrigo']) await toca(pg, 'vantoggle', id);
  await toca(pg, 'vanlisto');
  // Marcar: las 6 más usadas en botones grandes, cada uno entero de su color y distinto de los demás de su lado, con su glifo al centro
  // (la C de Iker); sin castigos; el TD y «Más opciones» con el resto; todo cabe sin bajar
  const grandes = () => pg.locator('.mk-grande').evaluateAll((xs) => xs.map((x) => [x.innerText, x.style.getPropertyValue('--c'), !!x.querySelector('.mk-gi svg')]));
  // «Profundo con brillo» (Iker, 17-nov): cada botón en dos tonos de su color, y el blanco se lee al sol (4.5:1 o más) en los dos tonos
  const contrasteMin = () => pg.locator('.mk-grande').evaluateAll((xs) => { const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const lum = (css) => { cv.fillStyle = '#000'; cv.fillStyle = css; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data;
      return [0, 1, 2].map((i) => d[i] / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
    return Math.min(...xs.map((x) => { const cs = getComputedStyle(x).backgroundImage.match(/(oklch|oklab|rgba?|color)\([^)]*\)/g); return cs.length === 2 ? Math.min(...cs.map((c) => 1.05 / (lum(c) + .05))) : 0; })); });
  assert.ok(await contrasteMin() >= 4.5);
  const ga = await grandes();
  assert.deepEqual(ga.map((x) => x[0]), ['Pase completo', 'Corrida', 'Incompleto', 'Intercepción lanzada', 'Sack recibido']);
  assert.deepEqual([new Set(ga.map((x) => x[1])).size, ga.every((x) => x[2])], [5, true]);
  assert.deepEqual(await pg.locator('.mk-tiras > button').allInnerTexts(), ['Touchdown', 'Más opciones']);
  assert.ok(Math.min(...await pg.locator('.mk-grande').evaluateAll((xs) => xs.map((x) => x.getBoundingClientRect().height))) >= 98);
  assert.ok(Math.min(...await pg.locator('.mk-tiras > button').evaluateAll((xs) => xs.map((x) => x.getBoundingClientRect().height))) >= 56);
  // el aviso sale arriba como pop-up, sobre el marcador: deja libres QB y Terminar, no toca los botones ni mueve la página, «Deshacer» de 44 o más, y todo sigue sin bajar (Iker, 17-nov)
  assert.deepEqual(await pg.evaluate(() => { const a = document.querySelector('.pant > .pregunta.aviso').getBoundingClientRect(), c = document.querySelector('.mk-cuerpo');
    return [a.top >= document.querySelector('.mbar').getBoundingClientRect().bottom, a.bottom <= document.querySelector('.mk-lado').getBoundingClientRect().top, document.querySelector('.pant > .pregunta.aviso .acc').getBoundingClientRect().height >= 44, c.scrollTop, c.scrollHeight <= c.clientHeight]; }), [true, true, true, 0, true]);
  // guardar una jugada no mueve nada: los botones quedan donde estaban, con el aviso arriba (antes la pantalla se bajaba, Iker 17-nov); luego se deshace
  const dondeBotones = () => pg.evaluate(() => [document.querySelector('.mk-cuerpo').scrollTop, ...[...document.querySelectorAll('.mk-grande, .mk-tiras > button')].map((x) => Math.round(x.getBoundingClientRect().top))]);
  const antes = await dondeBotones();
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd'); await pg.waitForTimeout(400);
  assert.equal(await pg.locator('.pant > .pregunta.aviso [data-a=deshacer]').count(), 1);
  assert.deepEqual(await dondeBotones(), antes);
  await toca(pg, 'deshacer', 'aviso'); await pg.waitForTimeout(300);
  assert.deepEqual(await dondeBotones(), antes);
  // el aviso de la jugada se va solo: en Marcar no se queda la tira «Última · Corregir · Deshacer»; todas las jugadas caben sin bajar
  await pg.evaluate(() => { st.toast = null; pintar(); }); // eslint-disable-line no-undef
  assert.deepEqual(await pg.evaluate(() => { const c = document.querySelector('.mk-cuerpo'); return [document.querySelectorAll('.mk-cuerpo .ultima').length, c.scrollHeight <= c.clientHeight]; }), [0, true]);
  await toca(pg, 'mas');
  assert.deepEqual(await pg.locator('.hoja .mk-tira').allInnerTexts(), ['Pick 6 en contra', 'Safety en contra']);
  await pg.locator('.hoja .hb.no').click(); await pg.waitForTimeout(150);
  assert.equal(await pg.evaluate(() => st.hoja), null); // eslint-disable-line no-undef
  await toca(pg, 'lado', 'D');
  const gd = await grandes();
  assert.deepEqual(gd.map((x) => x[0]), ['Bandera quitada', 'Pase tapado', 'Sack', 'Intercepción', 'Pick 6', 'Safety a favor']);
  assert.equal(new Set(gd.map((x) => x[1])).size, 6); // en defensa también, cada uno de su color
  assert.ok(await contrasteMin() >= 4.5);
  assert.equal(await pg.locator('[data-a="mas"]').count(), 0); // en defensa ya no queda nada para «Más opciones»
  assert.equal(await pg.locator('.mk-td.riv').innerText(), 'Touchdown'); // el TD de ellos dice solo «Touchdown»: el lado ya lo dice Defensa (Iker, 17-nov)
  await toca(pg, 'lado', 'O');
  // ¿Quién?: sin «No sé», y la ✕ de arriba no guarda nada; en la regla, la ✓ guarda las yardas ya
  await toca(pg, 'res', 'corrida');
  // al tocarlo, el botón rebota una vez con el destello del filo de luz
  assert.deepEqual(await pg.locator('.mk-grande.toque').evaluateAll((xs) => xs.map((x) => [x.dataset.v, getComputedStyle(x).animationName, getComputedStyle(x, '::after').animationName])), [['corrida', 'toque', 'destello']]);
  assert.doesNotMatch(await texto(pg), /No sé/);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  assert.equal(await pg.evaluate(() => st.partido.jugadas.length), 0); // eslint-disable-line no-undef
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico');
  // yardas: sin regla a la vista, abajo 5, 10, 20 y 30 yd (ponen ese número, no suman ni guardan) y el + y el − afinan; ✕ a la izquierda, el título al centro y ✓ a la derecha, sin texto abajo
  assert.deepEqual(await pg.locator('.hoja.cuanto .hbar > *').evaluateAll((xs) => xs.map((x) => x.className || x.tagName)), ['hb no', 'H3', 'hb si']);
  assert.equal(await pg.locator('.hoja.cuanto .hbar small, .hoja.cuanto p').count(), 0);
  assert.deepEqual(await pg.locator('.rg-saltos button').allInnerTexts(), ['5yd', '10yd', '20yd', '30yd']);
  assert.equal(await pg.locator('#rgth').isVisible(), false);
  await pg.locator('[data-salto="10"]').click(); await pg.locator('[data-salto="5"]').click();
  for (let i = 0; i < 3; i++) await pg.locator('.rg-b[data-pm="1"]').click();
  await pg.locator('.hoja.cuanto .hb.si').click(); await pg.waitForTimeout(150);
  assert.deepEqual(await pg.evaluate(() => [st.hoja, st.partido.jugadas[0].id, st.partido.jugadas[0].yd]), [null, 'nico', 8]); // eslint-disable-line no-undef
  // una jugada vieja sin nombre sigue contando y se le pone el jugador al corregirla (en Corregir ya no hay «No sé»)
  await pg.evaluate(() => { const p = st.partido; p.jugadas[0].id = null; rehacer(p); A.fila(0); pintar(); }); // eslint-disable-line no-undef
  assert.match(await texto(pg), /pase a sin nombre/); assert.doesNotMatch(await texto(pg), /No sé/);
  await toca(pg, 'cquien', 'rodrigo');
  assert.equal(await pg.evaluate(() => st.partido.jugadas[0].id), 'rodrigo'); // eslint-disable-line no-undef
  // ¿Quién?: primero el que acaba de jugar y luego los demás que vinieron, sin la marca «última» (Iker, 17-nov)
  await toca(pg, 'res', 'corrida');
  assert.deepEqual(await pg.locator('.hoja .pj').evaluateAll((xs) => xs.map((x) => x.dataset.v)), ['rodrigo', 'mau', 'nico', 'hugo']);
  assert.doesNotMatch(await pg.locator('.hoja').innerText(), /última/);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  // «Lo que pasó» va aparte, a la derecha de Marcar, sin pestañas ni texto: deslizando a la izquierda se llega y a la derecha se regresa; los puntos dicen dónde vas
  // un evento con sus toques (WebKit de escritorio no deja crear Touch)
  const desliza = (de, a) => pg.evaluate(([de, a]) => { const c = document.querySelector('.mk-cuerpo'), t = (x) => ({ identifier: 1, target: c, clientX: x, clientY: 400 });
    const ev = (tipo, touches, changedTouches) => c.dispatchEvent(Object.assign(new Event(tipo, { bubbles: true }), { touches, changedTouches }));
    ev('touchstart', [t(de)], [t(de)]); ev('touchend', [], [t(a)]); }, [de, a]);
  assert.doesNotMatch(await texto(pg), /Lo que pasó|Jugada por jugada/);
  assert.deepEqual(await pg.locator('.mk-puntos button').evaluateAll((xs) => xs.map((x) => x.className)), ['on', '']);
  await desliza(80, 300); // a la izquierda de Marcar no hay nada
  assert.equal(await pg.locator('.mk-tiras').count(), 1);
  await desliza(300, 120);
  assert.equal(await pg.locator('.mk-pag').getAttribute('style'), '--dx:72px'); // entra desde la derecha, con un resorte
  assert.match(await texto(pg), /Este partido/i);
  assert.deepEqual(await pg.locator('.mk-puntos button').evaluateAll((xs) => xs.map((x) => x.className)), ['', 'on']);
  await desliza(300, 120); // otra vez a la izquierda: se queda
  assert.equal(await pg.evaluate(() => st.mkVer), 'paso'); // eslint-disable-line no-undef
  await desliza(80, 300);
  assert.equal(await pg.evaluate(() => st.mkVer), 'marcar'); // eslint-disable-line no-undef
  assert.equal(await pg.locator('.mk-tiras').count(), 1);
  // con el dedo (Iker, 17-nov): la página lo sigue y el punto de arriba con ella; si se suelta antes de tiempo regresa; si pasa, sale y entra la otra
  const arrastra = (xs, suelta = true) => pg.evaluate(([xs, suelta]) => { const c = document.querySelector('.mk-cuerpo'), t = (x) => ({ identifier: 1, target: c, clientX: x, clientY: 400 });
    const ev = (tipo, touches, changedTouches) => c.dispatchEvent(Object.assign(new Event(tipo, { bubbles: true }), { touches, changedTouches }));
    ev('touchstart', [t(xs[0])], [t(xs[0])]); for (const x of xs.slice(1)) ev('touchmove', [t(x)], [t(x)]);
    const pag = document.querySelector('.mk-pag'), i = document.querySelector('.mk-puntos i'), va = [pag.style.transform, i.style.transform];
    if (suelta) ev('touchend', [], [t(xs[xs.length - 1])]); return va; }, [xs, suelta]);
  const [mueve, punto] = await arrastra([300, 280, 260, 250], false);
  assert.equal(mueve, 'translateX(-50px)');
  assert.ok(parseFloat(punto.slice(11)) > 0, punto); // el punto ya va camino a «Lo que pasó»
  await pg.evaluate(() => document.dispatchEvent(new Event('touchcancel'))); // eslint-disable-line no-undef
  assert.equal(await pg.locator('.mk-pag').evaluate((p) => p.style.transform), '');
  await arrastra([300, 295, 290, 285]); await pg.waitForTimeout(500); // 15 px: no alcanza, regresa con un rebote
  assert.deepEqual(await pg.evaluate(() => [st.mkVer, document.querySelector('.mk-pag').style.transform]), ['marcar', '']); // eslint-disable-line no-undef
  await arrastra([300, 260, 210, 160, 120]); await pg.waitForTimeout(700); // pasa el umbral: sale, entra «Lo que pasó» y las series llegan escalonadas
  assert.deepEqual(await pg.evaluate(() => [st.mkVer, document.querySelector('.mk-pag').hasAttribute('data-entra'), document.querySelector('.mk-puntos i').style.getPropertyValue('--p')]), ['paso', true, '1']); // eslint-disable-line no-undef
  assert.match(await texto(pg), /Este partido/i);
  await desliza(80, 300);
  assert.equal(await pg.locator('.mk-tiras').count(), 1);
  // Ataque/Defensa: grande, arriba, el lado en que vas marcado; tocar el mismo lado no cambia nada; sin 1ª y 10 en ¿Quién?
  assert.deepEqual(await pg.locator('.mk-lado button').evaluateAll((xs) => xs.map((x) => [x.innerText, x.classList.contains('on'), Math.round(x.getBoundingClientRect().height)])), [['Ataque', true, 34], ['Defensa', false, 34]]);
  assert.equal(await pg.locator('.mk-eq svg, .mk-eq img + span img').count(), 0); // ni balón ni nada junto a «BELUGAS»: solo el texto
  const cambios = await pg.evaluate(() => st.partido.cambios.length); // eslint-disable-line no-undef
  await toca(pg, 'lado', 'O');
  assert.equal(await pg.evaluate(() => st.partido.cambios.length), cambios); // eslint-disable-line no-undef
  // sin textos de ayuda: el incompleto solo trae sus opciones (y su ✕)
  await toca(pg, 'res', 'incompleto');
  assert.deepEqual([await pg.locator('.hoja p, .hoja h3').count(), await pg.locator('.hoja .hb.no').count(), await pg.locator('.hoja .op').allInnerTexts()], [0, 1, ['Pase soltado (era atrapable)', 'Mal pase o no atrapable']]);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  await toca(pg, 'res', 'pase'); assert.equal(await pg.locator('.hoja .pdt').count(), 0); assert.doesNotMatch(await pg.locator('.hoja').innerText(), /1ª y 10/);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  // defendiendo, la franja de la hora toma el color del rival (Kaffies, oscurecido); atacando, el azul muy claro del fondo («me gusta», 18-nov)
  await toca(pg, 'lado', 'D');
  assert.equal(await pg.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#5e4824');
  await toca(pg, 'lado', 'O');
  assert.equal(await pg.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#ecf4fc');
  // Inicio: la tarjeta del partido sin balón, con Belugas, el marcador y el nombre del rival
  await toca(pg, 'ir', 'inicio');
  assert.equal(await pg.locator('.heroe .balon').count(), 0);
  assert.match(await pg.locator('.heroe').innerText(), /Belugas[\s\S]*0 – 0[\s\S]*Kaffies/);
  await toca(pg, 'marcar'); await td(pg, 'corrida', 'nico'); await toca(pg, 'terminar'); await toca(pg, 'ir', 'inicio');
  assert.doesNotMatch(await texto(pg), /Último partido/); // Inicio: solo la tarjeta de arriba y Líderes (Iker, 17-nov); el partido sigue en Partidos
  // ninguna pantalla rebota (ni arriba ni abajo) ni deja mover la página entera
  for (const v of ['inicio', 'partidos', 'jugadores', 'metricas']) {
    await toca(pg, 'ir', v);
    assert.deepEqual(await pg.evaluate(() => [[...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).overscrollBehaviorY !== 'none').length, document.scrollingElement.scrollHeight <= innerHeight]), [0, true], v);
  }
  // Líderes: cambiar de categoría no regresa la página hasta arriba
  await toca(pg, 'ir', 'inicio');
  await toca(pg, 'todos'); // Inicio cabe en una pantalla; con «Ver todos» ya se baja
  const cu = pg.locator('#tel .cuerpo');
  await cu.evaluate((c) => { c.scrollTop = 150; }); const y = await cu.evaluate((c) => c.scrollTop); // a media lista: con todo más chico, 300 ya es casi el fondo
  assert.ok(y > 0);
  await toca(pg, 'cat', 'yds');
  assert.equal(await cu.evaluate((c) => c.scrollTop), y);
  // y al entrar a un jugador desde Líderes y regresar, Inicio sigue donde iba y con la misma categoría; igual Partidos y Jugadores
  const entra = (a) => pg.evaluate((a) => [...document.querySelectorAll(`#tel .cuerpo [data-a="${a}"]`)].pop().click(), a); // sin mover la página antes de tocar
  await entra('jug'); await pg.waitForTimeout(200);
  await toca(pg, 'volver');
  assert.deepEqual([await cu.evaluate((c) => c.scrollTop), await pg.evaluate(() => st.cat)], [y, 'yds']); // eslint-disable-line no-undef
  for (const [v, a] of [['jugadores', 'jug'], ['partidos', 'juego']]) {
    await toca(pg, 'ir', v); await pg.evaluate(() => { const c = document.querySelector('#tel .cuerpo'); c.scrollTop = c.scrollHeight; });
    const y2 = await cu.evaluate((c) => c.scrollTop); // con los datos de la prueba pueden caber sin bajar; el mecanismo es el mismo que en Inicio
    await entra(a); await pg.waitForTimeout(200);
    await toca(pg, 'volver'); assert.equal(await cu.evaluate((c) => c.scrollTop), y2, v);
  }
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// el service worker solo corre en https: con URL=https://joosemau-beep.github.io/belugas/
test('las animaciones: Líderes sin recargar fotos, sin barra en Partido por partido, el latido de En vivo y de una hoja a otra', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nicolas', 'Iker', 'Pepe']);
  // de una hoja a otra (rival → ¿quiénes vinieron?) el fondo no se aclara ni la hoja vuelve a subir
  await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies');
  assert.deepEqual(await pg.evaluate(() => [...document.querySelectorAll('#tel .hoja, #tel .velo')].map((e) => e.getAnimations().length)), [0, 0]);
  for (const id of ['mau', 'nicolas', 'iker']) await toca(pg, 'vantoggle', id);
  await toca(pg, 'vanlisto');
  // el punto de «En vivo» sigue su latido: con cada toque no empieza de nuevo
  const latido = () => pg.evaluate(() => document.getAnimations().filter((a) => a.animationName === 'latido').map((a) => a.startTime));
  await toca(pg, 'lado', 'D'); await toca(pg, 'lado', 'O');
  assert.deepEqual(await latido(), [0]);
  await td(pg, 'pase', 'nicolas'); await toca(pg, 'lado', 'O'); await td(pg, 'corrida', 'iker');
  await toca(pg, 'terminar'); await toca(pg, 'ir', 'inicio'); await pg.waitForTimeout(1200);
  // Líderes: al cambiar de categoría las fotos son las mismas (no se vuelven a cargar) y no se repite la entrada del podio; solo los números aparecen
  for (const cat of ['td', 'yds', 'rec', 'puntos']) {
    assert.deepEqual(await pg.evaluate((cat) => {
      const antes = new Set(document.querySelectorAll('.lideres img'));
      document.querySelector(`#tel [data-a="cat"][data-v="${cat}"]`).click();
      const imgs = [...document.querySelectorAll('.lideres img')];
      return [imgs.length > 0, imgs.every((i) => antes.has(i) && i.complete), [...new Set(document.querySelector('.lideres').getAnimations({ subtree: true }).map((a) => a.animationName))]];
    }, cat), [true, true, ['ap']], cat);
  }
  // la ficha del jugador: Partido por partido sin la barra (repetía los puntos de la derecha)
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'nicolas');
  assert.match(await texto(pg), /Partido por partido/);
  assert.equal(await pg.locator('#tel .pp .barra').count(), 0);
  // el recorrido: si la app se vuelve a pintar (la nube cada 4 s) la tarjeta no vuelve a aparecer
  await pg.evaluate(() => onb.empieza()); await pg.waitForTimeout(600); // eslint-disable-line no-undef
  const card = await pg.locator('.onb-card').elementHandle();
  await pg.evaluate(() => pintar()); await pg.waitForTimeout(50); // eslint-disable-line no-undef
  assert.deepEqual(await pg.evaluate((c) => [c.isConnected, document.querySelector('.onb').getAnimations({ subtree: true }).length], card), [true, 0]);
  await pg.evaluate(() => onb.fin()); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('la franja de la hora va del color del encabezado de cada pantalla, también en las fichas', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico']);
  // el color justo debajo de la franja de la hora (a la orilla, donde no hay botones) y el theme-color de esa pantalla
  const arriba = () => pg.evaluate(() => { const y = document.querySelector('#tel .estado').getBoundingClientRect().bottom + 6; let e = document.elementFromPoint(6, y);
    while (e && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(e).backgroundImage === 'none') e = e.parentElement;
    const c = getComputedStyle(e); return [document.querySelector('meta[name="theme-color"]').content, c.backgroundImage !== 'none' ? 'degradado' : c.backgroundColor]; });
  // sin franja marina («me gusta», 18-nov): bajo la hora se ve el degradado del fondo y la barra de Safari toma su azul muy claro
  const CLARO = ['#ecf4fc', 'degradado'];
  // al bajar, la franja se va con el encabezado (va dentro de lo que se desplaza): no queda una barra pegada arriba (Iker, 17-nov)
  const seVa = (v) => pg.evaluate(() => document.querySelector('#tel .estado').parentElement.className).then((c) => assert.equal(c, 'cuerpo', v));
  for (const v of ['inicio', 'partidos', 'jugadores', 'metricas']) { await toca(pg, 'ir', v); assert.deepEqual(await arriba(), CLARO, v); await seVa(v); }
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'nico'); assert.deepEqual(await arriba(), CLARO, 'ficha de jugador'); await seVa('ficha de jugador');
  await pg.evaluate(() => { A.juego(JUEGOS[0].id); pintar(); }); assert.deepEqual(await arriba(), CLARO, 'ficha de partido'); await seVa('ficha de partido'); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'inicio'); await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await toca(pg, 'vantoggle', 'mau'); await toca(pg, 'vanlisto');
  assert.deepEqual(await arriba(), ['#ecf4fc', 'degradado'], 'Marcar en ataque');
  await toca(pg, 'lado', 'D'); assert.deepEqual(await arriba(), ['#5e4824', 'degradado'], 'Marcar en defensa');
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// iOS 26 no pinta nada más allá de la orilla corta (WebKit 301108): una barra más abajo sale cortada (pasó con el PR 16, Iker 17-nov)
test('desde el ícono del iPhone la barra se ve entera abajo, aunque iOS 26 le dé a la página la pantalla menos la franja de la hora', async () => {
  // iPhone SE, 15 y 15 Pro Max: [ancho, pantalla, franja de la hora]
  for (const [ancho, pantalla, hora] of [[375, 667, 20], [393, 852, 59], [430, 932, 59]]) for (const alto of [pantalla, pantalla - hora]) {
    const pg = await telefono(srv.url, { app: { ancho, pantalla, alto } });
    await agrega(pg, ['Mau', 'Nico']);
    // la página le pide a iOS la pantalla entera (mide la ventana más la franja); que iOS se la dé solo se ve en el iPhone
    assert.match(await pg.evaluate(() => getComputedStyle(document.documentElement).minHeight), /^min\(/);
    // la barra termina en la orilla de lo que se pinta, con el aire de la rayita dentro; nada se arrastra; lo último de la pantalla no queda tapado
    const revisa = (v) => pg.evaluate(() => {
      const n = document.querySelector('#tel .nav').getBoundingClientRect(), c = document.querySelector('#tel .cuerpo, #tel .mk-cuerpo');
      c.scrollTop = c.scrollHeight; const u = c.lastElementChild.getBoundingClientRect();
      // la píldora de las pestañas va pegada abajo, como en un iPhone: entre sus íconos y su aire de abajo, a lo más 8 px; ese aire es la zona segura
      // menos 6 px (Iker, 17-nov: 14 px más abajo), así que con la rayita queda encima de ella y sin rayita (SE) a 14 px de la orilla
      const ab = parseFloat(getComputedStyle(document.querySelector('#tel .nav')).paddingBottom), nom = Math.max(...[...document.querySelectorAll('#tel .nav button')].map((b) => b.getBoundingClientRect().bottom));
      return [Math.round(n.bottom) - innerHeight, ab >= 14, n.bottom - ab - nom <= 8, document.scrollingElement.scrollHeight <= innerHeight, u.bottom <= n.top];
    }).then((r) => assert.deepEqual(r, [0, true, true, true, true], `${v} (${ancho} × ${alto})`));
    for (const v of ['inicio', 'partidos', 'jugadores', 'metricas']) { await toca(pg, 'ir', v); await revisa(v); }
    await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'nico'); await revisa('ficha de jugador');
    await toca(pg, 'ir', 'inicio'); await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await toca(pg, 'vantoggle', 'mau'); await toca(pg, 'vanlisto');
    await revisa('Marcar');
    // QB y Terminar bajan como el encabezado de las otras pantallas: pegados a la hora, iOS 26 los difumina (Iker, 17-nov)
    assert.equal(await pg.evaluate(() => document.querySelector('.mcab > .estado').offsetHeight), 24);
    await toca(pg, 'terminar'); await pg.evaluate(() => { A.juego(JUEGOS[0].id); pintar(); }); await revisa('ficha de partido'); // eslint-disable-line no-undef
    assert.deepEqual(pg.errores, []);
    await pg.context().close();
  }
});

test('la barra es la Waterline: solo íconos, En vivo con el marcador, la gota va a la pestaña tocada y se queda quieta; sin WebGL y sin animaciones también', async () => {
  for (const sinGL of [false, true]) {
    const pg = await telefono(srv.url, { app: {} });
    if (sinGL) { await pg.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; }); await pg.reload(); await pg.waitForSelector('#tel .nav'); }
    await agrega(pg, ['Mau', 'Nico']);
    // solo íconos: los nombres quedan para el lector de pantalla, sin ocupar lugar
    assert.deepEqual(await pg.locator('#tel .agua .nom').evaluateAll((xs) => xs.map((x) => [x.textContent, x.getBoundingClientRect().width <= 1])), [['Inicio', true], ['Partidos', true], ['Marcar', true], ['Jugadores', true], ['Métricas', true]]);
    if (sinGL) assert.equal(await pg.locator('#tel .agua').getAttribute('data-gl'), 'off');
    const gota = () => pg.evaluate(() => { const b = document.querySelector('#tel .agua button.on, #tel .agua .centro2.on').getBoundingClientRect(), n = document.querySelector('#tel .agua').getBoundingClientRect(); // eslint-disable-line no-undef
      return [Math.abs(Math.round(AGUA.a.x - AGUA_PAD + n.left - (b.left + b.width / 2))), AGUA.raf, AGUA.moving]; }); // eslint-disable-line no-undef
    await toca(pg, 'ir', 'metricas'); await pg.waitForTimeout(800);
    assert.deepEqual((await gota()).filter((x, i) => i !== 1), [0, false]); // ya llegó a Métricas y se asentó (se asienta en ~0.5 s; a la primera velocidad tardaba más de un segundo)
    await pg.waitForTimeout(1000);
    assert.deepEqual(await gota(), [0, 0, false]); // y al irse la onda ya no dibuja (la pila)
    if (sinGL) assert.ok(parseFloat(await pg.locator('#tel .agua-gota').evaluate((g) => g.style.width)) > 20);
    // con partido, el centro es el marcador con el punto de en vivo, y la gota se va ahí
    await toca(pg, 'ir', 'inicio'); await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await toca(pg, 'vantoggle', 'mau'); await toca(pg, 'vanlisto'); await pg.waitForTimeout(3600);
    assert.deepEqual(await pg.locator('#tel .agua .centro2').evaluate((b) => [b.className, b.querySelector('.pill').textContent, b.querySelector('.nom').textContent]), ['centro2 vivo on', '0–0', 'En vivo']);
    assert.deepEqual(await gota(), [0, 0, false]);
    assert.deepEqual(pg.errores, []);
    await pg.context().close();
  }
  // sin animaciones (reducir movimiento): la gota cambia de lugar de una vez
  const pg = await telefono(srv.url, { app: {} });
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await toca(pg, 'ir', 'jugadores');
  await pg.waitForTimeout(100);
  assert.deepEqual(await pg.evaluate(() => [AGUA.quieta, Math.abs(Math.round(AGUA.a.x - AGUA.t.x)), AGUA.rips.length, AGUA.moving, AGUA.raf]), [true, 0, 0, false, 0]); // eslint-disable-line no-undef
  await pg.context().close();
});

test('la 1ª y 10 no sale en ninguna pantalla, aunque una jugada vieja la traiga', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico']);
  await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await toca(pg, 'vantoggle', 'mau'); await toca(pg, 'vantoggle', 'nico'); await toca(pg, 'vanlisto');
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd');
  await toca(pg, 'lado', 'D'); await toca(pg, 'res', 'bandera'); await toca(pg, 'quien', 'mau'); await toca(pg, 'sinyd');
  await pg.evaluate(() => { const p = st.partido; p.jugadas.forEach((j) => { j.pd = true; }); rehacer(p); pintar(); }); // eslint-disable-line no-undef
  const sinPd = async (donde) => assert.doesNotMatch(await pg.evaluate(() => document.querySelector('#tel').textContent), /1ª|primeros? y diez/i, donde);
  await sinPd('Marcar');
  // el mal pase y «Nos pararon» ya no ofrecen las caras de a quién iba / a quién pararon
  await toca(pg, 'lado', 'O'); await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'mal');
  assert.equal(await pg.locator('.pregunta.aviso .cara').count(), 0);
  assert.equal(await pg.locator('[data-a="res"][data-v="parada"]').count(), 0); // «Nos pararon» ya no está en Marcar
  await pg.evaluate(() => { A.mkver('paso'); pintar(); }); await sinPd('Lo que pasó'); // eslint-disable-line no-undef
  // «Lo que pasó»: las series de ataque con el marino de Belugas y las de defensa con el color del rival (Kaffies)
  assert.deepEqual(await pg.evaluate(() => ['O', 'D'].map((l) => getComputedStyle(document.querySelector(`.serie .lt.${l}`)).backgroundColor)), ['rgb(13, 35, 71)', await pg.evaluate(() => { const e = document.createElement('i'); e.style.color = `color-mix(in srgb, ${R('kaffies').color} 78%, #000)`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; })]); // eslint-disable-line no-undef
  await pg.evaluate(() => { A.fila(0); pintar(); }); await sinPd('Corregir'); await pg.locator('.hoja .hb.no').click(); await pg.waitForTimeout(150); // eslint-disable-line no-undef
  await toca(pg, 'terminar'); await sinPd('el final');
  for (const v of ['inicio', 'partidos', 'jugadores']) { await toca(pg, 'ir', v); await sinPd(v); }
  await toca(pg, 'jug', 'nico'); await sinPd('ficha de jugador');
  await pg.evaluate(() => { A.juego(JUEGOS[JUEGOS.length - 1].id); pintar(); }); await sinPd('ficha de partido'); // eslint-disable-line no-undef
  // jugadores del partido: cada quien con sus puntos; al tocarlo, su pantalla de ese partido con lo que hizo («de cuántas» en pases) y de dónde salen sus puntos (la bandera +2, sin 1ª y 10)
  assert.deepEqual(await pg.locator('.jgs .pp').evaluateAll((xs) => xs.map((d) => [d.querySelector('b').textContent, d.querySelector('strong').textContent])), [['Mau', '2'], ['Nico', '1']]);
  const cuadros = () => pg.locator('.hz > div').evaluateAll((xs) => xs.map((d) => [...d.children].map((c) => c.textContent).join(' ')));
  const suma = () => pg.locator('.dp .rg').evaluateAll((xs) => xs.map((d) => [...d.children].map((c) => c.textContent).join(' ')));
  await toca(pg, 'jugp', 'mau'); await sinPd('jugador en el partido');
  assert.deepEqual([await cuadros(), await suma()], [['1/2 Pases', '1 Banderas'], ['Banderas 1 +2', 'Total 2']]);
  await toca(pg, 'juego', await pg.evaluate(() => st.juego)); await toca(pg, 'jugp', 'nico'); // eslint-disable-line no-undef
  assert.deepEqual([await cuadros(), await suma()], [['1/1 Recepciones'], ['Recepciones 1 +1', 'Total 1']]);
  await toca(pg, 'ir', 'metricas'); await sinPd('Métricas · ataque'); await toca(pg, 'met', 'defensa'); await sinPd('Métricas · defensa');
  // la jugada vieja sigue con su 1ª y 10 guardada, pero ya no da puntos: a Nico solo le cuenta la recepción
  assert.equal(await pg.evaluate(() => puntosDe(JUEGOS[JUEGOS.length - 1].st.nico)), 1); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// cómo funciona la app (belugas-tutorial): el recorrido toca los botones de verdad en un partido de práctica aparte
const recorre = async (pg) => {
  const hacer = {
    '[data-a=res][data-v=pase]': () => toca(pg, 'res', 'pase'),
    '.hoja [data-a=quien]': () => pg.locator('#tel .hoja [data-a=quien]').first().click(),
    '.hoja.cuanto': async () => { await pg.locator('[data-salto="10"]').click(); await toca(pg, 'rgok'); },
    '.mk-puntos': () => toca(pg, 'mkver', 'paso'),
    '.mk-pag [data-a=deshacer]': () => pg.locator('#tel .mk-pag [data-a=deshacer]').first().click(),
    '.mk-lado': () => toca(pg, 'lado', 'D'),
  };
  const vistos = [];
  for (let k = 0; k < 30; k++) {
    await pg.waitForTimeout(350);
    const p = await pg.evaluate(() => onb.paso && { sel: onb.paso.sel || '', tit: onb.paso.tit, hecho: !!onb.paso.hecho, pant: st.pant, practica: !!(st.partido && st.partido.practica) }); // eslint-disable-line no-undef
    if (!p) break;
    assert.ok(p.practica, `${p.tit}: en un partido de práctica`);
    vistos.push(p.tit);
    if (p.hecho) await hacer[p.sel](); else await pg.locator('.onb [data-o=sig]').click(); // los de tocar se tocan a través del hueco
  }
  return vistos;
};
const foto = (pg) => pg.evaluate(() => JSON.stringify({ st: Object.keys(st).sort(), mk: st.mkVer, yds: st.yds, cel: localStorage.getItem('belugas.cel'), pant: st.pant, partido: st.partido && aEnviar(st.partido).jugadas, marc: st.partido && [st.partido.nos, st.partido.ellos, st.partido.lado, st.partido.qb], van: st.van, temp: TEMP, juegos: JUEGOS.length, hoy: HOY })); // eslint-disable-line no-undef

test('cómo funciona la app: desde «¿Quién es el QB?» a media partida, sin tocar el partido en vivo', async () => {
  const clave = 'prueba-0123456789abcdefghij', nube = nubeFalsa(clave, ['Mau', 'Nico', 'Rodrigo']);
  const pg = await telefono(srv.url, { nube, clave });
  await pg.waitForFunction(() => PLANTEL.length === 3); // eslint-disable-line no-undef
  await toca(pg, 'empezar'); await toca(pg, 'rival', 'panini');
  for (const id of ['mau', 'nico', 'rodrigo']) await toca(pg, 'vantoggle', id);
  await toca(pg, 'vanlisto');
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'td'); await toca(pg, 'como', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd'); await toca(pg, 'conv', '0');
  await pg.waitForFunction(() => !st.toast); // eslint-disable-line no-undef
  await pg.waitForTimeout(1500);
  const nube0 = JSON.stringify(nube.db), antes = await foto(pg);
  assert.equal(nube.db[clave + '-vivo'].datos.partido.jugadas.length, 2);
  // el botón está arriba a la derecha de «¿Quién es el QB?»
  await toca(pg, 'qbver');
  const hb = await pg.locator('#tel .hoja .hbar [data-a=tour]').boundingBox(), x = await pg.locator('#tel .hoja .hbar .hb.no').boundingBox();
  assert.ok(hb.x > 300 && x.x < 60 && Math.abs(hb.y - x.y) < 2 && hb.width >= 44, 'arriba a la derecha, frente a la ✕');
  await toca(pg, 'tour');
  const vistos = await recorre(pg);
  assert.deepEqual(vistos.slice(0, 3), ['Así funciona Belugas', 'Inicio', 'Marcar']);
  assert.equal(vistos.at(-1), 'Listo, ya lo puedes usar');
  for (const t of ['Toca «Pase completo»', '¿Quién la atrapó?', '¿Cuántas yardas?', 'Lo que pasó', 'Corregir o deshacer', 'Ataque o defensa', 'Terminar', 'Partidos', 'Jugadores', 'Métricas']) assert.ok(vistos.includes(t), t);
  // regresa a donde estaba, con todo igual: el partido, el teléfono y la nube
  assert.deepEqual(await pg.evaluate(() => [onb.T, st.practicando, st.hoja, !!document.querySelector('.onb.on')]), [null, false, null, false]); // eslint-disable-line no-undef
  await pg.waitForTimeout(1500);
  assert.equal(await foto(pg), antes);
  assert.equal(JSON.stringify(nube.db), nube0);
  assert.equal(await marcador(pg), '6–0');
  // y se sigue marcando como siempre
  await toca(pg, 'res', 'bandera'); await toca(pg, 'quien', 'mau'); await toca(pg, 'sinyd'); // después del TD vamos en defensa
  await pg.waitForFunction(() => !st.toast); // eslint-disable-line no-undef
  await pg.waitForTimeout(1000);
  assert.equal(nube.db[clave + '-vivo'].datos.partido.jugadas.length, 3);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('cómo funciona la app: sale sola la primera vez (sin jugadores practica con tres de mentira), se salta y se abre desde Ajustes', async () => {
  const pg = await telefono(srv.url, { nuevo: true });
  const antes = await foto(pg);
  await pg.waitForFunction(() => onb.T); // eslint-disable-line no-undef
  const vistos = await recorre(pg);
  assert.equal(vistos.length, 15);
  assert.equal(await foto(pg), antes);
  assert.deepEqual(await pg.evaluate(() => [st.pant, st.partido, PLANTEL.length, localStorage.getItem('belugas.visto.ver')]), ['inicio', null, 0, '1']); // eslint-disable-line no-undef
  // ya no sale solo; desde Ajustes sí, y «Saltar» regresa todo
  await pg.reload(); await pg.waitForSelector('#tel .nav'); await pg.waitForTimeout(1600);
  assert.equal(await pg.evaluate(() => onb.T), null); // eslint-disable-line no-undef
  await toca(pg, 'ayuda');
  await toca(pg, 'tour'); await pg.locator('.onb [data-o=sig]').click(); await pg.locator('.onb [data-o=sig]').click();
  await pg.locator('.onb [data-o=sig]').click();
  assert.equal(await pg.evaluate(() => [st.pant, st.partido.practica]).then(JSON.stringify), '["marcar",true]'); // eslint-disable-line no-undef
  await pg.locator('.onb [data-o=fin]').click();
  assert.deepEqual(await pg.evaluate(() => [onb.T, st.pant, st.partido, st.hoja]), [null, 'inicio', null, null]); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// 17-nov: los tres de mentira llegaron al plantel real. Un celular nuevo abre con el link, el recorrido sale antes de que la nube
// conteste y, al contestar, se juntaba la copia de práctica de la temporada y se subía. Ahora a media práctica no se junta ni se sube nada
test('cómo funciona la app: si la nube contesta a media práctica, los jugadores de mentira no llegan a la nube', async () => {
  const clave = 'prueba-0123456789abcdefghij', nube = nubeFalsa(clave, ['Mau', 'Nico']);
  nube.db[clave + '-cel'].datos = { v: 1, plantel: [{ id: 'mau', nombre: 'Mau', n: 0, ver: 1 }, { id: 'nico', nombre: 'Nico', n: 1, ver: 1 }], linea: { O: [], D: [], qb: null, ver: 1 }, juegos: {}, sembrado: 1 };
  const lenta = { ruta: async (route) => { const b = JSON.parse(route.request().postData() || '{}'); if (b.p_clave === clave + '-cel') await new Promise((ok) => setTimeout(ok, 2500)); return nube.ruta(route); } };
  const pg = await telefono(srv.url, { nube: lenta, clave, nuevo: true });
  await pg.waitForFunction(() => onb.T && PLANTEL.some((p) => p.id === 'practica1')); // eslint-disable-line no-undef
  await pg.waitForTimeout(6000); // la nube ya contestó (y tardaría lo mismo en guardar), con el recorrido abierto
  const ids = () => nube.db[clave + '-cel'].datos.plantel.map((p) => p.id).sort().join();
  assert.equal(ids(), 'mau,nico');
  await pg.locator('.onb [data-o=fin]').click();
  await pg.waitForFunction(() => PLANTEL.length === 2, null, { timeout: 10000 }); // eslint-disable-line no-undef
  await pg.waitForTimeout(1000);
  assert.equal(ids(), 'mau,nico');
  assert.doesNotMatch(await pg.evaluate(() => localStorage.getItem('belugas.cel')), /practica/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// Iker, 17-nov: en la ficha cada quien es de Ataque, de Defensa o de los dos; «¿Quién?» va por grupos con su título, primero el lado que se marca y Los dos al final
test('el lado de cada jugador agrupa «¿Quién?» y viaja a la nube y al otro celular', async () => {
  const clave = 'prueba-lado-0123456789abcdef', nube = nubeFalsa(clave, ['Mau', 'Nico', 'Rodrigo', 'Pepe']);
  const a = await telefono(srv.url, { nube, clave });
  await a.waitForFunction(() => PLANTEL.length === 4); // eslint-disable-line no-undef
  const pon = async (id, v) => { await toca(a, 'ir', 'jugadores'); await toca(a, 'jug', id); await toca(a, 'ladoj', v); };
  await pon('pepe', 'D'); await pon('nico', 'O'); await pon('rodrigo', 'O');
  assert.equal(await a.locator('.lado .on').innerText(), 'Ataque');
  await toca(a, 'ladoj', ''); // de regreso a «Los dos»
  assert.equal(await a.locator('.lado .on').innerText(), 'Los dos');
  await toca(a, 'ir', 'inicio');
  await toca(a, 'empezar'); await toca(a, 'rival', 'panini');
  // «¿Quiénes vinieron hoy?» va por grupos: Ataque, Defensa y Los dos
  const van = () => a.locator('.lista-van > *').evaluateAll((xs) => xs.map((x) => x.dataset.v || x.innerText));
  assert.deepEqual(await van(), ['ATAQUE', 'nico', 'DEFENSA', 'pepe', 'LOS DOS', 'mau', 'rodrigo']);
  for (const id of ['mau', 'nico', 'rodrigo', 'pepe']) await toca(a, 'vantoggle', id);
  await toca(a, 'vanlisto');
  const quien = () => a.locator('.hoja .lados > *').evaluateAll((xs) => xs.flatMap((x) => (x.tagName === 'H4' ? [x.innerText] : [...x.children].map((y) => y.dataset.v))));
  await toca(a, 'res', 'corrida');
  assert.deepEqual(await quien(), ['ATAQUE', 'nico', 'DEFENSA', 'pepe', 'LOS DOS', 'mau', 'rodrigo']);
  // cada quien con el color de su lado: Ataque en azul (Nico), Defensa en el color del rival (Pepe, Panini), Los dos sin color (Mau y Rodrigo, que regresó); las fotos sin aro
  assert.deepEqual(await a.locator('.hoja .lados .pj').evaluateAll((xs) => xs.map((x) => [x.dataset.v, getComputedStyle(x).backgroundImage !== 'none', getComputedStyle(x.querySelector('.foto')).boxShadow !== 'none'])),
    [['nico', true, false], ['pepe', true, false], ['mau', false, false], ['rodrigo', false, false]]);
  assert.equal(await a.locator('.hoja .lados').evaluate((x) => x.style.getPropertyValue('--rc')), await a.evaluate(() => R('panini').color)); // eslint-disable-line no-undef
  await toca(a, 'quien', 'nico'); await toca(a, 'sinyd');
  await toca(a, 'lado', 'D'); await toca(a, 'res', 'bandera');
  assert.deepEqual(await quien(), ['DEFENSA', 'pepe', 'ATAQUE', 'nico', 'LOS DOS', 'mau', 'rodrigo']);
  await toca(a, 'quien', 'pepe'); await toca(a, 'sinyd');
  // Corregir la corrida (de ataque): también por grupos, Ataque primero
  await a.evaluate(() => { A.fila(st.partido.jugadas.findIndex((j) => j.k === 'corrida')); pintar(); }); // eslint-disable-line no-undef
  assert.deepEqual(await quien(), ['ATAQUE', 'nico', 'DEFENSA', 'pepe', 'LOS DOS', 'mau', 'rodrigo']);
  await a.waitForTimeout(800); // la temporada sube 300 ms después del último cambio
  const enNube = Object.fromEntries(nube.db[clave + '-cel'].datos.plantel.map((x) => [x.id, x.lado || '']));
  assert.deepEqual(enNube, { mau: '', nico: 'O', rodrigo: '', pepe: 'D' });
  const b = await telefono(srv.url, { nube, clave });
  await b.waitForFunction(() => P('pepe') && P('pepe').lado === 'D' && P('nico').lado === 'O' && !P('mau').lado); // eslint-disable-line no-undef
  assert.deepEqual([...a.errores, ...b.errores], []);
  await a.context().close(); await b.context().close();
});

test('abre sin señal', { skip: !srv.url.startsWith('https:') && 'solo con URL=https://…' }, async () => {
  const pg = await telefono(srv.url);
  await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(2000);
  await pg.context().setOffline(true);
  await pg.reload(); await pg.waitForSelector('#tel .nav');
  assert.deepEqual(await pg.$$eval('img', (xs) => xs.filter((x) => x.complete && !x.naturalWidth).map((x) => x.src)), []);
  await pg.context().close();
});

// los 3 errores de la revisión de métricas (Iker, 17-nov): una corrida corregida a TD sigue siendo corrida, los partidos de cada quien
// son los que vino, y un receptor que lanzó un pase no sale como QB
test('las métricas: corrida corregida a TD, partidos que vino y quién es QB', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico', 'Rodrigo', 'Pepe']);
  await juega(pg, 'kaffies', ['mau', 'nico', 'rodrigo', 'pepe'], async () => {
    for (let i = 0; i < 2; i++) { await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd'); }
    await pg.evaluate(() => { guarda({ k: 'pase', id: 'mau', qb: 'nico', yd: 15 }); pintar(); }); // Nico lanza en una jugada de engaño
    await toca(pg, 'res', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd');
    await fila(pg, await idxDe(pg, 'corrida')); await toca(pg, 'cqp'); await toca(pg, 'cqpya', 'td'); await toca(pg, 'conv', '0');
    assert.equal(await pg.evaluate(() => st.partido.jugadas.find((j) => j.k === 'td').qb), null); // eslint-disable-line no-undef
  });
  await juega(pg, 'panini', ['mau', 'nico', 'rodrigo', 'pepe'], async () => { await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico'); await toca(pg, 'sinyd'); });
  const t = await pg.evaluate(() => TEMP); // eslint-disable-line no-undef
  // 1. la corrida corregida a TD es TD corriendo, nada para Mau (Rodrigo trae de ANTES 1 TD y 1 corrida)
  assert.deepEqual([t.rodrigo.td, t.rodrigo.car, t.rodrigo.rec, t.mau.tdp, t.mau.att], [2, 2, 0, 0, 3]);
  // 2. vino a los dos aunque en uno no hizo nada
  assert.deepEqual([t.rodrigo.pj, t.pepe.pj, t.nico.pj], [2, 2, 2]);
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'pepe');
  assert.match(await texto(pg), /2 partidos/);
  assert.doesNotMatch(await texto(pg), /No jugó/);
  // 3. Nico lanzó un pase pero es receptor: su tarjeta y su línea van de recepciones
  await toca(pg, 'ir', 'jugadores');
  assert.match(await texto(pg), /Nico 3 rec · 1\/1 pases/);
  await toca(pg, 'jug', 'nico');
  assert.match(await pg.locator('.tj-main').innerText(), /Recepciones/i);
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'mau');
  assert.match(await pg.locator('.tj-main').innerText(), /Pases completos/i);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// Iker, 17-nov: a Juanpi no le salía la cara. Su id es el nombre con que entró («Jonpol»); el retrato se liga también por el nombre de hoy
test('el retrato se liga por id o por el nombre de hoy', async () => {
  const clave = 'prueba-retratos-0123456789', nube = nubeFalsa(clave, ['Mau', 'Juan Pi', 'Pepe']);
  nube.db[clave + '-cel'].datos = { v: 1, plantel: [{ id: 'jonpol', nombre: 'Juanpi', n: 0, ver: 1 }, { id: 'juan-pi', nombre: 'Juan Pi', n: 1, ver: 1 }, { id: 'pepe', nombre: 'Pepe', n: 2, ver: 1 }, { id: 'mau', nombre: 'Maú', n: 3, ver: 1 }, { id: 'jc', nombre: 'Juancho', n: 4, ver: 1 }, { id: 'pepe2', nombre: 'José', n: 5, ver: 1 }, { id: 'juan', nombre: 'Juan', n: 6, ver: 1 }, { id: 'jota', nombre: 'J. J.', n: 7, ver: 1 }], linea: { O: [], D: [], qb: null, ver: 1 }, juegos: {}, sembrado: 1 };
  const pg = await telefono(srv.url, { nube, clave });
  await pg.waitForFunction(() => PLANTEL.length === 8); // eslint-disable-line no-undef
  // el nombre tiene que casar entero: Juancho no se lleva la de Juanpi, José la suya, «Juan» ninguna y «J. J.» la de JJ
  assert.deepEqual(await pg.evaluate(() => PLANTEL.map((p) => p.cara)), ['juanpi', 'juanpi', null, 'mau', 'juancho', 'jose', null, 'jj'].map((x) => x && `archivos/jugadores/${x}.jpg`)); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// la revisión de los números (22-nov): los dos partidos de jugadas conocidas de la revisión del 17-nov, vs Panini 22–17 y vs Kaffies 6–13
const PAN = [{ lado: 'O', k: 'pase', id: 'nicolas', qb: 'mau', yd: 8 }, { lado: 'O', k: 'corrida', id: 'rodrigo', yd: 5 }, { lado: 'O', k: 'incompleto', id: 'juancho', qb: 'mau', drop: true }, { lado: 'O', k: 'incompleto', qb: 'mau' }, { lado: 'O', k: 'td', id: 'iker', qb: 'mau', yd: 12, conv: [1, 1], convId: 'nicolas', convQb: 'mau' }, { lado: 'D', k: 'bandera', id: 'juancho', yd: 3 }, { lado: 'D', k: 'tapado', id: 'mau' }, { lado: 'D', k: 'sack', id: 'rodrigo' }, { lado: 'D', k: 'bandera', id: 'iker', yd: -2 }, { lado: 'D', k: 'tdr', conv: [2, 1] },
  { lado: 'O', k: 'pase', id: 'mario', qb: 'nicolas', yd: 15 }, { lado: 'O', k: 'sackr', id: 'mau', yd: -4 }, { lado: 'O', k: 'int', qb: 'mau' }, { lado: 'D', k: 'intn', id: 'mario' }, { lado: 'O', k: 'corrida', id: 'rodrigo', yd: -2 }, { lado: 'O', k: 'td', id: 'rodrigo', qb: null, yd: 20, conv: [2, 0] }, { lado: 'D', k: 'pick6', id: 'iker', conv: [1, 1], convId: 'juancho', convQb: 'mau' }, { lado: 'D', k: 'safety', id: 'juancho' }, { lado: 'O', k: 'pase', id: 'juancho', qb: 'mau', yd: 6 }, { lado: 'O', k: 'pick6c', qb: 'mau', conv: [1, 1] }, { lado: 'O', k: 'safetyc', id: 'rodrigo' }, { lado: 'D', k: 'bandera', id: 'nicolas' }, { lado: 'O', k: 'pase', id: 'nicolas', qb: 'mau', yd: 4 }];
const KAF = [{ lado: 'O', k: 'pase', id: 'nicolas', qb: 'mau', yd: 10 }, { lado: 'O', k: 'td', id: 'nicolas', qb: 'mau', conv: [1, 0] }, { lado: 'D', k: 'tdr' }, { lado: 'O', k: 'incompleto', qb: 'mau' }, { lado: 'O', k: 'int', qb: 'mau' }, { lado: 'D', k: 'bandera', id: 'juancho', yd: 0 }, { lado: 'D', k: 'tdr', conv: [1, 1] }, { lado: 'O', k: 'corrida', id: 'iker', yd: 7 }];
// los partidos ya terminados, sin lo de antes de la app (ANTES): [rival, día de noviembre, jugadas]
async function siembra(pg, partidos = [['panini', 16, PAN], ['kaffies', 17, KAF]]) {
  await pg.evaluate((partidos) => {
    const ids = ['mau', 'nicolas', 'rodrigo', 'iker', 'mario', 'jaime', 'juancho'];
    T.plantel = ids.map((id, n) => ({ id, nombre: id[0].toUpperCase() + id.slice(1), n, ver: 1 })); T.linea.qb = 'mau'; // eslint-disable-line no-undef
    Object.keys(ANTES).forEach((k) => { delete ANTES[k]; }); // eslint-disable-line no-undef
    T.juegos = Object.fromEntries(partidos.map(([rival, d, js], i) => { const t0 = new Date(2026, 10, d, 19).getTime(); // eslint-disable-line no-undef
      return [`g${i}`, { id: `g${i}`, inicio: t0, dia: t0, rival, van: ids, qb: 'mau', jugadas: js.map((j, k) => ({ uid: `u${i}-${k}`, t: t0 + k * 60000, ver: 1, por: 'x', id: null, ...j })), borradas: {}, cambios: [], terminado: true }]; }));
    recalcular(); pintar(); // eslint-disable-line no-undef
  }, partidos);
}

test('Líderes › Yardas: atrapadas y corridas para todos; las lanzadas van aparte', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  // Mau solo lanza (75 yd) y ya no gana Yardas; Nicolás atrapó 57 y lanzó 15: antes salía con 72 «de pase»
  assert.deepEqual(await pg.evaluate(() => [TEMP.mau.yds, TEMP.nicolas.yds, TEMP.rodrigo.yds, TEMP.iker.yds]), [0, 57, 23, 19]); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'inicio'); await toca(pg, 'cat', 'yds');
  const nico = await pg.locator('.pcol.p1').innerText();
  assert.match(nico, /Nicolas/); assert.match(nico.replace(/\s+/g, ' '), /57 atrapadas 15 lanzadas, aparte/);
  assert.doesNotMatch(await texto(pg), /de pase/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});
