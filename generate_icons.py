#!/usr/bin/env python3
"""Generate CarWise extension icons — blue background, white car silhouette."""
import struct, zlib, math

def make_png(width, height, pixels):
    """Build a minimal PNG from a list of (r,g,b,a) tuples, row by row."""
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += bytes([r, g, b])

    comp = zlib.compress(raw, 9)
    idat = chunk(b'IDAT', comp)
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def draw_icon(size):
    pixels = [(255, 255, 255)] * (size * size)

    cx = size / 2
    cy = size / 2
    r  = size / 2

    # Blue (#1a56db) background circle or rounded rect
    bg_r, bg_g, bg_b = 0x1a, 0x56, 0xdb

    corner = size * 0.22  # corner radius as fraction

    def in_rounded_rect(x, y, rr):
        # Check if pixel is inside a rounded square
        mx = min(x, size - 1 - x)
        my = min(y, size - 1 - y)
        if mx >= rr and my >= rr:
            return True
        if mx < rr and my < rr:
            return math.hypot(rr - mx, rr - my) <= rr
        return mx >= 0 and my >= 0

    def draw_pixel(x, y, r2, g2, b2):
        if 0 <= x < size and 0 <= y < size:
            pixels[y * size + x] = (r2, g2, b2)

    # Fill rounded rectangle background
    for y in range(size):
        for x in range(size):
            if in_rounded_rect(x, y, corner):
                pixels[y * size + x] = (bg_r, bg_g, bg_b)

    # Car body — scaled to icon size
    s = size / 128.0  # scale factor (designed at 128px)

    def fill_rect(x1, y1, x2, y2, r2, g2, b2):
        for yy in range(int(y1), int(y2) + 1):
            for xx in range(int(x1), int(x2) + 1):
                draw_pixel(xx, yy, r2, g2, b2)

    def fill_circle(cx2, cy2, rad, r2, g2, b2):
        for yy in range(int(cy2 - rad) - 1, int(cy2 + rad) + 2):
            for xx in range(int(cx2 - rad) - 1, int(cx2 + rad) + 2):
                if math.hypot(xx - cx2, yy - cy2) <= rad:
                    draw_pixel(xx, yy, r2, g2, b2)

    white = (255, 255, 255)
    dark  = (0x1a, 0x40, 0xaa)   # darker blue for wheels

    # Car base (main body rectangle) — lower half
    body_top    = 68 * s
    body_bottom = 95 * s
    body_left   = 14 * s
    body_right  = 114 * s
    fill_rect(body_left, body_top, body_right, body_bottom, *white)

    # Car cabin (upper body)
    cabin_top    = 42 * s
    cabin_bottom = 70 * s
    cabin_left   = 34 * s
    cabin_right  = 94 * s
    fill_rect(cabin_left, cabin_top, cabin_right, cabin_bottom, *white)

    # Sloped hood (left side triangle approximation)
    for row in range(int(cabin_top), int(body_top + 1)):
        frac = (row - cabin_top) / max(1, body_top - cabin_top)
        x_start = cabin_left - frac * (cabin_left - body_left)
        fill_rect(x_start, row, cabin_left + 1, row, *white)

    # Sloped trunk (right side)
    for row in range(int(cabin_top), int(body_top + 1)):
        frac = (row - cabin_top) / max(1, body_top - cabin_top)
        x_end = cabin_right + frac * (body_right - cabin_right)
        fill_rect(cabin_right - 1, row, x_end, row, *white)

    # Wheels (dark circles)
    wheel_r = 12 * s
    wheel_y = 94 * s
    fill_circle(36 * s, wheel_y, wheel_r, *dark)
    fill_circle(92 * s, wheel_y, wheel_r, *dark)

    # Wheel centers (small white dot)
    dot_r = 4 * s
    fill_circle(36 * s, wheel_y, dot_r, *white)
    fill_circle(92 * s, wheel_y, dot_r, *white)

    # Windows: dark blue rects inside cabin
    win_y1 = (cabin_top + 6 * s)
    win_y2 = (cabin_bottom - 8 * s)
    win_l1 = (cabin_left  + 5 * s)
    win_r1 = (cabin_left  + 22 * s)
    win_l2 = (cabin_right - 22 * s)
    win_r2 = (cabin_right - 5 * s)
    fill_rect(win_l1, win_y1, win_r1, win_y2, *dark)
    fill_rect(win_l2, win_y1, win_r2, win_y2, *dark)

    return pixels

import os
os.makedirs('icons', exist_ok=True)

for size in [16, 48, 128]:
    pixels = draw_icon(size)
    png_data = make_png(size, size, pixels)
    path = f'icons/icon{size}.png'
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'Generated {path} ({size}x{size})')

print('Done.')
