# -*- coding: utf-8 -*-
"""Corrige las metaetiquetas og:url de articulos/*.html.

Deberían apuntar a la propia URL del artículo, pero el editor genera el
og:url desde el slug del título, así que los archivos con sufijo "(1)",
"(2)" etc. acaban apuntando a otro artículo. Este script detecta los
desajustes y reescribe el og:url con la URL real del archivo.
"""
import io
import os
import re
import sys
from urllib.parse import quote, unquote

BASE = os.path.join(os.path.dirname(__file__), "..", "articulos")
SITE = "https://leolarata35.github.io/e-radiomagazine/articulos/"
OG_URL_RE = re.compile(r'(<meta property="og:url" content=")([^"]*)(")')


def main(apply: bool) -> None:
    fixed = []
    for name in sorted(os.listdir(BASE)):
        if not name.endswith(".html"):
            continue
        path = os.path.join(BASE, name)
        with io.open(path, "r", encoding="utf-8") as f:
            text = f.read()
        m = OG_URL_RE.search(text)
        if not m:
            print("SIN og:url :", name)
            continue
        current = m.group(2)
        current_file = unquote(current.rstrip("/").rsplit("/", 1)[-1])
        if current_file == name:
            continue
        correct = SITE + quote(name)
        print("MAL:" if apply else "DESCUBIERTO:", name)
        print("   actual  :", current)
        print("   correcto:", correct)
        if apply:
            fixed.append(name)
            new_text = OG_URL_RE.sub(lambda mm: mm.group(1) + correct + mm.group(3), text)
            with io.open(path, "w", encoding="utf-8", newline="") as f:
                f.write(new_text)
    if apply:
        print()
        print("Corregidos:", len(fixed), "archivo(s)")


if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
