// Temporada de ejemplo para el prototipo de Métricas: una fila por jugada (camino B).
// Uso: node generar-datos.mjs  → escribe datos.json junto a este archivo y un resumen en la terminal.
// Son 10 partidos y 13 jugadores. Los 3 primeros marcadores son los reales que trae la app (index.html:487);
// los otros 7 y TODAS las jugadas son de ejemplo. g1 a g6 son los de la primera versión, fila por fila;
// g7 a g10 se agregaron para ver los casos raros: un empate, uno de solo 2 series (antes «incompleto»: ya no existe, ruido-24),
// una paliza en contra y una a favor. Nico, Rodrigo F. y Maú faltan a g1–g6; Rodrigo F. va a un partido y no tiene jugadas.
// El guion de cada partido (qué pasó en cada serie) está escrito a mano; el relleno de cada serie sale de un
// azar con semilla fija, así que siempre da lo mismo.
import { writeFileSync } from 'node:fs';

// azar con semilla (mulberry32)
function azar(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const escoge = (r, pesos) => { const e = Object.entries(pesos).filter(([, w]) => w > 0); let x = r() * e.reduce((a, [, w]) => a + w, 0); for (const [k, w] of e) { if ((x -= w) < 0) return k; } return e[e.length - 1][0]; };
const entre = (r, a, b) => a + Math.floor(r() * (b - a + 1));

const PLANTEL = ['sr', 'eo', 'mv', 'rs', 'me', 'ic', 'jm', 'bt', 'lp', 'jg', 'nico', 'rodrigo', 'mau'];
const NUEVOS = ['nico', 'rodrigo', 'mau']; // no fueron a los 6 primeros; 'rodrigo' no tiene pesos: va y no hace jugadas
// a quién le lanzan, quién atrapa mejor, quién corre y quién defiende (pesos, no porcentajes)
const BLANCO = {me: 30, rs: 26, eo: 22, mv: 14, jg: 5, lp: 3, nico: 14}, MANOS = {me: .72, rs: .68, eo: .55, mv: .62, jg: .5, lp: .5, nico: .6};
const CORRE = {mv: 55, eo: 20, me: 10}, BANDERA = {bt: 26, lp: 22, jm: 18, jg: 14, ic: 12, me: 3, rs: 3, eo: 2, mau: 14, nico: 3};
const TAPA = {bt: 34, jg: 28, jm: 24, lp: 10, ic: 4, mau: 10}, SACK = {ic: 60, lp: 25, jm: 15};

// Guion: cada serie es [lado, fin, extra]. lado A = atacamos, D = defendemos.
// fin nuestro: T touchdown, I intercepción lanzada, D se acabaron las oportunidades, R se acabó el tiempo.
// fin del rival: t touchdown, i intercepción nuestra, d los frenamos, r se acabó el tiempo.
// c = conversión [de cuánto, entró, quién la anotó o quién la tapó]; corta = serie que empieza cerca por una intercepción.
const T = (q, c, v = 'pase') => ['A', 'T', {q, v, c}];
const PARTIDOS = [
  {id: 'g1', rival: 'kaffies', fecha: '2026-10-05', real: true, falta: [...NUEVOS], qb: 'sr', semilla: 11, mitades: [
    [['A', 'D'], ['D', 't', {c: [1, 1]}], T('rs', [1, 1, 'eo']), ['D', 'd'], ['A', 'I'], ['D', 't', {c: [1, 1], corta: 1}], ['A', 'R']],
    [['D', 'd'], T('me', [1, 0]), ['D', 't', {c: [2, 0]}], ['A', 'D'], ['D', 'd'], ['A', 'I'], ['D', 'r']]]},
  {id: 'g2', rival: 'only-fins', fecha: '2026-10-12', real: true, falta: [...NUEVOS], qb: 'sr', semilla: 23, mitades: [
    [['D', 'd'], T('me', [1, 1, 'rs']), ['D', 'i', {q: 'bt'}], ['A', 'D'], ['D', 'd'], ['A', 'I'], ['D', 't', {c: [2, 1], corta: 1}], ['A', 'R']],
    [['A', 'D'], ['D', 'd'], T('eo', [1, 1, 'mv']), ['D', 'i', {q: 'jg'}], ['A', 'D'], ['D', 'd'], ['A', 'R']]]},
  {id: 'g3', rival: 'ultimos-aztecas', fecha: '2026-10-19', real: true, falta: [...NUEVOS], qb: 'sr', semilla: 37, mitades: [
    [T('me', [1, 1, 'me']), ['D', 't', {c: [1, 1]}], ['A', 'D'], ['D', 't', {c: [1, 1]}], T('rs', [1, 1, 'rs']), ['D', 'd'], ['A', 'R']],
    [['D', 'i', {q: 'jg'}], T('mv', [1, 1, 'eo'], 'corrida'), ['D', 'd'], ['A', 'D'], ['D', 't', {c: [2, 0, 'jg']}], ['A', 'R']]]},
  {id: 'g4', rival: 'bulldogs', fecha: '2026-10-26', real: false, falta: ['jm', ...NUEVOS], qb: 'sr', semilla: 41, mitades: [
    [['D', 'd'], T('eo', [1, 1, 'rs']), ['D', 't', {c: [1, 0]}], T('me', [1, 0]), ['D', 'i', {q: 'bt', td: 1, c: [1, 1, 'eo']}], ['D', 'd'], ['A', 'D'], ['D', 'r']],
    [T('mv', [2, 0], 'corrida'), ['D', 'd'], ['A', 'D'], ['D', 't', {c: [2, 0]}], ['A', 'I'], ['D', 'd'], ['A', 'R']]]},
  {id: 'g5', rival: 'lobos-its', fecha: '2026-11-02', real: false, falta: ['sr', ...NUEVOS], qb: 'mv', semilla: 59, mitades: [
    [['A', 'I'], ['D', 't', {c: [1, 1], corta: 1}], ['A', 'D'], ['D', 'd'], T('rs', [1, 0]), ['D', 't', {c: [1, 0]}], ['A', 'R']],
    [['D', 'd'], ['A', 'D'], ['D', 't', {c: [2, 0]}], T('me', [2, 0]), ['D', 'd'], ['A', 'I'], ['D', 'r']]]},
  {id: 'g6', rival: 'destroyers', fecha: '2026-11-09', real: false, falta: ['jg', ...NUEVOS], qb: 'sr', semilla: 67, mitades: [
    [['D', 't', {c: [1, 1]}], T('me', [1, 1, 'eo']), ['D', 'd'], T('rs', [1, 1, 'me']), ['D', 'd'], ['A', 'D'], ['D', 'r']],
    [['A', 'D'], ['D', 't', {c: [1, 0]}], T('eo', [1, 0]), ['D', 'i', {q: 'jm'}], ['A', 'D'], ['D', 'd'], ['A', 'R']]]},
  // ---- los casos raros ----
  {id: 'g7', rival: 'triple-t', fecha: '2026-11-16', real: false, falta: ['rodrigo'], qb: 'sr', semilla: 73, mitades: [ // empate
    [T('me', [1, 1, 'nico']), ['D', 't', {c: [1, 1]}], ['A', 'D'], ['D', 'd'], T('nico', [1, 0]), ['D', 't', {c: [1, 0]}], ['A', 'R']],
    [['D', 'd'], ['A', 'I'], ['D', 't', {c: [1, 1], corta: 1}], T('rs', [1, 1, 'me']), ['D', 'd'], ['A', 'D'], ['D', 'r']]]},
  {id: 'g8', rival: 'bucaneros', fecha: '2026-11-23', real: false, falta: ['rodrigo', 'ic'], qb: 'sr', semilla: 79, mitades: [ // solo se marcó la 1ª mitad
    [['D', 't', {c: [1, 0]}], T('eo', [1, 1, 'me']), ['D', 'd'], ['A', 'D'], ['D', 'r']]]},
  {id: 'g9', rival: 'panini', fecha: '2026-11-30', real: false, falta: ['me'], qb: 'sr', semilla: 83, mitades: [ // paliza en contra; Rodrigo F. va y no hace jugadas
    [['A', 'I'], ['D', 't', {c: [1, 1], corta: 1}], ['A', 'D'], ['D', 't', {c: [2, 1]}], ['A', 'D'], ['D', 'd'], ['A', 'R']],
    [['D', 't', {c: [1, 0]}], T('nico', [2, 0]), ['D', 't', {c: [1, 0]}], ['A', 'I'], ['D', 'd'], ['A', 'D'], ['D', 'r']]]},
  {id: 'g10', rival: 'kickass', fecha: '2026-12-07', real: false, falta: ['rodrigo'], qb: 'sr', semilla: 89, mitades: [ // paliza a favor
    [T('me', [1, 1, 'rs']), ['D', 'd'], T('eo', [1, 1, 'me']), ['D', 'i', {q: 'mau'}], ['A', 'D'], ['D', 'd'], T('mv', [1, 0], 'corrida'), ['D', 'r']],
    [['D', 't', {c: [1, 1]}], ['A', 'D'], ['D', 'd'], T('rs', [1, 1, 'nico']), ['D', 'i', {q: 'bt'}], ['A', 'R']]]},
];
const MARCADOR = {g1: [13, 20], g2: [14, 8], g3: [21, 20], g4: [26, 12], g5: [12, 19], g6: [20, 13], g7: [20, 20], g8: [7, 6], g9: [6, 27], g10: [27, 7]};

// cuántas jugadas trae la serie y en cuál se cruzó media cancha (k; 0 = no se cruzó antes del final)
function forma(r, fin) {
  if (fin === 'T') { const n = +escoge(r, {2: 1, 3: 3, 4: 4, 5: 4, 6: 3, 7: 1}); const k = n >= 5 ? entre(r, Math.max(1, n - 4), 4) : (r() < .3 ? 0 : entre(r, 1, n - 1)); return [n, k]; }
  if (fin === 'D') { if (r() < .62) return [4, 0]; const k = entre(r, 1, 4); return [k + 4, k]; }
  if (fin === 'I') { const n = +escoge(r, {1: 2, 2: 3, 3: 3, 4: 2, 5: 1, 6: 1}); const k = n >= 5 ? entre(r, Math.max(1, n - 4), 4) : (r() < .6 || n === 1 ? 0 : entre(r, 1, n - 1)); return [n, k]; }
  return [entre(r, 1, 4), 0]; // se acabó el tiempo
}

function partido(g) {
  const r = azar(g.semilla), van = PLANTEL.filter((p) => !g.falta.includes(p)), filas = [];
  const quita = (pesos, fuera = []) => Object.fromEntries(Object.entries(pesos).filter(([k]) => van.includes(k) && !fuera.includes(k)));
  let t = 0, n = 0, serie = 0, nos = 0, ellos = 0;
  const pon = (f) => { n++; filas.push({g: g.id, n, t: Math.round(t), ...f}); };
  // con otro QB se completan menos pases (partido sin Santiago)
  const pBuena = g.qb === 'sr' ? .58 : .46;
  g.mitades.forEach((series, mi) => {
    const m = mi + 1; if (mi) t += 120 + r() * 30;
    for (const [l, fin, x = {}] of series) {
      serie++; const F = fin.toUpperCase(), [nj, k] = forma(r, F), base = {m, s: serie, l};
      const cast = r() < .17 ? entre(r, 1, nj) : 0; // en qué jugada cae un castigo (0 = ninguno)
      for (let i = 1; i <= nj; i++) {
        t += 26 + r() * 12;
        if (i === cast) { pon({...base, tipo: 'castigo', a: r() < .5 ? 'favor' : 'contra'}); t += 15 + r() * 8; }
        const d = k && i > k ? i - k : i, ult = i === nj, pr = i === k ? 1 : 0;
        // ¿fue buena para quien ataca? La que cruza media cancha y la del TD sí; la última de una serie que muere en downs, no
        const buena = pr || (ult && F === 'T') ? true : (ult && F === 'D') ? false : r() < (l === 'A' ? pBuena : .5);
        if (l === 'A') {
          if (ult && F === 'T') { pon({...base, d, tipo: x.v, q: x.q, qb: x.v === 'pase' ? g.qb : undefined, td: 1}); nos += 6; }
          else if (ult && F === 'I') pon({...base, d, tipo: 'int', q: g.qb, qb: g.qb});
          else if (buena) {
            if (r() < .82) { const b = quita(BLANCO, [g.qb]); Object.keys(b).forEach((p) => { b[p] *= MANOS[p]; }); pon({...base, d, tipo: 'pase', q: escoge(r, b), qb: g.qb, pr}); }
            else pon({...base, d, tipo: 'corrida', q: escoge(r, quita(CORRE, [g.qb])), pr});
          } else if (r() < .76) { const b = quita(BLANCO, [g.qb]); Object.keys(b).forEach((p) => { b[p] *= 1 - MANOS[p]; }); pon({...base, d, tipo: 'incompleto', q: escoge(r, b), qb: g.qb}); }
          else pon({...base, d, tipo: 'parada', q: r() < .6 ? g.qb : escoge(r, quita(CORRE, [g.qb]))});
        } else {
          if (ult && F === 'T') { pon({...base, d, tipo: 'tdr', td: 1}); ellos += 6; }
          else if (ult && F === 'I') { pon({...base, d, tipo: 'intn', q: x.q, td: x.td}); if (x.td) nos += 6; }
          else if (buena) pon({...base, d, tipo: 'bandera', q: escoge(r, quita(BANDERA)), pr});
          else if (r() < .86) pon({...base, d, tipo: 'tapado', q: r() < .55 ? escoge(r, quita(TAPA)) : undefined});
          else pon({...base, d, tipo: 'sack', q: escoge(r, quita(SACK))});
        }
      }
      if (x.c) { // conversión: la nuestra va en la serie que anotó (también tras un TD de la defensa)
        const [pts, ok, q] = x.c, nuestra = l === 'A' || x.td; t += 20 + r() * 8;
        pon({...base, l: nuestra ? 'A' : 'D', tipo: 'conv', pts, ok, q, qb: nuestra && ok ? g.qb : undefined, def: l === 'D' && x.td ? 1 : undefined});
        if (ok) { if (nuestra) nos += pts; else ellos += pts; }
      }
      if (x.corta) filas.filter((f) => f.s === serie).forEach((f) => { f.corta = 1; });
      t += 12 + r() * 6;
    }
  });
  const [a, b] = MARCADOR[g.id];
  if (nos !== a || ellos !== b) throw new Error(`${g.id}: el guion da ${nos}-${ellos} y debe dar ${a}-${b}`);
  return {id: g.id, rival: g.rival, fecha: g.fecha, real: g.real, incompleto: g.incompleto, van, nos, ellos, filas};
}

const juegos = PARTIDOS.map(partido);
// fuera lo vacío, para que pese menos
const limpia = (f) => Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== undefined && !(v === 0 && k !== 'ok')));
const datos = {juegos: juegos.map(({filas, ...j}) => j), filas: juegos.flatMap((j) => j.filas.map(limpia))};
writeFileSync(new URL('./datos.json', import.meta.url), JSON.stringify(datos));

