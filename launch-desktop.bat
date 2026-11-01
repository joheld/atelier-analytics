@echo off
setlocal
echo [Atelier] Iniciando Atelier Analytics en Windows...

set "PORT=5173"
set "URL=http://localhost:%PORT%"

:: Open default browser
start "" "%URL%"

:: Check if bun is installed, else use npm
where bun >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [Atelier] Ejecutando con Bun...
    bun dev
) else (
    echo [Atelier] Ejecutando con NPM...
    npm run dev
)

endlocal
