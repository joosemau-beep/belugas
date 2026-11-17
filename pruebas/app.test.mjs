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
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico');
  for (let i = 0; i < 8; i++) await pg.locator('.rg-b[data-pm="1"]').click();
  await pg.waitForTimeout(3300); // la regla se cierra sola 3 s después del último toque
  await paso('0–0', /Ataque/);
  await toca(pg, 'res', 'corrida'); await toca(pg, 'quien', 'rodrigo'); await toca(pg, 'sinyd');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'cayo'); await toca(pg, 'quien', 'pepe');
  await toca(pg, 'res', 'incompleto'); await toca(pg, 'inc', 'mal');
  await toca(pg, 'res', 'parada');
  await toca(pg, 'castigo', 'favor'); await toca(pg, 'mas'); await toca(pg, 'castigo', 'contra'); // en ataque el castigo a favor va grande; en contra, sack, pick 6 y safety en «Más opciones»
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
  await toca(pg, 'mas'); await toca(pg, 'res', 'pick6'); await toca(pg, 'quien', 'mau'); await toca(pg, 'conv', '0');
  await paso('13–8', /Defensa/); // después del pick 6 ellos vuelven a atacar
  await toca(pg, 'mas'); await toca(pg, 'res', 'safety'); await toca(pg, 'quien', 'nico');
  await paso('15–8', /Ataque/);
  await toca(pg, 'mas'); await toca(pg, 'res', 'safetyc');
  await paso('15–10', /Defensa/);
  await toca(pg, 'lado', 'O'); // el lado a mano
  await paso('15–10', /Ataque/);
  await toca(pg, 'mas'); await toca(pg, 'res', 'pick6c'); await toca(pg, 'conv', '1-0');
  await paso('15–16', /Ataque/);
  // sack a nuestro QB con yardas perdidas, y se deshace
  await toca(pg, 'mas'); await toca(pg, 'res', 'sackr'); await pg.locator('.rg-b[data-pm="-1"]').click(); await pg.locator('.rg-b[data-pm="-1"]').click(); await pg.waitForTimeout(3300);
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
  assert.deepEqual(st.nico, { rec: 2, ryd: 8, td: 1, pres: 1, saf: 1, car: 1, pts: 11.8 }); // sin 1ª y 10: ya no se marca
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
  assert.match(await texto(pg), /¿Algo quedó mal\? Corregir/);
  await toca(pg, 'corregirp', g1);
  assert.equal(await marcador(pg), '6–6');
  assert.match(await texto(pg), /Corrigiendo/i);
  assert.equal(await pg.locator('.centro2.vivo').count(), 0);
  // borrar el TD de ellos y cambiar la corrida de Rodrigo por un pase a Nico
  await fila(pg, await idxDe(pg, 'tdr')); await toca(pg, 'borrar');
  assert.equal(await marcador(pg), '6–0');
  await fila(pg, await idxDe(pg, 'corrida')); await toca(pg, 'cqp'); await toca(pg, 'cqpya', 'pase');
  await fila(pg, await idxDe(pg, 'pase')); await toca(pg, 'cquien', 'nico');
  // el TD que faltó va después de la primera jugada, no al final
  await fila(pg, 0); await toca(pg, 'insaqui');
  assert.match(await texto(pg), /Va después de: TD de Nico/);
  await td(pg, 'corrida', 'rodrigo');
  assert.deepEqual(await pg.evaluate(() => st.partido.jugadas.map((j) => j.k + ':' + j.id)), ['td:nico', 'td:rodrigo', 'pase:nico']); // eslint-disable-line no-undef
  assert.equal(await marcador(pg), '12–0');
  // rival y fecha, desde el marcador
  await toca(pg, 'editar'); await toca(pg, 'rivalver', 'editar'); await toca(pg, 'rival', 'bucaneros');
  await toca(pg, 'fechaver'); await pg.fill('#fecha', '2026-11-09'); await toca(pg, 'fechaya');
  assert.match(await pg.locator('.hoja').innerText(), /Bucaneros[\s\S]*Fecha\s+9 nov/);
  await pg.locator('.hoja .op[data-a="cerrar"]').click();
  assert.match(await texto(pg), /Corrigiendo · 9 nov/i);
  await toca(pg, 'listocorr');
  assert.match(await texto(pg), /Ganamos · 9 nov.*12 – 0/i);
  assert.equal(await pg.evaluate(() => RECORD), '7–1'); // eslint-disable-line no-undef
  const pts = await pg.evaluate((id) => { const g = JUEGOS.find((x) => x.id === id); return Object.fromEntries(Object.entries(g.st).map(([k, x]) => [k, puntosDe(x)])); }, g1); // eslint-disable-line no-undef
  assert.deepEqual([pts.nico, pts.rodrigo], [11.5, 10.5]); // los TD suman las yardas que faltaban (45)
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
  assert.equal(await pg.evaluate(() => TEMP.rodrigo.pts), 10.5); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'jugadores');
  assert.match(await texto(pg), /Rodrigo 1 TD · 1 corrida 10\.5 pts/);
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
  // sin la barrita de arrastre: la hoja se cierra con su ✕, arriba a la derecha junto al título, de 44 px
  assert.equal(await pg.locator('.hoja').evaluate((h) => getComputedStyle(h, '::before').content), 'none');
  assert.deepEqual(await pg.locator('.hoja .hbar').evaluate((b) => [b.firstElementChild.tagName, b.querySelector('.hb.no').getBoundingClientRect().height, b.querySelector('.hb.no').getBoundingClientRect().right > innerWidth - 40]), ['H3', 44, true]);
  // abajo del botón fijo no se asoman los renglones
  assert.equal(await pg.evaluate(() => Math.round(document.querySelector('.hoja').getBoundingClientRect().bottom - document.querySelector('.ops.fijo').getBoundingClientRect().bottom)), 0);
  for (const id of ['mau', 'nico', 'rodrigo']) await toca(pg, 'vantoggle', id);
  await toca(pg, 'vanlisto');
  // Marcar: las 6 más usadas en botones grandes de solo texto, el TD y «Más opciones» con el resto; todo cabe sin bajar
  // cada botón de jugada lleva su ícono, en el estilo que se escoge en Ajustes y se recuerda: A ícono de color, C botón de color,
  // D ícono de fondo, E vidrio (los tres últimos, el botón entero del color de su jugada)
  assert.equal(await pg.locator('.mk-grandes.ico-color .mk-grande > .ic.relleno + span').count(), 6);
  for (const e of ['lleno', 'fondo', 'vidrio']) {
    await pg.evaluate(() => { A.ico(); pintar(); }); // eslint-disable-line no-undef
    assert.deepEqual([await pg.locator(`.mk-grandes.ico-${e} .mk-grande[style*="--c"] > .mk-gi svg`).count(), await pg.evaluate(() => localStorage.getItem('belugas.ico'))], [6, e]);
  }
  await pg.evaluate(() => { A.ico(); pintar(); }); // eslint-disable-line no-undef
  assert.equal(await pg.evaluate(() => st.ico), 'color'); // eslint-disable-line no-undef
  assert.deepEqual(await pg.locator('.mk-grande').allInnerTexts(), ['Pase completo', 'Corrida', 'Incompleto', 'Nos pararon', 'Intercepción', 'Castigo a favor']);
  assert.deepEqual(await pg.locator('.mk-tiras > button').allInnerTexts(), ['Touchdown', 'Más opciones']);
  assert.ok(Math.min(...await pg.locator('.mk-grande').evaluateAll((xs) => xs.map((x) => x.getBoundingClientRect().height))) >= 100);
  assert.ok(Math.min(...await pg.locator('.mk-tiras > button').evaluateAll((xs) => xs.map((x) => x.getBoundingClientRect().height))) >= 56);
  assert.ok(await pg.evaluate(() => document.querySelector('.mk-vista + .pregunta').getBoundingClientRect().bottom <= document.querySelector('.nav').getBoundingClientRect().top));
  // el aviso de la jugada se va solo: en Marcar no se queda la tira «Última · Corregir · Deshacer»; todas las jugadas caben sin bajar
  await pg.evaluate(() => { st.toast = null; pintar(); }); // eslint-disable-line no-undef
  assert.deepEqual(await pg.evaluate(() => { const c = document.querySelector('.mk-cuerpo'); return [document.querySelectorAll('.mk-cuerpo .ultima').length, c.scrollHeight <= c.clientHeight]; }), [0, true]);
  await toca(pg, 'mas');
  assert.deepEqual(await pg.locator('.hoja .mk-tira').allInnerTexts(), ['Castigo en contra', 'Sack a nuestro QB', 'Pick 6 en contra', 'Safety en contra']);
  await pg.locator('.hoja .hb.no').click(); await pg.waitForTimeout(150);
  assert.equal(await pg.evaluate(() => st.hoja), null); // eslint-disable-line no-undef
  await toca(pg, 'lado', 'D');
  assert.deepEqual(await pg.locator('.mk-grande').allInnerTexts(), ['Quitamos la bandera', 'Pase incompleto', 'Sack', 'Intercepción', 'Castigo a favor', 'Castigo en contra']);
  await toca(pg, 'mas');
  assert.deepEqual(await pg.locator('.hoja .mk-tira').allInnerTexts(), ['Pick 6', 'Safety a favor']);
  await toca(pg, 'cerrar'); await toca(pg, 'lado', 'O');
  // ¿Quién?: sin «No sé», y la ✕ de arriba no guarda nada; en la regla, la ✓ guarda las yardas ya
  await toca(pg, 'res', 'corrida');
  assert.doesNotMatch(await texto(pg), /No sé/);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  assert.equal(await pg.evaluate(() => st.partido.jugadas.length), 0); // eslint-disable-line no-undef
  await toca(pg, 'res', 'pase'); await toca(pg, 'quien', 'nico');
  // yardas como la V2: sin regla a la vista, saltos de −5, +5, +10 y +20, y el + y el − afinan; ✕ a la izquierda, el título al centro y ✓ a la derecha, sin texto abajo
  assert.deepEqual(await pg.locator('.hoja.cuanto .hbar > *').evaluateAll((xs) => xs.map((x) => x.className || x.tagName)), ['hb no', 'H3', 'hb si']);
  assert.equal(await pg.locator('.hoja.cuanto .hbar small, .hoja.cuanto p').count(), 0);
  assert.deepEqual(await pg.locator('.rg-saltos button').allInnerTexts(), ['-5', '+5', '+10', '+20']);
  assert.equal(await pg.locator('#rgth').isVisible(), false);
  await pg.locator('[data-salto="10"]').click(); await pg.locator('[data-salto="-5"]').click();
  for (let i = 0; i < 3; i++) await pg.locator('.rg-b[data-pm="1"]').click();
  await pg.locator('.hoja.cuanto .hb.si').click(); await pg.waitForTimeout(150);
  assert.deepEqual(await pg.evaluate(() => [st.hoja, st.partido.jugadas[0].id, st.partido.jugadas[0].yd]), [null, 'nico', 8]); // eslint-disable-line no-undef
  // una jugada vieja sin nombre sigue contando y se le pone el jugador al corregirla (en Corregir ya no hay «No sé»)
  await pg.evaluate(() => { const p = st.partido; p.jugadas[0].id = null; rehacer(p); A.fila(0); pintar(); }); // eslint-disable-line no-undef
  assert.match(await texto(pg), /pase a sin nombre/); assert.doesNotMatch(await texto(pg), /No sé/);
  await toca(pg, 'cquien', 'rodrigo');
  assert.equal(await pg.evaluate(() => st.partido.jugadas[0].id), 'rodrigo'); // eslint-disable-line no-undef
  // ¿Quién?: primero el que acaba de jugar, con la marca «última», y luego los demás que vinieron
  await toca(pg, 'res', 'corrida');
  assert.deepEqual(await pg.locator('.hoja .pj').evaluateAll((xs) => xs.map((x) => [x.dataset.v, !!x.querySelector('.ult')])), [['rodrigo', true], ['mau', false], ['nico', false], ['hugo', false]]);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  // «Lo que pasó» va aparte, sin pestañas ni texto: deslizando a la derecha se llega y a la izquierda se regresa; los puntos dicen dónde vas
  const desliza = (de, a) => pg.evaluate(([de, a]) => { const c = document.querySelector('.mk-cuerpo'), t = (x) => new Touch({ identifier: 1, target: c, clientX: x, clientY: 400 });
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [t(de)], changedTouches: [t(de)], bubbles: true }));
    c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(a)], bubbles: true })); }, [de, a]);
  assert.doesNotMatch(await texto(pg), /Lo que pasó/);
  assert.deepEqual(await pg.locator('.mk-puntos button').evaluateAll((xs) => xs.map((x) => x.className)), ['', 'on']);
  await desliza(300, 120); // a la izquierda no hay nada más
  assert.equal(await pg.locator('.mk-tiras').count(), 1);
  await desliza(80, 300);
  assert.match(await texto(pg), /Este partido/i);
  assert.deepEqual(await pg.locator('.mk-puntos button').evaluateAll((xs) => xs.map((x) => x.className)), ['on', '']);
  await desliza(80, 300); // otra vez a la derecha: se queda
  assert.equal(await pg.evaluate(() => st.mkVer), 'paso'); // eslint-disable-line no-undef
  await desliza(300, 120);
  assert.equal(await pg.evaluate(() => st.mkVer), 'marcar'); // eslint-disable-line no-undef
  assert.equal(await pg.locator('.mk-tiras').count(), 1);
  // Ataque/Defensa: grande, arriba, el lado en que vas marcado; tocar el mismo lado no cambia nada; sin 1ª y 10 en ¿Quién?
  assert.deepEqual(await pg.locator('.mk-lado button').evaluateAll((xs) => xs.map((x) => [x.innerText, x.classList.contains('on'), Math.round(x.getBoundingClientRect().height)])), [['Ataque', true, 34], ['Defensa', false, 34]]);
  assert.equal(await pg.locator('.mk-eq svg, .mk-eq img + span img').count(), 0); // ni balón ni nada junto a «BELUGAS»: solo el texto
  const cambios = await pg.evaluate(() => st.partido.cambios.length); // eslint-disable-line no-undef
  await toca(pg, 'lado', 'O');
  assert.equal(await pg.evaluate(() => st.partido.cambios.length), cambios); // eslint-disable-line no-undef
  // sin textos de ayuda: el incompleto solo trae sus opciones (y su ✕)
  await toca(pg, 'res', 'incompleto');
  assert.deepEqual([await pg.locator('.hoja p, .hoja h3').count(), await pg.locator('.hoja .hb.no').count(), await pg.locator('.hoja .op').allInnerTexts()], [0, 1, ['Se le cayó, no la atrapó', 'Mal pase o no se podía agarrar']]);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  await toca(pg, 'res', 'pase'); assert.equal(await pg.locator('.hoja .pdt').count(), 0); assert.doesNotMatch(await pg.locator('.hoja').innerText(), /1ª y 10/);
  await pg.locator('.hb.no').click(); await pg.waitForTimeout(150);
  // defendiendo, la franja de la hora toma el color del rival (Kaffies, oscurecido como el encabezado); atacando, el nuestro
  await toca(pg, 'lado', 'D');
  assert.equal(await pg.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#5e4824');
  await toca(pg, 'lado', 'O');
  assert.equal(await pg.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#0d2347');
  // Inicio: la tarjeta del partido sin balón, con Belugas, el marcador y el nombre del rival
  await toca(pg, 'ir', 'inicio');
  assert.equal(await pg.locator('.heroe .balon').count(), 0);
  assert.match(await pg.locator('.heroe').innerText(), /Belugas[\s\S]*0 – 0[\s\S]*Kaffies/);
  await toca(pg, 'marcar'); await td(pg, 'corrida', 'nico'); await toca(pg, 'terminar'); await toca(pg, 'ir', 'inicio');
  // ninguna pantalla rebota (ni arriba ni abajo) ni deja mover la página entera
  for (const v of ['inicio', 'partidos', 'jugadores', 'metricas']) {
    await toca(pg, 'ir', v);
    assert.deepEqual(await pg.evaluate(() => [[...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).overscrollBehaviorY !== 'none').length, document.scrollingElement.scrollHeight <= innerHeight]), [0, true], v);
  }
  // Líderes: cambiar de categoría no regresa la página hasta arriba
  await toca(pg, 'ir', 'inicio');
  const cu = pg.locator('#tel .cuerpo');
  await cu.evaluate((c) => { c.scrollTop = 300; }); const y = await cu.evaluate((c) => c.scrollTop);
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
test('la franja de la hora va del color del encabezado de cada pantalla, también en las fichas', async () => {
  const pg = await telefono(srv.url);
  await agrega(pg, ['Mau', 'Nico']);
  // el color justo debajo de la franja de la hora (a la orilla, donde no hay botones) y el theme-color de esa pantalla
  const arriba = () => pg.evaluate(() => { const y = document.querySelector('#tel .estado').getBoundingClientRect().bottom + 6; let e = document.elementFromPoint(6, y);
    while (e && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(e).backgroundImage === 'none') e = e.parentElement;
    const c = getComputedStyle(e); return [document.querySelector('meta[name="theme-color"]').content, c.backgroundImage !== 'none' ? 'degradado' : c.backgroundColor]; });
  const MARINO = ['#0d2347', 'rgb(13, 35, 71)'];
  for (const v of ['inicio', 'partidos', 'jugadores', 'metricas']) { await toca(pg, 'ir', v); assert.deepEqual(await arriba(), MARINO, v); }
  await toca(pg, 'ir', 'jugadores'); await toca(pg, 'jug', 'nico'); assert.deepEqual(await arriba(), MARINO, 'ficha de jugador');
  await pg.evaluate(() => { A.juego(JUEGOS[0].id); pintar(); }); assert.deepEqual(await arriba(), MARINO, 'ficha de partido'); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'inicio'); await toca(pg, 'empezar'); await toca(pg, 'rival', 'kaffies'); await toca(pg, 'vantoggle', 'mau'); await toca(pg, 'vanlisto');
  assert.deepEqual(await arriba(), ['#0d2347', 'degradado'], 'Marcar en ataque');
  await toca(pg, 'lado', 'D'); assert.deepEqual(await arriba(), ['#5e4824', 'degradado'], 'Marcar en defensa');
  assert.deepEqual(pg.errores, []);
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
  await pg.evaluate(() => { A.mkver('paso'); pintar(); }); await sinPd('Lo que pasó'); // eslint-disable-line no-undef
  await pg.evaluate(() => { A.fila(0); pintar(); }); await sinPd('Corregir'); await pg.locator('.hoja .hb.no').click(); await pg.waitForTimeout(150); // eslint-disable-line no-undef
  await toca(pg, 'terminar'); await sinPd('el final');
  for (const v of ['inicio', 'partidos', 'jugadores']) { await toca(pg, 'ir', v); await sinPd(v); }
  await toca(pg, 'jug', 'nico'); await sinPd('ficha de jugador');
  await pg.evaluate(() => { A.juego(JUEGOS[JUEGOS.length - 1].id); pintar(); }); await sinPd('ficha de partido'); // eslint-disable-line no-undef
  await toca(pg, 'ir', 'metricas'); await sinPd('Métricas · ataque'); await toca(pg, 'met', 'defensa'); await sinPd('Métricas · defensa');
  // los datos viejos se quedan: la jugada sigue con su 1ª y 10 guardada (y su punto), solo no se muestra
  assert.equal(await pg.evaluate(() => JUEGOS[JUEGOS.length - 1].st.nico.pd), 1); // eslint-disable-line no-undef
  assert.deepEqual(pg.errores, []);
  await pg.context().close();
});

test('abre sin señal', { skip: !srv.url.startsWith('https:') && 'solo con URL=https://…' }, async () => {
  const pg = await telefono(srv.url);
  await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(2000);
  await pg.context().setOffline(true);
  await pg.reload(); await pg.waitForSelector('#tel .nav');
  assert.deepEqual(await pg.$$eval('img', (xs) => xs.filter((x) => x.complete && !x.naturalWidth).map((x) => x.src)), []);
  await pg.context().close();
});