// resumen para revisar que la temporada se vea creíble
for (const j of juegos) {
  const A = j.filas.filter((f) => f.l === 'A' && f.tipo !== 'castigo' && f.tipo !== 'conv'), D = j.filas.filter((f) => f.l === 'D' && f.tipo !== 'castigo' && f.tipo !== 'conv');
  const c = (l, ...t) => l.filter((f) => t.includes(f.tipo)).length;
  const comp = c(A, 'pase'), att = comp + c(A, 'incompleto', 'int');
  console.log(`${j.id} ${j.rival.padEnd(16)} ${j.nos}-${j.ellos}  ataque ${A.length} jug · pases ${comp}/${att} (${Math.round(comp / att * 100)}%) · corridas ${c(A, 'corrida')} · paradas ${c(A, 'parada')} · INT ${c(A, 'int')}  |  defensa ${D.length} jug · banderas ${c(D, 'bandera')} · tapados ${c(D, 'tapado')} · sacks ${c(D, 'sack')} · INT ${c(D, 'intn')}  |  castigos ${j.filas.filter((f) => f.tipo === 'castigo').length} · dura ${Math.round(j.filas[j.filas.length - 1].t / 60)} min · van ${j.van.length}`);
}
console.log(`${datos.filas.length} filas, ${JSON.stringify(datos).length} bytes`);
