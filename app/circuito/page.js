'use client'
import { useEffect, useMemo, useState } from 'react'
import { simular } from '../../lib/simulador.js'
import { publicar, quorum, dosisRespuesta, parseHorario, PUBLICACION, DOSIS } from '../../lib/reglas.js'
import { similitud, aglomerativo, ari } from '../../lib/circuito.js'

const hhmm = (m) => (m == null ? '—' : `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
const hm = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`

function elegirColonias(rows) {
  const iz = rows.filter((r) => r.alc === 'IZTAPALAPA' && r.tipo === 'ventana_diaria' && r.horas && r.horas <= 5 && r.lat)
  iz.sort((a, b) => a.col.localeCompare(b.col))
  const a = iz[0]
  const b = iz.filter((r) => r.id !== a.id).sort((x, y) => (x.lat - a.lat) ** 2 + (x.lon - a.lon) ** 2 - ((y.lat - a.lat) ** 2 + (y.lon - a.lon) ** 2))[0]
  return [a, b]
}

export default function Circuito() {
  const [rows, setRows] = useState(null)
  const [tramposo, setTramposo] = useState(false)
  const [casa, setCasa] = useState('A-2')
  const [pFalla, setPFalla] = useState(0.3)
  useEffect(() => { fetch('/data/colonias.json').then((r) => r.json()).then((d) => setRows(d.rows)) }, [])

  const sim = useMemo(() => {
    if (!rows) return null
    const [ca, cb] = elegirColonias(rows)
    const ha = parseHorario(ca.horario), hb = parseHorario(cb.horario)
    const s = simular({ circuitos: [{ clave: 'A', inicio: ha.inicio, horas: ha.horas, casas: 6 }, { clave: 'B', inicio: hb.inicio, horas: hb.horas, casas: 6 }], dias: 14, semilla: 11, pFalla })
    return { ca, cb, ha, hb, s }
  }, [rows, pFalla])

  const out = useMemo(() => {
    if (!sim) return null
    const { s } = sim
    const ids = s.aparatos.map((a) => a.id)
    // minutos por aparato y día (con la "llave cerrada" del tramposo si está activada: A-3 cierra 4 noches con buena entrega)
    const minutos = s.dias.map((d) => d.porAparato.map((p) => p.minutos))
    // las 4 noches con la entrega más fuerte del circuito A (las "buenas"): ahí cerrar la llave es trampa visible
    const buenas = s.dias.map((d, i) => ({ i, f: d.red[0].entrega ? d.red[0].cargaM * d.red[0].dur : 0 })).sort((a, b) => b.f - a.f).slice(0, 4).map((x) => x.i)
    if (tramposo) buenas.forEach((dia) => { minutos[dia][ids.indexOf('A-3')] = 0 })
    // ML: eventos "llegó" por aparato -> similitud -> circuitos aprendidos (sin neutrales: ellos son control)
    const casas = s.aparatos.filter((a) => a.rol !== 'sitio neutral')
    const ev = casas.map((a) => s.dias.flatMap((d, n) => {
      if (tramposo && a.id === 'A-3' && buenas.includes(n)) return []
      return d.porAparato[ids.indexOf(a.id)].eventos.filter((e) => e.evento === 'llegó').map((e) => ({ noche: n, t: e.hora }))
    }))
    const lab = aglomerativo(similitud(ev, 60), 0.5)
    const verdad = casas.map((a) => a.circuito)
    // quórum por día y circuito real
    const q = s.dias.map((d) => [0, 1].map((c) => quorum(casas.filter((a) => a.circuito === c).flatMap((a) => d.porAparato[ids.indexOf(a.id)].eventos.filter((e) => e.evento === 'llegó').map((e) => ({ token: a.id, t: e.hora }))))))
    // publicación semanal por circuito aprendido
    const pubs = [0, 1].map((sem) => [...new Set(lab)].map((k) => {
      const miembros = casas.filter((_, i) => lab[i] === k)
      const ap = miembros.map((a) => {
        const dias = s.dias.slice(sem * 7, sem * 7 + 7)
        const i = ids.indexOf(a.id)
        return { minutos: Math.round(dias.reduce((t, d, j) => t + minutos[sem * 7 + j][i], 0) / 7), cobertura: Math.min(...dias.map((d) => d.porAparato[i].cobertura)) }
      })
      return { k, n: miembros.length, r: publicar(ap) }
    }))
    // dosis–respuesta contra el neutral de su circuito real
    const dosis = casas.map((a) => {
      const iN = ids.indexOf(a.circuito === 0 ? 'A-N' : 'B-N')
      const noches = s.dias.map((d) => ({ neutralMin: minutos[d.dia - 1][iN], neutralCargaM: d.red[a.circuito].cargaM || 0 }))
      return { id: a.id, rol: a.rol, ...dosisRespuesta(noches, s.dias.map((d) => minutos[d.dia - 1][ids.indexOf(a.id)])) }
    })
    const sinAgua = [0, 1].map((c) => s.dias.filter((d) => minutos[d.dia - 1][ids.indexOf(c === 0 ? 'A-N' : 'B-N')] === 0).length)
    const solos = casas.filter((_, i) => lab.filter((x) => x === lab[i]).length === 1).map((a) => a.id)
    return { ids, minutos, lab, ari: ari(verdad, lab), q, pubs, dosis, sinAgua, casas, solos }
  }, [sim, tramposo])

  if (!sim || !out) return <p>Simulando 14 días…</p>
  const { ca, cb, ha, hb, s } = sim
  const iCasa = out.ids.indexOf(casa)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">El registro, funcionando <span className="sim">SIMULADO</span></h1>
      <p className="text-sm">Aparatos inventados con física simple, sobre el horario <span className="med">REAL</span> que SEGIAGUA publica para dos colonias vecinas de Iztapalapa:
        <b> {ca.col}</b> ({hhmm(ha.inicio)}–{hhmm(ha.fin)}) y <b>{cb.col}</b> ({hhmm(hb.inicio)}–{hhmm(hb.fin)}). Dos válvulas (A y B), 6 casas anfitrionas cada una (la última, al final de la línea) y un sitio neutral por circuito. 14 días.
        Cada aparato manda solo: <code>{'{circuito, llegó | se fue, hora ±5 min, ficha}'}</code>.</p>

      <div className="card space-y-2" style={{ background: '#eef6f9' }}>
        <b>En corto: así se vería el registro de UN circuito (una válvula que surte a varias casas de {ca.col})</b>
        {(() => { const p = out.pubs[0].find((x) => x.r.estado === 'publicado'); return p ? (
          <p>En la semana 1 (días 1 al 7), la ciudad publicó <b>{ha.horas} horas</b> de agua al día. Medido en las llaves, en promedio: la casa que menos recibió tuvo <b>{hm(p.r.min)}</b> al día, y la mitad de las casas recibió <b>{hm(p.r.mediana)}</b> o menos. En los 14 días hubo <b>{out.sinAgua[0]}</b> sin nada de agua en el sitio neutral.</p>
        ) : <p>Esta semana no hay suficientes aparatos funcionando para publicar: se dice «sin datos suficientes», nunca «0 horas».</p> })()}
        <p className="text-sm"><b>¿Por qué no dice qué casa es?</b> Porque el número no es contra la familia: es contra lo que publicó la ciudad. Si dijéramos qué casa recibió menos, cualquiera podría señalarla (y no sabemos si es por estar al final del tubo o por otra cosa). Por eso solo se publica cuando hay al menos 5 casas, y sin nombres.</p>
        <p className="text-xs opacity-80">Esto es una DEMOSTRACIÓN con aparatos inventados sobre el horario real de dos colonias de Iztapalapa. Tu colonia tendrá su registro cuando haya sensores.</p>
      </div>

      <details className="space-y-3"><summary className="cursor-pointer font-semibold">Ver cómo funciona por dentro (técnico)</summary>
      <div className="card space-y-2">
        <b>1 · Aprender el circuito sin el plano de válvulas (el ML del producto)</b>
        <p className="text-sm">Dos casas están en el mismo circuito si llegan juntas (≤60 min) las mismas noches. Agrupamiento aglomerativo sobre esa co-llegada.</p>
        <div className="flex flex-wrap gap-2 text-sm">{out.casas.map((a, i) => <span key={a.id} className="rounded border px-2 py-1" style={{ background: ['#dbeef6', '#fde7c8', '#e5dcf3', '#e0f0df'][out.lab[i] % 4] }}>{a.id}</span>)}</div>
        <label className="text-sm">Noches en que la red no entrega nada: <select value={pFalla} onChange={(e) => setPFalla(+e.target.value)} className="rounded border p-1">
          <option value={0.15}>15%</option><option value={0.3}>30%</option><option value={0.5}>50%</option></select></label>
        <p className="text-sm">Coincidencia con la válvula real en esta corrida (ARI): <b>{out.ari.toFixed(2)}</b> (1 = perfecto). En esta demo cada válvula coincide con una colonia; en la ciudad no tiene por qué. Solo separa circuitos cuyas fallas son independientes.</p>
        <p className="text-sm"><b>Lo honesto:</b> una corrida no prueba nada. En 60 corridas por escenario (ARI mediana · peor 10% · mejor 10%): con 15% de noches fallidas <b>−0.03 · −0.05 · 0.69</b> (no aprende); con 30%, <b>0.69 · −0.03 · 0.85</b>; con 50%, <b>0.69 · 0.69 · 0.85</b>. Con horarios reales que arrancan a la misma hora, el circuito solo se aprende si falla seguido. Si no aprende, se publica por colonia y se dice.</p>
        {out.solos.length > 0 && <p className="text-sm">Aparatos que el agrupamiento dejó solos y por eso <b>no entran a ninguna publicación</b>: {out.solos.join(', ')}. Su medición sigue contando para su casa. Suelen ser las casas del final de la línea: el agua les llega tarde y no «llegan juntas» con nadie.</p>}
      </div>

      <div className="card space-y-2">
        <b>2 · Publicación semanal (nunca una cifra por casa)</b>
        <p className="text-xs opacity-80">Se publica con ≥{PUBLICACION.minAnfitriones} aparatos con cobertura ≥{PUBLICACION.minCobertura * 100}% en la semana; si no, «sin datos suficientes». Bloques de 15 min.</p>
        {out.pubs.map((sem, si) => (
          <div key={si}><div className="text-sm font-semibold">Semana {si + 1}</div>
            {sem.map((p) => (
              <div key={p.k} className="text-sm">Circuito aprendido {p.k + 1} ({p.n} aparatos): {p.r.estado === 'publicado'
                ? <>casa peor servida <b>{hm(p.r.min)}</b>/día · mediana <b>{hm(p.r.mediana)}</b> · mejor {hm(p.r.max)} {p.r.excluidos ? <span className="opacity-70">({p.r.excluidos} aparato fuera por cobertura &lt;90%: apagón)</span> : null}</>
                : <b>sin datos suficientes</b>}{p.r.estado !== 'publicado' && <span className="opacity-70"> ({p.r.n} válidos)</span>}</div>
            ))}
          </div>
        ))}
        <p className="text-sm">Publicado por SEGIAGUA: A {ha.horas} h/día · B {hb.horas} h/día. Días sin nada confirmados por el sitio neutral: A {out.sinAgua[0]} de 14 · B {out.sinAgua[1]} de 14.</p>
      </div>

      <div className="card space-y-2">
        <b>3 · Despertar a otros: quórum de 2</b>
        <p className="text-sm">Un solo aparato nunca despierta a nadie (una cubeta frente al sensor no despierta a 300 casas). Primer minuto confirmado por quórum, por día:</p>
        <div className="overflow-x-auto"><table className="t"><thead><tr><th>Día</th>{s.dias.map((d) => <th key={d.dia}>{d.dia}</th>)}</tr></thead>
          <tbody>{[0, 1].map((c) => <tr key={c}><td>{c ? 'B' : 'A'}</td>{out.q.map((x, i) => <td key={i}>{hhmm(x[c])}</td>)}</tr>)}</tbody></table></div>
      </div>

      <div className="card space-y-2">
        <b>4 · Revisión anti-trampa (solo si hay dinero en juego)</b>
        <p className="text-sm">Se juzga con {DOSIS.minNoches}+ noches, contra los minutos con presión fuerte (≥{DOSIS.umbralM} m) del sitio neutral. Una casa del final de la línea se queda sin agua solo cuando la red entrega débil; una llave cerrada, cualquier noche.</p>
        <label className="text-sm"><input type="checkbox" checked={tramposo} onChange={(e) => setTramposo(e.target.checked)} /> Simular que la casa A-3 cierra su llave de paso 4 noches buenas</label>
        <ul className="text-sm">{out.dosis.filter((x) => x.rol === 'final de línea' || x.id === 'A-3').map((x) => <li key={x.id}>{x.id} ({x.rol}): {x.bandera ? <b className="text-red-700">inconsistente: inspección de campo</b> : 'consistente'} <span className="opacity-60">(S = {x.S} min)</span></li>)}</ul>
        <p className="text-xs opacity-80">Precio de no acusar a la casa peor servida: se escapan tramposos que solo cierran en noches que ya eran malas. Una bandera es solo «inconsistente», nunca causa: la causa es una inspección.</p>
      </div>

      </details>

      <div className="card space-y-2">
        <b>Ejemplo inventado: lo que vería solo el dueño de un aparato en su propio teléfono</b>
        <label className="text-sm">Aparato <select value={casa} onChange={(e) => setCasa(e.target.value)} className="rounded border p-1">{out.casas.map((a) => <option key={a.id}>{a.id}</option>)}</select></label>
        <p className="text-sm">Esto no se publica: es el registro de su propia casa y no necesita que nadie lo confirme. Una casa puede tener más días sin agua que el sitio neutral (por ejemplo, días de poca presión o con el aparato apagado).</p>
        <div className="overflow-x-auto"><table className="t"><thead><tr><th>Día</th><th>Agua ese día</th><th>Primera llegada</th></tr></thead>
          <tbody>{s.dias.map((d) => { const e = d.porAparato[iCasa].eventos.find((x) => x.evento === 'llegó'); return <tr key={d.dia}><td>{d.dia}</td><td>{out.minutos[d.dia - 1][iCasa] ? hm(out.minutos[d.dia - 1][iCasa]) : 'nada'}</td><td>{e ? hhmm(e.hora) : '—'}</td></tr> })}</tbody></table></div>
      </div>
    </div>
  )
}
