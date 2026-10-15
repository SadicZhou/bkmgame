"""
骑乘行走图：AI 生成的 3 列 × 4 行网格（品红底，主角骑在伙伴背上）→ 每只坐骑一张 12 帧的一行 spritesheet
用法（项目根目录）：python scripts/process-mounts.py
输入：art-src/mounts/<物种id>.jpg（行：下 / 上 / 侧面 / 侧面，只取每行第 1 列）
输出：public/assets/chars/mount-<物种id>.png（下 / 上 / 左 / 右 各 3 帧：站立 / 起伏 A / 起伏 B，每帧 48×48）
做法：
- 第 3 行站立帧统一朝左（AI 原图如此），镜像出朝右
- 三方向共用裁剪框与缩放（转身时大小不跳），SCALE 为体型系数
- 四足坐骑不适合人形迈步算法，迈步帧用整体上抬 2px / 1px 表现奔跑起伏
@author zjh
@date 2026-10-15
"""

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "mounts"
OUT = ROOT / "public" / "assets" / "chars"

_spec = importlib.util.spec_from_file_location("chars", ROOT / "scripts" / "process-chars.py")
chars = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(chars)

FRAME = 48
# 体型系数（相对撑满 48px）：一阶进化小一些
SCALE = {"blazehorn": 0.9, "torrentshell": 0.88, "grovefox": 0.9, "cragdog": 0.92}


def lift(frame: Image.Image, dy: int) -> Image.Image:
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out.alpha_composite(frame, (0, -dy))
    return out


def process(name: str) -> None:
    img = chars.key_out(Image.open(SRC / f"{name}.jpg"))
    cw, ch = img.width / 3, img.height / 4
    cells = [chars.main_rows(img.crop((0, round(r * ch), round(cw), round((r + 1) * ch)))) for r in range(3)]
    boxes = [c.getbbox() for c in cells]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    uw, uh = union[2] - union[0], union[3] - union[1]
    scale = min(FRAME / uw, (FRAME - 2) / uh) * SCALE.get(name, 1.0)

    def fit(cell: Image.Image) -> Image.Image:
        part = chars.harden(cell.crop(union).resize((max(1, round(uw * scale)), max(1, round(uh * scale))), Image.LANCZOS))
        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        frame.alpha_composite(part, ((FRAME - part.width) // 2, FRAME - part.height))
        return frame

    down, up, left = (fit(c) for c in cells)
    right = left.transpose(Image.FLIP_LEFT_RIGHT)
    sheet = Image.new("RGBA", (FRAME * 12, FRAME), (0, 0, 0, 0))
    for row, idle in enumerate([down, up, left, right]):
        for k, f in enumerate([idle, lift(idle, 2), lift(idle, 1)]):
            sheet.alpha_composite(f, ((row * 3 + k) * FRAME, 0))
    sheet.save(OUT / f"mount-{name}.png")
    print(f"mount-{name}: scale {scale:.3f}")


def main() -> None:
    for path in sorted(SRC.glob("*.jpg")):
        process(path.stem)


if __name__ == "__main__":
    main()
