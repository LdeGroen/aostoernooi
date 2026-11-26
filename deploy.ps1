# AoS Toernooi uitrollen naar de Pi (aostoernooi.lucdegroen.nl).
#   .\deploy.ps1                # bouwen + kopieren + herstarten
#   .\deploy.ps1 -FirstInstall  # eerste keer; daarna pi-setup.sh draaien
param([string]$PiHost = "energiepi", [switch]$FirstInstall)
$ErrorActionPreference = "Stop"
$target = "luc@$PiHost"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location $here
try {
  $env:VITE_BASE = "/"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build mislukt" }
} finally { Pop-Location }

# Nieuwe build naast de oude zetten en dan in een keer omwisselen.
ssh $target "rm -rf ~/aostoernooi/dist.new"
scp "$here\server.mjs" "$here\pi-setup.sh" "${target}:~/aostoernooi/"
if ($LASTEXITCODE -ne 0) { throw "scp mislukt" }
scp -r "$here\dist" "${target}:~/aostoernooi/dist.new"
if ($LASTEXITCODE -ne 0) { throw "scp dist/ mislukt" }
ssh $target "cd ~/aostoernooi && rm -rf dist.old && (mv dist dist.old 2>/dev/null || true) && mv dist.new dist"

if ($FirstInstall) {
  Write-Host ">> Nu eenmalig (vraagt sudo):  ssh -t $target 'bash ~/aostoernooi/pi-setup.sh'"
  return
}
ssh $target "sudo -n systemctl restart aostoernooi && systemctl is-active aostoernooi"
if ($LASTEXITCODE -ne 0) { throw "herstarten mislukt" }
Write-Host ">> Klaar: https://aostoernooi.lucdegroen.nl"
