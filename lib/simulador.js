// SIMULADOR de la demo /circuito. Nada de esto es medición: son aparatos inventados con física simple,
// anclados al horario REAL que publica SEGIAGUA para las colonias elegidas. Se etiqueta SIMULADO en pantalla.
import { rng } from './circuito.js';
import { detectar, minutosConAgua, redondear5 } from './reglas.js';

// Un circuito = colonia real + su ventana publicada. Cada día: la red entrega o no (fallas independientes por
// circuito), con retraso y duración variables, y una carga (m de columna) que puede ser débil.
// Casas: necesitan cierta carga para recibir (las del final de la línea necesitan más) y tienen retraso propio.
export function simular({ circuitos, dias = 14, semilla = 11, pFalla = 0.15 }) {
  const R = rng(semilla);
  const u = (a, b) => a + (b - a) * R();
  const aparatos = []; // {id, circuito, rol, necesitaM, retraso, cobertura}
  circuitos.forEach((c, ci) => {
    for (let k = 0; k < c.casas; k++)
      aparatos.push({ id: `${c.clave}-${k + 1}`, circuito: ci, rol: k === c.casas - 1 ? 'final de línea' : 'casa',
        necesitaM: k === c.casas - 1 ? u(5, 8) : u(1.5, 3), retraso: k === c.casas - 1 ? Math.round(u(60, 120)) : Math.round(u(0, 25)),
        apagonDia: k === 1 ? Math.floor(u(0, dias)) : -1 });
    aparatos.push({ id: `${c.clave}-N`, circuito: ci, rol: 'sitio neutral', necesitaM: 1, retraso: 0, apagonDia: -1 });
  });
  const diasOut = [];
  for (let d = 0; d < dias; d++) {
    const red = circuitos.map((c) => {
      const r = R();
      if (r < pFalla) return { entrega: false };
      const debil = r < pFalla + 0.25;
      return { entrega: true, inicio: c.inicio + Math.round(u(0, 90)), dur: Math.round(c.horas * 60 * u(0.45, 1)), cargaM: debil ? u(2.5, 6) : u(10, 18) };
    });
    const porAparato = aparatos.map((a) => {
      const n = red[a.circuito];
      const serie = new Float32Array(1440).fill(0);
      let vivo = 1440;
      if (n.entrega && n.cargaM >= a.necesitaM) {
        const ini = n.inicio + a.retraso, fin = n.inicio + n.dur;
        const kpa = (n.cargaM - a.necesitaM + 1) * 9.8;
        for (let t = ini; t < Math.min(fin, 1440); t++) serie[t] = kpa;
      }
      for (let t = 0; t < 1440; t++) serie[t] += u(-0.6, 0.6); // ruido del transductor (kPa), SIMULADO
      if (a.apagonDia === d) { for (let t = 0; t < 1440; t++) if (t > 300 && t < 700) serie[t] = NaN; vivo = 1440 - 400; }
      const limpia = Array.from(serie, (x) => (Number.isNaN(x) ? 0 : x));
      const ev = detectar(limpia, { umbral: 4, minMin: 2 });
      const minutos = minutosConAgua(ev, 1440);
      return { id: a.id, eventos: ev.map((e) => ({ ...e, hora: redondear5(e.t) })), minutos, cobertura: Math.round((vivo / 1440) * 10) / 10 };
    });
    diasOut.push({ dia: d + 1, red, porAparato });
  }
  return { aparatos, dias: diasOut };
}
