// node --test: un partido completo en el teléfono, los puntos, recargar a media partida, dos celulares, corregir y eliminar un partido, las pantallas y sin señal
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { servidor, nubeFalsa, telefono, navegador, toca, marcador, lado, texto, cerrarNavegador } from './apoyo.mjs';
import { sembrar } from './partidos.mjs';

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

  // Métricas (los widgets del 22-nov: Cómo vamos con su «Más», Ataque, Defensa), Partidos y Jugadores
  await toca(pg, 'ir', 'metricas'); await abreMas(pg);
  const met = await texto(pg);
  assert.match(met, /Cómo vamos 5–2 \+3.3 por partido/); assert.match(met, /126 puntos a favor, 103 en contra/);
  assert.match(met, /Pases completos 33% \(2 de 6\)/); assert.match(met, /Después del TD: de 1, 100% \(1 de 1\)/);
  await toca(pg, 'met', 'defensa'); await abreMas(pg);
  assert.match(await texto(pg), /DEFENSA 67%[\s\S]*Defensa 67% series paradas[\s\S]*2 de 3 series/);
  assert.equal((met.match(/por partido/g) || []).length, 1); // un solo «por partido», el de Cómo vamos
  assert.doesNotMatch(met + await texto(pg), coloquial);
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
const abreMas = (pg) => pg.evaluate(() => document.querySelectorAll('.det').forEach((d) => { d.open = true; })); // lo que está detrás de «Más» no sale en innerText
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
  // A corrige: borra el TD de Rodrigo
  await toca(a, 'ir', 'partidos'); await toca(a, 'juego', g); await toca(a, 'corregirp', g);
  await fila(a, 1); await toca(a, 'borrar'); await toca(a, 'listocorr');
  // la app junta el partido en vivo con su copia de la temporada en cada consulta (cada 4 s): la corrección sí puede llegar a la fila en vivo, y no hace daño.
  // Lo que promete el diseño es que no lo reabre: se fuerza la consulta para no depender del reloj y se revisa eso (belugas-prueba-sync-intermitente, 17-nov)
  await a.evaluate(() => sinc(filas.vivo)); await a.waitForTimeout(300); // eslint-disable-line no-undef
  assert.equal(nube.db[clave + '-vivo'].datos.partido.terminado, true); // la corrección no reabre el partido en vivo
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
  assert.deepEqual([...a.errores, ...b.errores].filter((e) => !/due to access control checks/.test(e)), []); // WebKit avisa así un fetch a la nube cancelado al recargar: no es de la app
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
  assert.deepEqual(ga.map((x) => x[0]), ['Pase completo', 'Corrida', 'Incompleto', 'INT lanzada', 'Sack recibido']); // nombres de un renglón (Iker, 22-nov)
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
  assert.deepEqual(gd.map((x) => x[0]), ['Bandera', 'Pase tapado', 'Sack', 'Intercepción', 'Pick 6', 'Safety']);
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
  assert.match(await texto(pg), /Partido a partido/);
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
  assert.deepEqual([await cuadros(), await suma()], [['1 Recepciones'], ['Recepciones 1 +1', 'Total 1']]); // sin «de cuántas» (1/1): el mal pase no tiene receptor (revisión de números #7)
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
  assert.equal(await pg.locator('.col').count(), 2); // Partido a partido: una columna por partido que vino, sin guion
  assert.doesNotMatch(await texto(pg), /No jugó|no vino/);
  // 3. Nico lanzó un pase pero es receptor: su línea y su «Lo mío» van de recepciones
  await toca(pg, 'ir', 'jugadores');
  assert.match(await texto(pg), /Nico 3 rec · 1\/1 pases/);
  await toca(pg, 'jug', 'nico');
  assert.match(await pg.locator('.ce').first().innerText(), /Recepciones/i);
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'mau');
  assert.match(await pg.locator('.ce').first().innerText(), /Pases completos/i);
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

