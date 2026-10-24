import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AmbientLight, BackSide, Box3, Color, DirectionalLight, Group, Mesh, OrthographicCamera, Vector3 } from "three";
import { useExperience } from "./ExperienceContext";
import { LiquidBrandModel } from "./LiquidBrandModel";
import { useAdaptiveRenderQuality } from "./useAdaptiveRenderQuality";
import { renderProfiles, type RenderTier } from "./renderQuality";
import { brandLighting, type BrandFinish, type BrandLighting, type BrandPart } from "./brandFinishes";
import { PreparedScene } from "./PreparedScene";
import { useEnvironmentPreparation } from "./useEnvironmentPreparation";
import type { OrbitControls as Controls } from "three-stdlib";

type Props = { unfolded: boolean; onReady: () => void; onFailure: () => void; variant: "liquid" | "faceted"; rotation: number; finish: BrandFinish; scale: number; brightness: number; lighting: BrandLighting; part: BrandPart; topology: boolean; reset: number };
type SceneProps = Props & { tier: RenderTier; onWidth: (width: number) => void; onSample: (interval: number, now: number) => void };
function Logo({ unfolded, rotation, scale, onSample }: SceneProps) {
  // The authored GLB is uncompressed: avoid external decoders and unnecessary WASM.
  const original = useGLTF("/models/crystal-powers-logo-3d.glb?v=brand-01", false, false).scene;
  const { camera, size, invalidate } = useThree();
  const root = useRef<Group>(null);
  const progress = useRef(0);
  const wasAnimating = useRef(false);
  const model = useMemo(() => {
    const scene = original.clone(true);
    const centre = new Box3().setFromObject(scene).getCenter(new Vector3());
    scene.position.sub(centre);
    const pieces: { mesh: Mesh; rest: Vector3; offset: Vector3 }[] = [];
    scene.traverse(node => {
      if (!(node instanceof Mesh)) return;
      let ancestor = node.parent;
      let crystal = node.userData.role === "brand-emblem" || node.name.includes("Signature");
      while (ancestor) { crystal ||= ancestor.userData.role === "brand-emblem" || ancestor.name.includes("Signature"); ancestor = ancestor.parent; }
      if (!crystal) return;
      node.geometry.computeBoundingBox();
      const direction = node.geometry.boundingBox!.getCenter(new Vector3());
      if (direction.length() < .01) direction.set(0, .7, .2);
      direction.normalize().multiplyScalar(.75);
      pieces.push({ mesh: node, rest: node.position.clone(), offset: direction });
    });
    return { scene, pieces };
  }, [original]);
  useLayoutEffect(() => {
    if (camera instanceof OrthographicCamera) { camera.zoom = Math.min(size.width / 16, size.height / 5.8); camera.updateProjectionMatrix(); }
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => { invalidate(); }, [unfolded, invalidate]);
  useFrame((_, delta) => {
    const target = unfolded ? 1 : 0;
    progress.current += (target - progress.current) * (1 - Math.exp(-Math.min(delta, .05) * 5));
    for (const piece of model.pieces) piece.mesh.position.copy(piece.rest).addScaledVector(piece.offset, progress.current);
    if (root.current) { root.current.scale.setScalar(scale); root.current.rotation.y = rotation * Math.PI / 180 + progress.current * .25; root.current.rotation.x = .08 + progress.current * .08; }
    const moving = Math.abs(progress.current - target) > .001;
    onSample(wasAnimating.current ? delta * 1000 : 0, performance.now());
    wasAnimating.current = moving;
    if (moving) invalidate();
  });
  return <group ref={root}><primitive object={model.scene} dispose={null} /></group>;
}
export default function BrandLogoCanvas(props: Props) {
  useGLTF(props.variant === "liquid" ? "/models/liquid-brand-crystal.glb?v=studio-02" : "/models/crystal-powers-logo-3d.glb?v=brand-01", false, false);
  const { renderQuality } = useExperience();
  const [width, setWidth] = useState(0);
  const { tier, onSample } = useAdaptiveRenderQuality(renderQuality, width);
  return <Canvas orthographic camera={{ position: [0, 0, 12], zoom: 30, near: .1, far: 80 }} frameloop="demand" dpr={[1, renderProfiles[tier].maxDpr]} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => gl.setClearColor(0, 0)}>
    <BrandScene {...props} tier={tier} onSample={onSample} onWidth={setWidth} />
  </Canvas>;
}

