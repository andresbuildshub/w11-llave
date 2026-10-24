import { simular } from '../lib/simulador.js'
import { dosisRespuesta } from '../lib/reglas.js'
// real windows: 4h starting 07:00 and 5h; 200 seeds; vary limit
for (const lim of [90, 120, 150, 180, 240]) {
  let eolFlag = 0, cheatCaught = 0, n = 0
  for (let seed = 1; seed <= 200; seed++) {
    const s = simular({ circuitos: [{ clave: 'A', inicio: 420, horas: 4, casas: 6 }], dias: 14, semilla: seed })
    const ids = s.aparatos.map((a) => a.id), iN = ids.indexOf('A-N')
    const min = s.dias.map((d) => d.porAparato.map((p) => p.minutos))
    const noches = s.dias.map((d, i) => ({ neutralMin: min[i][iN], neutralCargaM: d.red[0].cargaM || 0 }))
    const eol = dosisRespuesta(noches, min.map((m) => m[ids.indexOf('A-6')]), { minNoches: 14, umbralM: 10, limite: lim })
    const buenas = s.dias.map((d, i) => ({ i, f: d.red[0].entrega ? d.red[0].cargaM * d.red[0].dur : 0 })).sort((a, b) => b.f - a.f).slice(0, 4).map((x) => x.i)
    const cheat = min.map((m, i) => (buenas.includes(i) ? 0 : m[ids.indexOf('A-3')]))
    const ch = dosisRespuesta(noches, cheat, { minNoches: 14, umbralM: 10, limite: lim })
    eolFlag += eol.bandera; cheatCaught += ch.bandera; n++
  }
  console.log(`limite ${lim} min: final de línea marcado ${(100 * eolFlag / n).toFixed(1)}% · tramposo atrapado ${(100 * cheatCaught / n).toFixed(1)}%`)
}
