// Normalizador de nombres de colonias (mismo que scripts/build_data.py). No toca números ni SECCIÓN/ETAPA/PARAJE.
export function norm(s) {
  let t = String(s).toUpperCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/\bCOL\.?\s/g, '').replace(/\bAMPL\.?\s/g, 'AMPLIACION ').replace(/\bU\.\s?H\.?\s/g, 'UNIDAD HABITACIONAL ');
  t = t.replace(/[^\w\s()]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}
