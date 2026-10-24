'use client'
import { useEffect, useState } from 'react'

export default function ListaFiscal() {
  const [res, setRes] = useState(null), [d, setD] = useState(null), [alc, setAlc] = useState('IZTAPALAPA')
  useEffect(() => { fetch('/data/resumen.json').then((r) => r.json()).then(setRes); fetch('/data/colonias.json').then((r) => r.json()).then(setD) }, [])
  if (!res || !d) return <p>Cargando…</p>
  const A = res.alcaldias
  const fuera = d.rows.filter((r) => r.alc === alc && r.tipo === 'ventana_diaria' && r.horas !== null && r.horas <= 8 && r.join === 'fuera').sort((a, b) => a.horas - b.horas || a.col.localeCompare(b.col))
  const rev = (x) => (x.join.revision || 0) + (x.join.posible || 0)
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Lista fiscal de tandeo vs. lo que publica SEGIAGUA</h1>
      <p className="text-sm"><b>¿Qué es?</b> Una lista oficial de colonias que la ciudad reconoce que reciben agua por tandeo. Según notas de prensa, a esas tomas se les cobra el agua de otra forma (por verificar). Cada año la ciudad publica en la Gaceta las colonias que «reciben agua por tandeo». Aquí cruzamos esa lista (transcripción de Uno TV, ene-2024: 284 colonias) con los horarios que publica SEGIAGUA hoy. <span className="tag">HIPÓTESIS</span> Sin el PDF de la Gaceta esto no es un hallazgo legal: es una lista para verificar.</p>
      <label className="text-sm">Alcaldía <select value={alc} onChange={(e) => setAlc(e.target.value)} className="rounded border p-1">{Object.keys(A).map((k) => <option key={k}>{k}</option>)}</select></label>
      <div className="card space-y-1">
        <b>{alc}, en corto</b>
        <ul className="list-disc pl-5 text-sm">
          <li>La lista de tandeo de la ciudad trae <b>{A[alc].lista_fiscal}</b> nombres de colonias de {alc}.</li>
          <li>SEGIAGUA dice que <b>{A[alc].ventana_le8}</b> colonias de {alc} reciben agua <b>8 horas o menos</b> al día.</li>
          <li>De esas {A[alc].ventana_le8}, <b>{A[alc].ventana_le8_fuera}</b> no coinciden con ningún nombre de la lista, ni buscando nombres parecidos. Son las de abajo.</li>
          <li>Aparte, en toda la alcaldía hay <b>{rev(A[alc])}</b> colonias con un nombre parecido (no igual) a uno de la lista: esas falta revisarlas a mano y todavía no las mostramos.</li>
          <li><b>Qué puedes hacer:</b> si tu colonia está abajo, llévala a la alcaldía o a SEGIAGUA como «lista para revisar», no como prueba.</li>
        </ul>
      </div>
      <details className="card overflow-x-auto"><summary className="cursor-pointer text-sm font-semibold">Ver la tabla de todas las alcaldías</summary>
        <table className="t">
          <thead><tr><th>Alcaldía</th><th>Colonias</th><th>En lista fiscal</th><th>Match exacto</th><th>En revisión manual (no mostradas)</th><th>Ventana ≤8 h</th><th>…y fuera de la lista</th></tr></thead>
          <tbody>{Object.entries(A).map(([k, x]) => (
            <tr key={k} style={k === alc ? { background: '#fff6e5' } : {}}><td><button className="underline" onClick={() => setAlc(k)}>{k}</button></td><td>{x.n}</td><td>{x.lista_fiscal}</td><td>{x.join.exacto || 0}</td><td><b>{rev(x)}</b></td><td>{x.ventana_le8}</td><td><b>{x.ventana_le8_fuera}</b></td></tr>
          ))}</tbody>
        </table>
      </details>
      <details className="card text-sm space-y-1"><summary className="cursor-pointer font-semibold">Cómo se emparejan los nombres (reglas fijadas antes de ver la lista)</summary>
        <ul className="list-disc pl-5">
          <li>Solo dentro de la misma alcaldía. Match exacto = mismo nombre normalizado (sin acentos, «COL.», puntuación; «AMPL.» → AMPLIACION; los números y SECCIÓN se respetan).</li>
          <li>Los nombres parecidos van a <b>revisión manual y no se muestran</b>. Su número sí se muestra arriba: los nombres «sucios» (BARRIO, PUEBLO, U. H., AMPLIACIÓN) son justo los de colonias populares, y un filtro que los esconde en silencio borra a quien peor está.</li>
          <li>«Fuera de la lista» es la cuenta robusta: aunque cada nombre de la lista cubriera varias colonias (quitando prefijos, comparando lo que va entre paréntesis), estas no coinciden con ninguno.</li>
        </ul>
      </details>
      <div className="card">
        <b>Las {fuera.length} colonias de {alc} con 8 horas o menos de agua al día que no aparecen en la lista</b>
        <ul className="mt-2 max-h-96 overflow-auto text-sm">{fuera.map((r) => <li key={r.id}>{r.col} <span className="opacity-60">· {r.horas} h · {r.horario.replace('SUMINISTRO DE ', '')}</span></li>)}</ul>
        {fuera.length === 0 && <p className="text-sm">Ninguna.</p>}
      </div>
    </div>
  )
}
