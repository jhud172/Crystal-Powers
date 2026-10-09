import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, OrbitControls, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { BackSide, CanvasTexture, Color, Group, Object3D, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshPhysicalMaterial, SRGBColorSpace, LoopOnce } from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { ModelKind } from "./ModelStage";
import { modelAnimationNames, selectAnimationName } from "./animationContract";
import { advanceCrystalMotion } from "./crystalMotion";

export type CrystalInteraction = { yaw: number; pitch: number; hoverX: number; hoverY: number; palette: number; pulse: number; invalidate?: () => void };

type Props = { interaction?: RefObject<CrystalInteraction>; model: ModelKind; image?: string; clip?: "CrystalOpen" | "CrystalClose"; pose?: "open" | "closed"; light: boolean; angle: number; reset: number; playing: boolean; onInteraction: () => void; onFailure: () => void; onReady: () => void; onFinished: () => void };
const modelUrl = (model: ModelKind) => `/models/${model}.glb${model === "observatory" ? "?v=aurora-02" : ""}`;

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

function ScreenTexture({ image, object }: { image: string; object: Group }) {
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
  }, [object, original]);
  return null;
}

function ObjectModel({ model, image, clip = "CrystalOpen", pose = "closed", angle, playing, reset, onReady, onFinished, interaction }: Pick<Props, "model" | "image" | "clip" | "pose" | "angle" | "playing" | "reset" | "onReady" | "onFinished" | "interaction">) {
  // Original GLBs are uncompressed: do not initialise external Draco or WASM Meshopt decoders.
  const gltf = useGLTF(modelUrl(model), false, false);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = Array.isArray(child.material) ? child.material.map((mat) => mat.clone()) : child.material.clone();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof MeshPhysicalMaterial && material.transmission > 0 && model !== "observatory") {
            material.thickness = 1.2;
            material.ior = 1.46;
            material.envMapIntensity = 0.55;
            material.transmission = 0.94;
            material.roughness = 0.07;
            material.clearcoat = 0.18;
            material.dispersion = 0.08;
          }
        }
      }
    });
    return clone;
  }, [gltf.scene, model]);
  const { actions, mixer } = useAnimations(gltf.animations, object);
  // Scrub a single authored path in either direction so reversals preserve the exact pose.
  const action = model === "observatory" ? actions[selectAnimationName(gltf.animations.map(item => item.name), "CrystalOpen")] : model === "crystal" || model === "laptop"
    ? actions[selectAnimationName(gltf.animations.map(clip => clip.name), modelAnimationNames[model], true)]
    : undefined;
  const group = useRef<Group>(null);
  const hasPlayed = useRef(false);
  const { invalidate } = useThree();
  const announcedReady = useRef(false);
  const unfolding = useRef({ time: 0, speed: 0, finished: false });
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
  const core = useMemo(() => object.getObjectByName("LuminousCore") as Mesh | undefined, [object]);
  useEffect(() => {
    const finished = () => { if (model === "laptop") onFinished(); };
    mixer.addEventListener("finished", finished); return () => mixer.removeEventListener("finished", finished);
  }, [mixer, model, onFinished]);
  useEffect(() => {
    if (model === "observatory") return;
    hasPlayed.current = false;
    if (action) { action.reset().play(); action.time = model === "laptop" ? action.getClip().duration : 0; mixer.update(0); action.paused = true; }
    invalidate();
  }, [reset, model, action, mixer, invalidate]);

  useEffect(() => {
    if (model === "observatory") return;
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
    if (model !== "observatory" || !action) return;
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
    if (!announcedReady.current) { announcedReady.current = true; onReady(); }
    const dt = Math.min(delta, 0.05);
    if (model === "observatory" && action && playing && !unfolding.current.finished) {
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
      motion.pulse = Math.max(0, motion.pulse - dt * .65);
      const energy = Math.sin(motion.pulse * Math.PI);
      if (core) {
        core.scale.setScalar(1 + energy * .18);
        if (core.material instanceof MeshStandardMaterial) core.material.emissiveIntensity = .45 + energy * 1.3;
      }
      group.current.scale.setScalar(1 + energy * .025);
      if (motion.pulse > 0) invalidate();
    } else if (group.current) group.current.rotation.y = angle;
    if (playing) invalidate();
  });
  return <group ref={group}><group position={[0, model === "observatory" ? -2.15 : model === "crystal" ? -1.5 : -1.1, 0]}>
    {model === "crystal" ? <CrystalTree object={object} /> : <primitive object={object} dispose={null} />}
    {image && model !== "crystal" && model !== "observatory" && <ScreenTexture image={image} object={object} />}
  </group></group>;
}

function CrystalTree({ object }: { object: Object3D }) {
  const glass = object instanceof Mesh && object.name !== "Obsidian_insert" && object.name !== "Satin_plinth" && ["Companion_cut", "Signature_crystal", "Small_cut"].includes(object.name);
  return <primitive object={object} dispose={null}>
    {glass && <MeshTransmissionMaterial resolution={256} samples={4} backside backsideResolution={128} backsideThickness={0.4} thickness={1.6} roughness={0.025} ior={1.46} chromaticAberration={0.025} anisotropicBlur={0} distortion={0} temporalDistortion={0} color="#eef6ff" envMapIntensity={1} />}
    {object.children.map(child => <CrystalTree key={child.uuid} object={child} />)}
  </primitive>;
}

function StudioScene(props: Props) {
  const controls = useRef<OrbitControlsType>(null);
  useEffect(() => { controls.current?.reset(); }, [props.reset]);
  return <>
    {props.model !== "observatory" && <color attach="background" args={[props.light ? "#f2f0eb" : "#0b1018"]} />}
    <ambientLight intensity={props.light ? 0.45 : 0.25} />
    <directionalLight position={[3, 5, 4]} intensity={1.5} />
    <Environment resolution={256} frames={1}>
      <mesh scale={30}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial color={props.light ? "#747d8c" : "#30394f"} side={BackSide} /></mesh>
      <Lightformer form="rect" intensity={2} position={[0, 4, -3]} scale={[5, 2, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.5} position={[-4, 1, 1]} scale={[1, 5, 1]} rotation-y={Math.PI / 2} color="#b6c8ff" />
      <Lightformer form="rect" intensity={2} position={[4, 3, 2]} scale={[1, 4, 1]} rotation-y={-Math.PI / 2} color={props.light ? "#fff2df" : "#b5a5f5"} />
    </Environment>
    <ObjectModel key={props.model} {...props} />
    {!props.interaction && <OrbitControls ref={controls} enabled={props.model !== "observatory" || !props.playing} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 1.8} onStart={props.onInteraction} />}
  </>;
}

export default function ModelCanvas(props: Props) {
  return <Canvas dpr={[1, 1.5]} frameloop={props.playing ? "always" : "demand"} camera={props.model === "observatory" ? { position: [3.6, 2.55, 9], fov: 30 } : { position: [3.6, 2.5, 7.5], fov: 34 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
    <CanvasHealth onFailure={props.onFailure} />
    <Suspense fallback={null}><StudioScene {...props} /></Suspense>
  </Canvas>;
}