test('Métricas: «por partido» es uno solo, el de Cómo vamos; la defensa dice lo que permitió y aparte lo regalado (revisión #2)', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  await toca(pg, 'ir', 'metricas'); await toca(pg, 'met', 'defensa');
  // 6 partidos de antes + 2 marcados: 139 a favor y 117 en contra, +2.8 por partido. Defensa decía «15 por partido» (solo los marcados) junto al 14.6 del Resumen
  assert.deepEqual((await texto(pg)).match(/[+\d.]+ por partido/g), ['+2.8 por partido']);
  // al abrir «Más» en Defensa: lo que permitió la defensa (los TD del rival) sin el pick 6 ni el safety en contra, que se dicen aparte
  await abreMas(pg);
  assert.match(await texto(pg), /La defensa permitió 10.5 puntos por partido; aparte, 9 los regaló el ataque \(pick 6 y safety\)/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('Métricas ya no dice «Touchdowns»: los TD de cada quien van en los mejores del ataque y la ficha del partido cuenta el pick 6 como anotación', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  await toca(pg, 'ir', 'metricas');
  assert.match(await texto(pg), /1 Nicolas 1 TD · 4 recepciones 57 yd 2 Rodrigo 1 TD · 3 corridas 23 yd 3 Iker 1 TD · 1 recepción 19 yd/); // los TD de ataque (el TD corriendo también es corrida), sin el pick 6 de Iker
  assert.doesNotMatch(await texto(pg), /Touchdowns|TD del ataque/);
  await pg.evaluate(() => { A.juego('g0'); pintar(); }); // eslint-disable-line no-undef
  assert.equal(((await texto(pg)).match(/TD de |Pick 6 de /g) || []).length, 5); // vs Panini: 2 TD del ataque, el pick 6 de Iker y los 2 del rival
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('jugadas exitosas: la corrida para atrás no cuenta', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  // vs Panini: la corrida de Rodrigo de −2 yd. Antes 8 de 13 (62 %)
  assert.deepEqual(await pg.evaluate(() => [JUEGOS.find((g) => g.id === 'g0').funcion, JUEGOS.find((g) => g.id === 'g0').jugadas]), [7, 13]); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('series con TD: la última serie del partido, cortada por el silbatazo, no cuenta', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  // los dos partidos acaban a media serie de ataque (vs Panini un pase de 4 yd, vs Kaffies una corrida de 7): antes 3 de 9 (33 %)
  assert.deepEqual(await pg.evaluate(() => { const c = cuentas(JUEGOS.filter((g) => !g.solo).map((g) => g.partido)); return [c.seriesTD, c.seriesO, c.fren, c.seriesD]; }), [3, 7, 4, 7]); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'metricas'); await abreMas(pg);
  assert.match(await texto(pg), /ATAQUE 43%[\s\S]*Ataque 43% series con TD[\s\S]*3 de 7 series/);
  // la que sí acabó cuenta: si el último es un TD, esa serie entra
  await siembra(pg, [['kaffies', 17, [...KAF, { lado: 'O', k: 'td', id: 'iker', qb: null, yd: 3 }]]]);
  assert.deepEqual(await pg.evaluate(() => { const c = cuentas([JUEGOS.at(-1).partido]); return [c.seriesTD, c.seriesO]; }), [2, 3]); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('los puntos de la temporada son la suma de los de cada partido, como se ven', async () => {
  const pg = await telefono(srv.url);
  // tres partidos con un pase de 2 yd de Mau: 0.08 por partido, que se ve 0.1; antes la temporada redondeaba 0.24 y decía 0.2
  const uno = [{ lado: 'O', k: 'pase', id: 'nicolas', qb: 'mau', yd: 2 }];
  await siembra(pg, [['panini', 10, uno], ['kaffies', 11, uno], ['bucaneros', 12, uno]]);
  assert.deepEqual(await pg.evaluate(() => [JUEGOS.filter((g) => !g.solo).map((g) => puntosDe(g.st.mau)), TEMP.mau.pts]), [[0.1, 0.1, 0.1], 0.3]); // eslint-disable-line no-undef
  await siembra(pg); // y con los dos de la revisión cuadra con lo de cada partido
  assert.deepEqual(await pg.evaluate(() => PLANTEL.filter((p) => Math.round(JUEGOS.reduce((a, g) => a + puntosDe(g.st[p.id]), 0) * 10) / 10 !== TEMP[p.id].pts).map((p) => p.id)), []); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('los sacks recibidos suman en la temporada y salen en la ficha', async () => {
  const pg = await telefono(srv.url); await siembra(pg);
  assert.equal(await pg.evaluate(() => TEMP.mau.sackr), 1); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'mau'); await abreMas(pg);
  assert.match(await texto(pg), /Sacks recibidos: 1\./); // en «Más» de Lo mío del QB
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('lo que ya no se marca no se ofrece (presión al QB, jugada detenida), pero las jugadas viejas siguen contando', async () => {
  const pg = await telefono(srv.url);
  await siembra(pg, [['panini', 16, [{ lado: 'O', k: 'parada', id: 'rodrigo' }, { lado: 'D', k: 'presion', id: 'jaime' }]]]);
  assert.deepEqual(await pg.evaluate(() => [TEMP.jaime.pres, TEMP.jaime.pts, TEMP.rodrigo.pj]), [1, 1, 1]); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'jugadores');
  assert.doesNotMatch(await pg.locator('.reglas').innerHTML(), /Presión/);
  // «Cambiar jugada» de un pase ya no trae «Jugada detenida»
  await juega(pg, 'kaffies', ['mau', 'nicolas'], async () => {
    await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nicolas'); await toca(pg, 'sinyd');
    await fila(pg, await idxDe(pg, 'pase')); await toca(pg, 'cqp');
    const ops = await pg.locator('.hoja .op').allInnerTexts();
    assert.ok(ops.includes('Corrida') && !ops.includes('Jugada detenida'), ops.join(', '));
    await toca(pg, 'cerrar');
  });
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// los widgets (22-nov, belugas-widgets-propuesta): con la temporada de 8 partidos de partidos.mjs. Los números los calcula la app con la revisión de
// números ya aplicada (la última serie cortada por el silbatazo no cuenta; la temporada es la suma de los partidos), por eso Ataque da 56 % y no 53
const tip = async (pg) => (await pg.locator('#tel .tip').innerText()).replace(/\s+/g, ' ');
const abreJug = (pg, id) => pg.evaluate((id) => { st.pant = 'jugadores'; A.jug(id); pintar(); }, id); // eslint-disable-line no-undef

test('El partido en 4 números y Mi partido, con lo que se toca (8 partidos)', async () => {
  const pg = await telefono(srv.url); await sembrar(pg);
  await pg.evaluate(() => { A.juego('g6'); pintar(); }); // eslint-disable-line no-undef
  const t = await texto(pg);
  // las anotaciones con la regla de textos: «Pase de Mau · 12 yd», «Corrida · 20 yd», el rival con su nombre corto
  assert.match(t, /TD de Iker Pase de Mau · 12 yd \+1 de Nicolás 7–0/); assert.match(t, /TD de Rodrigo Corrida · 20 yd 13–8/); assert.match(t, /TD de Panini \+2/);
  assert.match(t, /SERIES CON TD 2 de 5 temporada 56% SERIES PARADAS 4 de 5 temporada 52% EL BALÓN 0 robó 2 · perdió 2 COMPLETOS 5 de 9 temporada 67%/);
  assert.doesNotMatch(t, /Ver todos los números|Jugadas exitosas|Touchdowns/);
  // tocar un cuadro: se selecciona, los demás se atenúan y sale su etiqueta con el enlace
  const cuadros = pg.locator('.g4 button'); assert.equal(await cuadros.count(), 4);
  await cuadros.nth(1).click(); await pg.waitForTimeout(350);
  assert.equal(await tip(pg), 'Series paradas 4 de 5 (80%) temporada 52% Ver Defensa ›');
  // los demás del grupo se atenúan en su caja, no en su texto (sigue en 4.5:1)
  assert.deepEqual(await cuadros.evaluateAll((xs) => xs.map((x) => [x.classList.contains('sel'), x.getAttribute('aria-pressed'), getComputedStyle(x).opacity, getComputedStyle(x).backgroundColor])), [[false, 'false', '1', 'rgba(11, 27, 51, 0.02)'], [true, 'true', '1', 'rgba(11, 27, 51, 0.05)'], [false, 'false', '1', 'rgba(11, 27, 51, 0.02)'], [false, 'false', '1', 'rgba(11, 27, 51, 0.02)']]);
  // el mismo otra vez la quita; Escape también; tocar fuera también
  await cuadros.nth(1).click(); await pg.waitForTimeout(100);
  assert.deepEqual([await pg.locator('#tel .tip').isHidden(), await pg.locator('.g4 .sel').count(), await pg.locator('.g4.hay-sel').count()], [true, 0, 0]);
  await cuadros.nth(0).click(); await pg.keyboard.press('Escape'); assert.equal(await pg.locator('[data-sel].sel').count(), 0);
  await cuadros.nth(0).click(); await pg.locator('#tel h2').first().click(); assert.equal(await pg.locator('[data-sel].sel').count(), 0);
  // el enlace brinca a Métricas, con esa área a la vista
  await cuadros.nth(1).click(); await pg.locator('#tel .tip button').click(); await pg.waitForTimeout(150);
  assert.deepEqual(await pg.evaluate(() => [st.pant, st.met, st.gsel]), ['metricas', 'defensa', null]); // eslint-disable-line no-undef
  assert.ok(await pg.evaluate(() => document.querySelector('.areas').getBoundingClientRect().top < 160));
  // Mi partido: Iker vs Panini, con su lugar y su promedio, y «Cómo sumó sus puntos» siempre abierto y con palabras
  await pg.evaluate(() => { A.juego('g6'); pintar(); A.jugp('iker'); pintar(); }); // eslint-disable-line no-undef
  const m = await texto(pg);
  assert.match(m, /PUNTOS DEL PARTIDO 21.2 1º de 12 · tu promedio es 8.5/); assert.match(m, /vs Panini · 16 nov Victoria 22–17/);
  assert.match(m, /CÓMO SUMÓ SUS PUNTOS Recepciones 1 \+1 Yardas atrapadas 12 \+1.2 TD 2 \+12 Banderas 1 \+2 INT 1 \+5 Total 21.2/);
  await pg.evaluate(() => { A.juego('g6'); pintar(); A.jugp('mau'); pintar(); }); // eslint-disable-line no-undef
  assert.match(await texto(pg), /PUNTOS DEL PARTIDO 4.8 6º de 12 · tu promedio es 8.9 COMPLETOS 4\/8 YD DE PASE 30 TD DE PASE 1/);
  assert.match(await texto(pg), /Yardas de pase 30 \+1.2 TD de pase 1 \+4 Conversión lanzada \+2 INT lanzadas 2 −4 Yardas en sack 4 −0.4 Tapados 1 \+2 Total 4.8/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('El equipo: Cómo vamos, Ataque, Defensa y QB con sus mejores, El balón, Quién viene y Contra cada rival (8 partidos)', async () => {
  const pg = await telefono(srv.url); await sembrar(pg);
  await toca(pg, 'ir', 'metricas'); await abreMas(pg);
  const t = await texto(pg);
  assert.match(t, /Cómo vamos 6–2 \+2.8 por partido Partidos P G G G G G G P Más 139 puntos a favor, 117 en contra. 3 de las 6 victorias fueron por 3 puntos o menos. ATAQUE 56% DEFENSA 52% QB 68%/);
  assert.match(t, /Ataque 56% series con TD 2\/4 KAF 2\/4 ONF 3\/4 AZT 2\/4 KAF 5\/7 LOB 2\/4 BUC 2\/5 PAN 1\/2 KAF MEJORES · YD DE ATAQUE 1 Nicolás 5 TD · 15 recepciones 283 yd 2 Iker 1 TD · 7 recepciones 157 yd 3 Uri 5 recepciones 136 yd Más 19 de 34 series. Después del TD: de 1, 58% \(7 de 12\); de 2, 63% \(5 de 8\). Pases completos 67% \(46 de 69\), 7 soltados. Yardas de ataque: atrapadas más corridas./);
  assert.match(t, /El balón −3 más perdidos que robados 5 robados 8 perdidos/);
  assert.match(t, /Quién viene 6 vienen a todos José 5 de 8 Leo 5 de 8 Patrick 6 de 8 Uri 7 de 8 Más Mau 8 de 8 · Nicolás 8 de 8 · Mario 8 de 8/);
  assert.match(t, /Contra cada rival Kaffies 1–2 · 33–46 −13 Lobos 1–0 · 33–12 \+21 Only Fins 1–0 · 14–8 \+6 Panini 1–0 · 22–17 \+5 Bucaneros 1–0 · 16–14 \+2 Aztecas 1–0 · 21–20 \+1/);
  assert.doesNotMatch(t, /Resumen|Estadísticas|Racha|Conexiones/);
  // la barra de cada rival: Kaffies en rojo hacia la izquierda (13 de 21, el máximo, en media barra), Lobos la más larga a la derecha
  assert.deepEqual(await pg.locator('.rvf .riel > i').evaluateAll((xs) => xs.slice(0, 2).map((i) => [i.className, i.style.right || i.style.left, Math.round(parseFloat(i.style.width))])), [['mal neg', '50%', 31], ['', '50%', 50]]);
  // Defensa: los empates de los mejores se ordenan por banderas y luego por nombre; «Más» con lo que permitió. QB con sus tres cifras y a quién le lanza
  await toca(pg, 'met', 'defensa'); await abreMas(pg);
  assert.match(await texto(pg), /Defensa 52% series paradas 1\/4 KAF 2\/3 ONF 1\/4 AZT 2\/4 KAF 5\/7 LOB 2\/4 BUC 4\/5 PAN 0\/2 KAF MEJORES · DEFENSA 1 Ian 6 banderas · 3 sacks 9 jugadas 2 Jaime 6 banderas · 3 tapados 9 jugadas 3 Juancho 6 banderas · 2 tapados 9 jugadas Más 17 de 33 series. La defensa permitió 13.5 puntos por partido; aparte, 9 los regaló el ataque \(pick 6 y safety\). En total 37 banderas, 8 tapados, 7 sacks y 5 balones robados./);
  await toca(pg, 'met', 'qb'); await abreMas(pg);
  assert.match(await texto(pg), /QB Mau 65 pases en 8 partidos Completos 68% Yd por intento 11.2 TD : INT 10 : 8 57% KAF 50% ONF 89% AZT 64% KAF 91% LOB 71% BUC 50% PAN 50% KAF A QUIÉN LE LANZA 1 Nicolás 238 yd · 4 TD 14 pases 2 Iker 131 yd · 1 TD 7 pases 3 Uri 136 yd 5 pases Más 44 de 65 completos, 731 yardas, 10 TD y 8 INT en 8 partidos. 4 sacks recibidos. También lanzaron: Nicolás 1 de 1, José 1 de 3./);
  // tocar: una pastilla, una columna, un renglón de los mejores y un tramo del balón, cada uno con su etiqueta; otro toque cambia la selección
  await pg.locator('.rs[data-sel]').first().click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'vs Kaffies · 5 oct 13–20 Derrota Ver partido ›');
  await pg.locator('.col').nth(4).click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'vs Lobos · 2 nov 10 de 11 pases completos (91%) 33–12 · Victoria Ver partido ›');
  assert.deepEqual([await pg.locator('.rs.sel').count(), await pg.locator('.col.sel').count()], [0, 1]);
  await pg.locator('.pp[data-sel]').first().click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'Nicolás 14 pases 1º de 3 · 238 yd · 4 TD Ver ficha ›');
  await pg.evaluate(() => document.querySelector('.partida').scrollIntoView()); await pg.waitForTimeout(900); // las barras entran al verse la tarjeta (15 %): a la vista antes de tocar
  await pg.locator('.partida .b2').click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'Balones perdidos 8 intercepciones y pick 6 en contra del ataque Ver QB ›');
  // la pastilla se toca en 26 × 44 aunque su círculo mida 22, y no «desborda» su caja; teclado: Enter selecciona, aria-pressed lo dice, Escape quita
  assert.deepEqual(await pg.locator('.rs[data-sel]').first().evaluate((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e, '::before'); return [r.width >= 26, r.height >= 44, parseFloat(c.width), e.scrollWidth <= e.clientWidth + 1]; }), [true, true, 22, true]);
  await pg.locator('.col').nth(0).focus(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
  assert.deepEqual(await pg.locator('.col').nth(0).evaluate((e) => [e.getAttribute('aria-pressed'), e.classList.contains('sel')]), ['true', true]);
  await pg.keyboard.press('Escape'); assert.equal(await pg.locator('[data-sel].sel').count(), 0);
  // la selección sobrevive al repintado (la nube cada 4 s); el enlace lleva a la ficha, con «‹ Métricas» para regresar
  await pg.locator('.pp[data-sel]').first().click(); await pg.evaluate(() => pintar()); await pg.waitForTimeout(100); // eslint-disable-line no-undef
  assert.deepEqual([await pg.locator('.pp.sel').count(), await pg.locator('#tel .tip').isVisible()], [1, true]);
  await pg.locator('#tel .tip button').click(); await pg.waitForTimeout(150);
  assert.deepEqual(await pg.evaluate(() => [st.pant, st.jug, st.gsel]), ['jugador', 'nicolas', null]); // eslint-disable-line no-undef
  assert.match(await texto(pg), /‹ Métricas/);
  // Inicio: con próximo partido contra un rival ya enfrentado, cómo nos ha ido
  await pg.evaluate(() => { HOY = 'kaffies'; A.ir('inicio'); pintar(); }); // eslint-disable-line no-undef
  assert.match(await texto(pg), /PRÓXIMO PARTIDO · VS KAFFIES: 1–2/);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('Mi temporada: Cómo voy, Lo mío, Partido a partido, Mi jugada más larga y Conexiones (8 partidos)', async () => {
  const pg = await telefono(srv.url); await sembrar(pg);
  await abreJug(pg, 'nicolas'); await abreMas(pg);
  const t = await texto(pg);
  assert.match(t, /NICOLÁS PUNTOS DE LA TEMPORADA 77.9 DEL EQUIPO 1º POR PARTIDO 9.7 MEJOR · LOB 37.2/);
  assert.match(t, /Lo mío Recepciones 15 1º de 9 Yd por recepción 18.9yd 2º de 5 Manos seguras 88% 4º de 5 Más El punto de cada barra es el promedio del equipo: recepciones 5.1 · yd por recepción 18.5 yd · manos seguras 93%. Manos seguras: 15 de 17 pases que le llegaron. Para entrar al lugar en porcentajes y promedios hacen falta 5 intentos./);
  assert.match(t, /Partido a partido 5.9 KAF 1.9 ONF 3.4 AZT −0.5 KAF 37.2 LOB 10.7 BUC 6.8 PAN 12.5 KAF puntos por partido/);
  assert.match(t, /Mi jugada más larga 45yd Me la lanzó José · TD vs Lobos · 2 nov Más Las que siguen: 40 yd \(me la lanzó Mau · TD, vs Lobos\)/);
  assert.match(t, /Conexiones De Mau 238 yd · 4 TD 14 pases De José 45 yd · 1 TD 1 pase A Mario 15 yd 1 pase/);
  assert.doesNotMatch(t, /Partido por partido|Yardas atrapadas|puntos 1º del equipo/);
  // el último partido entero y los anteriores tenues; la columna tocada enseña su partido
  assert.deepEqual(await pg.locator('.col i').evaluateAll((xs) => xs.map((i) => getComputedStyle(i).opacity)), [...Array(7).fill('0.38'), '1']);
  await pg.locator('.col').nth(4).click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'vs Lobos · 2 nov 37.2 pts 33–12 · Victoria Ver partido ›');
  // el punto del promedio: al tocarlo, «prom. 5.1»; la barra: su etiqueta con el lugar y el promedio, y se toca en 44 px aunque mida 8
  await pg.locator('.prom').first().click(); await pg.waitForTimeout(250);
  assert.deepEqual(await pg.locator('.prom').first().evaluate((p) => [p.classList.contains('on'), getComputedStyle(p, '::after').content, getComputedStyle(p, '::after').opacity]), [true, '"prom. 5.1"', '1']);
  await pg.locator('.riel[data-sel]').first().click(); await pg.waitForTimeout(100);
  assert.equal(await tip(pg), 'Recepciones 15 1º de 9 · promedio del equipo 5.1 Ver a los mejores ›');
  assert.ok(await pg.locator('.riel[data-sel]').first().evaluate((e) => parseFloat(getComputedStyle(e, '::after').height) >= 44));
  // el punto del promedio va centrado en el eje del riel (±1 px) y nunca se sale por los extremos, tampoco en 0 % ni en 100 % (Iker, 22-nov: en el iPhone quedaba descolgado)
  const centrado = () => pg.evaluate(() => [...document.querySelectorAll('.rielc')].map((c) => { const r = c.querySelector('.riel').getBoundingClientRect(), p = c.querySelector('.prom').getBoundingClientRect(); return [Math.abs((p.top + p.height / 2) - (r.top + r.height / 2)) <= 1, p.left >= r.left && p.right <= r.right]; }));
  assert.deepEqual(await centrado(), [[true, true], [true, true], [true, true]]);
  await pg.evaluate(() => { const ps = document.querySelectorAll('.prom'); ps[0].style.left = 'clamp(6px, 0%, calc(100% - 6px))'; ps[2].style.left = 'clamp(6px, 100%, calc(100% - 6px))'; });
  assert.deepEqual(await centrado(), [[true, true], [true, true], [true, true]]);
  // Rodrigo (corredor) no vino a Kaffies del 17: un guion; Jaime (defensa) con empates; Mau (QB), el único con 5 pases, con sus sacks recibidos en «Más»
  await abreJug(pg, 'rodrigo');
  assert.match(await texto(pg), /Lo mío Corridas 14 1º de 4 Yd por corrida 9.4yd 1º de 3 TD corriendo 5 1º de 4/);
  assert.match(await texto(pg), /9.3 PAN — KAF puntos por partido · — no vino Mi jugada más larga 40yd Corriendo · TD vs Lobos · 2 nov/);
  await abreJug(pg, 'jaime');
  assert.match(await texto(pg), /Lo mío Banderas 6 2º de 10 \(empate\) Tapados y sacks 3 2º de 11 \(empate\) Intercepciones 0 7º de 11 \(empate\)/);
  await abreJug(pg, 'mau'); await abreMas(pg);
  assert.match(await texto(pg), /PUNTOS DE LA TEMPORADA 71.1 DEL EQUIPO 2º POR PARTIDO 8.9 MEJOR · LOB 21 [\s\S]*Lo mío Pases completos 68% 1º de 1 Yd por intento 11.2yd 1º de 1 TD : INT 10 : 8 1º de 1 Más [\s\S]*Sacks recibidos: 4\./);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('en iPad (700 px o más, con dedo) Métricas y las fichas van a 820 de ancho y a dos columnas; Inicio, y la Mac con cursor, a ancho de teléfono', async () => {
  const pg = await telefono(srv.url, { app: { ancho: 820, pantalla: 1180 } }); await sembrar(pg);
  const mide = () => pg.evaluate(() => [getComputedStyle(document.querySelector('#tel .cuerpo')).display, document.querySelector('#tel').offsetWidth, new Set([...document.querySelectorAll('#tel .w')].map((w) => Math.round(w.getBoundingClientRect().left))).size, Math.round(document.querySelector('#tel .nav').getBoundingClientRect().width)]);
  await toca(pg, 'ir', 'metricas');
  assert.deepEqual(await mide(), ['grid', 820, 2, 430]);
  await abreJug(pg, 'nicolas'); assert.deepEqual((await mide()).slice(0, 3), ['grid', 820, 2]);
  await pg.evaluate(() => { A.juego('g6'); pintar(); }); assert.deepEqual((await mide()).slice(0, 3), ['grid', 820, 2]); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'inicio'); assert.deepEqual((await mide()).slice(0, 2), ['block', 430]);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
  // en la Mac (cursor fino) nada cambia: Métricas sigue a 430
  const ctx = await (await navegador()).newContext({ viewport: { width: 1200, height: 800 } }); await ctx.addInitScript(() => localStorage.setItem('belugas.visto.ver', '1'));
  await ctx.route(/supabase\.co/, (r) => r.abort()); const mac = await ctx.newPage(); await mac.goto(srv.url); await mac.waitForSelector('#tel .nav');
  await toca(mac, 'ir', 'metricas');
  assert.deepEqual(await mac.evaluate(() => [getComputedStyle(document.querySelector('#tel .cuerpo')).display, document.querySelector('#tel').offsetWidth]), ['block', 430]);
  await ctx.close();
});

// Iker (22-nov, capturas): fotos pegadas en Conexiones, texto pegado al borde en El balón, «1 pases». Nada toca el borde de su caja ni se sale de ella
test('nada pegado en los widgets: el texto lejos del borde de la tarjeta y dentro de su botón, las fotos vecinas con aire y la barra partida con relleno y texto centrado (8 partidos)', async () => {
  const pg = await telefono(srv.url); await sembrar(pg);
  const mide = () => pg.evaluate(() => {
    const out = [], rect = (n) => { const r = document.createRange(); r.selectNodeContents(n); return [...r.getClientRects()].filter((q) => q.width > 1); };
    for (const c of document.querySelectorAll('#tel .card')) { const cb = c.getBoundingClientRect(), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) { if (!n.data.trim()) continue; const el = n.parentElement, t = n.data.trim().slice(0, 22);
        if (el.closest('details:not([open]) > :not(summary)') || el.classList.contains('corta')) continue; // lo plegado no se ve; .corta se recorta con puntos suspensivos
        for (const q of rect(n)) { if (q.left < cb.left + 8 || q.right > cb.right - 8) out.push(`«${t}» pegado al borde de la tarjeta`);
          const b = el.closest('button'); if (b && !b.classList.contains('col')) { const bb = b.getBoundingClientRect(); if (q.left < bb.left - 1 || q.right > bb.right + 1 || q.top < bb.top - 1 || q.bottom > bb.bottom + 1) out.push(`«${t}» fuera de su botón`); } } } }
    for (const g of document.querySelectorAll('#tel [data-grupo]')) { const fs = [...g.querySelectorAll(':scope > .pp, :scope > .rvf')].map((r) => r.querySelector('.foto, .rlogo').getBoundingClientRect()); /* la primera foto de cada renglón: Conexiones del partido lleva dos en pila */ for (let i = 1; i < fs.length; i++) if (fs[i].top - fs[i - 1].bottom < 12) out.push(`fotos a ${Math.round(fs[i].top - fs[i - 1].bottom)} px en ${g.parentElement.className}`); }
    for (const b of document.querySelectorAll('#tel .partida > button')) { const bb = b.getBoundingClientRect(), i = b.querySelector('i').getBoundingClientRect(), t = rect(b.lastChild)[0], izq = Math.min(i.left, t.left) - bb.left, der = bb.right - Math.max(i.right, t.right);
      if (izq < 12 || der < 12) out.push(`tramo ${b.className}: ${Math.round(Math.min(izq, der))} px de relleno`);
      if (Math.abs((i.top + i.bottom) / 2 - (bb.top + bb.bottom) / 2) > 4) out.push(`tramo ${b.className}: el número descentrado`); if (Math.abs(i.bottom - t.bottom) > 3) out.push(`tramo ${b.className}: número y palabra en distinta línea base`); }
    for (const e of document.querySelectorAll('#tel .pp small, #tel .tip em')) if (/\b1 (pases|recepciones|partidos|corridas|jugadas|banderas)\b/.test(e.textContent)) out.push(`plural: «${e.textContent.trim()}»`);
    return out; });
  const ve = async (js) => { await pg.evaluate(js); await abreMas(pg); await pg.evaluate(() => document.querySelectorAll('#tel .w').forEach((w) => w.classList.add('vio'))); await pg.waitForTimeout(800); return mide(); }; // .vio: las barras ya entraron, como se ven al final
  assert.deepEqual(await ve(() => { st.met = 'ataque'; A.ir('metricas'); pintar(); document.querySelectorAll('.col')[4].click(); }), [], 'Métricas · Ataque'); // eslint-disable-line no-undef
  assert.deepEqual(await ve(() => { st.met = 'defensa'; pintar(); document.querySelector('.pp[data-sel]').click(); }), [], 'Métricas · Defensa'); // eslint-disable-line no-undef
  assert.deepEqual(await ve(() => { st.met = 'qb'; pintar(); document.querySelector('.partida .b1').click(); }), [], 'Métricas · QB'); // eslint-disable-line no-undef
  assert.deepEqual(await ve(() => { st.pant = 'jugadores'; A.jug('nicolas'); pintar(); document.querySelector('.w[data-w=conex] .pp[data-sel]').click(); }), [], 'ficha de Nicolás'); // eslint-disable-line no-undef
  assert.deepEqual(await ve(() => { A.juego('g6'); pintar(); document.querySelectorAll('.g4 button')[2].click(); }), [], 'ficha del partido'); // eslint-disable-line no-undef
  assert.deepEqual(await ve(() => { A.jugp('iker'); pintar(); }), [], 'Iker en el partido'); // eslint-disable-line no-undef
  // la etiqueta abre en el flujo, debajo de lo tocado: no tapa nada y no se corta en las orillas
  await pg.evaluate(() => { st.pant = 'jugadores'; A.jug('nicolas'); pintar(); document.querySelector('.w[data-w=conex] .pp[data-sel]').click(); }); // eslint-disable-line no-undef
  assert.deepEqual(await pg.evaluate(() => { const tip = document.querySelector('#tel .tip'), fila = tip.previousElementSibling, tr = tip.getBoundingClientRect(), fr = fila.getBoundingClientRect(), tel = document.querySelector('#tel').getBoundingClientRect();
    return [fila.classList.contains('sel'), tr.top >= fr.bottom, tr.left >= tel.left + 8 && tr.right <= tel.right - 8, getComputedStyle(tip).position]; }), [true, true, true, 'relative']);
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

// Iker (22-nov): «no quiero que ninguna frase esté como en doble renglón»: ninguna etiqueta, título, línea ni texto de botón ocupa dos renglones en 320, 375,
// 390 ni iPad; las cifras hermanas comparten línea base; y lo que vive dentro de una tarjeta lleva el radio concéntrico (el de la tarjeta menos su distancia al borde)
const MEDIR = () => {
  const out = [], tel = document.querySelector('#tel');
  const salta = (el) => el.closest('p, .relevo, .det > div, .reglas, .sinquerer, .repe-av, .onb, .tip span, .hoja h3 + p, .mk-corr, input, textarea, .nav, .jfila, .van-f small');
  const w = document.createTreeWalker(tel, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { if (!n.data.trim()) continue; const el = n.parentElement; if (salta(el)) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('details:not([open]) > :not(summary)')) continue;
    const r = document.createRange(); if ([...el.children].every((c) => getComputedStyle(c).display.startsWith('inline'))) r.selectNodeContents(el); else r.selectNodeContents(n);
    const qs = [...r.getClientRects()].filter((q) => q.width > 1 && q.height > 1).sort((a, b) => a.top - b.top); let lineas = 0, fin = -1e9; for (const q of qs) { if (q.top >= fin - 2) { lineas++; fin = q.bottom; } else fin = Math.max(fin, q.bottom); }
    if (lineas > 1) out.push(`2 renglones: «${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)}» (${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}) en .${(el.closest('.w, .card, .heroe, .tj, .tjp, .hoja, .mcab, .mk-cuerpo, .lideres') || tel).className.split(' ')[0]}`); }
  for (const g of tel.querySelectorAll('.franja3, .tj-tira, .g4, .areas, .hz, .marca, .lqm > div, .tj-info')) { const es = [...g.querySelectorAll('strong, b.num')].filter((e) => e.offsetWidth); const filas = {}; es.forEach((e) => { const r = e.getBoundingClientRect(); const k = Math.round(r.top / 24); (filas[k] = filas[k] || []).push(Math.round(r.bottom)); }); for (const bs of Object.values(filas)) if (bs.length > 1 && Math.max(...bs) - Math.min(...bs) > 4 && !g.classList.contains('hz')) out.push(`líneas base distintas en .${g.className.split(' ')[0]}: ${bs.join(',')}`); }
  for (const e of tel.querySelectorAll('.partida > button, .g4 > button, .tip')) { /* los chips son píldoras: van en el flujo, no pegados a la orilla */ const c = e.closest('.card'); if (!c || !e.offsetWidth) continue; const cs = getComputedStyle(e), r = e.getBoundingClientRect(), cr = c.getBoundingClientRect(), R0 = Math.min(38, parseFloat(getComputedStyle(c).borderTopLeftRadius)); // 38: el radio de diseño (Chromium pinta squircle de 61)
    const d = Math.min(r.left - cr.left, cr.right - r.right); if (d >= R0 - 1) continue; const ext = Math.min(r.height / 2, e.matches('.b1') ? parseFloat(cs.borderTopLeftRadius) : e.matches('.b2') ? parseFloat(cs.borderTopRightRadius) : parseFloat(cs.borderTopLeftRadius)), esperado = Math.min(R0 - d, r.height / 2);
    if (Math.abs(ext - esperado) > 1.5) out.push(`radio no concéntrico en .${e.className.split(' ')[0]}: ${ext} (esperado ${Math.round(esperado)})`);
    if (e.matches('.b1') && parseFloat(cs.borderTopRightRadius) > 0.5) out.push('b1 con radio por dentro'); if (e.matches('.b2') && parseFloat(cs.borderTopLeftRadius) > 0.5) out.push('b2 con radio por dentro'); }
  for (const e of tel.querySelectorAll('.riel, .riel > i')) if (e.offsetWidth && parseFloat(getComputedStyle(e).borderTopLeftRadius) < e.getBoundingClientRect().height / 2 - .5) out.push('riel sin píldora');
  return [...new Set(out)];
};
const ESC = [
  ['inicio', () => { HOY = 'kaffies'; A.ir('inicio'); pintar(); }], ['lideres-yardas', () => { A.cat('yds'); A.todos(); pintar(); }],
  ['partidos', () => { A.ir('partidos'); pintar(); }], ['jugadores', () => { A.ir('jugadores'); pintar(); }],
  ['metricas', () => { st.met = 'ataque'; A.ir('metricas'); pintar(); document.querySelectorAll('.det').forEach((d) => { d.open = true; }); document.querySelectorAll('.col')[4].click(); }],
  ['metricas-defensa', () => { st.met = 'defensa'; pintar(); document.querySelectorAll('.det').forEach((d) => { d.open = true; }); document.querySelector('.pp[data-sel]').click(); }],
  ['metricas-qb', () => { st.met = 'qb'; pintar(); document.querySelectorAll('.det').forEach((d) => { d.open = true; }); document.querySelector('.partida .b2').click(); }],
  ['metricas-rival', () => { document.querySelector('.rvf').click(); }], ['metricas-viene', () => { document.querySelector('.chip').click(); }], ['metricas-pastilla', () => { document.querySelector('.rs[data-sel]').click(); }],
  ['ficha-nicolas', () => { st.pant = 'jugadores'; A.jug('nicolas'); pintar(); document.querySelectorAll('.det').forEach((d) => { d.open = true; }); document.querySelector('.riel[data-sel]').click(); }],
  ['ficha-mau', () => { st.pant = 'jugadores'; A.jug('mau'); pintar(); document.querySelectorAll('.det').forEach((d) => { d.open = true; }); document.querySelector('.w[data-w=conex] .pp[data-sel]').click(); }],
  ['ficha-rodrigo', () => { st.pant = 'jugadores'; A.jug('rodrigo'); pintar(); }], ['ficha-jaime', () => { st.pant = 'jugadores'; A.jug('jaime'); pintar(); }],
  ['partido-g6', () => { A.juego('g6'); pintar(); document.querySelectorAll('.g4 button')[2].click(); }], ['partido-g4', () => { A.juego('g4'); pintar(); }],
  ['jugp-iker', () => { A.juego('g6'); pintar(); A.jugp('iker'); pintar(); }], ['jugp-mau', () => { A.juego('g6'); pintar(); A.jugp('mau'); pintar(); }], ['jugp-rodrigo', () => { A.juego('g6'); pintar(); A.jugp('rodrigo'); pintar(); }],
  ['marcar', () => { const t = (a, v) => { const e = document.querySelector('#tel [data-a="' + a + '"]' + (v ? '[data-v="' + v + '"]' : '')); if (e) e.click(); }; A.ir('inicio'); pintar(); t('empezar'); t('rival', 'kaffies'); ['mau', 'nicolas', 'rodrigo', 'jaime'].forEach((id) => t('vantoggle', id)); t('vanlisto'); }],
  ['marcar-defensa', () => { A.lado('D'); pintar(); }], ['hoja-quien', () => { A.lado('O'); pintar(); A.res('pase'); pintar(); }], ['hoja-mas', () => { A.cerrar(); A.mas(); pintar(); }],
  ['hoja-editar', () => { A.cerrar(); A.editar(); pintar(); }], ['hoja-rival', () => { A.rivalver('editar'); pintar(); }], ['hoja-van', () => { A.cerrar(); A.vanver('editar'); pintar(); }], ['hoja-qb', () => { A.cerrar(); A.qbver(); pintar(); }],
  ['hoja-inc', () => { A.cerrar(); A.res('incompleto'); pintar(); }], ['hoja-como', () => { A.cerrar(); A.res('td'); pintar(); }],
  ['hoja-corrige', () => { A.cerrar(); A.quien('nicolas'); A.sinyd(); pintar(); A.fila(0); pintar(); }], ['hoja-cqp', () => { A.cqp(); pintar(); }], ['hoja-conv', () => { A.cerrar(); A.tdr(); pintar(); }],
  ['lo-que-paso', () => { A.conv('0'); A.mkver('paso'); pintar(); }], ['final', () => { A.terminar(); pintar(); }], ['ajustes', () => { A.ir('inicio'); pintar(); st.hoja = 'ayuda'; pintar(); }], ['eliminar', () => { st.hoja = null; A.juego('g6'); pintar(); A.eliminarver('g6'); pintar(); }],
];
test('un renglón por etiqueta, cifras hermanas alineadas y radios concéntricos, en toda la app y en 4 tamaños', async () => {
  for (const [w, h, app] of [[320, 568, 0], [375, 667, 0], [390, 844, 0], [820, 1180, 1]]) {
    const pg = await telefono(srv.url, app ? { app: { ancho: w, pantalla: h } } : { ancho: w, alto: h }); await sembrar(pg);
    for (const [nom, js] of ESC) { await pg.evaluate(js); await pg.evaluate(() => document.querySelectorAll('#tel .w').forEach((x) => x.classList.add('vio'))); await pg.waitForTimeout(150);
      assert.deepEqual(await pg.evaluate(MEDIR), [], `${w} × ${h} · ${nom}`); }
    assert.deepEqual(pg.errores, []);
    await pg.context().close();
  }
});
