import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Path, Shape } from "three";
import { brandFinishes, type BrandFinish } from "./brandFinishes";

// Stable constructor options prevent geometry recreation on control updates.
const shellExtrusion = { depth: .3, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: .11, bevelThickness: .13, curveSegments: 40 };
const coreExtrusion = { depth: .36, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: .09, bevelThickness: .14, curveSegments: 32 };

/** Original editable Liquid Light mark. Shape and bevels are authored here;
 * declarative R3F geometries/materials own their GPU disposal. No external assets. */
export function LiquidBrandModel({ unfolded, rotation, finish, onReady, onSample }: { unfolded: boolean; rotation: number; finish: BrandFinish; onReady: () => void; onSample: (interval: number, now: number) => void }) {
  const material = brandFinishes[finish];
  const root = useRef<Group>(null);
  const core = useRef<Group>(null);
  const drawn = useRef(false);
  const amount = useRef(0);
  const yaw = useRef(rotation);
  const wasAnimating = useRef(false);
  const { invalidate } = useThree();
  const shapes = useMemo(() => {
    const shell = new Shape();
    shell.moveTo(0, 2.05);
    shell.bezierCurveTo(.28, 2.05, 1.48, .6, 1.48, 0);
    shell.bezierCurveTo(1.48, -.62, .25, -2.05, 0, -2.05);
    shell.bezierCurveTo(-.25, -2.05, -1.48, -.62, -1.48, 0);
    shell.bezierCurveTo(-1.48, .6, -.28, 2.05, 0, 2.05);
    const hole = new Path();
    hole.moveTo(0, 1.48);
    hole.bezierCurveTo(-.18, 1.48, -.91, .42, -.91, 0);
    hole.bezierCurveTo(-.91, -.43, -.18, -1.48, 0, -1.48);
    hole.bezierCurveTo(.18, -1.48, .91, -.43, .91, 0);
    hole.bezierCurveTo(.91, .42, .18, 1.48, 0, 1.48);
    shell.holes.push(hole);
    const centre = new Shape();
    centre.moveTo(0, 1.06);
    centre.bezierCurveTo(.15, 1.06, .47, .28, .47, 0);
    centre.bezierCurveTo(.47, -.3, .15, -1.06, 0, -1.06);
    centre.bezierCurveTo(-.15, -1.06, -.47, -.3, -.47, 0);
    centre.bezierCurveTo(-.47, .28, -.15, 1.06, 0, 1.06);
    return { shell, centre };
  }, []);
  useFrame((_, delta) => {
    const damping = 1 - Math.exp(-Math.min(delta, .05) * 7);
    amount.current += ((unfolded ? 1 : 0) - amount.current) * damping;
    yaw.current += (rotation - yaw.current) * damping;
    if (root.current) {
      root.current.rotation.set(.13 + amount.current * .09, yaw.current + .18, -.12);
    }
    if (core.current) {
      core.current.position.z = .2 + amount.current * .8;
      core.current.rotation.y = amount.current * .55;
      core.current.position.y = amount.current * .16;
    }
    if (!drawn.current) { drawn.current = true; onReady(); }
    const moving = Math.abs(amount.current - (unfolded ? 1 : 0)) > .001 || Math.abs(yaw.current - rotation) > .001;
    onSample(wasAnimating.current ? delta * 1000 : 0, performance.now());
    wasAnimating.current = moving;
    if (moving) invalidate();
  });
  return <group ref={root}>
    <mesh position={[0, 0, -.16]}>
      <extrudeGeometry args={[shapes.shell, shellExtrusion]} />
      <meshPhysicalMaterial color={material.shell} metalness={material.metalness} roughness={material.roughness} clearcoat={1} clearcoatRoughness={.16} />
    </mesh>
    <group ref={core}>
      <mesh position={[0, 0, -.2]}>
        <extrudeGeometry args={[shapes.centre, coreExtrusion]} />
        <meshPhysicalMaterial color={material.core} metalness={.15} roughness={.16} clearcoat={1} emissive={material.glow} emissiveIntensity={.16} />
      </mesh>
    </group>
  </group>;
}
