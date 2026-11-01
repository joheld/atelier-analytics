# Atelier Analytics - Windows PowerShell Launcher
Write-Host "[Atelier] Iniciando Atelier Analytics en Windows..." -ForegroundColor Cyan

$Port = if ($env:PORT) { $env:PORT } else { "5173" }
$Url = "http://localhost:$Port"

# Launch default browser
Start-Process $Url

# Run using Bun if available, otherwise fallback to NPM
if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "[Atelier] Ejecutando servidor con Bun en $Url..." -ForegroundColor Green
    & bun dev
} else {
    Write-Host "[Atelier] Ejecutando servidor con NPM en $Url..." -ForegroundColor Green
    & npm run dev
}
