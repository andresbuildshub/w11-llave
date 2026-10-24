# Charter — w11-llave · "Llave: ¿llegó el agua que publicaron?"

> The constitution of this product. When my agent and I disagree about a feature at 2am, this is the referee. Written BEFORE the first line of code (2026-10-23), right after the Week 11 Brain Bending fight.

**What it exists to do:** measure the gap between what SEGIAGUA publishes about water supply in each colonia and when water actually reaches the tap. The city logs when a valve opens; nobody logs when water arrives at the house. That gap is the product.

**For whom:** the neighbors of a colonia with tandeo (in practice: whoever organizes them, e.g. the COPACO representative) who need evidence for SEGIAGUA, the alcaldía or the yearly fiscal tandeo list. Households host sensors; they are not the customer of an alarm.

**What it will never do:**
- Publish anything about a single house. No per-house public output, ever; publication needs ≥5 hosts per circuit.
- Keep a pressure trace or audio. Devices send only `{circuito, llegó | se fue, hour rounded to 5 min, rotating token}`.
- Score, rank or "verify" a household by itself. The measurement is not voted: a house counts for itself. Verification only when money is at stake, judged over many nights, never one.
- Infer *why* a house got less water (end of the line vs suction from the main). Cause is a field inspection, not my inference.
- Sell a head start: no paid early alert, no priority.
- Tell people what to do with water ("prende la bomba", tips). Forbidden zone: no awareness, no tips.
- Hide who a filter leaves out: every filter publishes its omissions.

**Long view (3 sentences):** If this slice works, Llave becomes the delivery ledger of the city: every colonia with intermittent supply has a public record of promised vs delivered water, kept by sensors that know nothing about the families that host them. The yearly fiscal tandeo list and SEGIAGUA's repair priorities get argued with a measured number instead of a protest. And the same rails (dumb sensor + circuit learning + no per-house output) carry over to the next abundance that arrives unevenly: electricity in a blackout-prone grid.
