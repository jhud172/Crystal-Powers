import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, PerspectiveCamera, Sparkles } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { ThemeId } from "../../data/site";

type SceneProps = {
  reducedMotion?: boolean;
  theme: ThemeId;
};

type CrystalPalette = {
  facets: string[];
  edge: string;
  material: string;
  emissive: string;
  glow: string;
  ringPrimary: string;
  ringSecondary: string;
  ringTertiary: string;
  fog: string;
  lightKey: string;
  lightFill: string;
  lightAccent: string;
  lightBase: string;
  sparkles: string;
  shadow: string;
};

const hudLabels = ["Strategy locked", "Interface system online", "Client route mapped", "Automation flow active"];

const crystalPalettes = {
  futuristic: {
    facets: ["#f8ffff", "#9cf7ff", "#38bdf8", "#0f63d8", "#123c9c", "#8b5cf6", "#f0abfc", "#ffe7c2"],
    edge: "#e8fdff",
    material: "#ffffff",
    emissive: "#0ea5e9",
    glow: "#67e8f9",
    ringPrimary: "#8ff7ff",
    ringSecondary: "#c4b5fd",
    ringTertiary: "#ffffff",
    fog: "#020617",
    lightKey: "#f8ffff",
    lightFill: "#60a5fa",
    lightAccent: "#a78bfa",
    lightBase: "#fbcfe8",
    sparkles: "#dffbff",
    shadow: "#38bdf8"
  },
  classic: {
    facets: ["#fff7ed", "#f8d9a7", "#e8b36f", "#9a5f32", "#5c3420", "#f2c48d", "#fff0cf", "#70421f"],
    edge: "#fff0cf",
    material: "#fff8eb",
    emissive: "#d97706",
    glow: "#f5c16c",
    ringPrimary: "#f6d39b",
    ringSecondary: "#b7793d",
    ringTertiary: "#fff7ed",
    fog: "#120c08",
    lightKey: "#fff7ed",
    lightFill: "#d6a76d",
    lightAccent: "#9a5f32",
    lightBase: "#f6d39b",
    sparkles: "#fff1cf",
    shadow: "#c08442"
  },
  clean: {
    facets: ["#ffffff", "#dbeafe", "#bfdbfe", "#60a5fa", "#2563eb", "#e0f2fe", "#f8fafc", "#93c5fd"],
    edge: "#eff6ff",
    material: "#ffffff",
    emissive: "#2563eb",
    glow: "#93c5fd",
    ringPrimary: "#60a5fa",
    ringSecondary: "#bfdbfe",
    ringTertiary: "#ffffff",
    fog: "#dbeafe",
    lightKey: "#ffffff",
    lightFill: "#60a5fa",
    lightAccent: "#38bdf8",
    lightBase: "#bfdbfe",
    sparkles: "#eff6ff",
    shadow: "#60a5fa"
  },
  fresh: {
    facets: ["#f0fdfa", "#ccfbf1", "#5eead4", "#14b8a6", "#0f766e", "#bbf7d0", "#ecfdf5", "#22c55e"],
    edge: "#d9fff6",
    material: "#f0fdfa",
    emissive: "#14b8a6",
    glow: "#5eead4",
    ringPrimary: "#99f6e4",
    ringSecondary: "#86efac",
    ringTertiary: "#ffffff",
    fog: "#dcfce7",
    lightKey: "#f0fdfa",
    lightFill: "#2dd4bf",
    lightAccent: "#22c55e",
    lightBase: "#bbf7d0",
    sparkles: "#ecfdf5",
    shadow: "#14b8a6"
  },
  "summer-vibes": {
    facets: ["#fff7ed", "#fde68a", "#fdba74", "#f97316", "#c2410c", "#67e8f9", "#fffaf0", "#facc15"],
    edge: "#fff7d6",
    material: "#fffaf0",
    emissive: "#f97316",
    glow: "#facc15",
    ringPrimary: "#fde68a",
    ringSecondary: "#67e8f9",
    ringTertiary: "#ffffff",
    fog: "#ffedd5",
    lightKey: "#fff7ed",
    lightFill: "#fb923c",
    lightAccent: "#06b6d4",
    lightBase: "#fde68a",
    sparkles: "#fff7d6",
    shadow: "#f97316"
  }
} satisfies Record<ThemeId, CrystalPalette>;

