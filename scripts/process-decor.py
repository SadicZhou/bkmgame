"""
地图装饰物处理：品红底抠透明 → （素材表按等分切开）→ 裁边 → 按游戏内目标宽度缩放 → PNG
用法（项目根目录）：python scripts/process-decor.py
输入：art-src/decor/<名称>.jpg（AI 生成原图，品红背景）
输出：public/assets/decor/decor-<名称>.png
@author zjh
@date 2026-10-14
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "decor"
OUT = ROOT / "public" / "assets" / "decor"

# 单张原图：名称 → 游戏内宽度（px，32px = 1 格）
SINGLE = {
    "house": 116,
    "spring": 78,
    "brazier": 30,
    "bed": 62,
    "fireplace": 68,
    "rug": 66,
}
# 素材表：原图名 → 从左到右每段的（名称, 宽度）
SHEETS = {
    "props": [("plant", 26), ("well", 40), ("stall", 70)],
}


def is_key(r: int, g: int, b: int) -> bool:
    """品红背景判定（兼容偏暗的玫红底）"""
    return r > 150 and b > 90 and g < 110 and (r - g) > 100 and (b - g) > 40


def key_out(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, _ = px[x, y]
            if is_key(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return img


def fit_width(img: Image.Image, width: int) -> Image.Image:
    box = img.getbbox()
    if box:
        img = img.crop(box)
    height = max(1, round(img.height * width / img.width))
    return img.resize((width, height), Image.LANCZOS)


def main_blob(img: Image.Image) -> Image.Image:
    """只保留最宽的一段连续非透明列（去掉切分时混入的邻居碎片）"""
    alpha = img.getchannel("A")
    cols = [alpha.crop((x, 0, x + 1, img.height)).getbbox() is not None for x in range(img.width)]
    best, start = (0, 0), None
    for x, filled in enumerate(cols + [False]):
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            if x - start > best[1] - best[0]:
                best = (start, x)
            start = None
    return img.crop((best[0], 0, best[1], img.height))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, width in SINGLE.items():
        f = SRC / f"{name}.jpg"
        fit_width(key_out(Image.open(f)), width).save(OUT / f"decor-{name}.png")
        print(f"{name}: ok")
    for sheet, parts in SHEETS.items():
        img = key_out(Image.open(SRC / f"{sheet}.jpg"))
        step = img.width / len(parts)
        for i, (name, width) in enumerate(parts):
            piece = img.crop((round(i * step), 0, round((i + 1) * step), img.height))
            fit_width(main_blob(piece), width).save(OUT / f"decor-{name}.png")
            print(f"{name}: ok")


if __name__ == "__main__":
    main()
