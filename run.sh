#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-5173}"
LOG_FILE="/tmp/atelier-analytics.log"

echo "[Atelier] Iniciando servidor de analítica visual en puerto ${PORT}..."

# Kill any lingering process on the target port
if lsof -i :"$PORT" -t >/dev/null 2>&1; then
  echo "[Atelier] Liberando puerto ${PORT}..."
  kill -9 $(lsof -i :"$PORT" -t) 2>/dev/null || true
  sleep 1
fi

# Launch background server detached from stdin/signals
cd "$DIR"
nohup bun run dev --host 127.0.0.1 --port "$PORT" </dev/null >"$LOG_FILE" 2>&1 &
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
