'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { elegibilidad, CRITERIO_ATIPICAS, parseHorario } from '../../lib/reglas.js'
import { norm } from '../../lib/nombres.js'
const Mapa = dynamic(() => import('../../components/Mapa.js'), { ssr: false })

const TIPO = { continuo: 'Suministro continuo', ventana_diaria: 'Ventana diaria', ventana_dias: 'Solo ciertos días', pipas: 'Abasto por pipas', sin_horario: 'Sin horario publicado' }
const JOIN = { exacto: 'Aparece en la lista fiscal de tandeo (nombre exacto)', revision: 'Posible coincidencia con la lista fiscal: en revisión manual', posible: 'Posible coincidencia con la lista fiscal: en revisión manual', fuera: 'No aparece en la lista fiscal de tandeo (ni con el emparejamiento más generoso)' }

const hora = (m) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`
function queDice(r) {
  if (r.tipo === 'continuo') return 'agua todo el día'
  if (r.tipo === 'pipas') return 'aquí el agua llega en pipas'
  if (r.tipo === 'sin_horario') return 'hoy no publica horario para tu colonia'
  const h = parseHorario(r.horario)
  const dias = r.tipo === 'ventana_dias' ? 'solo algunos días' : 'todos los días'
  return h ? `agua ${dias}, de ${hora(h.inicio)} a ${hora(h.fin)} (${h.horas} horas)` : r.horario.toLowerCase()
}

function resumenTexto(r, d) {
  const fecha = new Date(d.fecha_pull + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const lista = r.join === 'exacto' ? 'sí aparece (lista de enero 2024; por confirmar en la Gaceta)' : r.join === 'fuera' ? 'no aparece (lista de enero 2024; por confirmar en la Gaceta)' : 'no es seguro (nombre parecido, en revisión)'
  return `${r.col} (${r.alc[0] + r.alc.slice(1).toLowerCase()}): la página oficial de SEGIAGUA dice que la ciudad da ${queDice(r)}. Consultado el ${fecha}.\nLista de tandeo: ${lista}.\nFuente: SEGIAGUA «Agua en tu colonia», guardado por Llave: https://w11-llave.vercel.app/colonias`
}
async function compartir(r, d) {
  const t = resumenTexto(r, d)
  if (navigator.share) { try { await navigator.share({ text: t }); return } catch { /* cancelado */ } }
  window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener')
}

function descargar(r, d) {
  const filas = [['fecha_guardado', 'alcaldia', 'colonia', 'horario_publicado', 'fuente', 'condicion_atipica']]
  // historial completo: el JSON publicado trae el último día; los anteriores viven en /data/historial (uno por fecha)
  ;(r.hist || [{ fecha: d.fecha_pull, horario: r.horario, fuente: r.fuente, atip: r.atip }]).forEach((h) => filas.push([h.fecha, r.alc, r.col, h.horario || 'sin horario publicado', h.fuente || '', h.atip ? 'sí' : 'no']))
  const csv = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv + '\n\nFuente: API público «Agua en tu colonia» de SEGIAGUA, guardado diario por Llave (w11-llave.vercel.app).'], { type: 'text/csv;charset=utf-8' }))
  a.download = `lo-publicado-${r.col.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`; a.click()
}

