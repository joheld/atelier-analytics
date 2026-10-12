#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/Users/joe/atelier-analytics"
PORT="5173"
URL="http://127.0.0.1:${PORT}"

# Verify if server is already responding
if curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null | grep -q "200"; then
  echo "[Atelier] Servidor ya activo en $URL"
else
  echo "[Atelier] Iniciando servidor analítico..."
  "$PROJECT_DIR/run.sh"
fi

# Open in default macOS web browser
open "$URL"

# Send native notification
osascript -e 'display notification "Plataforma analítica abierta en el navegador" with title "Atelier Analytics" subtitle "DuckDB-WASM + Observable Plot"' 2>/dev/null || true
