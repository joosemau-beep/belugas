// la temporada de ejemplo de la revisión de números (22-nov): el plantel real, los 6 rivales, las fechas y los 8 marcadores reales (KAF 13–20, ONF 14–8,
// AZT 21–20, KAF 14–13, LOB 33–12, BUC 16–14, PAN 22–17, KAF 6–13) con jugadas de ejemplo de semilla fija (178) que dan justo esos marcadores; los dos
// de esta semana son los revisados a mano (PAN y KAF). sembrar(pg) la mete en la app abierta. De aquí salen los números que esperan las pruebas de los widgets

let s = 17; const R = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ent = (a, b) => a + Math.floor(R() * (b - a + 1));
const de = (w) => { const l = Object.entries(w), tot = l.reduce((a, [, n]) => a + n, 0); let x = R() * tot; for (const [k, n] of l) { x -= n; if (x < 0) return k; } return l[0][0]; };
const REC = { nicolas: 30, uri: 14, patrick: 12, iker: 12, mario: 10, juancho: 8, leo: 7, jose: 5, juanpi: 2 };
const CORR = { rodrigo: 50, iker: 15, ian: 20, juanpi: 15 };
const BAND = { jaime: 18, juancho: 14, ian: 12, juanpi: 12, jose: 12, leo: 10, iker: 10, mario: 8, rodrigo: 4 };
const INTN = { jaime: 40, mario: 20, iker: 15, juancho: 25 }, TAP = { juancho: 40, jaime: 30, jose: 30 }, SACK = { rodrigo: 50, ian: 50 };
export const NOMBRES = ['Mau', 'Nicolás', 'Rodrigo', 'Iker', 'Mario', 'Jaime', 'Uri', 'Ian', 'Patrick', 'Juanpi', 'Leo', 'José', 'Juancho'];
export const IDS = ['mau', 'nicolas', 'rodrigo', 'iker', 'mario', 'jaime', 'uri', 'ian', 'patrick', 'juanpi', 'leo', 'jose', 'juancho'];

// un marcador en TD + conversiones: [tipo, entró] por TD
function partes(n) {
  for (let k = Math.floor(n / 6); k >= 1; k--) { let r = n - 6 * k; if (r > 2 * k) continue;
    return Array.from({ length: k }, () => { const v = r >= 2 && (r > k - 1 || R() < .4) ? 2 : r >= 1 ? 1 : 0; r -= v; return v ? [v, 1] : [R() < .7 ? 1 : 2, 0]; }); }
  throw new Error('no sale ' + n);
}
// un partido: series alternadas; las que anotan, al azar
function partido(nos, ellos, qbExtra) {
  const ours = partes(nos), theirs = partes(ellos), n = Math.max(ours.length, theirs.length) + ent(1, 2);
  const marcaO = new Set(), marcaD = new Set(); while (marcaO.size < ours.length) marcaO.add(ent(0, n - 1)); while (marcaD.size < theirs.length) marcaD.add(ent(0, n - 1));
  const js = [], empO = R() < .5; let io = 0, id = 0;
  const serieO = (anota, i) => {
    const qb = qbExtra && i >= n - 2 ? qbExtra : 'mau'; let spot = 5;
    const avance = (max) => { const r = R();
      if (r < .5) { const yd = Math.min(ent(3, R() < .15 ? 26 : 16), max); const x = de(REC); js.push({ lado: 'O', k: 'pase', id: x, qb, yd }); spot += yd; }
      else if (r < .8) { const yd = Math.min(ent(-3, 10), max); js.push({ lado: 'O', k: 'corrida', id: de(CORR), yd }); spot += yd; }
      else if (r < .95) { const drop = R() < .3; js.push({ lado: 'O', k: 'incompleto', qb, ...(drop ? { id: de(REC), drop: true } : {}) }); }
      else { const yd = -ent(2, 6); js.push({ lado: 'O', k: 'sackr', id: qb, yd }); spot += yd; } spot = Math.max(1, spot); };
    if (anota) { const [t, e] = ours[io++];
      // 6 de cada 10 TD se llegan a anotar desde la zona roja (a 10 yd o menos): un avance hasta ahí y, a veces, un incompleto antes del TD
      if (R() < .6) { for (let k = ent(0, 1); k > 0; k--) avance(30 - spot); const meta = ent(40, 46), yd = meta - spot, x = R() < .7 ? de(REC) : null;
        js.push(x ? { lado: 'O', k: 'pase', id: x, qb, yd } : { lado: 'O', k: 'corrida', id: de(CORR), yd }); spot = meta; if (R() < .35) js.push({ lado: 'O', k: 'incompleto', qb }); }
      else for (let k = ent(0, 3); k > 0; k--) avance(48 - spot);
      const corre = R() < .22, x = corre ? de(CORR) : de(REC), cid = e && t ? de(REC) : null;
      js.push({ lado: 'O', k: 'td', id: x, qb: corre ? null : qb, conv: [t, e], ...(cid ? { convId: cid, convQb: qb } : {}) }); return; }
    for (let k = 0; k < 4; k++) { if (R() < .1) { js.push({ lado: 'O', k: 'int', qb }); return; } avance(45 - spot); }
  };
  const serieD = (anota) => {
    for (let k = ent(anota ? 0 : 1, 3); k > 0; k--) { const r = R();
      if (r < .65) js.push({ lado: 'D', k: 'bandera', id: de(BAND), yd: ent(-2, 9) }); else if (r < .85) js.push({ lado: 'D', k: 'tapado', id: de(TAP) }); else js.push({ lado: 'D', k: 'sack', id: de(SACK) }); }
    if (anota) { const [t, e] = theirs[id++]; js.push({ lado: 'D', k: 'tdr', conv: [t, e] }); }
    else if (R() < .25) js.push({ lado: 'D', k: 'intn', id: de(INTN) });
  };
  for (let i = 0; i < n; i++) { if (empO) { serieO(marcaO.has(i), i); serieD(marcaD.has(i)); } else { serieD(marcaD.has(i)); serieO(marcaO.has(i), i); } }
  return js;
}
// los dos partidos ya revisados a mano en las rondas 1 y 2, con los nombres del plantel real
export const ren = (j) => { const m = { nico: 'nicolas', pepe: 'juancho', luis: 'patrick' }; const x = { ...j }; ['id', 'qb', 'convId', 'convQb'].forEach((k) => { if (m[x[k]]) x[k] = m[x[k]]; }); return x; };
export const PAN = [{ lado: 'O', k: 'pase', id: 'nico', qb: 'mau', yd: 8 }, { lado: 'O', k: 'corrida', id: 'rodrigo', yd: 5 }, { lado: 'O', k: 'incompleto', id: 'pepe', qb: 'mau', drop: true }, { lado: 'O', k: 'incompleto', qb: 'mau' },
  { lado: 'O', k: 'td', id: 'iker', qb: 'mau', yd: 12, conv: [1, 1], convId: 'nico', convQb: 'mau' }, { lado: 'D', k: 'bandera', id: 'pepe', yd: 3 }, { lado: 'D', k: 'tapado', id: 'mau' }, { lado: 'D', k: 'sack', id: 'rodrigo' },
  { lado: 'D', k: 'bandera', id: 'iker', yd: -2 }, { lado: 'D', k: 'tdr', conv: [2, 1] }, { lado: 'O', k: 'pase', id: 'mario', qb: 'nico', yd: 15 }, { lado: 'O', k: 'sackr', id: 'mau', yd: -4 }, { lado: 'O', k: 'int', qb: 'mau' },
  { lado: 'D', k: 'intn', id: 'mario' }, { lado: 'O', k: 'corrida', id: 'rodrigo', yd: -2 }, { lado: 'O', k: 'td', id: 'rodrigo', qb: null, yd: 20, conv: [2, 0] }, { lado: 'D', k: 'pick6', id: 'iker', conv: [1, 1], convId: 'pepe', convQb: 'mau' },
  { lado: 'D', k: 'safety', id: 'pepe' }, { lado: 'O', k: 'pase', id: 'pepe', qb: 'mau', yd: 6 }, { lado: 'O', k: 'pick6c', qb: 'mau', conv: [1, 1] }, { lado: 'O', k: 'safetyc', id: 'rodrigo' }, { lado: 'D', k: 'bandera', id: 'nico' }, { lado: 'O', k: 'pase', id: 'nico', qb: 'mau', yd: 4 }].map(ren);
