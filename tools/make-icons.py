#!/usr/bin/env python3
"""Render Dither Lab's icons (stdlib only): a Bayer-dithered moon with a halation ring.

Writes web/icons/*.png + icon.svg and "Dither Lab.app/Contents/Resources/AppIcon.icns".
Run from anywhere:  python3 tools/make-icons.py
"""
import math
import os
import shutil
import struct
import subprocess
import tempfile
import zlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ICONS = os.path.join(ROOT, "web", "icons")
APP_RES = os.path.join(ROOT, "Dither Lab.app", "Contents", "Resources")

INK = (22, 21, 19)
PAPER = (239, 233, 218)
HALATION = (255, 84, 44)
BAYER8 = [
    [0, 48, 12, 60, 3, 51, 15, 63], [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55], [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61], [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53], [42, 26, 38, 22, 41, 25, 37, 21],
]


def write_png(path, w, h, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * w * 4:(y + 1) * w * 4])

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def cell_colour(cx, cy, n):
    """Colour of one dither cell on an n×n grid (the plate)."""
    u = (cx + 0.5) / n - 0.5
    v = (cy + 0.5) / n - 0.5
    r = 0.29
    d = math.hypot(u, v)
    t = (BAYER8[cy % 8][cx % 8] + 0.5) / 64
    lx, ly = -0.62, -0.58  # light from the upper left
    if d < r:
        nz = math.sqrt(max(0.0, 1 - (d / r) ** 2))
        nx, ny = u / r, v / r
        light = max(0.0, lx * nx + ly * ny + 0.53 * nz)
        tone = min(1.0, 0.04 + 1.05 * light ** 1.1)
        return PAPER if tone > t else INK
    # halation: a thin red fringe, strongest beside the lit limb
    facing = max(0.0, (lx * u + ly * v) / d)
    halo = math.exp(-((d - r) / 0.045) ** 2) * (0.02 + 0.6 * facing)
    if halo > t:
        return HALATION
    if d > r + 0.1 and 0.12 < (cx + 0.5) / n < 0.88 and 0.12 < (cy + 0.5) / n < 0.88 and (cx * 7 + cy * 13) % 89 == 0:
        return PAPER
    return INK


def render(size, full_bleed):
    """macOS-style rounded plate (or full-bleed for maskable) with a dithered moon."""
    n = 32  # dither cells across the plate
    plate = size if full_bleed else round(size * 824 / 1024)
    off = (size - plate) / 2
    radius = 0 if full_bleed else plate * 0.2237
    inner = plate * (0.8 if full_bleed else 1.0)  # maskable safe zone
    ioff = off + (plate - inner) / 2
    cell = inner / n
    grid = [[cell_colour(x, y, n) for x in range(n)] for y in range(n)]
    buf = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            px, py = x + 0.5 - off, y + 0.5 - off
            # rounded-rect coverage (1px AA)
            if full_bleed:
                cov = 1.0
            else:
                qx = max(abs(px - plate / 2) - (plate / 2 - radius), 0)
                qy = max(abs(py - plate / 2) - (plate / 2 - radius), 0)
                dist = math.hypot(qx, qy) - radius
                cov = min(1.0, max(0.0, 0.5 - dist))
            if cov <= 0:
                continue
            gx = int((x + 0.5 - ioff) // cell)
            gy = int((y + 0.5 - ioff) // cell)
            col = grid[gy][gx] if 0 <= gx < n and 0 <= gy < n else INK
            o = (y * size + x) * 4
            buf[o:o + 4] = bytes((col[0], col[1], col[2], round(cov * 255)))
    return buf


def svg_icon():
    n = 32
    rects = []
    for y in range(n):
        for x in range(n):
            c = cell_colour(x, y, n)
            if c != INK:
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"/>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
        f'<rect width="{n}" height="{n}" rx="7.16" fill="#161513"/>{"".join(rects)}</svg>\n'
    )


def main():
    os.makedirs(ICONS, exist_ok=True)
    master = render(1024, False)
    tmp = tempfile.mkdtemp()
    try:
        mpath = os.path.join(tmp, "master.png")
        write_png(mpath, 1024, 1024, master)
        write_png(os.path.join(ICONS, "icon-maskable-512.png"), 512, 512, render(512, True))
        for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
            out = os.path.join(ICONS, name)
            subprocess.run(["sips", "-z", str(size), str(size), mpath, "--out", out], check=True, capture_output=True)
        with open(os.path.join(ICONS, "icon.svg"), "w") as f:
            f.write(svg_icon())
        # macOS .icns for the launcher
        iconset = os.path.join(tmp, "AppIcon.iconset")
        os.makedirs(iconset)
        for base in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                px = base * scale
                name = f"icon_{base}x{base}{'@2x' if scale == 2 else ''}.png"
                subprocess.run(["sips", "-z", str(px), str(px), mpath, "--out", os.path.join(iconset, name)], check=True, capture_output=True)
        os.makedirs(APP_RES, exist_ok=True)
        subprocess.run(["iconutil", "-c", "icns", iconset, "-o", os.path.join(APP_RES, "AppIcon.icns")], check=True)
    finally:
        shutil.rmtree(tmp)
    print("icons written to", ICONS, "and", APP_RES)


if __name__ == "__main__":
    main()
