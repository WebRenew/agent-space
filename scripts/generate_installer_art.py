#!/usr/bin/env python3

from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RESOURCES_DIR = ROOT / "resources"
BUILD_DIR = ROOT / "build"
WEB_APP_DIR = ROOT / "web" / "src" / "app"

DMG_BACKGROUND_PATH = RESOURCES_DIR / "dmg-background.png"
ICON_ICNS_PATH = RESOURCES_DIR / "icon.icns"
BUILD_ICON_ICNS_PATH = BUILD_DIR / "icon.icns"
WEB_ICON_PATH = WEB_APP_DIR / "icon.png"
WEB_APPLE_ICON_PATH = WEB_APP_DIR / "apple-icon.png"

SF_FONT = Path("/System/Library/Fonts/SFNS.ttf")
ARIAL_FONT = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
ARIAL_BOLD_FONT = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [ARIAL_BOLD_FONT, SF_FONT] if bold else [SF_FONT, ARIAL_FONT]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def lerp_channel(start: int, end: int, ratio: float) -> int:
    return round(start + (end - start) * ratio)


def lerp_color(start: tuple[int, int, int], end: tuple[int, int, int], ratio: float) -> tuple[int, int, int]:
    return tuple(lerp_channel(a, b, ratio) for a, b in zip(start, end))


def add_linear_gradient(image: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    width, height = image.size
    gradient = Image.new("RGBA", image.size)
    pixels = gradient.load()
    for y in range(height):
        y_ratio = y / max(height - 1, 1)
        base = lerp_color(top, bottom, y_ratio)
        for x in range(width):
            x_ratio = x / max(width - 1, 1)
            wash = lerp_color(base, (245, 247, 250), 0.08 * (1 - x_ratio))
            pixels[x, y] = (*wash, 255)
    image.alpha_composite(gradient)


def add_glow(image: Image.Image, box: tuple[int, int, int, int], color: tuple[int, int, int, int], blur: int) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    image.alpha_composite(layer)


def add_panel(
    image: Image.Image,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
) -> None:
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [box[0] + 8, box[1] + 12, box[2] + 8, box[3] + 18],
        radius=34,
        fill=(31, 43, 54, 38),
    )
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(box, radius=34, fill=fill, outline=outline, width=2)
    draw.rounded_rectangle([box[0] + 18, box[1] + 18, box[2] - 18, box[1] + 34], radius=8, fill=accent)

    for offset in range(box[0] + 22, box[2] - 22, 42):
        draw.line([(offset, box[1] + 52), (offset, box[3] - 22)], fill=(77, 98, 114, 18), width=1)
    for offset in range(box[1] + 60, box[3] - 20, 42):
        draw.line([(box[0] + 22, offset), (box[2] - 22, offset)], fill=(77, 98, 114, 16), width=1)

    image.alpha_composite(layer)


def draw_background() -> Image.Image:
    image = Image.new("RGBA", (920, 560), (0, 0, 0, 0))
    add_linear_gradient(image, (247, 242, 232), (226, 234, 240))

    width, height = image.size
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for x in range(0, width, 48):
        draw.line([(x, 0), (x, height)], fill=(63, 81, 92, 18), width=1)
    for y in range(0, height, 48):
        draw.line([(0, y), (width, y)], fill=(63, 81, 92, 18), width=1)

    image.alpha_composite(layer)
    add_glow(image, (-120, -80, 280, 280), (82, 133, 94, 90), 60)
    add_glow(image, (640, -110, 1040, 250), (219, 158, 75, 70), 70)
    add_glow(image, (250, 220, 680, 620), (72, 108, 130, 42), 90)

    add_panel(
        image,
        (72, 132, 388, 454),
        (253, 250, 243, 225),
        (97, 118, 130, 58),
        (89, 140, 90, 70),
    )
    add_panel(
        image,
        (532, 132, 848, 454),
        (250, 252, 255, 225),
        (97, 118, 130, 54),
        (76, 137, 217, 64),
    )

    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    accent_path = [(404, 293), (456, 293), (496, 293)]
    draw.line(accent_path, fill=(34, 72, 94, 200), width=10, joint="curve")
    draw.line(accent_path, fill=(96, 163, 137, 150), width=4, joint="curve")
    draw.polygon([(496, 293), (472, 278), (472, 308)], fill=(34, 72, 94, 220))
    draw.ellipse((448, 274, 466, 292), fill=(221, 155, 66, 210))
    draw.ellipse((467, 274, 485, 292), fill=(96, 163, 137, 165))

    title_font = load_font(34, bold=True)
    subtitle_font = load_font(17)
    chip_font = load_font(14, bold=True)
    note_font = load_font(15)

    draw.text((68, 48), "AGENT OBSERVER", font=title_font, fill=(23, 36, 46, 255))
    draw.text((68, 90), "Solo AI dev cockpit for meaningful repo work.", font=subtitle_font, fill=(60, 81, 92, 255))

    chips = [("observe", (89, 140, 90)), ("recover", (212, 160, 64)), ("ship", (76, 137, 217))]
    cursor_x = 618
    for label, color in chips:
        text_box = draw.textbbox((0, 0), label.upper(), font=chip_font)
        chip_width = text_box[2] - text_box[0] + 22
        draw.rounded_rectangle((cursor_x, 56, cursor_x + chip_width, 86), radius=12, fill=(*color, 34), outline=(*color, 88), width=1)
        draw.text((cursor_x + 11, 63), label.upper(), font=chip_font, fill=(34, 49, 61, 255))
        cursor_x += chip_width + 10

    draw.text((112, 154), "APP", font=chip_font, fill=(51, 76, 62, 255))
    draw.text((572, 154), "APPLICATIONS", font=chip_font, fill=(46, 67, 92, 255))
    draw.text((298, 488), "Drag into Applications to install.", font=note_font, fill=(56, 78, 89, 255))

    image.alpha_composite(layer)
    return image.convert("RGB")


