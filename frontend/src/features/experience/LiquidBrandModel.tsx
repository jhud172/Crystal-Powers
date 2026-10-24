import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Color, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from "three";
import { brandFinishes, brandLighting, type BrandFinish, type BrandLighting, type BrandPart } from "./brandFinishes";
import { renderProfiles, type RenderTier } from "./renderQuality";
import { advanceCrystalMotion } from "./crystalMotion";

const smooth = (value: number) => value * value * value * (value * (value * 6 - 15) + 10);
const colourDistance = (a: Color, b: Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
const finishTargets = (finish: BrandFinish, lighting: BrandLighting, role: string) => ({
  colour: new Color(role === "brand-core" ? brandFinishes[finish].core : role === "brand-backing" ? "#b6a4f4" : finish === "glacier" ? "#ffffff" : brandFinishes[finish].shell),
  neon: new Color(brandFinishes[finish].glow).lerp(new Color(brandLighting[lighting].key), .3),
  roughness: finish === "pearl" ? .19 : finish === "rose" ? .065 : .035,
  gradient: role === "brand-shell" && finish === "glacier" ? 1 : 0,
  alpha: finish === "pearl" ? .58 : role === "brand-core" ? .38 : role === "brand-backing" ? .18 : .23,
});

/** Stable optical shaders and uniforms let finishes morph without a poster flash. */
export function LiquidBrandModel({ unfolded, rotation, finish, lighting, scale, part, topology, tier, onSample }: {
  unfolded: boolean; rotation: number; finish: BrandFinish; lighting: BrandLighting; scale: number; part: BrandPart;
  topology: boolean; tier: RenderTier; onSample: (interval: number, now: number) => void;
}) {
  const original = useGLTF("/models/liquid-brand-crystal.glb?v=studio-02", false, false).scene;
  const root = useRef<Group>(null);
  const unfolding = useRef({ time: 0, speed: 0 });
  const yaw = useRef(rotation), zoom = useRef(scale);
  const wasAnimating = useRef(false);
  const { invalidate } = useThree();
  // The initial snapshot seeds a newly opened instance; later control changes use targets below.
  const initial = useRef({ finish, lighting });
  const model = useMemo(() => {
    const scene = original.clone(true);
    const pieces: { mesh: Mesh; role: string; rest: Vector3 }[] = [];
    const surfaces: { material: MeshStandardMaterial; role: string; gradient: { value: number }; neon: { value: Color }; alpha: { value: number } }[] = [];
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.material = Array.isArray(child.material) ? child.material.map(material => material.clone()) : child.material.clone();
      const role = String(child.userData.role);
      pieces.push({ mesh: child, role, rest: child.position.clone() });
      child.renderOrder = role === "brand-backing" ? 0 : role === "brand-core" ? 1 : 2;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        const target = finishTargets(initial.current.finish, initial.current.lighting, role);
        const gradient = { value: target.gradient }, neon = { value: target.neon }, alpha = { value: target.alpha };
        material.vertexColors = role === "brand-shell";
        material.color.copy(target.colour); material.roughness = target.roughness; material.metalness = .025;
        material.transparent = true; material.opacity = 1; material.depthWrite = false;
        material.emissive.copy(target.neon); material.emissiveIntensity = role === "brand-core" ? .13 : .025;
        if (material instanceof MeshPhysicalMaterial) {
          material.clearcoat = 1; material.clearcoatRoughness = .025;
          material.ior = 1.46; material.thickness = role === "brand-core" ? .46 : .32;
          material.envMapIntensity = 2.4; material.specularIntensity = 1;
        }
        material.onBeforeCompile = shader => {
          shader.uniforms.signatureGradient = gradient;
          shader.uniforms.signatureNeon = neon;
          shader.uniforms.signatureAlpha = alpha;
          shader.fragmentShader = 'uniform float signatureGradient;\nuniform vec3 signatureNeon;\nuniform float signatureAlpha;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
            #if defined( USE_COLOR_ALPHA )
              diffuseColor *= mix(vec4(1.0), vColor, signatureGradient);
            #elif defined( USE_COLOR )
              diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, signatureGradient);
            #endif
          `).replace('#include <opaque_fragment>', `
            #include <opaque_fragment>
            float signatureFacing = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
            float signatureFresnel = pow(1.0 - signatureFacing, 2.5);
            vec3 signatureReflection = reflect(-normalize(vViewPosition), normal);
            float signatureSoftbox = pow(max(dot(signatureReflection, normalize(vec3(-0.3, 0.5, 1.0))), 0.0), 56.0);
            gl_FragColor.rgb += signatureNeon * signatureFresnel * 1.05 + vec3(0.85, 0.96, 1.0) * signatureSoftbox * 0.6;
            gl_FragColor.a = mix(signatureAlpha, 0.92, signatureFresnel);
          `);
        };
        material.customProgramCacheKey = () => "signature-liquid-optics-03";
        surfaces.push({ material, role, gradient, neon, alpha });
      }
    });
    return { scene, pieces, surfaces };
  }, [original]);
  const targets = useMemo(() => model.surfaces.map(surface => ({ ...surface, target: finishTargets(finish, lighting, surface.role) })), [model, finish, lighting]);
  useEffect(() => {
    for (const { mesh, role } of model.pieces) mesh.visible = part === "complete" || (part === "core" ? role === "brand-core" : role !== "brand-core");
  }, [model, part]);
  useEffect(() => {
    for (const { material } of model.surfaces) {
      material.wireframe = topology;
      if (material instanceof MeshPhysicalMaterial) material.transmission = renderProfiles[tier].transmission && !topology ? .8 : 0;
      material.needsUpdate = true;
    }
    invalidate();
  }, [model, topology, tier, invalidate]);
  useEffect(() => { invalidate(); }, [unfolded, rotation, scale, targets, invalidate]);
  useEffect(() => () => {
    for (const { mesh } of model.pieces) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  }, [model]);
  useFrame((_, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta, .05) * 6);
    const motion = advanceCrystalMotion(unfolding.current.time, unfolding.current.speed, unfolded ? 1 : -1, 1.25, delta);
    unfolding.current.time = motion.time; unfolding.current.speed = motion.finished ? 0 : motion.speed;
    const amount = smooth(motion.time / 1.25);
    yaw.current += (rotation - yaw.current) * blend;
    zoom.current += (scale - zoom.current) * blend;
    let changing = false;
    for (const { material, gradient, neon, alpha, target, role } of targets) {
      material.color.lerp(target.colour, blend);
      material.emissive.lerp(target.neon, blend);
      neon.value.lerp(target.neon, blend);
      const roughness = topology ? .6 : target.roughness;
      material.roughness += (roughness - material.roughness) * blend;
      gradient.value += (target.gradient - gradient.value) * blend;
      const opacity = topology ? 1 : target.alpha;
      alpha.value += (opacity - alpha.value) * blend;
      material.emissiveIntensity = (role === "brand-core" ? .13 : .025) * (1 + amount * .5);
      if (colourDistance(material.color, target.colour) + colourDistance(neon.value, target.neon) + colourDistance(material.emissive, target.neon) + Math.abs(material.roughness - roughness) + Math.abs(gradient.value - target.gradient) + Math.abs(alpha.value - opacity) > .002) changing = true;
    }
    if (root.current) {
      root.current.rotation.set(.12 + amount * .08, yaw.current + .22, 0);
      root.current.scale.setScalar(zoom.current);
    }
    for (const { mesh, rest, role } of model.pieces) {
      mesh.position.copy(rest);
      if (role === "brand-shell") mesh.position.z += amount * .12;
      if (role === "brand-core") { mesh.position.z += amount * .98; mesh.position.y += amount * .08; mesh.rotation.y = amount * .28; }
      if (role === "brand-backing") { mesh.position.z -= amount * .64; mesh.rotation.z = amount * -.045; }
    }
    const moving = changing || !motion.finished || Math.abs(yaw.current - rotation) > .001 || Math.abs(zoom.current - scale) > .001;
    onSample(wasAnimating.current ? delta * 1000 : 0, performance.now());
    wasAnimating.current = moving;
    if (moving) invalidate();
  });
  return <group ref={root}><primitive object={model.scene} dispose={null} /></group>;
}
