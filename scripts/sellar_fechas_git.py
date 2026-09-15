#!/usr/bin/env python3
"""
Sella article:published_time en articulos sin fecha, usando el PRIMER commit
de git en el que aparecio cada archivo (fecha real de publicacion).

Idempotente: los archivos que ya tienen article:published_time no se tocan.
Requiere repo git con historial completo (git fetch --unshallow si hace falta).

Uso:  python scripts/sellar_fechas_git.py
"""

import os
import re
import subprocess
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIR_ARTICULOS = os.path.join(RAIZ, 'articulos')

# Formato ISO que usa el sitio: YYYY-MM-DD
FMT = '%Y-%m-%d'


def run(args):
    return subprocess.run(args, cwd=RAIZ, capture_output=True, text=True).stdout


def main():
    archivos = sorted(f for f in os.listdir(DIR_ARTICULOS) if f.lower().endswith('.html'))
    sellados, ya, sin_historial = 0, 0, []

    for filename in archivos:
        ruta = os.path.join('articulos', filename)
        path_fs = os.path.join(DIR_ARTICULOS, filename)
        with open(path_fs, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()

        if re.search(r'name=["\']article:published_time["\']', html):
            ya += 1
            continue

        # Primer commit que toco este archivo (fecha real de publicacion)
        out = run(['git', 'log', '--follow', '--reverse', '--date=format:%Y-%m-%d',
                   '--format=%ad', '--', ruta])
        fechas = [l.strip() for l in out.splitlines() if l.strip()]
        if not fechas:
            sin_historial.append(filename)
            continue
        fecha = fechas[0]

        etiqueta = (f'  <meta name="article:published_time" content="{fecha}">\n')
        nuevo = re.sub(r'</head>', etiqueta + '</head>', html, count=1, flags=re.IGNORECASE)
        if nuevo != html:
            with open(path_fs, 'w', encoding='utf-8', newline='') as f:
                f.write(nuevo)
            sellados += 1
            print(f"SELLADO {fecha}  {filename}")
        else:
            sin_historial.append(filename)

    print(f"\nResumen: {sellados} sellados, {ya} ya tenian fecha, "
          f"{len(sin_historial)} sin historial git")
    if sin_historial:
        for f in sin_historial:
            print(f"  - SIN HISTORIAL: {f}")
        sys.exit(2)


if __name__ == '__main__':
    main()
