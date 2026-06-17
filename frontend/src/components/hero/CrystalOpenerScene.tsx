import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, PerspectiveCamera, Sparkles } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type SceneProps = {
  reducedMotion?: boolean;
};

const hudLabels = ["Strategy locked", "Interface system online", "Client route mapped", "Automation flow active"];

function browserSupportsWebGL() {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const onChange = () => setPrefersReducedMotion(query.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

function createDiamondGeometry() {
  const table = makeRing(8, 0.68, 0.28, 0.68, 0.08);
  const crown = makeRing(12, 1.34, 0.66, 0.1, 0);
  const pavilion = makeRing(12, 0.56, 0.31, -0.58, 0.1);
  const tableCenter = new THREE.Vector3(0, 0.72, 0);
  const culet = new THREE.Vector3(0, -1.32, 0);
  const palette = [
    new THREE.Color("#f8ffff"),
    new THREE.Color("#9cf7ff"),
    new THREE.Color("#38bdf8"),
    new THREE.Color("#0f63d8"),
    new THREE.Color("#123c9c"),
    new THREE.Color("#8b5cf6"),
    new THREE.Color("#f0abfc"),
    new THREE.Color("#ffe7c2")
  ];

  const vertices: number[] = [];
  const colors: number[] = [];

  const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
  };

  table.forEach((point, index) => {
    addTriangle(tableCenter, point, table[(index + 1) % table.length], palette[index % palette.length]);
  });

  crown.forEach((point, index) => {
    const nextCrown = crown[(index + 1) % crown.length];
    const tablePoint = table[Math.floor((index / crown.length) * table.length)];
    const nextTablePoint = table[Math.floor(((index + 1) / crown.length) * table.length) % table.length];
    addTriangle(tablePoint, point, nextTablePoint, palette[(index + 1) % palette.length]);
    addTriangle(nextTablePoint, point, nextCrown, palette[(index + 3) % palette.length]);
  });

  crown.forEach((point, index) => {
    const nextCrown = crown[(index + 1) % crown.length];
    const lower = pavilion[index];
    const nextLower = pavilion[(index + 1) % pavilion.length];
    addTriangle(point, lower, nextCrown, palette[(index + 4) % palette.length]);
    addTriangle(nextCrown, lower, nextLower, palette[(index + 2) % palette.length]);
    addTriangle(lower, culet, nextLower, palette[(index + 5) % palette.length]);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeRing(count: number, radiusX: number, radiusZ: number, y: number, offset: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + offset;
    return new THREE.Vector3(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
  });
}

function DiamondMesh({ reducedMotion }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();
  const geometry = useMemo(createDiamondGeometry, []);
  const edgeGeometry = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  const edgeMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#e8fdff", transparent: true, opacity: 0.24 }),
    []
  );
  const edgeLines = useMemo(() => new THREE.LineSegments(edgeGeometry, edgeMaterial), [edgeGeometry, edgeMaterial]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    };
  }, [edgeGeometry, edgeMaterial, geometry]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    const motion = reducedMotion ? 0.18 : 1;
    const targetY = pointer.x * 0.28 + elapsed * 0.12 * motion;
    const targetX = -pointer.y * 0.16 + Math.sin(elapsed * 0.45) * 0.035 * motion;

    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, 0.045);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, 0.045);
    group.rotation.z = Math.sin(elapsed * 0.34) * 0.025 * motion;
    group.position.y = Math.sin(elapsed * 0.55) * 0.07 * motion;

    if (glowRef.current) {
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.12 + Math.sin(elapsed * 1.25) * 0.035 * motion;
    }
  });

  return (
    <group ref={groupRef} scale={[0.92, 1, 0.92]}>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial
          vertexColors
          color="#ffffff"
          emissive="#0ea5e9"
          emissiveIntensity={0.22}
          metalness={0.04}
          roughness={0.02}
          transmission={0.72}
          thickness={1.75}
          ior={2.42}
          transparent
          opacity={0.86}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={1.8}
          reflectivity={0.88}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      <primitive object={edgeLines} />
      <mesh ref={glowRef} geometry={geometry} scale={[0.86, 0.9, 0.86]}>
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OrbitRings({ reducedMotion }: SceneProps) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ringRef.current || reducedMotion) {
      return;
    }

    ringRef.current.rotation.y = state.clock.elapsedTime * 0.11;
    ringRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.045;
  });

  return (
    <group ref={ringRef}>
      <mesh rotation={[Math.PI / 2.2, 0, Math.PI / 8]}>
        <torusGeometry args={[1.68, 0.006, 8, 180]} />
        <meshBasicMaterial color="#8ff7ff" transparent opacity={0.34} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.72, 0, -Math.PI / 5]}>
        <torusGeometry args={[2.08, 0.005, 8, 180]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.22} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, 0, Math.PI / 2.8]}>
        <torusGeometry args={[2.45, 0.004, 8, 180]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function SceneContents({ reducedMotion }: SceneProps) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.08, 6.25]} fov={35} />
      <fog attach="fog" args={["#020617", 5.4, 11]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[3.5, 3.6, 4.6]} color="#f8ffff" intensity={3.2} />
      <directionalLight position={[-3.2, -0.8, 3.8]} color="#60a5fa" intensity={1.1} />
      <pointLight position={[-2.4, 1.6, 2.6]} color="#a78bfa" intensity={2.6} distance={7} />
      <pointLight position={[2.4, -1.3, 2.5]} color="#22d3ee" intensity={2.3} distance={7} />
      <pointLight position={[0, -2.1, 1.4]} color="#fbcfe8" intensity={1.15} distance={5} />

      <Float speed={reducedMotion ? 0 : 1.25} rotationIntensity={reducedMotion ? 0 : 0.08} floatIntensity={reducedMotion ? 0 : 0.25}>
        <group position={[0.12, -0.02, 0]}>
          <DiamondMesh reducedMotion={reducedMotion} />
          <OrbitRings reducedMotion={reducedMotion} />
        </group>
      </Float>

      <Sparkles count={reducedMotion ? 18 : 42} speed={reducedMotion ? 0 : 0.28} size={1.45} scale={[4.5, 2.8, 2.4]} color="#dffbff" opacity={0.42} />
      <ContactShadows position={[0.12, -1.45, 0]} opacity={0.22} scale={3.8} blur={2.4} far={3.4} color="#38bdf8" />

    </>
  );
}

