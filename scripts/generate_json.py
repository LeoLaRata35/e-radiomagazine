#!/usr/bin/env python3
"""
Generador de data/articles.json — E-Radio Magazine
Escanea articulos/*.html y crea data/articles.json (schema identico al original).

Portable: se ejecuta desde cualquier carpeta del repo, en cualquier SO.
Sin dependencias externas (solo libreria estandar).

Prioridad de fechas:
  1. meta article:published_time del articulo
  2. fecha que ya tenia ese articulo en el articles.json anterior
  3. fecha de la tarjeta estatica en index.html (si existe)
  4. fecha de modificacion del archivo

Duplicados: solo se considera duplicado el og:title identico (los archivos
tipo "ranma1_2(1).html" suelen ser articulos DISTINTOS, nunca se descartan
por el nombre). Entre copias se prefiere conservar la URL que ya existia.

Uso:
    python scripts/generate_json.py
    python scripts/generate_json.py --raiz C:\\ruta\\al\\repo   (opcional)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

MESES = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}
MESES_INVERSO = {v: k for k, v in MESES.items()}

ETIQUETAS_CATEGORIA = {
    'anime': 'Anime', 'manga': 'Manga', 'videojuegos': 'Videojuegos',
    'cine': 'Cine', 'musica': 'Musica', 'reviews': 'Reviews',
    'game': 'Videojuegos',
}


def meta(html, attr, valor):
    """Extrae content de <meta attr="valor" content="..."> (orden indistinto)."""
    for patron in (
        r'<meta\s[^>]*?' + attr + r'=["\']' + re.escape(valor) + r'["\'][^>]*?content=["\']([^"\']*)["\']',
        r'<meta\s[^>]*?content=["\']([^"\']*)["\'][^>]*?' + attr + r'=["\']' + re.escape(valor) + r'["\']',
    ):
        m = re.search(patron, html, re.IGNORECASE)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return None


def titulo_respaldo(html):
    """Fallback: <title> o primer <h1> si falta og:title."""
    m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    if m and m.group(1).strip():
        return m.group(1).strip()
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
    if m:
        texto = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if texto:
            return texto
    return None


def fecha_legible(iso_fecha):
    try:
        dt = datetime.strptime(iso_fecha, "%Y-%m-%d")
        return f"{dt.day} {MESES[dt.strftime('%m')]} {dt.year}"
    except (ValueError, KeyError):
        return iso_fecha


def fecha_legible_a_iso(texto):
    """'27 Jun 2026' -> '2026-06-27' (o None si no se puede)."""
    m = re.match(r'^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$', str(texto).strip())
    if m and m.group(2) in MESES_INVERSO:
        return f"{m.group(3)}-{MESES_INVERSO[m.group(2)]}-{int(m.group(1)):02d}"
    return None


def cargar_json_anterior(ruta):
    """Devuelve {href: fecha_legible} del articles.json previo, si existe."""
    resultado = {}
    if os.path.isfile(ruta):
        try:
            with open(ruta, 'r', encoding='utf-8') as f:
                for a in json.load(f):
                    if a.get('href') and a.get('date'):
                        resultado[a['href']] = a['date']
        except (json.JSONDecodeError, OSError):
            pass
    return resultado


def cargar_fechas_tarjetas(ruta_index):
    """Devuelve {href: fecha_legible} de las tarjetas estaticas de index.html."""
    resultado = {}
    if not os.path.isfile(ruta_index):
        return resultado
    with open(ruta_index, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    for bloque in re.findall(r'<article class="article-card".*?</article>', html, re.DOTALL | re.IGNORECASE):
        m_href = re.search(r'class="read-more"\s+href="([^"]+)"', bloque)
        m_fecha = re.search(r'class="article-date">([^<]+)<', bloque)
        if m_href and m_fecha:
            resultado[m_href.group(1).strip()] = m_fecha.group(1).strip()
    return resultado


def main():
    parser = argparse.ArgumentParser(description="Regenera data/articles.json")
    parser.add_argument('--raiz', default=None,
                        help='Carpeta raiz del repo (por defecto: la de este script, ..)')
    args = parser.parse_args()

    raiz = args.raiz or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dir_articulos = os.path.join(raiz, 'articulos')
    ruta_salida = os.path.join(raiz, 'data', 'articles.json')
    ruta_index = os.path.join(raiz, 'index.html')

    if not os.path.isdir(dir_articulos):
        print(f"ERROR: no existe la carpeta {dir_articulos}", file=sys.stderr)
        sys.exit(1)

    fechas_previas = cargar_json_anterior(ruta_salida)
    fechas_tarjetas = cargar_fechas_tarjetas(ruta_index)

    candidatos = []   # articulos parseados
    avisos = []

    for filename in sorted(os.listdir(dir_articulos)):
        if not filename.lower().endswith('.html'):
            continue
        ruta = os.path.join(dir_articulos, filename)
        with open(ruta, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()

        titulo = meta(html, 'property', 'og:title') or meta(html, 'name', 'og:title')
        if not titulo:
            titulo = titulo_respaldo(html)
        if not titulo:
            avisos.append(f"SIN TITULO, se omite: {filename}")
            continue

        href = f'articulos/{filename}'
        publicado = meta(html, 'name', 'article:published_time')
        origen_fecha = 'meta'
        if not publicado and href in fechas_previas:
            publicado = fecha_legible_a_iso(fechas_previas[href]) or fechas_previas[href]
            origen_fecha = 'json anterior'
        if not publicado and href in fechas_tarjetas:
            publicado = fecha_legible_a_iso(fechas_tarjetas[href])
            origen_fecha = 'tarjeta index'
        if not publicado:
            publicado = datetime.fromtimestamp(os.path.getmtime(ruta)).strftime('%Y-%m-%d')
            origen_fecha = 'mtime'
            avisos.append(f"SIN fecha conocida, usa mtime: {filename} -> {publicado}")

        descripcion = meta(html, 'property', 'og:description') or meta(html, 'name', 'og:description') or ''
        imagen = meta(html, 'property', 'og:image') or meta(html, 'name', 'og:image')
        if not imagen:
            imagen = 'https://leolarata35.github.io/e-radiomagazine/assets/default.png'
            avisos.append(f"SIN og:image: {filename}")

        categoria = meta(html, 'name', 'article:category') or 'anime'

        candidatos.append({
            'filename': filename,
            'href': href,
            'titulo': titulo.strip(),
            'clave_titulo': titulo.strip().casefold(),
            'category': categoria,
            'categoryLabel': ETIQUETAS_CATEGORIA.get(categoria, categoria.capitalize()),
            'img': imagen,
            'description': descripcion,
            'publicado': publicado,
            'origen_fecha': origen_fecha,
        })

    # Dedupe SOLO por titulo identico: se conserva la variante cuya URL ya
    # existia en el JSON anterior (o en las tarjetas de index.html).
    por_titulo = {}
    for c in candidatos:
        por_titulo.setdefault(c['clave_titulo'], []).append(c)

    articulos = []
    for grupo in por_titulo.values():
        if len(grupo) == 1:
            articulos.append(grupo[0])
            continue
        def prioridad(c):
            return (0 if c['href'] in fechas_previas else 1,
                    0 if c['href'] in fechas_tarjetas else 1,
                    c['filename'])
        grupo.sort(key=prioridad)
        elegido = grupo[0]
        articulos.append(elegido)
        for c in grupo[1:]:
            avisos.append(f"DUPLICADO (mismo titulo): {c['filename']} == {elegido['filename']} (se omite)")

    articulos.sort(key=lambda c: c['publicado'], reverse=True)

    salida = [{
        'category': c['category'],
        'img': c['img'],
        'date': fecha_legible(c['publicado']),
        'categoryLabel': c['categoryLabel'],
        'title': c['titulo'],
        'description': c['description'],
        'href': c['href'],
    } for c in articulos]

    os.makedirs(os.path.dirname(ruta_salida), exist_ok=True)
    with open(ruta_salida, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(salida, f, indent=4, ensure_ascii=False)

    print(f"OK: {len(salida)} articulos -> {ruta_salida}")
    con_meta = sum(1 for c in articulos if c['origen_fecha'] == 'meta')
    print(f"Fechas: {con_meta} desde meta, {len(articulos) - con_meta} recuperadas (json anterior / index / mtime)")
    if avisos:
        print(f"\nAvisos ({len(avisos)}):")
        for aviso in avisos:
            print(f"  - {aviso}")


if __name__ == '__main__':
    main()
