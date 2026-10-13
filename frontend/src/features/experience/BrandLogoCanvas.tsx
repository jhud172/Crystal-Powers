import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Box3, Group, Mesh, OrthographicCamera, Vector3 } from "three";
import { useExperience } from "./ExperienceContext";

type Props = { unfolded: boolean; onReady: () => void; onFailure: () => void };
function Logo({ unfolded, onReady, onFailure }: Props) {
  // The authored GLB is uncompressed: avoid external decoders and unnecessary WASM.
  const original = useGLTF("/models/crystal-powers-logo-3d.glb?v=brand-01", false, false).scene;
  const { camera, size, invalidate, gl } = useThree();
  const root = useRef<Group>(null);
  const progress = useRef(0);
  const firstDraw = useRef(false);
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
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useFrame((_, delta) => {
    const target = unfolded ? 1 : 0;
    progress.current += (target - progress.current) * (1 - Math.exp(-Math.min(delta, .05) * 5));
    for (const piece of model.pieces) piece.mesh.position.copy(piece.rest).addScaledVector(piece.offset, progress.current);
    if (root.current) { root.current.rotation.y = -.12 + progress.current * .25; root.current.rotation.x = .08 + progress.current * .08; }
    if (!firstDraw.current) { firstDraw.current = true; onReady(); }
    if (Math.abs(progress.current - target) > .001) invalidate();
  });
  return <group ref={root}><primitive object={model.scene} dispose={null} /></group>;
}
export default function BrandLogoCanvas(props: Props) {
  const { renderQuality } = useExperience();
  return <Canvas orthographic camera={{ position: [0, 0, 12], zoom: 30, near: .1, far: 80 }} frameloop="demand" dpr={[1, renderQuality === "low" ? 1 : renderQuality === "high" ? 2 : 1.5]} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => gl.setClearColor(0, 0)}>
    <ambientLight intensity={1.4} /><directionalLight position={[0, 4, 8]} intensity={3} /><directionalLight position={[-6, 1, 4]} intensity={2} color="#94d6ff" /><directionalLight position={[5, -3, 2]} intensity={1.5} />
    <Logo {...props} />
  </Canvas>;
}
