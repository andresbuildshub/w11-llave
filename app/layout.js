import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Llave — ¿llegó el agua que publicaron?',
  description: 'Lo que SEGIAGUA publica de cada colonia vs. cuándo llega el agua a la llave. Datos públicos reales + circuito simulado.',
}

const nav = [
  ['/colonias', 'Tu colonia'],
  ['/lista-fiscal', 'Lista de tandeo'],
  ['/circuito', 'Registro (simulado)'],
  ['/sensor', 'Sensor'],
  ['/metodo', 'Cómo funciona'],
]

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header style={{ background: 'var(--agua)' }} className="text-white">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <Link href="/" className="text-xl font-bold">💧 Llave</Link>
            <span className="ml-2 text-sm opacity-80">¿llegó el agua que publicaron?</span>
            <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {nav.map(([h, t]) => <Link key={h} href={h} className="underline-offset-4 hover:underline">{t}</Link>)}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs opacity-70">
          Proyecto escolar (Crystal Ball Studio, semana 11). Datos de horarios: API público de SEGIAGUA «Agua en tu colonia». Lista fiscal: transcripción de Uno TV (ene-2024), no el PDF de la Gaceta.
          Lo marcado <span className="sim">SIMULADO</span> no es medición. Ningún dato de personas ni de casas.
        </footer>
      </body>
    </html>
  )
}
