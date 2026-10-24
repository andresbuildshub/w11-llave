import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHorario, tipoSuministro, elegibilidad, detectar, minutosConAgua, quorum, publicar, dosisRespuesta } from '../lib/reglas.js';
import { similitud, aglomerativo, ari, rng } from '../lib/circuito.js';
import { simular } from '../lib/simulador.js';
import { norm } from '../lib/nombres.js';

test('horario: ventanas reales del API', () => {
  assert.deepEqual(parseHorario('SUMINISTRO DE 07:00 AM A 11:00 AM'), { inicio: 420, fin: 660, horas: 4 });
  assert.equal(parseHorario('SUMINISTRO DE 07:00 AM A 07:00 PM').horas, 12);
  assert.equal(parseHorario('SUMINISTRO DE 5:00 AM A 11:00 AM').horas, 6);
  assert.equal(parseHorario('SUMINISTRO DE 04:00 AM A 00:00 AM').horas, 20);
  assert.equal(parseHorario('SUMINISTRO CONTINUO'), null);
});

test('tipo de suministro', () => {
  assert.equal(tipoSuministro({ horario: 'SUMINISTRO CONTINUO', fuente: 'PIPAS' }), 'pipas');
  assert.equal(tipoSuministro({ horario: 'SUMINISTRO CONTINUO' }), 'continuo');
  assert.equal(tipoSuministro({ horario: null }), 'sin_horario');
  assert.equal(tipoSuministro({ horario: 'SUMINISTRO LUNES DE 07:00 AM A 07:00 PM' }), 'ventana_dias');
  assert.equal(tipoSuministro({ horario: 'SUMINISTRO DE 07:00 AM A 11:00 AM' }), 'ventana_diaria');
});

test('elegibilidad: criterio fijado antes de los datos', () => {
  assert.equal(elegibilidad(1, 1).estado, 'pendiente');
  assert.equal(elegibilidad(28, 21).estado, 'estructural');
  assert.equal(elegibilidad(28, 6).estado, 'temporal');
  assert.equal(elegibilidad(28, 14).estado, 'intermitente');
});

test('detección: escalón con histéresis ignora picos de 1 min', () => {
  const s = Array(120).fill(0);
  s[10] = 20; // pico de 1 minuto (abrir y cerrar otra salida de la Y)
  for (let t = 30; t < 90; t++) s[t] = 20;
  const ev = detectar(s, { umbral: 4, minMin: 2 });
  assert.deepEqual(ev.map((e) => e.evento), ['llegó', 'se fue']);
  assert.equal(ev[0].t, 30);
  assert.equal(minutosConAgua(ev, 120), 60);
});

test('quórum: un solo aparato no despierta a nadie', () => {
  assert.equal(quorum([{ token: 'a', t: 10 }, { token: 'a', t: 12 }]), null);
  assert.equal(quorum([{ token: 'a', t: 10 }, { token: 'b', t: 35 }]), 35);
  assert.equal(quorum([{ token: 'a', t: 10 }, { token: 'b', t: 50 }]), null);
});

test('publicación: menos de 5 válidos = sin datos; nunca 0h falso por aparato apagado', () => {
  const r = publicar([{ minutos: 0, cobertura: 0.7 }, { minutos: 100, cobertura: 1 }, { minutos: 120, cobertura: 1 }, { minutos: 150, cobertura: 1 }, { minutos: 160, cobertura: 1 }]);
  assert.equal(r.estado, 'sin datos suficientes');
  const ok = publicar([{ minutos: 0, cobertura: 0.7 }, ...[100, 120, 150, 160, 200].map((m) => ({ minutos: m, cobertura: 1 }))]);
  assert.equal(ok.estado, 'publicado');
  assert.equal(ok.min, 105); // 100 → bloque de 15 min; el aparato apagado (0 min) NO es el mínimo
  assert.equal(ok.excluidos, 1);
});

test('dosis–respuesta: noche larga y débil no acusa a la casa del final', () => {
  const noches = Array.from({ length: 14 }, (_, i) => (i % 2 ? { neutralMin: 300, neutralCargaM: 4 } : { neutralMin: 300, neutralCargaM: 15 }));
  const finalDeLinea = noches.map((n) => (n.neutralCargaM < 6 ? 0 : 200));
  assert.equal(dosisRespuesta(noches, finalDeLinea).bandera, false);
  const tramposo = noches.map((n, i) => (i === 0 ? 0 : 280));
  assert.equal(dosisRespuesta(noches, tramposo).bandera, true);
  assert.equal(dosisRespuesta(noches.slice(0, 7), tramposo).estado, 'pocas noches');
});

test('circuito: co-llegadas recuperan 2 circuitos (ARI alto)', () => {
  const R = rng(3), ev = [], verdad = [];
  for (let c = 0; c < 2; c++) for (let k = 0; k < 5; k++) { ev.push([]); verdad.push(c); }
  for (let n = 0; n < 14; n++)
    for (let c = 0; c < 2; c++) {
      if (R() < 0.3) continue;
      const t0 = Math.floor(R() * 1440);
      for (let h = 0; h < 10; h++) if (verdad[h] === c && R() < 0.85) ev[h].push({ noche: n, t: t0 + Math.floor(R() * 20) });
    }
  const lab = aglomerativo(similitud(ev, 60), 0.5);
  assert.ok(ari(verdad, lab) > 0.8, 'ARI ' + ari(verdad, lab));
});

test('simulador: determinista y sin cifras por casa en la publicación', () => {
  const a = simular({ circuitos: [{ clave: 'C1', inicio: 420, horas: 4, casas: 6 }], dias: 3, semilla: 5 });
  const b = simular({ circuitos: [{ clave: 'C1', inicio: 420, horas: 4, casas: 6 }], dias: 3, semilla: 5 });
  assert.deepEqual(a.dias[0].porAparato.map((x) => x.minutos), b.dias[0].porAparato.map((x) => x.minutos));
  assert.ok(a.dias.every((d) => d.porAparato.every((x) => x.eventos.every((e) => e.hora % 5 === 0))));
});

test('nombres: normalizador no colapsa secciones', () => {
  assert.notEqual(norm('LEYES DE REFORMA 1A SECCIÓN'), norm('LEYES DE REFORMA 2A SECCIÓN'));
  assert.equal(norm('Col. Ampl. Veracruzana'), 'AMPLIACION VERACRUZANA');
  assert.equal(norm('U. H. El Salado'), 'UNIDAD HABITACIONAL EL SALADO');
});