function BrandScene(props: SceneProps) {
  const { camera, size, invalidate, gl } = useThree();
  const profile = renderProfiles[props.tier];
  const environment = useEnvironmentPreparation(gl, Math.min(256, profile.environmentResolution), props.onFailure);
  const controls = useRef<Controls>(null);
  useEffect(() => {
    camera.position.set(0, 0, 12); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0); controls.current?.update(); invalidate();
  }, [props.reset, camera, invalidate]);
  useEffect(() => { gl.transmissionResolutionScale = profile.transmissionScale; invalidate(); }, [gl, profile, invalidate]);
  useEffect(() => { props.onWidth(size.width); }, [size.width, props.onWidth]);
  useEffect(() => { gl.domElement.dataset.renderTier = props.tier; }, [gl, props.tier]);
  useLayoutEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = props.variant === "liquid" ? Math.min(size.width / 5.8, size.height / 6.8) : Math.min(size.width / 16, size.height / 5.8);
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, size.width, size.height, props.variant, props.unfolded, props.rotation, props.finish, props.scale, props.brightness, props.lighting, props.part, props.topology, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); props.onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, props.onFailure]);
  return <>
    <StudioLights lighting={props.lighting} brightness={props.brightness} />
    {environment.ready && <Environment resolution={Math.min(256, profile.environmentResolution)} frames={1}>
      <mesh scale={25}><sphereGeometry args={[1, 16, 8]} /><meshBasicMaterial color="#18243a" side={BackSide} /></mesh>
      <Lightformer form="rect" intensity={4} position={[-3, 3, 4]} rotation-y={Math.PI - .55} scale={[2, 6, 1]} color="#e4faff" />
      <Lightformer form="rect" intensity={3} position={[4, -1, 3]} rotation-y={Math.PI + .7} scale={[1, 5, 1]} color="#9fdfff" />
      <Lightformer form="rect" intensity={3.5} position={[0, 4, 2]} rotation-x={Math.PI / 2} scale={[5, 1.4, 1]} color="#f4fbff" />
    </Environment>}
    {props.variant === "liquid" ? <LiquidBrandModel unfolded={props.unfolded} rotation={props.rotation * Math.PI / 180} finish={props.finish} lighting={props.lighting} scale={props.scale} part={props.part} topology={props.topology} tier={props.tier} onSample={props.onSample} /> : <Logo {...props} />}
    <OrbitControls ref={controls} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI * 2 / 3} />
    <PreparedScene environmentReady={environment.ready} onCompiled={environment.release} revision={`${props.variant}-${props.topology}-${props.tier}`} onReady={props.onReady} onFailure={props.onFailure} />
  </>;
}

/** Retarget existing lights; changing a preset never replaces a light or its scene. */
function StudioLights({ lighting, brightness }: Pick<Props, "lighting" | "brightness">) {
  const { invalidate } = useThree();
  const ambient = useRef<AmbientLight>(null), key = useRef<DirectionalLight>(null), rim = useRef<DirectionalLight>(null);
  const seed = useRef({ ...brandLighting[lighting], power: brightness / 100 });
  const target = useMemo(() => ({ key: new Color(brandLighting[lighting].key), rim: new Color(brandLighting[lighting].rim), position: new Vector3(...brandLighting[lighting].position), power: brightness / 100 }), [lighting, brightness]);
  useEffect(() => { invalidate(); }, [target, invalidate]);
  useFrame((_, delta) => {
    if (!ambient.current || !key.current || !rim.current) return;
    const blend = 1 - Math.exp(-Math.min(delta, .05) * 6);
    ambient.current.intensity += (.4 * target.power - ambient.current.intensity) * blend;
    key.current.intensity += (3 * target.power - key.current.intensity) * blend;
    rim.current.intensity += (2.2 * target.power - rim.current.intensity) * blend;
    key.current.color.lerp(target.key, blend); rim.current.color.lerp(target.rim, blend);
    key.current.position.lerp(target.position, blend);
    const colourError = Math.abs(key.current.color.r - target.key.r) + Math.abs(key.current.color.g - target.key.g) + Math.abs(key.current.color.b - target.key.b) + Math.abs(rim.current.color.r - target.rim.r) + Math.abs(rim.current.color.g - target.rim.g) + Math.abs(rim.current.color.b - target.rim.b);
    if (colourError + key.current.position.distanceTo(target.position) + Math.abs(ambient.current.intensity - .4 * target.power) + Math.abs(key.current.intensity - 3 * target.power) + Math.abs(rim.current.intensity - 2.2 * target.power) > .002) invalidate();
  });
  return <>
    <ambientLight ref={ambient} intensity={.4 * seed.current.power} />
    <directionalLight ref={key} position={seed.current.position} intensity={3 * seed.current.power} color={seed.current.key} />
    <directionalLight ref={rim} position={[4, -2, 3]} intensity={2.2 * seed.current.power} color={seed.current.rim} />
  </>;
}
