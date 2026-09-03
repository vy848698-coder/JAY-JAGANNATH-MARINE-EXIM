"""Regenerate the crest at every size the site actually draws it.

A photorealistic seal - embossed metal, a globe, rim lettering - has to survive
being drawn at 64px on a bar that is very nearly its own colour. The first pass
at this simply brightened the whole mark, which is the wrong instrument: it
lifts the navy field along with the gold, so the seal loses its depth and reads
as a faded sticker. Nothing here raises overall brightness. Instead:

  linear light   Downscaling is done in linear light, not sRGB. Averaging a
                 bright gold stroke against dark navy in gamma space returns a
                 value far darker than the eye expects, which is precisely what
                 was eating the rim lettering. Measured, this alone returns
                 about 11% of the luminance of those strokes at 64px.
  clarity        A large-radius, low-amount unsharp raises local contrast, so
                 the embossing reads as relief rather than as texture. This is
                 what gives the mark presence, and it costs no brightness.
  acuity         A small-radius unsharp for edge definition, because any
                 downscale of this much detail softens it.
  gold only      The lift is masked to the warm hues - ring, rim text,
                 monogram, compass, sextant. The navy field is left alone, so
                 contrast against it goes up rather than down.
  deeper field   A slight contrast increase settles the navy back down, which
                 is what makes the gold read as gold instead of as yellow.

Alpha is resized separately and premultiplied, and the sharpening is done
against navy rather than against the transparent black outside the disc -
sharpening straight RGBA drags that black into the gold rim as a dark halo.
"""
from PIL import Image, ImageMath, ImageFilter, ImageEnhance, ImageChops
import os

NAVY = (0x11, 0x2A, 0x46)          # header ground; the footer's is a shade deeper
OUT  = 'assets/img'
GAMMA = 2.2

src = Image.open('images/logo.png').convert('RGBA')
w, h = src.size                     # 819 x 849, crest spanning x 1..817, y 1..847
S = max(w, h)
MASTER = Image.new('RGBA', (S, S), (0, 0, 0, 0))
MASTER.paste(src, ((S - w) // 2 + 1, (S - h) // 2), src)   # square the canvas, not the art

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

def gold_mask(rgb):
    """Warm, saturated pixels only - the metal. Feathered so the lift has no edge."""
    hue, sat, _ = rgb.convert('HSV').split()
    warm = hue.point(lambda v: 255 if 12 <= v <= 54 else 0)
    real = sat.point(lambda v: 255 if v >= 45 else 0)      # keeps greys and the navy out
    return ImageChops.multiply(warm, real).filter(ImageFilter.GaussianBlur(0.8))

def render(size):
    small = linear_resize(MASTER, size)
    alpha = small.getchannel('A')
    plate = Image.new('RGB', (size, size), NAVY)
    plate.paste(small, (0, 0), small)
    plate = plate.filter(ImageFilter.UnsharpMask(radius=max(1.5, size / 14), percent=55, threshold=0))
    plate = plate.filter(ImageFilter.UnsharpMask(radius=0.5 + size / 340, percent=105, threshold=0))
    hot = ImageEnhance.Color(ImageEnhance.Brightness(plate).enhance(1.30)).enhance(1.16)
    plate = Image.composite(hot, plate, gold_mask(plate))
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
print('srcset ladder')
for size, name in ((320, 'logo.png'), (176, 'logo-176.png'),
                   (88, 'logo-88.png'), (56, 'logo-56.png')):
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
