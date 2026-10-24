// E2E vs producción. Uso: NODE_PATH=<playwright node_modules> node test/e2e.cjs [url] [wav-para-micrófono-falso]
const { chromium } = require('playwright')
const URL = process.argv[2] || 'https://w11-llave.vercel.app'
const WAV = process.argv[3]
const shots = process.env.SHOTS
let ok = 0, fail = 0
const check = (c, m) => { c ? ok++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m) }
;(async () => {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  if (WAV) args.push('--use-file-for-fake-audio-capture=' + WAV)
  const b = await chromium.launch({ args })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] })
  const p = await ctx.newPage()
  const errs = [], posts = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('request', (r) => { if (r.method() !== 'GET') posts.push(r.method() + ' ' + r.url()) })
  const shot = async (n) => shots && p.screenshot({ path: `${shots}/${n}.png`, fullPage: true })

  await p.goto(URL); await p.waitForLoadState('networkidle')
  check((await p.textContent('body')).includes('2,006'), 'home: 2,006 colonias (real)')
  check(await p.locator('text=HIPÓTESIS').count() > 0, 'home: hipótesis etiquetada')
  await shot('01-inicio')

  await p.goto(URL + '/colonias'); await p.waitForSelector('text=colonias')
  await p.waitForTimeout(1500)
  check((await p.textContent('body')).includes('290 colonias'), 'colonias: Iztapalapa 290')
  check(await p.locator('.leaflet-container').count() === 1, 'colonias: mapa cargó')
  const tiles = await p.locator('img.leaflet-tile-loaded').count()
  check(tiles > 0, `colonias: teselas OSM cargadas bajo CSP (${tiles})`)
  await p.fill('input', 'paraje san juan')
  check((await p.locator('ul li').count()) >= 1, 'colonias: búsqueda filtra')
  await p.fill('input', '<script>')
  check((await p.textContent('body')).includes('Solo letras'), 'colonias: valida entrada')
  await p.fill('input', 'paraje san juan')
  check(!(await p.textContent('body')).includes('Solo letras'), 'colonias: el error se borra al corregir la búsqueda')
  await p.locator('ul li button').first().click(); await p.waitForTimeout(800)
  const ficha = await p.textContent('#ficha')
  check(/PENDIENTE/.test(ficha) && ficha.includes('21 de 28'), 'colonias: ficha muestra elegibilidad PENDIENTE con su regla')
  check(/lista fiscal/i.test(ficha), 'colonias: ficha muestra join fiscal')
  await shot('02-colonia')

  await p.goto(URL + '/lista-fiscal'); await p.waitForSelector('table')
  const t = await p.textContent('body')
  check(t.includes('revisión manual (no mostradas)'), 'lista-fiscal: omisiones publicadas')
  check(/58 colonias con ventana diaria/.test(t), 'lista-fiscal: cota robusta Iztapalapa = 58')
  await shot('03-lista')

  await p.goto(URL + '/circuito'); await p.waitForSelector('text=Publicación semanal', { timeout: 20000 })
  const c = await p.textContent('body')
  check(c.includes('SIMULADO'), 'circuito: etiqueta SIMULADO')
  check(/ARI\): \d\.\d\d/.test(c), 'circuito: ML de circuitos corre en el navegador')
  check(/casa peor servida|sin datos suficientes/.test(c), 'circuito: publicación semanal (o sin datos)')
  check(!/A-\d[^N]*minutos/.test(c.split('Lo que ve solo el dueño')[0]), 'circuito: ninguna cifra por aparato antes de la vista privada')
  const antes = (await p.textContent('body')).match(/A-3 \(casa\): ([^(]+)/)?.[1]?.trim()
  await p.check('input[type=checkbox]'); await p.waitForTimeout(500)
  const despues = (await p.textContent('body')).match(/A-3 \(casa\): ([^(]+)/)?.[1]?.trim()
  check(antes === 'consistente' && /inconsistente/.test(despues || ''), `circuito: tramposo detectado (${antes} → ${despues})`)
  const fin = (await p.textContent('body')).match(/[AB]-6 \(final de línea\): ([^(]+)/g) || []
  check(fin.length === 2 && fin.every((x) => x.includes('consistente') && !x.includes('inconsistente')), 'circuito: casas del final de la línea nunca marcadas')
  check(/60 corridas/.test(c) && /no aprende/.test(c), 'circuito: muestra la distribución honesta del ARI, no una corrida')
  await shot('04-circuito')

  await p.goto(URL + '/sensor'); await p.waitForSelector('text=Probar el micrófono')
  check((await p.textContent('body')).includes('DEMO'), 'sensor: etiqueta DEMO')
  await shot('05-sensor')
  if (WAV) {
    await p.click('text=Probar el micrófono')
    await p.waitForSelector('text=escuchando', { timeout: 60000 })
    await p.waitForTimeout(12000)
    const s = await p.textContent('body')
    check(/segundos con agua/.test(s), 'sensor: YAMNet clasifica en el teléfono (bajo CSP)')
    check(/supresión de ruido apagada/.test(s), 'sensor: supresión de ruido apagada')
    await shot('06-sensor-escuchando')
  }
  await p.goto(URL + '/metodo'); check((await p.textContent('body')).includes('Lo que falta'), 'metodo: límites declarados')
  await shot('07-metodo')
  check(posts.length === 0, 'red: ningún POST/PUT desde ninguna página (nada sale del teléfono) ' + posts.join(','))
  check(errs.length === 0, 'consola: sin errores ' + errs.slice(0, 3).join(' | '))
  const h = await (await ctx.request.get(URL)).headers()
  check((h['content-security-policy'] || '').includes("default-src 'self'"), 'headers: CSP')
  check((h['permissions-policy'] || '').includes('microphone=(self)'), 'headers: micrófono solo propio origen')
  console.log(`\n${ok} pass, ${fail} fail`)
  await b.close(); process.exit(fail ? 1 : 0)
})()
