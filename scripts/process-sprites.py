"""
伙伴立绘处理：品红底抠透明 → 裁边 → 补成正方形 → 缩放到 144×144 → 输出普通版与异色版 PNG
用法（项目根目录）：python scripts/process-sprites.py
输入：art-src/creatures/<物种id>.jpg|png（AI 生成原图，纯品红 #FF00FF 背景）
输出：public/assets/creatures/<物种id>.png 与 <物种id>-shiny.png
@author zjh
@date 2026-10-14
"""

import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "creatures"
OUT = ROOT / "public" / "assets" / "creatures"

# 游戏内伙伴基准 48px，立绘按 3 倍输出以保留细节
SIZE = 144
# 四周留白比例，避免贴边
PAD = 0.06
# 与 CritterPalettes.shinyPalette 一致的色相偏移
SHINY_HUE_SHIFT = 0.42
# 半透明雾气 / 水花在品红底上会染成粉紫色，这些物种需要去溢色
DESPILL = {"mistnewt", "wavefin"}


def is_key(r: int, g: int, b: int) -> bool:
    """品红背景判定：红、蓝高而绿低（腮红 / 粉耳朵的绿色分量较高，不会被误删）"""
    return r > 150 and b > 90 and g < 110 and (r - g) > 110 and (b - g) > 40


def key_out(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if is_key(r, g, b):
                px[x, y] = (40, 24, 24, 0)
    return img


def despill(img: Image.Image) -> Image.Image:
    """把红、蓝都明显高于绿的粉紫色像素拉回冷白（腮红的蓝绿差小，不受影响）"""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and r - g > 40 and b - g > 40:
                px[x, y] = (g, g + (b - g) // 3, max(b, g), a)
    return img


def fit_square(img: Image.Image) -> Image.Image:
    box = img.getbbox()
    if box:
        img = img.crop(box)
    side = int(max(img.size) * (1 + PAD * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, side - img.height - int(side * PAD)), img)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def shiny(img: Image.Image) -> Image.Image:
    """色相偏移；低饱和像素（描边、眼睛高光）与淡粉腮红保持不变"""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s < 0.2 or v < 0.25:
                continue
            if (h > 0.88 or h < 0.02) and s < 0.7 and v > 0.7:
                continue
            nr, ng, nb = colorsys.hsv_to_rgb((h + SHINY_HUE_SHIFT) % 1, s, v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted([*SRC.glob("*.jpg"), *SRC.glob("*.png")])
    if not files:
        print(f"没有找到原图：{SRC}")
        return
    for f in files:
        keyed = key_out(Image.open(f))
        if f.stem in DESPILL:
            keyed = despill(keyed)
        sprite = fit_square(keyed)
        sprite.save(OUT / f"{f.stem}.png")
        shiny(sprite).save(OUT / f"{f.stem}-shiny.png")
        print(f"{f.stem}: ok")


if __name__ == "__main__":
    main()
