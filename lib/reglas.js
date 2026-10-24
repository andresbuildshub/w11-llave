// Reglas de Llave: funciones puras, sin red, sin estado. Probadas en test/reglas.test.mjs.
// Todo lo que decide qué se publica vive aquí, para que se pueda auditar en un solo archivo.

export const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

// "SUMINISTRO DE 07:00 AM A 11:00 AM" -> { inicio: 420, fin: 660, horas: 4 }
export function parseHorario(h) {
  const m = [...String(h || '').toUpperCase().matchAll(/(\d{1,2}):(\d{2}) ?([AP])M/g)];
  if (m.length < 2) return null;
  const t = m.slice(0, 2).map(([, hh, mm, p]) => ((+hh % 12) + (p === 'P' ? 12 : 0)) * 60 + +mm);
  const dur = (t[1] - t[0] + 1440) % 1440 || 1440;
  return { inicio: t[0], fin: t[1], horas: Math.round((dur / 60) * 10) / 10 };
}

export function tipoSuministro(r) {
  const h = String(r.horario || '').toUpperCase();
  if (r.fuente === 'PIPAS') return 'pipas';
  if (h.includes('CONTINUO')) return 'continuo';
  if (!h) return 'sin_horario';
  if (DIAS.some((d) => h.includes(d))) return 'ventana_dias';
  return 'ventana_diaria';
}

// Elegibilidad del sensor #1. Criterio fijado el 2026-10-23, ANTES de tener la serie:
// estructural si atípica en >=75% de los días (>=21 de 28); temporal si <25%; intermitente en medio.
// Con menos de 28 días: PENDIENTE (no se adelanta el veredicto).
export const CRITERIO_ATIPICAS = { dias: 28, estructural: 0.75, temporal: 0.25, fijado: '2026-10-23', decision: '2026-11-19' };
export function elegibilidad(diasPull, diasAtip, c = CRITERIO_ATIPICAS) {
  if (diasPull < c.dias) return { estado: 'pendiente', texto: `Pendiente: ${diasAtip} de ${diasPull} días con condición atípica` };
  const f = diasAtip / diasPull;
  if (f >= c.estructural) return { estado: 'estructural', texto: `Estructural: atípica ${diasAtip} de ${diasPull} días` };
  if (f < c.temporal) return { estado: 'temporal', texto: `Temporal: atípica ${diasAtip} de ${diasPull} días` };
  return { estado: 'intermitente', texto: `Intermitente: atípica ${diasAtip} de ${diasPull} días (esperar 8 semanas)` };
}

// --- Sensor de presión (tonto): escalón sobre línea base con histéresis ---
// serie: lecturas por minuto (kPa). Devuelve eventos {t, evento:'llegó'|'se fue'}.
// "llegó" solo si la presión pasa el umbral sostenida >= minMin minutos; "se fue" igual hacia abajo.
export function detectar(serie, { base = 0, umbral = 4, minMin = 2 } = {}) {
  const ev = [];
  let agua = false, racha = 0;
  for (let t = 0; t < serie.length; t++) {
    const arriba = serie[t] - base >= umbral;
    if (arriba !== agua) {
      racha++;
      if (racha >= minMin) {
        agua = arriba;
        ev.push({ t: t - minMin + 1, evento: agua ? 'llegó' : 'se fue' });
        racha = 0;
      }
    } else racha = 0;
  }
  return ev;
}

export const redondear5 = (min) => Math.round(min / 5) * 5;

// Minutos con agua a partir de eventos (una noche/día).
export function minutosConAgua(ev, total) {
  let m = 0, desde = null;
  for (const e of ev) {
    if (e.evento === 'llegó') desde = e.t;
    else if (desde !== null) { m += e.t - desde; desde = null; }
  }
  if (desde !== null) m += total - desde;
  return m;
}

// Quórum: SOLO para despertar a otros. La medición de una casa cuenta para ella sin confirmación.
// llegadas: [{token, t}] ; devuelve el minuto en que >=k tokens distintos coinciden en una ventana, o null.
export function quorum(llegadas, { k = 2, ventana = 30 } = {}) {
  const s = [...llegadas].sort((a, b) => a.t - b.t);
  for (let i = 0; i < s.length; i++) {
    const toks = new Set();
    for (let j = i; j < s.length && s[j].t - s[i].t <= ventana; j++) {
      toks.add(s[j].token);
      if (toks.size >= k) return s[j].t;
    }
  }
  return null;
}

// Publicación semanal por circuito: nunca una cifra por casa.
// aparatos: [{minutos, cobertura}] (cobertura 0..1, redondeada a 10% en el aparato)
export const PUBLICACION = { minAnfitriones: 5, minCobertura: 0.9 };
export function publicar(aparatos, p = PUBLICACION) {
  const validos = aparatos.filter((a) => a.cobertura >= p.minCobertura).map((a) => a.minutos).sort((a, b) => a - b);
  if (validos.length < p.minAnfitriones)
    return { estado: 'sin datos suficientes', n: validos.length, excluidos: aparatos.length - validos.length };
  const blk = (m) => Math.round(m / 15) * 15; // bloques de 15 min
  const med = validos.length % 2 ? validos[(validos.length - 1) / 2] : (validos[validos.length / 2 - 1] + validos[validos.length / 2]) / 2;
  return { estado: 'publicado', n: validos.length, excluidos: aparatos.length - validos.length, min: blk(validos[0]), mediana: blk(med), max: blk(validos[validos.length - 1]) };
}

// Revisión dosis–respuesta contra el sitio neutral (solo cuando hay dinero en juego, 14+ noches).
// noches: [{neutralMin, neutralCargaM}] ; casa: minutos por noche. S = máx. "minutos fuertes" del neutral
// (carga >= umbralM) en noches en que la casa marcó cero. Bandera si S > limite.
// limite: debe ser MAYOR que el retraso máximo plausible de la casa del final de la línea (aquí 150 min, supuesto).
// Con 240 (el valor de las simulaciones de la pelea, noches de 3–6 h) nunca se atrapa a nadie en ventanas reales de
// 4–5 h; con 90 se marca a 6% de casas del final de la línea. Calibración: 200 circuitos simulados con ventana 07–11.
export const DOSIS = { minNoches: 14, umbralM: 10, limite: 150 };
export function dosisRespuesta(noches, casa, d = DOSIS) {
  if (noches.length < d.minNoches) return { estado: 'pocas noches', S: null, bandera: false };
  let S = 0;
  noches.forEach((n, i) => { if (casa[i] === 0) S = Math.max(S, n.neutralCargaM >= d.umbralM ? n.neutralMin : 0); });
  return { estado: 'evaluado', S, bandera: S > d.limite };
}
