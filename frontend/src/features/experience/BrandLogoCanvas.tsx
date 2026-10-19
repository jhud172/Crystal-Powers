import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box3, Group, Mesh, OrthographicCamera, Vector3 } from "three";
import { useExperience } from "./ExperienceContext";
import { LiquidBrandModel } from "./LiquidBrandModel";
import { useAdaptiveRenderQuality } from "./useAdaptiveRenderQuality";
import { renderProfiles, type RenderTier } from "./renderQuality";
import type { BrandFinish } from "./brandFinishes";

type Props = { unfolded: boolean; onReady: () => void; onFailure: () => void; variant: "liquid" | "faceted"; rotation: number; finish: BrandFinish };
type SceneProps = Props & { tier: RenderTier; onWidth: (width: number) => void; onSample: (interval: number, now: number) => void };
function Logo({ unfolded, onReady, onSample }: SceneProps) {
  // The authored GLB is uncompressed: avoid external decoders and unnecessary WASM.
  const original = useGLTF("/models/crystal-powers-logo-3d.glb?v=brand-01", false, false).scene;
  const { camera, size, invalidate } = useThree();
  const root = useRef<Group>(null);
  const progress = useRef(0);
  const firstDraw = useRef(false);
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
    if (camera instanceof OrthographicCamera) { camera.zoom = Math.min(size.width / 13.2, size.height / 4.5); camera.updateProjectionMatrix(); }
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => { invalidate(); }, [unfolded, invalidate]);
  useFrame((_, delta) => {
    const target = unfolded ? 1 : 0;
    progress.current += (target - progress.current) * (1 - Math.exp(-Math.min(delta, .05) * 5));
    for (const piece of model.pieces) piece.mesh.position.copy(piece.rest).addScaledVector(piece.offset, progress.current);
    if (root.current) { root.current.rotation.y = -.12 + progress.current * .25; root.current.rotation.x = .08 + progress.current * .08; }
    if (!firstDraw.current) { firstDraw.current = true; onReady(); }
    const moving = Math.abs(progress.current - target) > .001;
    onSample(wasAnimating.current ? delta * 1000 : 0, performance.now());
    wasAnimating.current = moving;
    if (moving) invalidate();
  });
  return <group ref={root}><primitive object={model.scene} dispose={null} /></group>;
}
export default function BrandLogoCanvas(props: Props) {
  const { renderQuality } = useExperience();
  const [width, setWidth] = useState(0);
  const { tier, onSample } = useAdaptiveRenderQuality(renderQuality, width);
  return <Canvas orthographic camera={{ position: [0, 0, 12], zoom: 30, near: .1, far: 80 }} frameloop="demand" dpr={[1, renderProfiles[tier].maxDpr]} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => gl.setClearColor(0, 0)}>
    <ambientLight intensity={1.4} /><directionalLight position={[0, 4, 8]} intensity={3} /><directionalLight position={[-6, 1, 4]} intensity={2} color="#94d6ff" /><directionalLight position={[5, -3, 2]} intensity={1.5} />
    <BrandScene {...props} tier={tier} onSample={onSample} onWidth={setWidth} />
  </Canvas>;
}

function BrandScene(props: SceneProps) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => { props.onWidth(size.width); }, [size.width, props.onWidth]);
  useEffect(() => { gl.domElement.dataset.renderTier = props.tier; }, [gl, props.tier]);
  useLayoutEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = props.variant === "liquid" ? Math.min(size.width / 6.4, size.height / 5.3) : Math.min(size.width / 13.2, size.height / 4.5);
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, size.width, size.height, props.variant, props.unfolded, props.rotation, props.finish, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); props.onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, props.onFailure]);
  return props.variant === "liquid" ? <LiquidBrandModel unfolded={props.unfolded} rotation={props.rotation * Math.PI / 180} finish={props.finish} onReady={props.onReady} onSample={props.onSample} /> : <Logo {...props} />;
}
