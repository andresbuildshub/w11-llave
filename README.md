# Llave — ¿llegó el agua que publicaron?

Crystal Ball Studio · Week 11 (AI 2041 ch. 10 "Dreaming of Plenitude") · T4 · Technologist · Andrés Álvarez Morphy Namnum
**Live:** https://w11-llave.vercel.app

SEGIAGUA publishes a water-supply schedule for each of CDMX's 2,006 colonias. Nobody records whether water actually reaches the tap. Llave compares the published schedule with measured arrival, per valve circuit, never per house.

- `/colonias`: REAL SEGIAGUA data, map + plain-language card + dated WhatsApp summary / CSV of what the city published.
- `/lista-fiscal`: join with the fiscal tandeo list (Uno TV transcription, Jan-2024), with published omissions. HYPOTHESIS until checked against the Gaceta.
- `/circuito`: the ledger on SIMULADO devices: dumb pressure detection, circuit learning (with its honest ARI distribution), quorum, weekly publication (≥5 hosts), dose–response fraud check.
- `/sensor`: on-device YAMNet mic DEMO (desktop-tested only) + the pressure device spec.
- `/metodo`: every rule with the date it was fixed; what is real vs simulated.

**Data:** `scripts/pull_segiagua.cjs` (headless browser: the API resets non-browser clients) → `data/history/YYYY-MM-DD.json` → `scripts/build_data.py` → `public/data/`. Daily via `scripts/diario.sh` (cron).
**Tests:** `npm test` (10 unit) · `NODE_PATH=<playwright>/node_modules node test/e2e.cjs [url] [wav]` (32 E2E) · `test/calibrar-*.mjs`.
**Docs:** `docs/CHARTER.md`, `docs/PACKET.md` (written before code), `docs/DECISIONS.md`.
No accounts, no database, no personal data, no API keys.