function browserSupportsWebGL() {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}


function createDiamondGeometry(facetColours: string[]) {
  const table = makeRing(8, 0.68, 0.28, 0.68, 0.08);
  const crown = makeRing(12, 1.34, 0.66, 0.1, 0);
  const pavilion = makeRing(12, 0.56, 0.31, -0.58, 0.1);
  const tableCenter = new THREE.Vector3(0, 0.72, 0);
  const culet = new THREE.Vector3(0, -1.32, 0);
  const palette = facetColours.map((colour) => new THREE.Color(colour));

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

function DiamondMesh({ reducedMotion, theme }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();
  const palette = crystalPalettes[theme];
  const geometry = useMemo(() => createDiamondGeometry(palette.facets), [palette.facets]);
  const edgeGeometry = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  const edgeMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: palette.edge, transparent: true, opacity: 0.24 }),
    [palette.edge]
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
          color={palette.material}
          emissive={palette.emissive}
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
        <meshBasicMaterial color={palette.glow} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OrbitRings({ reducedMotion, theme }: SceneProps) {
  const ringRef = useRef<THREE.Group>(null);
  const palette = crystalPalettes[theme];

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
        <meshBasicMaterial color={palette.ringPrimary} transparent opacity={0.34} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.72, 0, -Math.PI / 5]}>
        <torusGeometry args={[2.08, 0.005, 8, 180]} />
        <meshBasicMaterial color={palette.ringSecondary} transparent opacity={0.22} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, 0, Math.PI / 2.8]}>
        <torusGeometry args={[2.45, 0.004, 8, 180]} />
        <meshBasicMaterial color={palette.ringTertiary} transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function SceneContents({ reducedMotion, theme }: SceneProps) {
  const palette = crystalPalettes[theme];

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.08, 6.25]} fov={35} />
      <fog attach="fog" args={[palette.fog, 5.4, 11]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[3.5, 3.6, 4.6]} color={palette.lightKey} intensity={3.2} />
      <directionalLight position={[-3.2, -0.8, 3.8]} color={palette.lightFill} intensity={1.1} />
      <pointLight position={[-2.4, 1.6, 2.6]} color={palette.lightAccent} intensity={2.6} distance={7} />
      <pointLight position={[2.4, -1.3, 2.5]} color={palette.glow} intensity={2.3} distance={7} />
      <pointLight position={[0, -2.1, 1.4]} color={palette.lightBase} intensity={1.15} distance={5} />

      <Float speed={reducedMotion ? 0 : 1.25} rotationIntensity={reducedMotion ? 0 : 0.08} floatIntensity={reducedMotion ? 0 : 0.25}>
        <group position={[0.12, -0.02, 0]}>
          <DiamondMesh reducedMotion={reducedMotion} theme={theme} />
          <OrbitRings reducedMotion={reducedMotion} theme={theme} />
        </group>
      </Float>

      <Sparkles count={reducedMotion ? 18 : 42} speed={reducedMotion ? 0 : 0.28} size={1.45} scale={[4.5, 2.8, 2.4]} color={palette.sparkles} opacity={0.42} />
      <ContactShadows position={[0.12, -1.45, 0]} opacity={0.22} scale={3.8} blur={2.4} far={3.4} color={palette.shadow} />

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

export function CrystalOpenerScene({ theme }: { theme: ThemeId }) {
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
            <SceneContents reducedMotion={reducedMotion} theme={theme} />
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
