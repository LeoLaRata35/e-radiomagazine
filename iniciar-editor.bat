@echo off
cd /d "%~dp0"
echo Abriendo editor en http://localhost:8000/editor-private.html
start http://localhost:8000/editor-private.html
python -m http.server 8000
pause
