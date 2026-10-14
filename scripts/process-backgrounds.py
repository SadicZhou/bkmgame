"""
场景背景处理：AI 原图 → 缩放裁切到游戏尺寸 → 输出 JPG
用法（项目根目录）：python scripts/process-backgrounds.py
输入：art-src/backgrounds/<key>.jpg|png
  - bg-battle-*：战斗背景，输出 640×360（底部被指令框遮住）
  - 其余：全屏背景，输出 640×480
输出：public/assets/backgrounds/<key>.jpg
@author zjh
@date 2026-10-14
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "backgrounds"
OUT = ROOT / "public" / "assets" / "backgrounds"

BATTLE_SIZE = (640, 360)
SCREEN_SIZE = (640, 480)


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """等比放缩铺满目标尺寸，超出部分居中裁掉"""
    tw, th = size
    scale = max(tw / img.width, th / img.height)
    w, h = round(img.width * scale), round(img.height * scale)
    img = img.resize((w, h), Image.LANCZOS)
    left, top = (w - tw) // 2, (h - th) // 2
    return img.crop((left, top, left + tw, top + th))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted([*SRC.glob("*.jpg"), *SRC.glob("*.png")])
    if not files:
        print(f"没有找到原图：{SRC}")
        return
    for f in files:
        size = BATTLE_SIZE if f.stem.startswith("bg-battle-") else SCREEN_SIZE
        cover(Image.open(f).convert("RGB"), size).save(OUT / f"{f.stem}.jpg", quality=88, optimize=True)
        print(f"{f.stem}: {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
