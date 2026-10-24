'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { elegibilidad, CRITERIO_ATIPICAS } from '../../lib/reglas.js'
import { norm } from '../../lib/nombres.js'
const Mapa = dynamic(() => import('../../components/Mapa.js'), { ssr: false })

const TIPO = { continuo: 'Suministro continuo', ventana_diaria: 'Ventana diaria', ventana_dias: 'Solo ciertos días', pipas: 'Abasto por pipas', sin_horario: 'Sin horario publicado' }
const JOIN = { exacto: 'Aparece en la lista fiscal de tandeo (nombre exacto)', revision: 'Posible coincidencia con la lista fiscal: en revisión manual', posible: 'Posible coincidencia con la lista fiscal: en revisión manual', fuera: 'No aparece en la lista fiscal de tandeo (ni con el emparejamiento más generoso)' }

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
          <div><b>Lo que publica SEGIAGUA hoy:</b> {sel.horario ? sel.horario.replace('SUMINISTRO', 'Suministro').toLowerCase().replace(/^s/, 'S') : 'no publica horario'}</div>
          <div>Tipo: {TIPO[sel.tipo]}{sel.horas ? ` · ${sel.horas} h al día` : ''} · Fuente: {sel.fuente || 'no indicada'} · Condición atípica hoy: {sel.atip ? 'sí' : 'no'}</div>
          <div><b>¿Iría un sensor aquí?</b> <span className="tag">{e.estado.toUpperCase()}</span> {e.texto}.
            <div className="text-xs opacity-80">Regla fijada el {CRITERIO_ATIPICAS.fijado}, antes de tener datos: estructural si es atípica en ≥21 de 28 días; decisión el {CRITERIO_ATIPICAS.decision}. El sensor va donde la ciudad no publica horario, no donde alguien lo pide.</div></div>
          <div><b>Lista fiscal de tandeo (ene-2024):</b> {sel.join === 'revision' || sel.join === 'posible' ? JOIN.posible : JOIN[sel.join]} <span className="tag">HIPÓTESIS</span>
            <div className="text-xs opacity-80">Verificar contra el PDF de la Gaceta. Lo que esto significa en el recibo no lo afirmamos aquí.</div></div>
          <div className="text-sm"><b>Cuándo llega de verdad:</b> sin medición todavía en esta colonia. Mira <a className="underline" href="/circuito">cómo se vería el registro</a> (simulado).</div>
        </div>
      )}
      <div className="card">
        <b>{lista.length} colonias</b>
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
