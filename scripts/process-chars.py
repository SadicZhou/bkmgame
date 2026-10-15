"""
人物行走图处理：品红底抠透明 → 按网格切格 → 所有格共用一个裁剪框（帧间不抖动）→ 缩放后脚底对齐 → 拼成一行 spritesheet
用法（项目根目录）：python scripts/process-chars.py
输入：art-src/chars/<名称>.jpg（AI 生成的网格图，品红背景）
输出：public/assets/chars/char-<名称>.png（每帧 FRAME_W×FRAME_H，按行优先顺序排成一行）
@author zjh
@date 2026-10-14
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "chars"
OUT = ROOT / "public" / "assets" / "chars"

# 与 src/game/graphics/CharArt.ts 保持一致
FRAME_W = 32
FRAME_H = 40
# 名称 → (列数, 行数)
SHEETS = {
    "player": (3, 4),
    "npcs": (3, 3),
    "npcs2": (3, 1),
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


def harden(img: Image.Image) -> Image.Image:
    """半透明边缘二值化，缩小后保持像素画的硬边"""
    r, g, b, a = img.split()
    a = a.point(lambda v: 255 if v >= 110 else 0)
    return Image.merge("RGBA", (r, g, b, a))


def main_rows(cell: Image.Image) -> Image.Image:
    """只保留最长的一段连续非透明行，清掉越格的邻居碎片（帽尖、脚尖）"""
    alpha = cell.getchannel("A")
    filled = [alpha.crop((0, y, cell.width, y + 1)).getbbox() is not None for y in range(cell.height)]
    best, start = (0, 0), None
    for y, f in enumerate(filled + [False]):
        if f and start is None:
            start = y
        elif not f and start is not None:
            if y - start > best[1] - best[0]:
                best = (start, y)
            start = None
    out = Image.new("RGBA", cell.size, (0, 0, 0, 0))
    out.paste(cell.crop((0, best[0], cell.width, best[1])), (0, best[0]))
    return out


def process(name: str, cols: int, rows: int) -> None:
    img = key_out(Image.open(SRC / f"{name}.jpg"))
    cw, ch = img.width / cols, img.height / rows
    cells = [
        main_rows(img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))
        for r in range(rows)
        for c in range(cols)
    ]
    boxes = [cell.getbbox() for cell in cells if cell.getbbox()]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    uw, uh = union[2] - union[0], union[3] - union[1]
    scale = min(FRAME_W / uw, FRAME_H / uh)
    sheet = Image.new("RGBA", (FRAME_W * len(cells), FRAME_H), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        part = cell.crop(union)
        part = harden(part.resize((max(1, round(uw * scale)), max(1, round(uh * scale))), Image.LANCZOS))
        sheet.alpha_composite(part, (i * FRAME_W + (FRAME_W - part.width) // 2, FRAME_H - part.height))
    sheet.save(OUT / f"char-{name}.png")
    print(f"{name}: {len(cells)} frames")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (cols, rows) in SHEETS.items():
        process(name, cols, rows)


if __name__ == "__main__":
    main()
