'use client'
import { useRef, useState } from 'react'

// Clases de YAMNet (AudioSet) que cuentan como "agua entrando". Sin 448 Pump (liquid): la bomba de la casa no es llegada.
const AGUA = [282, 364, 365, 366, 438, 442, 443, 444, 445, 446]
const LLUVIA = [283, 284, 285]
const VENTANA = 60, FRACCION = 0.6 // regla de duración: ≥60% de los últimos 60 s con agua

export default function Sensor() {
  const [estado, setEstado] = useState('apagado')
  const [frames, setFrames] = useState([])
  const [eventos, setEventos] = useState([])
  const [info, setInfo] = useState('')
  const stop = useRef(null)

  async function iniciar() {
    try {
      setEstado('cargando modelo…')
      const tf = await import('@tensorflow/tfjs')
      const model = await tf.loadGraphModel('/yamnet/model.json')
      const ctx = new AudioContext()
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      const set = st.getAudioTracks()[0].getSettings()
      setInfo(`backend ${tf.getBackend()} · ${ctx.sampleRate} Hz · supresión de ruido ${set.noiseSuppression ? 'ACTIVA (el navegador no la apagó)' : 'apagada'}`)
      const src = ctx.createMediaStreamSource(st), proc = ctx.createScriptProcessor(4096, 1, 1)
      let buf = new Float32Array(0)
      proc.onaudioprocess = (e) => { const d = e.inputBuffer.getChannelData(0); const n = new Float32Array(Math.min(buf.length + d.length, ctx.sampleRate * 2)); n.set(buf.subarray(Math.max(0, buf.length + d.length - n.length))); n.set(d, n.length - d.length); buf = n }
      src.connect(proc); proc.connect(ctx.destination)
      const hist = []; let agua = false
      let wake = null; try { wake = await navigator.wakeLock?.request('screen') } catch { /* sin Wake Lock */ }
      setEstado('escuchando')
      const iv = setInterval(async () => {
        if (buf.length < ctx.sampleRate) return
        const x = buf.slice(-ctx.sampleRate), y = new Float32Array(16000), r = ctx.sampleRate / 16000
        for (let i = 0; i < 16000; i++) { const t = i * r, j = Math.floor(t), f = t - j; y[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f }
        const t0 = performance.now()
        const inp = tf.tensor1d(y); const [s] = model.predict(inp); const a = (await s.array())[0]; s.dispose(); inp.dispose()
        // el audio se descarta aquí: solo queda un sí/no por segundo
        const w = AGUA.reduce((q, i) => q + a[i], 0), rn = LLUVIA.reduce((q, i) => q + a[i], 0)
        const si = w > 0.15 && rn < 0.2
        hist.push(si); if (hist.length > VENTANA) hist.shift()
        const frac = hist.filter(Boolean).length / hist.length
        setFrames((f) => [...f.slice(-59), { si, ms: Math.round(performance.now() - t0) }])
        const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        if (!agua && hist.length >= VENTANA && frac >= FRACCION) { agua = true; setEventos((e) => [...e, `llegó · ${hora}`]) }
        if (agua && frac < 0.2) { agua = false; setEventos((e) => [...e, `se fue · ${hora}`]) }
      }, 1000)
      stop.current = () => { clearInterval(iv); st.getTracks().forEach((t) => t.stop()); ctx.close(); wake?.release?.(); setEstado('apagado') }
    } catch (e) {
      setEstado('error'); setInfo('No se pudo iniciar: ' + (e.message || e))
    }
  }

  const ult = frames.filter((f) => f.si).length
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">El sensor</h1>
      <div className="card space-y-2">
        <b>Modo micrófono (celular como sensor)</b> <span className="sim">DEMO · probado solo en escritorio</span>
        <p className="text-sm">YAMNet (modelo de Google, 521 sonidos) corre <b>en tu teléfono</b>. El audio nunca sale del aparato y no se guarda: cada segundo queda solo un «agua / sin agua». Si hay agua sostenida ≥60% del último minuto, marca «llegó».</p>
        <p className="text-sm"><b>Lo que sabemos de él (medido en laboratorio):</b> oye agua contra ruido nocturno casi perfecto, pero un excusado o el mar también «suenan a agua» (precisión 0.26 en 400 clips). La regla de duración elimina el excusado. Un hilo de poca presión no lo oye (0% en 200 noches simuladas). Por eso el producto usa presión, no sonido.</p>
        {estado === 'apagado' || estado === 'error'
          ? <button onClick={iniciar} className="rounded-lg px-4 py-2 font-semibold text-white" style={{ background: 'var(--agua)' }}>Probar el micrófono</button>
          : <button onClick={() => stop.current?.()} className="rounded-lg border px-4 py-2">Detener</button>}
        <div className="text-sm">Estado: <b>{estado}</b> {info && <span className="opacity-70">· {info}</span>}</div>
        {frames.length > 0 && <div className="text-sm">Último minuto: {ult} de {frames.length} segundos con agua · inferencia {frames[frames.length - 1].ms} ms</div>}
        {frames.length > 0 && <div className="flex h-4 gap-px" aria-label="segundos con agua">{frames.map((f, i) => <span key={i} style={{ width: 4, background: f.si ? '#2a7fa0' : '#ddd' }} />)}</div>}
        {eventos.length > 0 && <ul className="text-sm">{eventos.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        <p className="text-xs opacity-70">Para una noche entera necesitaría la pantalla encendida y conectado a la corriente; en teléfono real no está probado. Pruébalo abriendo una llave cerca del micrófono durante más de un minuto.</p>
      </div>
      <div className="card space-y-2">
        <b>Modo presión (el sensor real del producto)</b> <span className="tag">DISEÑO · noche de campo pendiente</span>
        <ul className="list-disc pl-5 text-sm">
          <li>Transductor de presión de 5 V en una «Y» enroscada en la llave del patio: sin plomero y sin cortar tubo. ESP32 + convertidor ADS1115 + batería 18650 para apagones cortos.</li>
          <li>Detecta el <b>escalón</b> desde cero cuando llega el agua a la llave cerrada: umbral sostenido ≥2 min. Sin ML.</li>
          <li>Mide a 1 vez por segundo y guarda 10 min en RAM; <b>nunca escribe la presión en memoria</b>. A 1 Hz no se distingue qué mueble usó la familia (eso requiere milisegundos).</li>
          <li>Lo único que sale del aparato:</li>
        </ul>
        <pre>{`{ "circuito": "C-0412", "evento": "llegó" | "se fue", "hora": "03:15" (redondeada a 5 min), "ficha": "rota cada 30 días" }`}</pre>
        <p className="text-sm">Y una vez por semana: minutos con agua y su cobertura (fracción del tiempo que estuvo vivo, en bloques de 10%). Nada más.</p>
        <p className="text-sm"><b>Criterio de muerte, fijado antes de medir:</b> si el escalón es menor que 5 veces el ruido en la peor de 3 llegadas, o hay 2 o más llegadas falsas en 7 noches, el sensor en planta baja no sirve y Llave se queda solo con los datos públicos.</p>
      </div>
    </div>
  )
}
