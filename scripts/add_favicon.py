#!/usr/bin/env python3
"""Inserta el favicon del logo en index, pages y todos los articulos. Uso unico."""
import glob
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FAV_ROOT = (
    '  <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">\n'
    '  <link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">\n'
    '  <link rel="shortcut icon" href="assets/favicon.ico">\n'
    '  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">\n'
)
FAV_SUB = (
    '  <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">\n'
    '  <link rel="icon" type="image/png" sizes="192x192" href="../assets/favicon-192.png">\n'
    '  <link rel="shortcut icon" href="../assets/favicon.ico">\n'
    '  <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">\n'
)

def procesar(ruta, fav_nuevo, marcador):
    with open(ruta, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    if 'favicon-32.png' in html:
        return 'ya'
    if marcador not in html:
        return 'SIN MARCADOR'
    html = html.replace(marcador, fav_nuevo + marcador, 1)
    with open(ruta, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    return 'ok'

resumen = {}

# index + pages: reemplazar el link de emoji por los nuevos
emoji_variants = [
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>\U0001F4FB</text></svg>">\n',
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=.9em font-size=90>\U0001F4FB</text></svg>">\n',
]
for ruta in sorted(glob.glob(os.path.join(RAIZ, 'index.html')) + glob.glob(os.path.join(RAIZ, 'page*.html'))):
    with open(ruta, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    if 'favicon-32.png' in html:
        resumen[os.path.basename(ruta)] = 'ya'
        continue
    hecho = False
    for ev in emoji_variants:
        if ev in html:
            html = html.replace(ev, FAV_ROOT, 1)
            hecho = True
            break
    if not hecho:
        resumen[os.path.basename(ruta)] = 'SIN EMOJI'
        continue
    with open(ruta, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    resumen[os.path.basename(ruta)] = 'ok'

# articulos: insertar antes del stylesheet
marcador = '<link rel="stylesheet" href="../css/styles.css">'
for ruta in sorted(glob.glob(os.path.join(RAIZ, 'articulos', '*.html'))):
    r = procesar(ruta, FAV_SUB, marcador)
    resumen['articulos/' + os.path.basename(ruta)] = r

fallos = {k: v for k, v in resumen.items() if v not in ('ok', 'ya')}
oks = sum(1 for v in resumen.values() if v == 'ok')
yas = sum(1 for v in resumen.values() if v == 'ya')
print(f'OK nuevos: {oks} | ya tenian: {yas} | fallos: {len(fallos)}')
for k, v in fallos.items():
    print(' FALLO:', k, '->', v)
