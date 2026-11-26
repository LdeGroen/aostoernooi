#!/usr/bin/env bash
# Eenmalige inrichting van AoS Toernooi op de Pi (energiepi). Vraagt om sudo.
# Draaien vanaf de pc:   ssh -t luc@energiepi 'bash ~/aostoernooi/pi-setup.sh'
#
# 1. systemd-service `aostoernooi` (poort 4800) + wachtwoordloze herstart voor deploy
# 2. ingress-regel in de Cloudflare-tunnel `energie` (~/.cloudflared/config.yml)
# 3. DNS-route aostoernooi.lucdegroen.nl → tunnel, cloudflared herstarten
# 4. opnemen in pihealth
set -euo pipefail
HOST=aostoernooi.lucdegroen.nl
PORT=4800
APP="$HOME/aostoernooi"
CFG="$HOME/.cloudflared/config.yml"

echo ">> systemd-service aostoernooi"
sudo tee /etc/systemd/system/aostoernooi.service >/dev/null <<UNIT
[Unit]
Description=AoS Toernooi (statische site)
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$APP
Environment=PORT=$PORT
ExecStart=/usr/bin/node $APP/server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable aostoernooi
sudo systemctl restart aostoernooi
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart aostoernooi" | sudo tee /etc/sudoers.d/aostoernooi-deploy >/dev/null
sudo chmod 440 /etc/sudoers.d/aostoernooi-deploy
sleep 1
curl -fsS -o /dev/null "http://localhost:$PORT/" && echo "   service draait op poort $PORT"

echo ">> tunnel-ingress ($CFG)"
if grep -q "hostname: $HOST" "$CFG"; then
  echo "   staat er al in"
else
  cp "$CFG" "$CFG.bak-aostoernooi"
  awk -v host="$HOST" -v port="$PORT" '
    /^[[:space:]]*-[[:space:]]*service:[[:space:]]*http_status:404/ && !done {
      print "  - hostname: " host; print "    service: http://localhost:" port; print ""; done=1 }
    { print }' "$CFG.bak-aostoernooi" > "$CFG"
  grep -q "hostname: $HOST" "$CFG" || { echo "   !! geen catch-all gevonden"; cp "$CFG.bak-aostoernooi" "$CFG"; exit 1; }
  echo "   toegevoegd (backup: $CFG.bak-aostoernooi)"
fi
cloudflared tunnel --config "$CFG" ingress validate

echo ">> DNS-route"
cloudflared tunnel route dns energie "$HOST" || echo "   (bestond waarschijnlijk al)"

echo ">> cloudflared herstarten"
sudo systemctl restart cloudflared

echo ">> pihealth"
HS="$HOME/pihealth/health.sh"
if [ -f "$HS" ] && ! grep -q 'SERVICES=.*aostoernooi' "$HS"; then
  sed -i 's/^SERVICES="\(.*\)"/SERVICES="\1 aostoernooi"/' "$HS" && echo "   toegevoegd"
fi
echo "Klaar: https://$HOST"
