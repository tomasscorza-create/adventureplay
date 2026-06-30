import json
import math
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) <= 1:
    raise SystemExit("Uso: python scripts/prepare-faust-assets.py <carpeta-fuente-de-Faust>")
SOURCE = Path(sys.argv[1]).expanduser().resolve()
CHARACTER_OUTPUT = ROOT / "src" / "assets" / "characters"
WEAPON_OUTPUT = ROOT / "src" / "assets" / "weapons"

FRAME_WIDTH = 96
FRAME_HEIGHT = 80

PlacedFrame = tuple[Image.Image, tuple[float, float]]


def crop_alpha(image: Image.Image) -> Image.Image:
    bounds = image.getbbox()
    if not bounds:
        raise ValueError("The source image does not contain visible pixels")
    return image.crop(bounds)


def extract_jump_poses() -> list[tuple[Image.Image, tuple[float, float]]]:
    strip = Image.open(SOURCE / "salto 5 frames seguidos.png").convert("RGBA")
    ranges = [(0, 100), (100, 200), (200, 305), (305, 410), (410, strip.width)]
    hand_points = [(20, 148), (116, 133), (217, 103), (321, 153), (443, 214)]
    poses: list[tuple[Image.Image, tuple[float, float]]] = []

    for (left, right), (hand_x, hand_y) in zip(ranges, hand_points):
        cell = strip.crop((left, 0, right, strip.height))
        bounds = cell.getbbox()
        if not bounds:
            raise ValueError(f"Jump cell {left}:{right} is empty")
        pose = cell.crop(bounds)
        poses.append((pose, (hand_x - left - bounds[0], hand_y - bounds[1])))

    return poses


def rotate_point(
    point: tuple[float, float],
    source_size: tuple[int, int],
    output_size: tuple[int, int],
    angle: float,
) -> tuple[float, float]:
    radians = math.radians(angle)
    cosine = math.cos(radians)
    sine = math.sin(radians)
    source_center = (source_size[0] / 2, source_size[1] / 2)
    output_center = (output_size[0] / 2, output_size[1] / 2)
    relative_x = point[0] - source_center[0]
    relative_y = point[1] - source_center[1]
    return (
        output_center[0] + cosine * relative_x + sine * relative_y,
        output_center[1] - sine * relative_x + cosine * relative_y,
    )


def place_pose(
    pose: Image.Image,
    hand: tuple[float, float],
    *,
    y_offset: int = 0,
    angle: float = 0,
) -> PlacedFrame:
    source = pose
    source_hand = hand

    if angle:
        source_size = source.size
        source = source.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        source_hand = rotate_point(source_hand, source_size, source.size, angle)

    scale = min(88 / source.width, 72 / source.height)
    width = max(1, round(source.width * scale))
    height = max(1, round(source.height * scale))
    resized = source.resize((width, height), Image.Resampling.LANCZOS)
    draw_x = round((FRAME_WIDTH - width) / 2)
    draw_y = FRAME_HEIGHT - height - 2 + y_offset
    frame = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT))
    frame.alpha_composite(resized, (draw_x, draw_y))
    transformed_hand = (
        draw_x + source_hand[0] * scale,
        draw_y + source_hand[1] * scale,
    )
    return frame, transformed_hand


def blend_frames(first: PlacedFrame, second: PlacedFrame, progress: float) -> PlacedFrame:
    return (
        Image.blend(first[0], second[0], progress),
        (
            first[1][0] + (second[1][0] - first[1][0]) * progress,
            first[1][1] + (second[1][1] - first[1][1]) * progress,
        ),
    )