function CrystalWebGLFallback() {
  return (
    <div className="crystal-webgl-fallback" aria-hidden="true">
      <span className="crystal-webgl-fallback-core" />
      <span className="crystal-webgl-fallback-ring crystal-webgl-fallback-ring-a" />
      <span className="crystal-webgl-fallback-ring crystal-webgl-fallback-ring-b" />
    </div>
  );
}

export function CrystalOpenerScene() {
  const reducedMotion = usePrefersReducedMotion();
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    setHasWebGL(browserSupportsWebGL());
  }, []);

  if (!hasWebGL) {
    return (
      <div className="hero-scene-shell crystal-opener-shell" aria-hidden="true">
        <CrystalWebGLFallback />
      </div>
    );
  }

  return (
    <div className="hero-scene-shell crystal-opener-shell" aria-hidden="true">
      <div className="crystal-webgl-aura crystal-webgl-aura-back" />
      <div className="crystal-webgl-aura crystal-webgl-aura-floor" />
      <div className="crystal-webgl-canvas">
        <Suspense fallback={<CrystalWebGLFallback />}>
          <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} shadows>
            <SceneContents reducedMotion={reducedMotion} />
          </Canvas>
        </Suspense>
      </div>
      <div className="crystal-webgl-panels">
        {hudLabels.map((label, index) => (
          <span key={label} className={`crystal-webgl-label crystal-webgl-label-${index + 1}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
