import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BackSide, FrontSide, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshPhysicalMaterial, PerspectiveCamera, SRGBColorSpace, LoopOnce, TextureLoader } from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { ModelKind } from "./ModelStage";
import { modelAnimationNames, selectAnimationName } from "./animationContract";
import { PRISM_PULSE_DURATION, prismPulseEnergy } from "./prismPulse";
import { advanceCrystalMotion } from "./crystalMotion";
import { useExperience } from "./ExperienceContext";
import { renderProfiles, type RenderQuality, type RenderTier } from "./renderQuality";
import { containedSceneFov, scenePresentation } from "./scenePresentation";
import { PreparedScene } from "./PreparedScene";
import { useEnvironmentPreparation } from "./useEnvironmentPreparation";
import { useAdaptiveRenderQuality } from "./useAdaptiveRenderQuality";
import { RenderPerformanceProbe } from "./RenderPerformanceProbe";

export type CrystalInteraction = { yaw: number; pitch: number; hoverX: number; hoverY: number; palette: number; pulse: number; invalidate?: () => void };

type Props = { interaction?: RefObject<CrystalInteraction>; model: ModelKind; image?: string; clip?: "CrystalOpen" | "CrystalClose"; pose?: "open" | "closed"; light: boolean; angle: number; reset: number; playing: boolean; onInteraction: () => void; onFailure: () => void; onReady: () => void; onFinished: () => void };
const isOpening = (model: ModelKind) => model === "observatory" || model === "prism-gate";
const modelUrl = (model: ModelKind) => `/models/${model}.glb${isOpening(model) ? "?v=prism-precision-02" : ""}`;

/** A rejected cached fetch must be evicted before an explicit retry. */
export function clearModelCache(model: ModelKind, image?: string) {
  useGLTF.clear(modelUrl(model));
  if (image) useTexture.clear(image);
}

function CanvasHealth({ onFailure }: Pick<Props, "onFailure">) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    if (gl.getContext().isContextLost()) onFailure();
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return null;
}

function PosterFraming({ model }: { model: ModelKind }) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !size.width || !size.height) return;
    const view = scenePresentation(model);
    camera.fov = containedSceneFov(view.fov, view.posterWidth / view.posterHeight, size.width / size.height);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, model, size.width, size.height, invalidate]);
  return null;
}

function ScreenTexture({ image, object }: { image: string; object: Group }) {
  const { gl } = useThree();
  const original = useTexture(image);
  useEffect(() => {
    let aspect = 1.6;
    object.traverse(child => { if (child instanceof Mesh && child.userData.role === "project-screen" && typeof child.userData.aspect === "number") aspect = child.userData.aspect; });
    const canvas = document.createElement("canvas");
    canvas.width = aspect < 1 ? 768 : 1280; canvas.height = Math.round(canvas.width / aspect);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#0b1018"; context.fillRect(0, 0, canvas.width, canvas.height);
    const source = original.image as HTMLImageElement;
    const scale = Math.min(canvas.width / source.width, canvas.height / source.height);
    context.drawImage(source, (canvas.width - source.width * scale) / 2, (canvas.height - source.height * scale) / 2, source.width * scale, source.height * scale);
    const texture = new CanvasTexture(canvas);
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
    const screens: { mesh: Mesh; original: Mesh["material"] }[] = [];
    object.traverse((child) => {
      if (child instanceof Mesh && (child.name === "Screen" || child.userData.role === "project-screen")) {
        screens.push({ mesh: child, original: child.material });
        child.material = material;
      }
    });
    return () => { for (const item of screens) item.mesh.material = item.original; material.dispose(); texture.dispose(); original.dispose(); useTexture.clear(image); };
  }, [object, original, gl]);
  return null;
}

