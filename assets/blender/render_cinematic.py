"""Render a seamless original crystal orbit from the editable studio scene."""
import argparse
import math
from pathlib import Path
import sys
import bpy

parser = argparse.ArgumentParser()
parser.add_argument("--appearance", choices=["dark", "light"], default="dark")
parser.add_argument("--width", type=int, default=1280)
parser.add_argument("--samples", type=int, default=24)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
root = Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root / "assets/blender/scenes" / f"crystal-{args.appearance}.blend"))
scene = bpy.context.scene
rotor = bpy.data.objects["CrystalOptics"]
rotor.animation_data_clear()
# Six seconds, with the closing duplicate frame omitted from the movie.
for frame, angle in [(1, 0), (145, math.tau)]:
    rotor.rotation_euler.z = angle
    rotor.keyframe_insert("rotation_euler", frame=frame)
action = rotor.animation_data.action
action.name = "CinematicCrystalOrbit"
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for point in curve.keyframe_points:
                    point.interpolation = "LINEAR"
scene.frame_start = 1
scene.frame_end = 144
scene.render.fps = 24
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width * .625)
scene.cycles.samples = args.samples
preferences = bpy.context.preferences.addons["cycles"].preferences
preferences.compute_device_type = "OPTIX"
preferences.get_devices()
for device in preferences.devices:
    device.use = device.type == "OPTIX"
scene.cycles.device = "GPU" if any(d.type == "OPTIX" for d in preferences.devices) else "CPU"
scene.render.image_settings.media_type = "VIDEO"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
scene.render.ffmpeg.ffmpeg_preset = "GOOD"
scene.render.ffmpeg.audio_codec = "NONE"
output = root / "frontend/public/renders" / f"crystal-{args.appearance}-orbit.mp4"
scene.render.filepath = str(output)
bpy.ops.wm.save_as_mainfile(filepath=str(root / "assets/blender/scenes" / f"crystal-{args.appearance}-cinematic.blend"))
bpy.ops.render.render(animation=True)
print(f"CINEMATIC_RENDER_PASS {output} bytes={output.stat().st_size}", flush=True)
