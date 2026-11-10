#!/usr/bin/env python3
"""Comprime las imágenes de assets/ para que el sitio quepa en GitHub Pages (1 GB).

Es idempotente: solo reescribe un archivo si el ahorro es de al menos MIN_GAIN,
así que pasar la compresión sobre imágenes ya optimizadas no hace nada.

Uso:
    python scripts/comprimir-imagenes.py            # aplica cambios
    python scripts/comprimir-imagenes.py --dry-run  # solo informa
"""

import argparse
import io
import os
import sys

from PIL import Image

MAX_SIDE = 1600        # lado mayor máximo, en px
JPEG_QUALITY = 82
MIN_SIZE = 120 * 1024  # ignorar archivos ya pequeños
MIN_GAIN = 0.10        # no reescribir si se ahorra menos del 10%
FORMATOS = {"PNG", "JPEG"}
DIRS_IGNORADOS = {".git", "node_modules", "vendor", "video_tmp"}


def tiene_transparencia_real(im):
    """True solo si hay píxeles realmente translúcidos (un alfa todo a 255 no cuenta)."""
    if im.mode in ("RGBA", "LA"):
        alfa = im.getchannel("A")
        return alfa.getextrema()[0] < 255
    if im.mode == "P":
        return "transparency" in im.info
    return False


def codificar(im):
    """Devuelve los bytes de la versión comprimida, o None si no se puede mejorar."""
    tiene_alfa = tiene_transparencia_real(im)
    trabajo = im.copy()

    if not tiene_alfa:
        if trabajo.mode in ("RGBA", "LA", "P"):
            trabajo = trabajo.convert("RGB")
        elif trabajo.mode not in ("RGB", "L"):
            trabajo = trabajo.convert("RGB")

    if max(trabajo.size) > MAX_SIDE:
        trabajo.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)

    buf = io.BytesIO()
    try:
        if im.format == "JPEG":
            rgb = trabajo.convert("RGB")
            extra = {}
            if im.info.get("icc_profile"):
                extra["icc_profile"] = im.info["icc_profile"]
            rgb.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True,
                     progressive=True, **extra)
        else:  # PNG
            if tiene_alfa:
                return None  # paletizar rompería el alfa; mejor no tocarlo
            cuantizada = trabajo.convert("RGB").quantize(
                colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG
            )
            cuantizada.save(buf, "PNG", optimize=True)
    except Exception as e:  # noqa: BLE001
        print(f"  ! {e}")
        return None
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rutas", nargs="*", default=["assets"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    archivos = []
    for raiz in args.rutas:
        if not os.path.isdir(raiz):
            continue
        for dirpath, dirnames, filenames in os.walk(raiz):
            dirnames[:] = [d for d in dirnames if d not in DIRS_IGNORADOS]
            archivos += [os.path.join(dirpath, f) for f in filenames]

    total_antes = total_despues = 0
    cambiados = errores = 0

    for ruta in sorted(archivos):
        try:
            antes = os.path.getsize(ruta)
        except OSError:
            continue
        if antes < MIN_SIZE:
            continue
        try:
            with Image.open(ruta) as im:
                if im.format not in FORMATOS:
                    continue
                nuevo = codificar(im)
        except Exception as e:  # noqa: BLE001
            print(f"  ! no se pudo abrir {ruta}: {e}")
            errores += 1
            continue

        if nuevo is None:
            continue
        ahorro = 1 - len(nuevo) / antes
        if ahorro < MIN_GAIN:
            continue

        total_antes += antes
        total_despues += len(nuevo)
        cambiados += 1
        print(f"  {antes/1024:7.0f} KB -> {len(nuevo)/1024:6.0f} KB  {ruta}")
        if not args.dry_run:
            tmp = ruta + ".tmp"
            with open(tmp, "wb") as fh:
                fh.write(nuevo)
            os.replace(tmp, ruta)

    accion = "se comprimirían" if args.dry_run else "comprimidas"
    print(f"\n{cambiados} imágenes {accion} ({errores} errores)")
    if cambiados:
        print(f"Ahorro: {(total_antes - total_despues) / 1048576:.1f} MB "
              f"({total_antes/1048576:.0f} MB -> {total_despues/1048576:.0f} MB)")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