function ObjectModel({ model, image, clip = "CrystalOpen", pose = "closed", angle, playing, reset, onFinished, interaction, tier }: Pick<Props, "model" | "image" | "clip" | "pose" | "angle" | "playing" | "reset" | "onFinished" | "interaction"> & { tier: RenderTier }) {
  const { invalidate, gl } = useThree();
  // Original GLBs are uncompressed: do not initialise external Draco or WASM Meshopt decoders.
  const gltf = useGLTF(modelUrl(model), false, false);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = Array.isArray(child.material) ? child.material.map((mat) => mat.clone()) : child.material.clone();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof MeshPhysicalMaterial && model === "prism-gate" && (child.userData.role === "gate-corner" || child.userData.role === "projector-diamond")) {
            // Thin optical glass around the coated quartz centre: retain reflections
            // without volume refraction duplicating the foreground machined details.
            material.thickness = 0;
            material.ior = 1.46;
            material.envMapIntensity = 1.0;
            const isCorner = child.userData.role === "gate-corner";
            material.transmission = isCorner ? 0.65 : 0;
            material.metalness = isCorner ? 0 : 0.72;
            material.roughness = isCorner ? .12 : .09;
            material.clearcoat = isCorner ? 0.6 : 0.25;
            material.clearcoatRoughness = 0.045;
            material.dispersion = 0;
            material.side = FrontSide;
          } else if (material instanceof MeshPhysicalMaterial && material.transmission > 0 && model !== "observatory") {
            material.thickness = 1.2;
            material.ior = 1.46;
            material.envMapIntensity = model === "crystal" ? 1.4 : .55;
            material.transmission = model === "crystal" ? .72 : .94;
            material.roughness = 0.07;
            material.clearcoat = 0.18;
            material.dispersion = 0.08;
          }
        }
      }
    });
    return clone;
  }, [gltf.scene, model]);
  const transmissiveMaterials = useMemo(() => {
    const items: { material: MeshPhysicalMaterial; transmission: number; roughness: number }[] = [];
    object.traverse(child => {
      if (!(child instanceof Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (material instanceof MeshPhysicalMaterial && material.transmission > 0) items.push({ material, transmission: material.transmission, roughness: material.roughness });
      }
    });
    return items;
  }, [object]);
  useEffect(() => {
    // Change material cost without replacing the object or restarting its authored animation.
    for (const item of transmissiveMaterials) {
      item.material.transmission = renderProfiles[tier].transmission ? item.transmission : 0;
      item.material.roughness = renderProfiles[tier].transmission ? item.roughness : Math.max(.22, item.roughness);
      item.material.needsUpdate = true;
    }
    invalidate();
  }, [tier, transmissiveMaterials, invalidate]);
  const { actions, mixer } = useAnimations(gltf.animations, object);
  // Scrub a single authored path in either direction so reversals preserve the exact pose.
  const action = isOpening(model) ? actions[selectAnimationName(gltf.animations.map(item => item.name), "CrystalOpen")] : model === "crystal" || model === "laptop"
    ? actions[selectAnimationName(gltf.animations.map(clip => clip.name), modelAnimationNames[model], true)]
    : undefined;
  const group = useRef<Group>(null);
  const hasPlayed = useRef(false);
  const unfolding = useRef({ time: 0, speed: 0, finished: false });
  const pulse = useRef({ request: interaction?.current.pulse ?? 0, startedAt: -Infinity, initial: 0, energy: 0 });
  const illuminated = useMemo(() => {
    const materials: { material: MeshStandardMaterial; resting: number }[] = [];
    if (model === "prism-gate") object.traverse(child => {
      if (!(child instanceof Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (material instanceof MeshStandardMaterial && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0)
          materials.push({ material, resting: material.emissiveIntensity });
      }
    });
    return materials;
  }, [object, model]);
  const gems = useMemo(() => {
    const items: { material: MeshStandardMaterial; colours: Color[] }[] = [];
    object.traverse(child => {
      if (!(child instanceof Mesh)) return;
      for (const mat of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!(mat instanceof MeshStandardMaterial) || !mat.name.startsWith("Prism_")) continue;
        const index = Number(mat.name.split("_")[1]);
        const ember = ["#e99b40", "#e26338", "#ad4165", "#edb660", "#b85334", "#dc7a8e"];
        const tide = ["#33babe", "#407ace", "#725fc6", "#48a6b4", "#689ccc", "#45c89d"];
        items.push({ material: mat, colours: [mat.color.clone(), new Color(ember[index]), new Color(tide[index])] });
      }
    });
    return items;
  }, [object]);
  const core = useMemo(() => (object.getObjectByName("Projector emitter") || object.getObjectByName("LuminousCore")) as Mesh | undefined, [object]);
  useEffect(() => {
    const finished = () => { if (model === "laptop") onFinished(); };
    mixer.addEventListener("finished", finished); return () => mixer.removeEventListener("finished", finished);
  }, [mixer, model, onFinished]);
  useEffect(() => {
    if (isOpening(model)) return;
    hasPlayed.current = false;
    if (action) { action.reset().play(); action.time = model === "laptop" ? action.getClip().duration : 0; mixer.update(0); action.paused = true; }
    invalidate();
  }, [reset, model, action, mixer, invalidate]);

  useEffect(() => {
    if (isOpening(model)) return;
    if (!action) return;
    if (model === "laptop") { action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; }
    if (playing) {
      if (!hasPlayed.current || action.time >= action.getClip().duration - 0.01) action.reset();
      action.paused = false;
      action.play();
      hasPlayed.current = true;
    } else {
      if (!hasPlayed.current) {
        action.reset().play();
        action.time = model === "laptop" ? action.getClip().duration : 0;
        mixer.update(0);
      }
      action.paused = true;
    }
    invalidate();
  }, [action, playing, model, invalidate, mixer]);

  useEffect(() => {
    if (!isOpening(model) || !action) return;
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = true;
    unfolding.current.finished = false;
    if (!playing) {
      unfolding.current.time = pose === "open" ? action.getClip().duration : 0;
      unfolding.current.speed = 0;
      action.time = unfolding.current.time;
      mixer.update(0);
    }
    invalidate();
  }, [model, action, clip, pose, playing, mixer, invalidate]);

  useEffect(() => () => {
    mixer.stopAllAction();
    object.traverse((child) => {
      if (child instanceof Mesh) for (const material of (Array.isArray(child.material) ? child.material : [child.material])) material.dispose();
    });
  }, [object, mixer]);

  useEffect(() => {
    if (!interaction) return;
    const motion = interaction.current;
    motion.invalidate = invalidate;
    return () => { motion.invalidate = undefined; };
  }, [interaction, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (isOpening(model) && action && playing && !unfolding.current.finished) {
      const motion = unfolding.current;
      const direction = clip === "CrystalClose" ? -1 : 1;
      Object.assign(motion, advanceCrystalMotion(motion.time, motion.speed, direction, action.getClip().duration, delta));
      action.time = motion.time;
      mixer.update(0);
      if (motion.finished) {
        onFinished();
      }
    }
    if (group.current && interaction) {
      const motion = interaction.current;
      const yaw = motion.yaw + motion.hoverX;
      const pitch = motion.pitch + motion.hoverY;
      const blend = 1 - Math.exp(-10 * Math.min(delta, 0.1));
      group.current.rotation.y += (yaw - group.current.rotation.y) * blend;
      group.current.rotation.x += (pitch - group.current.rotation.x) * blend;
      if (Math.abs(yaw - group.current.rotation.y) + Math.abs(pitch - group.current.rotation.x) > 0.0001) invalidate();
      for (const gem of gems) {
        const target = gem.colours[motion.palette] || gem.colours[0];
        gem.material.color.lerp(target, blend);
        if (Math.abs(gem.material.color.r - target.r) + Math.abs(gem.material.color.g - target.g) + Math.abs(gem.material.color.b - target.b) > .001) invalidate();
      }
      if (model === "prism-gate") {
        const now = performance.now() / 1000;
        const state = pulse.current;
        if (motion.pulse !== state.request) {
          state.request = motion.pulse;
          state.initial = state.energy;
          state.startedAt = motion.pulse === 0 ? -Infinity : now;
        }
        const elapsed = now - state.startedAt;
        const energy = prismPulseEnergy(elapsed, state.initial);
        if (state.energy !== energy) {
          for (const { material, resting } of illuminated) material.emissiveIntensity = resting * (1 + energy * 2.5);
          gl.domElement.style.setProperty("--prism-pulse", energy.toFixed(4));
          state.energy = energy;
        }
        if (elapsed < PRISM_PULSE_DURATION) invalidate();
      } else {
        motion.pulse = Math.max(0, motion.pulse - dt * .65);
        const energy = Math.sin(motion.pulse * Math.PI);
        if (core) {
          core.scale.setScalar(1 + energy * .18);
          if (core.material instanceof MeshStandardMaterial) core.material.emissiveIntensity = .45 + energy * 1.3;
        }
        group.current.scale.setScalar(1 + energy * .025);
        if (motion.pulse > 0) invalidate();
      }
    } else if (group.current) group.current.rotation.y = angle;
    if (playing) invalidate();
  });
  return <group ref={group}><group position={model === "crystal" ? [-1.25, -1.5, .55] : [0, isOpening(model) ? -2.15 : -1.1, 0]}>
    <primitive object={object} dispose={null} />
    {image && model !== "crystal" && !isOpening(model) && <ScreenTexture image={image} object={object} />}
  </group></group>;
}

