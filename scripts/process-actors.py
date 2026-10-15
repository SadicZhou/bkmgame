"""
四方向 NPC 行走图：AI 生成的 3 列 × 4 行网格（品红底）→ 每人一张 12 帧的一行 spritesheet
用法（项目根目录）：python scripts/process-actors.py
输入：art-src/chars/actors/<名称>.jpg（行：下 / 上 / 侧面 / 侧面，只取每行第 1 列的站立帧）
输出：public/assets/chars/actor-<名称>.png（与 char-player-walk 相同布局：下 / 上 / 左 / 右 各 3 帧）
做法：
- AI 原图的侧面两行朝向不可靠，只取第 3 行站立帧，按 SIDE 配置决定它朝左还是朝右，另一侧水平镜像
- 三个方向共用一个裁剪框与缩放比例（转身时身高不跳），再乘以 SCALE 里的身高系数（小孩矮一些）
- 迈步帧沿用 make-walk-frames.py 的抬脚 / 跨步算法
@author zjh
@date 2026-10-15
"""

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "chars" / "actors"
OUT = ROOT / "public" / "assets" / "chars"

_spec = importlib.util.spec_from_file_location("walk", ROOT / "scripts" / "make-walk-frames.py")
walk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(walk)
_chars_spec = importlib.util.spec_from_file_location("chars", ROOT / "scripts" / "process-chars.py")
chars = importlib.util.module_from_spec(_chars_spec)
_chars_spec.loader.exec_module(chars)

FRAME_W, FRAME_H = walk.FRAME_W, walk.FRAME_H
# 第 3 行站立帧的朝向
SIDE = {"kid": "right"}
# 身高系数（相对撑满 40px 帧高）
SCALE = {"kid": 0.84, "florist": 0.92, "washer": 0.92, "farmer": 0.94, "angler": 0.92, "fishergirl": 0.9}
# 个别原图某方向画错了列：方向行号 → 改用的列号
COL = {"scout2": {1: 1}}


def process(name: str) -> None:
    img = chars.key_out(Image.open(SRC / f"{name}.jpg"))
    cw, ch = img.width / 3, img.height / 4

    def cell(r: int) -> Image.Image:
        c = COL.get(name, {}).get(r, 0)
        return chars.main_rows(img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))

    cells = [cell(r) for r in range(3)]
    boxes = [c.getbbox() for c in cells]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    uw, uh = union[2] - union[0], union[3] - union[1]
    scale = min(FRAME_W / uw, FRAME_H / uh) * SCALE.get(name, 1.0)

    def fit(cell: Image.Image) -> Image.Image:
        part = cell.crop(union)
        part = chars.harden(part.resize((max(1, round(uw * scale)), max(1, round(uh * scale))), Image.LANCZOS))
        frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
        frame.alpha_composite(part, ((FRAME_W - part.width) // 2, FRAME_H - part.height))
        return frame

    down, up, side = (fit(c) for c in cells)
    mirrored = side.transpose(Image.FLIP_LEFT_RIGHT)
    left, right = (mirrored, side) if SIDE.get(name) == "right" else (side, mirrored)

    sheet = Image.new("RGBA", (FRAME_W * 12, FRAME_H), (0, 0, 0, 0))
    for row, (d, idle) in enumerate([("down", down), ("up", up), ("left", left), ("right", right)]):
        if d in ("down", "up"):
            a, b = walk.front_step(idle, True), walk.front_step(idle, False)
        else:
            a, b = walk.side_stride(idle, d == "right"), walk.side_pass(idle, d == "right")
        for k, f in enumerate([idle, a, b]):
            sheet.alpha_composite(f, ((row * 3 + k) * FRAME_W, 0))
    sheet.save(OUT / f"actor-{name}.png")
    print(f"actor-{name}: 12 frames, scale {scale:.3f}")


def main() -> None:
    for path in sorted(SRC.glob("*.jpg")):
        process(path.stem)


if __name__ == "__main__":
    main()
