"""Cut the crest out of its black background and write the RGBA master.

build-logo.py needs a master with a real alpha channel: it resizes alpha
separately and premultiplies, and it sharpens against navy rather than against
whatever sits outside the disc. The artwork we are given is a JPEG, which
cannot carry alpha, so the background has to be reconstructed before that
pipeline can run.

Three things make a naive key wrong here:

  no global threshold   About one pixel in eight inside the disc is darker
                        than the background it sits on - the navy field, the
                        engraved outlines, the shadow under the anchors. A
                        "make black transparent" pass punches holes straight
                        through the crest. So the cut is a flood fill inwards
                        from the border: only black that is *connected to the
                        outside* becomes transparent, and enclosed black stays.

  the rim is not sealed The anchors cross the lower rim, leaving a gap the fill
                        can walk through. Once inside it runs along the shadow
                        under the laurel and eats it. Measured on this artwork,
                        a threshold of 34 puts 2534 background pixels inside
                        the disc and 24 puts 8; 20 and below put none. Hence
                        DARK below - the headroom is spent on sealing that gap,
                        and it costs only 0.6% of the background left behind,
                        which the erode below takes anyway.

  erode, do not feather The edge pixels of a JPEG on black are composited
                        against that black, so their colour is already
                        darkened. Keeping them and calling them opaque leaves a
                        dark fringe once the mark is drawn on navy; dividing
                        the darkening back out needs an alpha we do not know.
                        Cheaper and cleaner to drop that ambiguous ring: erode
                        one pixel, then blur, so the boundary lands just inside
                        the real edge. One pixel of 894 is a third of a pixel at
                        the largest size the site draws.

The output is cropped to the crest so the art is centred by construction,
which is what lets build-logo.py square the canvas without a hand-tuned nudge.
"""
from PIL import Image, ImageChops, ImageFilter
from collections import deque
import os
import sys

SRC = 'images/logo-1.jpeg'      # the crest on a solid black ground
OUT = 'images/logo.png'
DARK = 20                       # a pixel this dark, reached from the border, is background
MAX_LEAK = 50                   # background pixels allowed inside the disc

# Keyed on the brightest channel, not on luma. The darkest real parts of the
# crest are navy, which is blue-heavy: max(R,G,B) reads about 75 there where
# luma reads 47, so the gap to a black background is wider on every pixel that
# matters.
im = Image.open(SRC).convert('RGB')
W, H = im.size
r, g, b = im.split()
key = ImageChops.lighter(ImageChops.lighter(r, g), b).load()

# ── flood fill the background inwards from every border pixel ────────────────
bg = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if key[x, y] <= DARK and not bg[y * W + x]:
            bg[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if key[x, y] <= DARK and not bg[y * W + x]:
            bg[y * W + x] = 1; q.append((x, y))

while q:
    x, y = q.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < W and 0 <= ny < H:
            i = ny * W + nx
            if not bg[i] and key[nx, ny] <= DARK:
                bg[i] = 1; q.append((nx, ny))

alpha = Image.frombytes('L', (W, H), bytes(255 if not v else 0 for v in bg))
box = alpha.getbbox()
x0, y0, x1, y1 = box
cx, cy = (x0 + x1 - 1) / 2, (y0 + y1 - 1) / 2
ax, ay = (x1 - x0) / 2, (y1 - y0) / 2

# ── a leak is background that ended up inside the disc ───────────────────────
# It is a thin finger, so it barely moves the total and is easy to miss in a
# thumbnail - it shipped once already, eating half the laurel. Measure it
# where it matters and refuse to write a bad master.
leak = 0
for i, v in enumerate(bg):
    if v and ((i % W - cx) / ax) ** 2 + ((i // W - cy) / ay) ** 2 < 0.95 ** 2:
        leak += 1

# ── pull the boundary a pixel inside the composited edge, then soften ────────
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
out = im.convert('RGBA')
out.putalpha(alpha)
out = out.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox())

bw, bh = out.size
print(f'source      {W}x{H}  {os.path.getsize(SRC) / 1024:.0f} KB')
print(f'background  {sum(bg)} px ({sum(bg) * 100 // (W * H)}% of frame) keyed out')
print(f'crest       {bw}x{bh}  aspect {bw / bh:.3f}')
print(f'leak        {leak} background px inside the disc (limit {MAX_LEAK})')

if leak > MAX_LEAK:
    sys.exit(f'FAILED: the fill leaked into the crest. Lower DARK and run again.')

out.save(OUT, optimize=True)
print(f'written     {OUT}  {os.path.getsize(OUT) / 1024:.0f} KB')