export default function Colonias() {
  const [d, setD] = useState(null)
  const [alc, setAlc] = useState('IZTAPALAPA')
  const [q, setQ] = useState('')
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState('')
  const [sel, setSel] = useState(null)
  useEffect(() => { fetch('/data/colonias.json').then((r) => r.json()).then(setD) }, [])
  const alcs = useMemo(() => (d ? [...new Set(d.rows.map((r) => r.alc))].sort() : []), [d])
  const lista = useMemo(() => {
    if (!d) return []
    const nq = norm(q)
    return d.rows.filter((r) => r.alc === alc && (!nq || norm(r.col).includes(nq))).sort((a, b) => a.col.localeCompare(b.col))
  }, [d, alc, q])
  function onQ(v) {
    setRaw(v.slice(0, 60))
    if (v.length > 60) return setErr('Máximo 60 caracteres.')
    if (/[^\p{L}\p{N}\s.\-()]/u.test(v)) return setErr('Solo letras, números y espacios.')
    setErr(''); setQ(v)
  }
  if (!d) return <p>Cargando datos públicos de SEGIAGUA…</p>
  const e = sel && elegibilidad(sel.dias_pull, sel.dias_atip)
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Tu colonia: lo que publica SEGIAGUA</h1>
      <p className="text-sm">Datos <span className="med">REALES</span> del API «Agua en tu colonia», pull del {d.fecha_pull} ({d.pulls.length} {d.pulls.length === 1 ? 'día guardado' : 'días guardados'}).</p>
      <div className="flex flex-wrap gap-2">
        <label className="text-sm">Alcaldía{' '}
          <select value={alc} onChange={(e) => { setAlc(e.target.value); setSel(null) }} className="rounded border p-1">
            {alcs.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">Buscar colonia{' '}
          <input value={raw} onChange={(e) => onQ(e.target.value)} placeholder="ej. Paraje San Juan" className="rounded border p-1" maxLength={60} />
        </label>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <Mapa puntos={lista} sel={sel} onSel={setSel} />
      <p className="text-xs opacity-70">Colores: azul continuo · amarillo ventana diaria · rojo solo ciertos días · morado pipas · gris sin horario.</p>
      {sel && (
        <div className="card space-y-2" id="ficha">
          <div className="text-xs opacity-70">{sel.alc} · CP {sel.cp}</div>
          <div className="text-2xl font-bold">{sel.col}</div>
          <div className="rounded-lg p-3" style={{ background: '#eef6f9' }}>
            <b>En corto</b>
            <ul className="mt-1 list-disc pl-5">
              <li>La ciudad dice: {queDice(sel)}. <span className="text-xs">(Es lo publicado en la página oficial; si en ventanilla te dicen otro, éste es el oficial.)</span></li>
              <li>¿Sensor aquí? {e.estado === 'estructural' ? 'Sí: esta colonia está en la lista para el primer sensor.' : sel.tipo === 'sin_horario' || sel.atip ? `Todavía no se sabe: la ciudad no publica horario hoy. Se decide el ${CRITERIO_ATIPICAS.decision.slice(8)} de noviembre, viendo si eso pasa casi todos los días.` : 'Por ahora no: los primeros sensores van a colonias donde la ciudad no publica ningún horario. Tu colonia sí tiene uno publicado (aunque no se cumpla).'}</li>
              <li>¿En la lista de tandeo (la lista oficial de colonias que la ciudad reconoce que reciben agua por tandeo)? {sel.join === 'exacto' ? 'Sí aparece (lista de enero 2024, copiada por un noticiero; hay que confirmarla en la Gaceta).' : sel.join === 'fuera' ? 'No aparece, ni buscando nombres parecidos (lista de enero 2024; hay que confirmarla en la Gaceta).' : 'No es seguro: hay un nombre parecido que falta revisar a mano.'}</li>
            </ul>
            <div className="mt-1 text-xs">Lo que esto cambia en tu recibo no lo sabemos todavía. Lo que sí puedes hacer: llevar este dato a la alcaldía como «lista para revisar», no como prueba.</div>
          </div>
          <div className="text-sm font-semibold opacity-70">El detalle:</div>
          <div><b>Lo que publica SEGIAGUA hoy:</b> {sel.horario ? sel.horario.replace('SUMINISTRO', 'Suministro').toLowerCase().replace(/^s/, 'S') : 'no publica horario'}</div>
          <div>Tipo: {TIPO[sel.tipo]}{sel.horas ? ` · ${sel.horas} h al día` : ''} · Fuente: {sel.fuente || 'no indicada'} · ¿Hoy hay corte o falla anunciada («condición atípica»)? {sel.atip ? 'sí' : 'no'}</div>
          <div><b>¿Iría un sensor aquí?</b> <span className="tag">{e.estado === 'estructural' ? 'SÍ' : (sel.tipo === 'sin_horario' || sel.atip) ? 'PENDIENTE' : 'NO POR AHORA'}</span> {e.texto}.
            <div className="text-xs opacity-80">Regla fijada el {CRITERIO_ATIPICAS.fijado}, antes de tener datos: estructural si es atípica en ≥21 de 28 días; decisión el {CRITERIO_ATIPICAS.decision}. El sensor va donde la ciudad no publica horario, no donde alguien lo pide.</div></div>
          <div><b>Lista fiscal de tandeo (ene-2024):</b> {sel.join === 'revision' || sel.join === 'posible' ? JOIN.posible : JOIN[sel.join]} <span className="tag">HIPÓTESIS</span>
            <div className="text-xs opacity-80">Verificar contra el PDF de la Gaceta. Lo que esto significa en el recibo no lo afirmamos aquí.</div></div>
          <div className="rounded-lg border p-3 text-sm">
            <b>Lo que puedes llevar hoy, sin sensor</b>
            <p className="mt-1">Este mensaje, con la fecha. Si en ventanilla te dicen otro horario, este es el que aparece en la página oficial de SEGIAGUA. Cada mañana guardamos uno nuevo y no se borra ninguno.</p>
            <div className="mt-2 rounded-lg bg-white p-2 text-sm" style={{ whiteSpace: 'pre-wrap' }} aria-label="Resumen para compartir">{resumenTexto(sel, d)}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => compartir(sel, d)} className="rounded-lg px-3 py-2 font-semibold text-white" style={{ background: '#1f8a4c' }}>Mandar por WhatsApp</button>
              <button onClick={() => descargar(sel, d)} className="rounded-lg border px-3 py-2">Descargar tabla de todos los días ({d.pulls.length})</button>
            </div>
            <p className="mt-2 text-xs opacity-80">¿Por qué no se puede pedir un sensor aquí? Porque el lugar lo decide el dato del tubo y no quién pide. Si lo decidiera quién pide, llegarían primero las colonias que más saben pedir. Los primeros van a donde la ciudad no publica ningún horario. Tu turno llega cuando esas tengan el suyo; hoy no tenemos fecha.</p>
          </div>
          <div className="text-sm"><b>Cuándo llega de verdad:</b> sin medición todavía en esta colonia. Mira <a className="underline" href="/circuito">cómo se vería el registro</a> (simulado).</div>
        </div>
      )}
      <div className="card">
        <b>{lista.length} {lista.length === 1 ? 'colonia' : 'colonias'}</b>
        <ul className="mt-2 max-h-80 overflow-auto text-sm">
          {lista.map((r) => (
            <li key={r.id}><button className="w-full py-1 text-left hover:underline" onClick={() => { setSel(r); setTimeout(() => document.getElementById('ficha')?.scrollIntoView({ behavior: 'smooth' }), 50) }}>
              {r.col} <span className="opacity-60">· {TIPO[r.tipo]}{r.horas ? ` (${r.horas} h)` : ''}{r.atip ? ' · atípica' : ''}</span></button></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
