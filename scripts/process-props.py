"""
场景物件贴图：AI 生成的品红底网格 → 每格一张透明 PNG
用法（项目根目录）：python scripts/process-props.py
输入：art-src/props/mushrooms.jpg（4 列 × 2 行：上排白天 4 种菇、下排夜晚 4 种发光菇）
输出：public/assets/props/mush-<id>.png（28×28，脚底对齐格子下沿）
@author zjh
@date 2026-10-15
"""

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "props"
OUT = ROOT / "public" / "assets" / "props"

_spec = importlib.util.spec_from_file_location("chars", ROOT / "scripts" / "process-chars.py")
chars = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(chars)

SIZE = 28
# 与 src/game/data/mushrooms.ts 的顺序一致
MUSHROOMS = ["redcap", "chanter", "porcini", "oyster", "bluelamp", "violet", "moon", "star"]


def fit(cell: Image.Image) -> Image.Image:
    part = cell.crop(cell.getbbox())
    scale = min(SIZE / part.width, SIZE / part.height)
    part = chars.harden(part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.LANCZOS))
    frame = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    frame.alpha_composite(part, ((SIZE - part.width) // 2, SIZE - part.height))
    return frame


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img = chars.key_out(Image.open(SRC / "mushrooms.jpg"))
    cw, ch = img.width / 4, img.height / 2
    for i, name in enumerate(MUSHROOMS):
        c, r = i % 4, i // 4
        cell = chars.main_rows(img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))
        fit(cell).save(OUT / f"mush-{name}.png")
        print(f"mush-{name}")


if __name__ == "__main__":
    main()
