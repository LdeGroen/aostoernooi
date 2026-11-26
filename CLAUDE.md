# AoS Toernooi

React + Vite + Tailwind-app voor een AoS-toernooi: beheerpaneel + publiek scherm (HashRouter).
Alle data staat in `localStorage` (`aostoernooi-state`) van het apparaat; tabs syncen via
BroadcastChannel. Geen backend.

## Hosting
- **Pi (energiepi, poort 4800)** → https://aostoernooi.lucdegroen.nl. `server.mjs` serveert `dist/`
  (pure Node, geen dependencies).
      .\deploy.ps1 -FirstInstall                                  # eerste keer
      ssh -t luc@energiepi 'bash ~/aostoernooi/pi-setup.sh'       # eenmalig: service, tunnel, DNS, pihealth
      .\deploy.ps1                                                # daarna: elke update (bouwt lokaal, scp, herstart)
- **GitHub Pages is uitgezet** (26-11-2026, op verzoek van Luc); de Pages-workflow is weg. De Pi is
  de enige host.
- Let op: localStorage is per domein. Een toernooi dat op het oude github.io-adres was ingesteld
  staat niet op aostoernooi.lucdegroen.nl.
