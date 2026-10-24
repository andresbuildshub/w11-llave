import { simular } from '../lib/simulador.js'
import { similitud, aglomerativo, ari } from '../lib/circuito.js'
for (const pF of [0.15, 0.3, 0.5]) for (const dias of [14, 28]) {
  let A = [], N = 60
  for (let seed = 1; seed <= N; seed++) {
    const s = simular({ circuitos: [{ clave: 'A', inicio: 420, horas: 4, casas: 6 }, { clave: 'B', inicio: 420, horas: 5, casas: 6 }], dias, semilla: seed, pFalla: pF })
    const ids = s.aparatos.map((a) => a.id), casas = s.aparatos.filter((a) => a.rol !== 'sitio neutral')
    const ev = casas.map((a) => s.dias.flatMap((d, n) => d.porAparato[ids.indexOf(a.id)].eventos.filter((e) => e.evento === 'llegó').map((e) => ({ noche: n, t: e.hora }))))
    A.push(ari(casas.map((a) => a.circuito), aglomerativo(similitud(ev, 60), 0.5)))
  }
  A.sort((a, b) => a - b)
  console.log(`fallas ${pF} · ${dias} días: ARI mediana ${A[N / 2].toFixed(2)} · p10 ${A[6].toFixed(2)} · p90 ${A[54].toFixed(2)}`)
}
