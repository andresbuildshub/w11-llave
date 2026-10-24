import Link from 'next/link'
import resumen from '../public/data/resumen.json'

export default function Home() {
  const iz = resumen.alcaldias['IZTAPALAPA']
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">SEGIAGUA publica cuándo debería llegar el agua. Nadie registra cuándo llega.</h1>
      <p>
        La ciudad registra cuándo abre una válvula. Llave mide cuándo el agua llega a la llave de una casa, y publica la diferencia por circuito,
        nunca por casa.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-3xl font-bold">{resumen.total.toLocaleString('es-MX')}</div>colonias con horario publicado por SEGIAGUA <span className="med">REAL</span></div>
        <div className="card"><div className="text-3xl font-bold">{iz.tipo.continuo} de {iz.n}</div>colonias de Iztapalapa con «suministro continuo» publicado <span className="med">REAL</span></div>
        <div className="card"><div className="text-3xl font-bold">{iz.ventana_le8_fuera}</div>colonias de Iztapalapa con ventana diaria de 8 h o menos que no aparecen en la lista fiscal de tandeo <span className="tag">HIPÓTESIS</span></div>
      </div>
      <div className="card space-y-2">
        <b>Qué puedes hacer aquí</b>
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link className="underline" href="/colonias">Buscar tu colonia</Link>: qué publica la ciudad hoy, y si ahí iría un sensor (y con qué regla).</li>
          <li><Link className="underline" href="/lista-fiscal">Ver la lista de tandeo</Link>: qué colonias con horario recortado no aparecen en la lista fiscal.</li>
          <li><Link className="underline" href="/circuito">Ver el registro funcionando</Link> con aparatos <span className="sim">SIMULADO</span>: cómo se publica sin exponer a ninguna casa.</li>
        </ol>
      </div>
      <div className="card text-sm"><b>Lo que Llave nunca hace:</b> no pide tu nombre, teléfono ni dirección; no hay cuentas; no guarda audio; no califica casas ni dice cuál casa recibió menos.</div>
      <p className="text-sm opacity-80">Último pull del API: {resumen.fecha_pull} · días guardados: {resumen.n_pulls}. Primera noche de campo con un sensor real: pendiente.</p>
    </div>
  )
}
