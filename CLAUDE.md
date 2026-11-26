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
- **GitHub Pages** (https://ldegroen.github.io/aostoernooi/) draait nog via `.github/workflows/deploy.yml`
  bij een push naar master; die build zet `VITE_BASE=/aostoernooi/`. Standaard is de base `/`.
  Wordt uitgefaseerd zodra de Pi-versie in gebruik is.
- Let op: localStorage is per domein. Een toernooi dat op github.io is ingesteld staat niet
  automatisch op aostoernooi.lucdegroen.nl.