def add_inner_shadow(base: Image.Image, radius: int, alpha: int) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle((20, 20, base.size[0] - 20, base.size[1] - 20), radius=radius, fill=(0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))
    overlay.alpha_composite(shadow)
    cutout = Image.new("L", base.size, 255)
    cutout_draw = ImageDraw.Draw(cutout)
    cutout_draw.rounded_rectangle((40, 40, base.size[0] - 40, base.size[1] - 40), radius=radius - 18, fill=0)
    overlay.putalpha(cutout)
    base.alpha_composite(overlay)


def draw_icon(size: int = 1024) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    radius = 228
    card_box = (44, 44, size - 44, size - 44)
    draw.rounded_rectangle(card_box, radius=radius, fill=(17, 26, 33, 255))
    image.alpha_composite(layer)

    gradient = Image.new("RGBA", image.size, (0, 0, 0, 0))
    pixels = gradient.load()
    for y in range(size):
        y_ratio = y / max(size - 1, 1)
        for x in range(size):
            x_ratio = x / max(size - 1, 1)
            red = lerp_channel(17, 34, 0.65 * y_ratio + 0.25 * x_ratio)
            green = lerp_channel(26, 45, 0.55 * y_ratio + 0.18 * x_ratio)
            blue = lerp_channel(33, 59, 0.52 * y_ratio + 0.12 * x_ratio)
            pixels[x, y] = (red, green, blue, 255)

    mask = Image.new("L", image.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(card_box, radius=radius, fill=255)
    gradient.putalpha(mask)
    image.alpha_composite(gradient)

    grid = Image.new("RGBA", image.size, (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    for offset in range(110, size - 80, 74):
        grid_draw.line([(offset, 110), (offset, size - 110)], fill=(88, 120, 134, 24), width=2)
        grid_draw.line([(110, offset), (size - 110, offset)], fill=(88, 120, 134, 24), width=2)
    grid.putalpha(mask)
    image.alpha_composite(grid)

    add_glow(image, (250, 230, 860, 840), (78, 196, 164, 120), 78)
    add_glow(image, (408, 180, 860, 632), (53, 118, 202, 84), 68)
    add_glow(image, (552, 184, 760, 392), (228, 164, 70, 130), 36)

    rings = Image.new("RGBA", image.size, (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(rings)
    ring_draw.arc((236, 236, 788, 788), start=212, end=32, fill=(128, 243, 204, 255), width=36)
    ring_draw.arc((312, 312, 712, 712), start=196, end=20, fill=(137, 197, 255, 235), width=24)
    ring_draw.arc((360, 360, 664, 664), start=216, end=360, fill=(235, 179, 84, 255), width=16)
    ring_draw.line([(354, 512), (670, 512)], fill=(231, 241, 245, 110), width=6)
    ring_draw.line([(512, 354), (512, 670)], fill=(231, 241, 245, 110), width=6)
    ring_draw.ellipse((470, 470, 554, 554), fill=(241, 248, 250, 220))
    ring_draw.ellipse((596, 218, 670, 292), fill=(233, 171, 73, 255))
    ring_draw.rounded_rectangle((224, 762, 456, 812), radius=18, fill=(74, 121, 90, 160))
    ring_draw.rounded_rectangle((224, 826, 636, 862), radius=16, fill=(215, 226, 230, 56))
    rings.putalpha(mask)
    image.alpha_composite(rings)

    highlight = Image.new("RGBA", image.size, (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.rounded_rectangle((92, 92, size - 92, 270), radius=148, fill=(255, 255, 255, 18))
    highlight_draw.arc((84, 84, size - 84, size - 84), start=218, end=325, fill=(255, 255, 255, 46), width=10)
    highlight.putalpha(mask)
    image.alpha_composite(highlight)

    add_inner_shadow(image, radius, 150)
    return image


def export_icns(master: Image.Image, destination: Path) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        iconset_dir = Path(temp_dir) / "agent-observer.iconset"
        iconset_dir.mkdir(parents=True, exist_ok=True)
        sizes = [16, 32, 128, 256, 512]
        for size in sizes:
            resized = master.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(iconset_dir / f"icon_{size}x{size}.png")
            retina = master.resize((size * 2, size * 2), Image.Resampling.LANCZOS)
            retina.save(iconset_dir / f"icon_{size}x{size}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset_dir), "-o", str(destination)], check=True)


def main() -> None:
    RESOURCES_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    WEB_APP_DIR.mkdir(parents=True, exist_ok=True)

    background = draw_background()
    background.save(DMG_BACKGROUND_PATH)

    icon_master = draw_icon()
    export_icns(icon_master, ICON_ICNS_PATH)
    shutil.copy2(ICON_ICNS_PATH, BUILD_ICON_ICNS_PATH)

    icon_master.resize((512, 512), Image.Resampling.LANCZOS).save(WEB_ICON_PATH)
    icon_master.resize((180, 180), Image.Resampling.LANCZOS).save(WEB_APPLE_ICON_PATH)


if __name__ == "__main__":
    main()
