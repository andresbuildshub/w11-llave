// ML del producto: aprender el circuito de válvulas a partir de co-llegadas (sin plano de SEGIAGUA).
// Similitud(i,j) = noches en que i y j "llegan juntos" (<= ventana min) / noches en que cualquiera disparó.
// Clustering aglomerativo, enlace promedio, corte fijo. Lo que se guarda por par es un CONTADOR, sin fechas.

export function similitud(eventos, ventana = 60) {
  // eventos[h] = [{noche, t}]
  const H = eventos.length;
  const S = Array.from({ length: H }, () => Array(H).fill(0));
  for (let i = 0; i < H; i++)
    for (let j = i + 1; j < H; j++) {
      let co = 0;
      for (const a of eventos[i]) for (const b of eventos[j]) if (a.noche === b.noche && Math.abs(a.t - b.t) <= ventana) co++;
      const noches = new Set([...eventos[i], ...eventos[j]].map((e) => e.noche)).size;
      S[i][j] = S[j][i] = noches ? co / noches : 0;
    }
  return S;
}

export function aglomerativo(S, corte = 0.5) {
  let cl = S.map((_, i) => [i]);
  for (;;) {
    let best = null;
    for (let a = 0; a < cl.length; a++)
      for (let b = a + 1; b < cl.length; b++) {
        let s = 0;
        for (const i of cl[a]) for (const j of cl[b]) s += S[i][j];
        s /= cl[a].length * cl[b].length;
        if (!best || s > best.s) best = { s, a, b };
      }
    if (!best || best.s < corte) break;
    cl[best.a] = cl[best.a].concat(cl[best.b]);
    cl.splice(best.b, 1);
  }
  const lab = Array(S.length).fill(0);
  cl.forEach((c, k) => c.forEach((i) => (lab[i] = k)));
  return lab;
}

export function ari(a, b) {
  const comb = (n) => (n * (n - 1)) / 2;
  const cont = new Map(), sa = new Map(), sb = new Map();
  a.forEach((x, i) => {
    const k = x + '|' + b[i];
    cont.set(k, (cont.get(k) || 0) + 1);
    sa.set(x, (sa.get(x) || 0) + 1);
    sb.set(b[i], (sb.get(b[i]) || 0) + 1);
  });
  const idx = [...cont.values()].reduce((s, v) => s + comb(v), 0);
  const ia = [...sa.values()].reduce((s, v) => s + comb(v), 0);
  const ib = [...sb.values()].reduce((s, v) => s + comb(v), 0);
  const exp = (ia * ib) / comb(a.length), mx = (ia + ib) / 2;
  return mx === exp ? 1 : (idx - exp) / (mx - exp);
}

// Generador SIMULADO y determinista (semilla) para la demo.
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
