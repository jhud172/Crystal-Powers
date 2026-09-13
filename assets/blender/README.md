# Original Crystal Powers assets

`build_assets.py` is the editable source recipe for the crystal and device collection. It runs in an isolated Blender process and does not touch an open Blender session.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python assets/blender/build_assets.py -- --asset all
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python assets/blender/build_assets.py -- --asset crystal --render --width 1920 --samples 96
```

Source scenes go in `assets/blender/scenes/`; web GLBs and rendered stills go in `frontend/public/models/` and `frontend/public/renders/`. Open the saved `.blend` file to edit geometry, studio lights, cameras, materials and animation. Re-running the recipe replaces only its named generated outputs.

Device screens use named `Screen` meshes and UVs so the website can replace their material with project screenshots. Device roots use metres and export Y-up through Blender's glTF exporter. Animation actions are named `CrystalTurn` and `LaptopOpen`. Critical product text remains HTML, outside the canvas.

All geometry is original to this project. No paid assets, downloaded models or external generation services are used. Rendered optical effects are intentionally richer than their real-time material equivalents. Validate both separately.

## Delivered outputs and regeneration

The collection includes eight editable light/dark scenes, two cinematic scenes, four self-contained GLBs, eight Cycles PNG stills, sixteen responsive WebP stills and two six-second H.264 films (24 fps, 1280 × 800). The default screen textures are screenshots of this website, not invented client work.

After editing a saved dark scene, run `export_web_models.py` through isolated background Blender to regenerate all four web models. It exports custom properties: each device's `Screen` node must retain `role=project-screen` and its physical `aspect`. The browser uses those values to fit screenshots without distortion.

Run `python assets/blender/prepare_web_assets.py` to create the 800/1600-pixel WebP variants, validate geometry, screen metadata, animation, self-contained buffers and the 5 MB per-model limit, and refresh `frontend/public/models/manifest.json`.

Render either cinematic with `blender --background --factory-startup --python assets/blender/render_cinematic.py -- --appearance dark --width 1280 --samples 48` (or `light`). This is a full Cycles animation render and can take several minutes. The source recipe uses Blender 5.2's video output API and OptiX when available.

The largest GLB is the detailed laptop at approximately 1.32 MB. The two films are approximately 1.07 MB and 0.79 MB. The application defers films and live 3D until requested, keeps one visible canvas, and retains still-image fallbacks for reduced motion or failed rendering. Browser checks and their limitations are recorded in `docs/REBUILD_QA.md`.