function StudioScene(props: Props & { tier: RenderTier; onWidth: (width: number) => void }) {
  const { gl, size, invalidate } = useThree();
  const tier = props.tier;
  const profile = renderProfiles[tier];
  const environment = useEnvironmentPreparation(gl, profile.environmentResolution, props.onFailure);
  useEffect(() => {
    gl.transmissionResolutionScale = profile.transmissionScale;
    gl.domElement.dataset.renderTier = tier;
    invalidate();
  }, [gl, profile, tier, invalidate]);
  useEffect(() => { props.onWidth(size.width); }, [size.width, props.onWidth]);
  const controls = useRef<OrbitControlsType>(null);
  useEffect(() => { controls.current?.reset(); }, [props.reset]);
  return <>
    {/* Transparent stages inherit the page palette in every appearance. */}
    <ambientLight intensity={props.model === "observatory" ? props.light ? .65 : .45 : props.light ? .45 : .25} />
    <directionalLight position={[3, 5, 4]} intensity={props.model === "prism-gate" ? .7 : props.model === "observatory" ? 2.4 : 1.5} />
    {environment.ready && <Environment key={`${tier}-${props.light}`} resolution={profile.environmentResolution} frames={1}>
      <mesh scale={30}><sphereGeometry args={[1, profile.sphereSegments, profile.sphereSegments / 2]} /><meshBasicMaterial color={props.model === "crystal" ? props.light ? "#cad2dd" : "#838ea1" : props.light ? "#747d8c" : "#30394f"} side={BackSide} /></mesh>
      <Lightformer form="rect" intensity={2} position={[0, 4, -3]} scale={[5, 2, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.5} position={[-4, 1, 1]} scale={[1, 5, 1]} rotation-y={Math.PI / 2} color="#b6c8ff" />
      {profile.rimLight && <Lightformer form="rect" intensity={2} position={[4, 3, 2]} scale={[1, 4, 1]} rotation-y={-Math.PI / 2} color={props.light ? "#fff2df" : "#b5a5f5"} />}
      {props.model === "prism-gate" && <>
        <Lightformer form="rect" intensity={3} position={[-3, 2, 5]} scale={[3, 7, 1]} rotation-y={Math.PI - .5} color="#f2f7ff" />
        {profile.rimLight && <Lightformer form="rect" intensity={2} position={[3, -1, 4]} scale={[1.2, 6, 1]} rotation-y={Math.PI + .6} color="#b9e7ff" />}
      </>}
    </Environment>}
    <ObjectModel key={props.model} {...props} tier={tier} />
    <PreparedScene environmentReady={environment.ready} onCompiled={environment.release} revision={`${tier}-${props.light}-${props.model}-${props.image || ""}`} onReady={props.onReady} onFailure={props.onFailure} />
    {!props.interaction && <OrbitControls ref={controls} enabled={!isOpening(props.model) || !props.playing} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 1.8} onStart={props.onInteraction} />}
  </>;
}

