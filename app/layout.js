import './globals.css'

export const metadata = {
  title: 'w11-llave',
  description: 'Crystal Ball Studio weekly ship.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  )
}
