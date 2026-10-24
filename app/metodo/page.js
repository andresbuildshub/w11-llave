import { CRITERIO_ATIPICAS, PUBLICACION, DOSIS } from '../../lib/reglas.js'

export default function Metodo() {
  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold">Cómo funciona (y qué no hace)</h1>
      <div className="card space-y-1">
        <b>Qué es real y qué no</b>
        <ul className="list-disc pl-5">
          <li><span className="med">REAL</span> Horarios, fuente y condición de 2,006 colonias: API público de SEGIAGUA «Agua en tu colonia» (pull diario desde el 23-oct-2026; el servidor solo responde a navegadores, así que el pull corre en un navegador sin pantalla).</li>
          <li><span className="tag">HIPÓTESIS</span> Lista fiscal de tandeo: transcripción de Uno TV (26-ene-2024) de la resolución de la Gaceta; no es el PDF oficial.</li>
          <li><span className="sim">SIMULADO</span> Aparatos, circuitos y publicación de /circuito: física inventada sobre horarios reales.</li>
          <li><span className="sim">DEMO</span> Modo micrófono: corre de verdad en tu teléfono, pero solo se probó en escritorio.</li>
        </ul>
      </div>
      <div className="card space-y-1">
        <b>Reglas (cada una con la fecha en que se fijó, antes de ver los datos)</b>
        <ul className="list-disc pl-5">
          <li>Sensor #1: va donde la ciudad no publica horario. Estructural si la colonia es atípica en ≥21 de 28 días (fijada {CRITERIO_ATIPICAS.fijado}; decisión {CRITERIO_ATIPICAS.decision}). Lo decide el dato del tubo, no quién lo pide.</li>
          <li>Publicación: por circuito, semanal, con ≥{PUBLICACION.minAnfitriones} aparatos con cobertura ≥{PUBLICACION.minCobertura * 100}%. Mínimo, mediana y máximo en bloques de 15 min. Nunca una cifra por casa.</li>
          <li>La medición no se vota: una casa cuenta para sí misma sin confirmación. El quórum (2 aparatos) sirve solo para despertar a otros.</li>
          <li>Anti-trampa solo con dinero en juego: {DOSIS.minNoches}+ noches, dosis–respuesta contra el sitio neutral (presión ≥{DOSIS.umbralM} m). Nunca juzga una sola noche: en una noche, la casa del final de la línea se ve igual que un tramposo.</li>
          <li>Nunca decimos <i>por qué</i> una casa recibió menos (final de línea o succión). Eso es inspección de campo.</li>
          <li>Cada filtro publica a quién deja fuera (ver «en revisión manual» en la lista de tandeo).</li>
          <li>Emparejamiento de nombres: solo exacto se muestra como match (fijado 23-oct, antes de ver la lista).</li>
        </ul>
      </div>
      <div className="card space-y-1">
        <b>Lo que Llave nunca hace</b>
        <ul className="list-disc pl-5">
          <li>No guarda audio, presión, nombres, direcciones ni teléfonos. No hay cuentas.</li>
          <li>No vende aviso anticipado ni prioridad. No dice «prende la bomba» ni da consejos.</li>
          <li>No califica casas.</li>
        </ul>
      </div>
      <div className="card space-y-1">
        <b>Lo que falta (dicho tal cual)</b>
        <ul className="list-disc pl-5">
          <li>Ninguna noche de agua real medida todavía. La primera noche de campo tiene criterio de muerte escrito.</li>
          <li>El PDF de la Gaceta para confirmar la lista fiscal.</li>
          <li>28 días de pulls para decidir qué colonias son «sin promesa» estructural.</li>
          <li>Probar el modo micrófono en un Android real, una noche completa.</li>
        </ul>
      </div>
    </div>
  )
}