export const KAF = [{ lado: 'O', k: 'pase', id: 'nico', qb: 'mau', yd: 10 }, { lado: 'O', k: 'td', id: 'nico', qb: 'mau', conv: [1, 0] }, { lado: 'D', k: 'tdr' }, { lado: 'O', k: 'incompleto', qb: 'mau' }, { lado: 'O', k: 'int', qb: 'mau' },
  { lado: 'D', k: 'bandera', id: 'pepe', yd: 0 }, { lado: 'D', k: 'tdr', conv: [1, 1] }, { lado: 'O', k: 'corrida', id: 'iker', yd: 7 }].map(ren);

// los 8 partidos: los 6 de antes con su marcador real (PASADOS de index.html) y los dos de esta semana
const CAL = [['kaffies', 2026, 9, 5, 13, 20], ['only-fins', 2026, 9, 12, 14, 8], ['ultimos-aztecas', 2026, 9, 19, 21, 20], ['kaffies', 2026, 9, 26, 14, 13], ['lobos-its', 2026, 10, 2, 33, 12, 'jose'], ['bucaneros', 2026, 10, 9, 16, 14], ['panini', 2026, 10, 16, 22, 17], ['kaffies', 2026, 10, 17, 6, 13]];
export const juegos = CAL.map(([rival, y, m, dd, nos, ellos, qbx], i) => { const t0 = new Date(y, m, dd, 19).getTime(), crudas = i === 6 ? PAN : i === 7 ? KAF : partido(nos, ellos, qbx);
  const usados = new Set(crudas.flatMap((j) => [j.id, j.qb, j.convId]).filter(Boolean)), resto = IDS.filter((x) => !usados.has(x)).sort(() => R() - .5);
  const van = [...usados, ...resto.slice(0, Math.max(0, ent(10, 12) - usados.size))];
  return { id: 'g' + i, inicio: t0, dia: t0, rival, van, qb: 'mau', jugadas: crudas.map((j, k) => ({ uid: `u${i}-${k}`, t: t0 + k * 60000, ver: 1, por: 'x', id: null, ...j })), borradas: {}, cambios: [], terminado: true, meta: [nos, ellos] }; });

// siembra los 8 partidos en la app abierta (los 6 de antes ya vienen con jugadas, como en el catálogo)
export async function sembrar(pg) {
  await pg.evaluate(({ juegos, NOMBRES, IDS }) => {
    T.plantel = NOMBRES.map((n, i) => ({ id: IDS[i], nombre: n, n: i, ver: 1 }));
    T.linea.qb = 'mau';
    PASADOS.length = 0; Object.keys(ANTES).forEach((k) => { delete ANTES[k]; });
    T.juegos = Object.fromEntries(juegos.map((g) => [g.id, g]));
    recalcular(); pintar();
  }, { juegos, NOMBRES, IDS });
}
