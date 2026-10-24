// Pull diario del API público "Agua en tu colonia" (SEGIAGUA). El servidor corta a clientes que no son
// navegador (reset TLS a curl/Node), así que se hace desde Chromium sin pantalla (Playwright).
// Uso: NODE_PATH=<playwright> node scripts/pull_segiagua.cjs <repo>   → data/history/YYYY-MM-DD.json (nunca sobreescribe)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const repo = process.argv[2] || '.';
const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const out = path.join(repo, 'data/history', fecha + '.json');
if (fs.existsSync(out)) { console.log('ya existe', out); process.exit(0); }
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('https://aguaentucolonia.sacmex.cdmx.gob.mx/', { timeout: 90000 });
  await p.waitForTimeout(4000);
  const rows = await p.evaluate(async () => {
    const A = 'https://aguaentucolonia.sacmex.cdmx.gob.mx/api/v1';
    const j = async (u) => { for (let k = 0; k < 3; k++) { try { const x = await fetch(A + u); return await x.json(); } catch (e) { await new Promise((r) => setTimeout(r, 1500)); } } return null; };
    const mun = await j('/municipalities/WaterInYourSettlement'); const all = [];
    for (const m of mun || []) {
      const cols = (await j('/settlements/getSettlementsByMunicipalityIdForWaterInYourSettlement/' + m.real_id)) || [];
      const q = cols.slice();
      const w = async () => { while (q.length) { const c = q.shift(); const d = await j('/settlements/getSettlementsByIdForWaterInYourSettlement/' + c.id); all.push({ id: c.id, alcaldia: m.municipality, colonia: c.nomut, cp: c.zip_code, ...(d || {}) }); await new Promise((r) => setTimeout(r, 80)); } };
      await Promise.all([w(), w(), w(), w()]);
    }
    return all;
  });
  await b.close();
  if (rows.length < 1500) { console.error('pull incompleto', rows.length); process.exit(1); }
  fs.writeFileSync(out, JSON.stringify({ fetched: new Date().toISOString(), source: 'https://aguaentucolonia.sacmex.cdmx.gob.mx/api/v1', rows }));
  console.log('ok', out, rows.length);
})();
