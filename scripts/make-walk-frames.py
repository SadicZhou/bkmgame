"""
由站立帧生成更明显的行走帧（AI 原图的迈步帧和站立帧只差一两个像素，走起来看不出动）
用法（项目根目录，先跑 process-chars.py）：python scripts/make-walk-frames.py
输入：public/assets/chars/char-player.png（4 方向 × 3 帧）、char-npcs*.png（每人 1 帧，正面）
输出：
- char-player-walk.png：布局不变，每个方向的第 2、3 帧换成生成的迈步帧
- char-npcs*-walk.png：每人 3 帧（站立 / 迈左脚 / 迈右脚）
做法：取脚部一条横带（人物高度的约 1/6），以脚部重心为界分成左右两半：
- 正面 / 背面：一只脚抬起 2px（原位置留空，看得出抬脚）
- 侧面：两半前后分开成跨步，或后脚抬起、前脚前伸
@author zjh
@date 2026-10-15
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHARS = ROOT / "public" / "assets" / "chars"

# 与 src/game/graphics/CharArt.ts 保持一致
FRAME_W = 32
FRAME_H = 40
# 玩家行顺序：下 / 上 / 左 / 右
PLAYER_DIRS = ["down", "up", "left", "right"]
NPC_SHEETS = ["npcs", "npcs2", "npcs3"]


def leg_band(frame: Image.Image) -> tuple[int, int, float] | None:
    """脚部横带的 [top, bottom) 与脚部像素的平均 x"""
    box = frame.getbbox()
    if not box:
        return None
    top, bottom = box[1], box[3]
    h = max(4, round((bottom - top) * 0.17))
    band_top = bottom - h
    px = frame.load()
    xs = [x for y in range(band_top, bottom) for x in range(FRAME_W) if px[x, y][3] > 0]
    if not xs:
        return None
    return band_top, bottom, sum(xs) / len(xs)


def move_legs(frame: Image.Image, rule) -> Image.Image:
    """把脚部横带里的像素按 rule(x, y, left_half) -> (dx, dy) 移动，其余部分不动"""
    band = leg_band(frame)
    if not band:
        return frame.copy()
    top, bottom, cx = band
    out = frame.copy()
    src = frame.load()
    dst = out.load()
    for y in range(top, bottom):
        for x in range(FRAME_W):
            dst[x, y] = (0, 0, 0, 0)
    # 先画不动 / 往下的部分，再画抬起的部分，抬起的脚压在裤腿上
    pixels = [(x, y, src[x, y]) for y in range(top, bottom) for x in range(FRAME_W) if src[x, y][3] > 0]
    moved = []
    for x, y, c in pixels:
        dx, dy = rule(x, y, x < cx)
        moved.append((dy < 0, x + dx, y + dy, c))
    moved.sort(key=lambda m: m[0])
    for _, nx, ny, c in moved:
        if 0 <= nx < FRAME_W and 0 <= ny < FRAME_H:
            dst[nx, ny] = c
    return out


def front_step(frame: Image.Image, lift_left: bool) -> Image.Image:
    """正面 / 背面：一只脚抬起 2px"""
    return move_legs(frame, lambda x, y, left: (0, -2) if left == lift_left else (0, 0))


def side_stride(frame: Image.Image, facing_right: bool) -> Image.Image:
    """侧面跨步：前脚往前 2px、后脚往后 1px"""

    def rule(x, y, left):
        front = (not left) if facing_right else left
        sign = 1 if facing_right else -1
        return (2 * sign, 0) if front else (-1 * sign, 0)

    return move_legs(frame, rule)


def side_pass(frame: Image.Image, facing_right: bool) -> Image.Image:
    """侧面换脚：后脚抬起 2px 往前收，前脚略往后"""

    def rule(x, y, left):
        front = (not left) if facing_right else left
        sign = 1 if facing_right else -1
        return (-1 * sign, 0) if front else (1 * sign, -2)

    return move_legs(frame, rule)


def frame_at(sheet: Image.Image, i: int) -> Image.Image:
    return sheet.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H))


def make_player() -> None:
    sheet = Image.open(CHARS / "char-player.png").convert("RGBA")
    out = Image.new("RGBA", sheet.size, (0, 0, 0, 0))
    for row, d in enumerate(PLAYER_DIRS):
        idle = frame_at(sheet, row * 3)
        if d in ("down", "up"):
            a, b = front_step(idle, True), front_step(idle, False)
        else:
            right = d == "right"
            a, b = side_stride(idle, right), side_pass(idle, right)
        for k, f in enumerate([idle, a, b]):
            out.alpha_composite(f, ((row * 3 + k) * FRAME_W, 0))
    out.save(CHARS / "char-player-walk.png")
    print("player-walk: 12 frames")


def make_npcs(name: str) -> None:
    path = CHARS / f"char-{name}.png"
    if not path.exists():
        return
    sheet = Image.open(path).convert("RGBA")
    n = sheet.width // FRAME_W
    out = Image.new("RGBA", (FRAME_W * n * 3, FRAME_H), (0, 0, 0, 0))
    for i in range(n):
        idle = frame_at(sheet, i)
        for k, f in enumerate([idle, front_step(idle, True), front_step(idle, False)]):
            out.alpha_composite(f, ((i * 3 + k) * FRAME_W, 0))
    out.save(CHARS / f"char-{name}-walk.png")
    print(f"{name}-walk: {n * 3} frames")


def main() -> None:
    make_player()
    for name in NPC_SHEETS:
        make_npcs(name)


if __name__ == "__main__":
    main()
