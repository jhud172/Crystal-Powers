# Crystal Studio — interactive signature

The public header/footer logo opens a local studio for exploring the Crystal Powers signature. It loads no WebGL until the user opens it. The initial cyan-to-violet shell, optical backing and mint core follow the existing SVG mark; the original faceted wordmark remains available as the explicit heritage alternative.

## Editing the model

- Recipe: `assets/blender/build_liquid_brand.py`. The original cubic silhouettes are traced from `frontend/public/branding/crystal-powers-liquid-mark.svg`; no downloaded geometry, textures, HDRIs or new dependencies.
- Native scene: `assets/blender/scenes/liquid-brand-crystal.blend`. Three separately editable meshes, soft physical bevels, weighted normals, vertex-colour signature gradient, studio lights and portrait camera. The Blender5 save may be Zstandard-compressed; it reopens successfully in installed Blender5.2.1LTS.
- Web model: `frontend/public/models/liquid-brand-crystal.glb`,280,580bytes /15,360triangles /3meshes. Roles:`brand-shell`, `brand-backing`, `brand-core`. Embedded buffers, no decoder or external texture request.
- Transparent fallback: `frontend/public/renders/liquid-brand-crystal.png`,720×800RGBA. The arrival logo remains the existing lightweight SVG.

Authoring converts web `(x,y,z)` to Blender `(x,-z,y)` so glTF's Y-up export delivers the upright signature. Do not add another90-degree scene rotation. `verify-liquid-brand-asset.py` asserts the exported portrait dimensions and finite bounds as well as mesh roles, colours, no external buffers/decoders, size/triangle budgets and fallback dimensions.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python assets/blender/build_liquid_brand.py
python scripts/verify-liquid-brand-asset.py
npm.cmd --prefix frontend run build
```

## Controls and ownership

`BrandIdentity.tsx` owns local state, controls, focus, outside/Escape dismissal and responsive popup placement. `brandFinishes.ts` owns renderer-free finish/lighting definitions. `BrandLogoCanvas.tsx` owns opt-in orthographic rendering, bounded/adaptive DPR, mouse orbit, scene preparation, environment/lights and context-loss handling. `LiquidBrandModel.tsx` loads the real Blender asset, clones/disposes only instance materials and smoothly interpolates orientation, scale and layer separation; imported geometry stays shared in the GLTF cache. `brand-identity.css` owns layout and focus/hover treatment.

Controls: Glacier/Rose/Pearl; Studio/Aurora/Sunset lighting;30–180% light intensity;65–120% object size; keyboard rotation; direct mouse orbit; complete/shell/core isolation; mesh construction; reversible unfold; persistent Reset view. Camera orbit disables zoom and pan so wheel input remains available for scrolling. Reset restores model/camera, lighting/intensity, size, finish, complete mark and assembled layers without replacing the canvas.

Motion uses demand rendering and exponential damping. The scene stops drawing at rest; no perpetual spin. Shared quality/preference/visibility rules still own eligibility. Hidden/offscreen stages and closing retire the renderer. System/explicit reduced motion or compact ineligible screens retain the rendered logo, adjustable finish/size/intensity and close/reset; part isolation, mesh construction and live unfolding require a ready renderer. The UI explicitly labels preview mode. Controls and essential copy stay in the DOM.

During initial shader/environment preparation, preserve the reserved rendered preview. Shared `useEnvironmentPreparation`/`PreparedScene` retain their existing compilation, cancellation and temporary target cleanup. Native context loss leaves a usable fallback; closing and reopening provides a clean retry. No business data, provider operations or persisted company-wide branding changes occur in this viewer.

## Verification

Current grouped results and evidence are recorded at the top of `CRYSTAL_POWERS_2_0_AUDIT.md`. `verify-crystal-studio-browser.cjs` checks actual rendered-pixel changes, unchanged canvas identity during edits, reset/orbit/idle behaviour, legacy selection, all appearances, responsive/fallback behaviour, actual context loss/recovery and header/footer bounds. `verify-brand-resources-browser.cjs` observes real native allocation/deletion/retirement. Local browser and Blender evidence does not certify physical devices or production release.

## Liquid optics update — 24 October 2026

Live materials now retain stable vertex-colour shader definitions and blend tint/gradient weight, roughness, alpha and emission on demand. The economical tier composites a Fresnel optical shell over the real stage; eligible transmission tiers add the shared physical refraction pass. Clearcoat/softbox reflections and a soft CSS halo provide the neon treatment without added geometry or a postprocessing dependency. `brandFinishes.ts` supplies palette/glow colours; `LiquidBrandModel.tsx` owns optical targets and uniforms. Native `StudioLights` retarget their colour, position and power instead of replacing the scene.

The1.25-second layer journey uses the shared velocity-easing helper and a minimum-jerk positional curve, so changing direction preserves the current pose. Finish/light interpolation uses frame-rate-independent exponential damping, then stops invalidating at convergence. CSS atmosphere/halo/preview transitions last700ms and honour the reduced-motion policy. Finish changes are excluded from `PreparedScene` revisions; topology/tier changes still prepare their actual shader variants. Existing cloned-material disposal and stage cleanup remain intact. Source Blender geometry and the rendered fallback photograph remain reusable; this optical appearance is applied by the web renderer.

`verify-crystal-studio-browser.cjs` now observes actual native glass/light/matrix uniform writes and shader-link status in addition to pixels, verifying intermediate values, no fallback flash during morphs, rapid retargeting, continuous reversal and idle. Latest scoped results are61 Studio/282 grouped checks in the main audit.
