@echo off
chcp 65001 >nul
title E-Radio Magazine - Regenerar articles.json

echo ==========================================
echo  REGENERAR DATA/ARTICLES.JSON
echo  E-Radio Magazine
echo ==========================================
echo.
echo Esto reindexa TODOS los articulos de articulos\
echo (nuevos y viejos) para la portada, busqueda,
echo filtros y "Cargar mas".
echo.

cd /d "%~dp0.."

python scripts\generate_json.py
if errorlevel 1 (
    echo.
    echo ERROR: revisa que Python este instalado y en el PATH.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  LISTO. Ahora sube los cambios a GitHub:
echo    git add data/articles.json articulos/
echo    git commit -m "Actualizar indice de articulos"
echo    git push
echo ==========================================
echo.
pause