export default function ModelCanvas(props: Props) {
  const { renderQuality } = useExperience();
  // Resolve assets under the DOM error boundary before creating a renderer.
  // R3F forwards even caught renderer-root load errors to window.reportError.
  useGLTF(modelUrl(props.model), false, false);
  return props.image ? <ImageReadyCanvas {...props} image={props.image} quality={renderQuality} /> : <SceneCanvas {...props} quality={renderQuality} />;
}

function ImageReadyCanvas(props: Props & { image: string; quality: RenderQuality }) {
  useLoader(TextureLoader, props.image);
  return <SceneCanvas {...props} />;
}

function SceneCanvas(props: Props & { quality: RenderQuality }) {
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const { tier, onSample } = useAdaptiveRenderQuality(props.quality, width);
  const profile = renderProfiles[tier];
  const onReady = useCallback(() => { setReady(true); props.onReady(); }, [props.onReady]);
  const view = scenePresentation(props.model);
  // Keep DPR in Canvas configuration: imperative setDpr can be overwritten on parent/size updates.
  return <Canvas dpr={[1, profile.maxDpr]} frameloop={props.playing ? "always" : "demand"} camera={{ position: view.position, fov: view.fov }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
    <PosterFraming model={props.model} />
    <CanvasHealth onFailure={props.onFailure} />
    <RenderPerformanceProbe enabled={ready && props.playing} onSample={onSample} />
    <Suspense fallback={null}><StudioScene {...props} tier={tier} onReady={onReady} onWidth={setWidth} /></Suspense>
  </Canvas>;
}
