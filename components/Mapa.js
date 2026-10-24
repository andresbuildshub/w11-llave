'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

const COLOR = { continuo: '#2a7fa0', ventana_diaria: '#e0a030', ventana_dias: '#d9534f', pipas: '#7b3fa0', sin_horario: '#555' }

export default function Mapa({ puntos, sel, onSel }) {
  const el = useRef(null), map = useRef(null), capa = useRef(null)
  useEffect(() => {
    let L
    import('leaflet').then((m) => {
      L = m.default
      if (!map.current) {
        map.current = L.map(el.current, { zoomControl: true }).setView([19.36, -99.1], 11)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap' }).addTo(map.current)
      }
      if (capa.current) capa.current.remove()
      capa.current = L.layerGroup(puntos.filter((p) => p.lat).map((p) => L.circleMarker([p.lat, p.lon], {
        radius: sel && sel.id === p.id ? 9 : 5, color: '#fff', weight: 1, fillColor: COLOR[p.tipo] || '#999', fillOpacity: 0.9,
      }).on('click', () => onSel(p)).bindTooltip(p.col))).addTo(map.current)
      const pts = puntos.filter((p) => p.lat).map((p) => [p.lat, p.lon])
      if (sel && sel.lat) map.current.setView([sel.lat, sel.lon], 14)
      else if (pts.length) map.current.fitBounds(pts, { padding: [10, 10] })
    })
  }, [puntos, sel])
  return <div ref={el} style={{ height: 320, borderRadius: 14, overflow: 'hidden' }} aria-label="Mapa de colonias" />
}
export { COLOR }
