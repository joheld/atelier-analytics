#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-5173}"
LOG_FILE="/tmp/atelier-analytics.log"

# Export portable PATH for non-interactive environments (macOS AppleScript / Automator / .app)
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"

# Resolve bun executable dynamically
if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN_BIN="$HOME/.bun/bin/bun"
elif [ -x "/opt/homebrew/bin/bun" ]; then
  BUN_BIN="/opt/homebrew/bin/bun"
elif [ -x "/usr/local/bin/bun" ]; then
  BUN_BIN="/usr/local/bin/bun"
else
  echo "[Atelier] Error: No se encontró 'bun' en el sistema."
  echo "Verifica que bun esté instalado en ~/.bun/bin/bun o ejecuta: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

echo "[Atelier] Usando motor en: ${BUN_BIN}"
echo "[Atelier] Iniciando servidor de analítica visual en puerto ${PORT}..."

# Kill any lingering process on the target port
if lsof -i :"$PORT" -t >/dev/null 2>&1; then
  echo "[Atelier] Liberando puerto ${PORT}..."
  kill -9 $(lsof -i :"$PORT" -t) 2>/dev/null || true
  sleep 1
fi

# Launch background server detached from stdin/signals
cd "$DIR"
nohup "$BUN_BIN" run dev --host 127.0.0.1 --port "$PORT" </dev/null >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "[Atelier] Servidor lanzado con PID ${SERVER_PID}. Esperando respuesta HTTP en http://127.0.0.1:${PORT}..."

# Poll socket for up to 15 seconds
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}" 2>/dev/null | grep -q "200"; then
    echo "[Atelier] Servidor en línea y respondiendo HTTP 200 OK en http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 0.5
done

echo "[Atelier] Error: El servidor no respondió a tiempo. Logs:"
cat "$LOG_FILE"
exit 1
