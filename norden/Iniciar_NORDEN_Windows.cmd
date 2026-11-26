@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 24 ou superior antes de iniciar.
  pause
  exit /b 1
)
node src\seed.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Abra http://127.0.0.1:4173 no navegador.
echo Mantenha esta janela aberta durante a demonstracao.
echo.
node src\server.mjs
pause