def interleave(
    keyframes: list[PlacedFrame],
    key_angles: list[float],
    *,
    cyclic: bool = False,
) -> tuple[list[PlacedFrame], list[float]]:
    frames: list[PlacedFrame] = []
    angles: list[float] = []
    pair_count = len(keyframes) if cyclic else len(keyframes) - 1

    for index in range(pair_count):
        next_index = (index + 1) % len(keyframes)
        frames.append(keyframes[index])
        angles.append(key_angles[index])
        frames.append(blend_frames(keyframes[index], keyframes[next_index], 0.5))
        angles.append(key_angles[index] + (key_angles[next_index] - key_angles[index]) * 0.5)

    if not cyclic:
        frames.append(keyframes[-1])
        angles.append(key_angles[-1])

    return frames, angles


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(
            "No se encontro la carpeta fuente de Faust. "
            "Pasa su ruta archivada como primer argumento."
        )

    CHARACTER_OUTPUT.mkdir(parents=True, exist_ok=True)
    WEAPON_OUTPUT.mkdir(parents=True, exist_ok=True)

    run_sources = [
        ("1er frame run _ mano d x_0.83 y_1.10.png", (83, 110)),
        ("2frame corriendo x_ 1.50 y_ 0.87.png", (150, 87)),
        ("3 frame corriendo x_ 0.85 y_ 1.09.png", (85, 109)),
        ("4 frame corriendo x_ 1.50 y_ 0.9.png", (150, 90)),
    ]
    run_poses: list[tuple[Image.Image, tuple[float, float]]] = []
    for filename, hand in run_sources:
        source = Image.open(SOURCE / filename).convert("RGBA")
        bounds = source.getbbox()
        if not bounds:
            raise ValueError(f"{filename} is empty")
        run_poses.append((source.crop(bounds), (hand[0] - bounds[0], hand[1] - bounds[1])))

    jump_poses = extract_jump_poses()
    run_keys = [place_pose(pose, hand) for pose, hand in run_poses]
    jump_keys = [place_pose(pose, hand) for pose, hand in jump_poses]

    states: list[tuple[str, list[PlacedFrame], list[float], int, int]] = []
    idle_offsets = [0, -1, -1, 0, 1, 1, 0, 0]
    idle_frames = [place_pose(*run_poses[0], y_offset=offset) for offset in idle_offsets]
    states.append(("idle", idle_frames, [12, 9, 6, 5, 7, 10, 12, 13], 10, -1))

    run_frames, run_angles = interleave(run_keys, [12, -52, 10, -48], cyclic=True)
    states.append(("run", run_frames, run_angles, 16, -1))

    jump_frames, jump_angles = interleave(jump_keys[:3], [-32, -44, -56])
    states.append(("jump", jump_frames, jump_angles, 14, 0))

    fall_frames, fall_angles = interleave(jump_keys[2:], [-56, -24, 8])
    states.append(("fall", fall_frames, fall_angles, 14, 0))

    attack_frames, attack_angles = interleave(
        [run_keys[0], run_keys[1], run_keys[3], run_keys[0]],
        [-112, -48, 18, 78],
    )
    states.append(("attack", attack_frames, attack_angles, 28, 0))

    hurt_frames, hurt_angles = interleave(
        [jump_keys[3], jump_keys[4], jump_keys[3]],
        [24, 56, 34],
    )
    states.append(("hurt", hurt_frames, hurt_angles, 28, 0))

    death_keys = [place_pose(*jump_poses[4], y_offset=index // 2, angle=angle) for index, angle in enumerate([0, 20, 45, 72])]
    death_frames, death_angles = interleave(death_keys, [52, 68, 84, 102])
    states.append(("dead", death_frames, death_angles, 12, 0))

    all_frames: list[PlacedFrame] = []
    weapon_angles: list[float] = []
    animations: dict[str, dict[str, int]] = {}
    for name, frames, angles, frame_rate, repeat in states:
        start = len(all_frames)
        all_frames.extend(frames)
        weapon_angles.extend(angles)
        animations[name] = {
            "start": start,
            "end": len(all_frames) - 1,
            "frameRate": frame_rate,
            "repeat": repeat,
        }

    sheet = Image.new("RGBA", (FRAME_WIDTH * len(all_frames), FRAME_HEIGHT))
    weapon_frames: list[dict[str, float]] = []
    for index, ((frame, hand), angle) in enumerate(zip(all_frames, weapon_angles)):
        sheet.alpha_composite(frame, (index * FRAME_WIDTH, 0))
        weapon_frames.append({
            "x": round(hand[0] - FRAME_WIDTH / 2, 2),
            "y": round(hand[1] - FRAME_HEIGHT / 2, 2),
            "angle": round(angle, 2),
        })

    sheet.save(CHARACTER_OUTPUT / "faust.png", optimize=True)
    (CHARACTER_OUTPUT / "faust-animation.json").write_text(
        json.dumps({"animations": animations, "weaponFrames": weapon_frames}, indent=2),
        encoding="utf-8",
    )

    portrait = Image.open(SOURCE / "ChatGPT Image 30 jun 2026, 04_40_06 a.m..png").convert("RGB")
    portrait.thumbnail((512, 768), Image.Resampling.LANCZOS)
    portrait.save(
        CHARACTER_OUTPUT / "portraits" / "faust.webp",
        "WEBP",
        quality=84,
        method=6,
    )

    sword = crop_alpha(Image.open(SOURCE / "espada.png").convert("RGBA"))
    sword.save(WEAPON_OUTPUT / "sword-1.png", optimize=True)
    print(f"Generated {len(all_frames)} Faust frames")


if __name__ == "__main__":
    main()
