"""Re-export the saved original scenes without rerendering or modifying their source files."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[2]
for name in ("crystal", "laptop", "monitor", "phone"):
    bpy.ops.wm.open_mainfile(filepath=str(root / "assets/blender/scenes" / f"{name}-dark.blend"))
    model = bpy.data.objects[name.capitalize()]
    bpy.context.scene.frame_set(1 if name == "crystal" else 90)
    bpy.ops.object.select_all(action="DESELECT")
    model.select_set(True)
    for obj in model.children_recursive:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root / "frontend/public/models" / f"{name}.glb"),
                             export_format="GLB", use_selection=True, export_animations=True,
                             export_apply=True, export_materials="EXPORT", export_cameras=False,
                             export_lights=False, export_yup=True, export_extras=True)
    print(f"MODEL_REEXPORT_PASS {name}", flush=True)
