"""Regenerate the crest at every size the site actually draws it.

A photorealistic seal - embossed metal, a globe, rim lettering - has to survive
being drawn small on a bar that is very nearly its own colour. Nothing here
brightens it. An earlier pass lifted the gold to make it carry, and that is the
wrong instrument at every size: where the rim lettering is not fully resolved
the lift raises the letters and the gaps between them together, so the ring
glows and the text goes to mush, and where it is resolved it simply reads hot.
It is gone. What is left only sharpens and deepens:

  linear light   Downscaling is done in linear light, not sRGB. Averaging a
                 bright gold stroke against dark navy in gamma space returns a
                 value far darker than the eye expects, which is precisely what
                 was eating the rim lettering. Measured, this alone returns
                 about 11% of the luminance of those strokes at 64px.
  clarity        A large-radius, low-amount unsharp raises local contrast, so
                 the embossing reads as relief rather than as texture. This is
                 what gives the mark presence, and it costs no brightness.
  acuity         A small-radius unsharp for edge definition, because any
                 downscale of this much detail softens it. Wound up as the mark
                 gets smaller, where there is less of every stroke to keep.
  deeper field   A slight contrast increase settles the navy down, which is
                 what makes the gold read as gold instead of as yellow.

Alpha is resized separately and premultiplied, and the sharpening is done
against navy rather than against the transparent black outside the disc -
sharpening straight RGBA drags that black into the gold rim as a dark halo.
"""
from PIL import Image, ImageMath, ImageFilter, ImageEnhance
import os

NAVY = (0x11, 0x2A, 0x46)          # header ground; the footer's is a shade deeper
OUT  = 'assets/img'
GAMMA = 2.2

src = Image.open('images/logo.png').convert('RGBA')
src = src.crop(src.getchannel('A').getbbox())   # trust the alpha, not the canvas
w, h = src.size
S = max(w, h)
MASTER = Image.new('RGBA', (S, S), (0, 0, 0, 0))
MASTER.paste(src, ((S - w) // 2, (S - h) // 2), src)       # square the canvas, not the art

def _to_linear(band):
    return ImageMath.lambda_eval(lambda d: (d['x'] / 255.0) ** GAMMA * 255.0, x=band.convert('F'))

def _to_srgb(f):
    return ImageMath.lambda_eval(lambda d: (d['x'] / 255.0) ** (1.0 / GAMMA) * 255.0, x=f)

def linear_resize(im, size):
    """Premultiplied, gamma-correct downscale."""
    r, g, b, a = im.split()
    af = a.convert('F')
    ar = af.resize((size, size), Image.LANCZOS)
    bands = []
    for band in (r, g, b):
        pm = ImageMath.lambda_eval(lambda d: d['l'] * d['al'] / 255.0, l=_to_linear(band), al=af)
        pm = pm.resize((size, size), Image.LANCZOS)
        un = ImageMath.lambda_eval(lambda d: d['p'] * 255.0 / (d['al'] + 0.5), p=pm, al=ar)
        bands.append(_to_srgb(un).convert('L'))
    return Image.merge('RGBA', (*bands, ar.convert('L')))

def acuity_for(size):
    """Edge definition, wound up as the mark gets smaller.

    A downscale of this much detail softens every stroke, and the smaller the
    render the less of each stroke survives to be softened. This is the whole
    budget now that the gold lift is gone: it separates a letter from the ground
    behind it rather than raising both, which is the only thing that makes the
    rim readable rather than merely bright.
    """
    t = min(1.0, max(0.0, (size - 88) / (176 - 88)))
    return round(160 - 55 * t)                      # percent is an int


def render(size):
    acuity = acuity_for(size)
    small = linear_resize(MASTER, size)
    alpha = small.getchannel('A')
    plate = Image.new('RGB', (size, size), NAVY)
    plate.paste(small, (0, 0), small)
    plate = plate.filter(ImageFilter.UnsharpMask(radius=max(1.5, size / 14), percent=55, threshold=0))
    plate = plate.filter(ImageFilter.UnsharpMask(radius=0.5 + size / 340, percent=acuity, threshold=0))
    plate = ImageEnhance.Contrast(plate).enhance(1.10)
    out = plate.convert('RGBA'); out.putalpha(alpha)
    return out

def save(im, name, quantise=True):
    p = os.path.join(OUT, name)
    if quantise:      # 256 colours is indistinguishable here and roughly quarters the file
        im = im.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    im.save(p, optimize=True)
    print(f'  {name:24} {Image.open(p).size[0]:>4}px  {os.path.getsize(p)/1024:6.1f} KB')

# ── the srcset ladder ────────────────────────────────────────────────────────
# Header draws at 64/54/50/46px and the footer at 150/120px, each times a device
# pixel ratio of 1, 2 or 3. The footer sets the top of the ladder: 150px on a 2x
# screen wants 300 real pixels.
#
# 64 and 128 exist so the header never asks the browser to resample. Without a
# 64 step the header at 64px on a 1x screen was served the 88 and scaled down
# in the browser - in gamma space, undoing the linear-light downscale this file
# is careful about, and costing a quarter of the rim contrast (93.5 -> 70.0
# measured). 128 is the same step for a 2x screen. Both land 1:1, so the pixels
# the browser paints are the pixels sharpened here.
print('srcset ladder')
for size, name in ((320, 'logo.png'), (176, 'logo-176.png'), (128, 'logo-128.png'),
                   (88, 'logo-88.png'), (64, 'logo-64.png'), (56, 'logo-56.png')):
    save(render(size), name)

print('icons')
save(render(192), 'icon-192.png')
save(render(32), 'favicon-32.png')

print('matted')
# iOS composites a home screen icon onto black, so this one is not transparent
touch = Image.new('RGB', (180, 180), NAVY); r = render(180); touch.paste(r, (0, 0), r)
touch.save(f'{OUT}/apple-touch-icon.png', optimize=True)
print(f'  {"apple-touch-icon.png":24}  180px  {os.path.getsize(OUT+"/apple-touch-icon.png")/1024:6.1f} KB')

# inlined as a cid: part in every enquiry mail, where base64 inflates it by a third
mail = Image.new('RGB', (184, 184), NAVY); r = render(184); mail.paste(r, (0, 0), r)
mail.quantize(colors=255, method=Image.MEDIANCUT).save(f'{OUT}/logo-email.png', optimize=True)
print(f'  {"logo-email.png":24}  184px  {os.path.getsize(OUT+"/logo-email.png")/1024:6.1f} KB')
