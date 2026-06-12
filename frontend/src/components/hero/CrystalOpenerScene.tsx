import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";

type SceneProps = {
  reducedMotion?: boolean;
};

type PanelConfig = {
  label: string;
  radiusX: number;
  radiusZ: number;
  height: number;
  speed: number;
  offset: number;
  tilt: number;
};

const panelConfigs: PanelConfig[] = [
  { label: "Strategy locked", radiusX: 1.82, radiusZ: 1.24, height: 0.58, speed: 0.2, offset: 0, tilt: -0.12 },
  { label: "Interface system online", radiusX: 1.92, radiusZ: 1.46, height: -0.22, speed: -0.16, offset: 1.1, tilt: 0.2 },
  { label: "Client route mapped", radiusX: 1.72, radiusZ: 1.62, height: 0.1, speed: 0.18, offset: 2.3, tilt: -0.26 },
  { label: "Automation flow active", radiusX: 1.98, radiusZ: 1.18, height: -0.58, speed: 0.15, offset: 3.4, tilt: 0.18 },
  { label: "Launch support armed", radiusX: 1.86, radiusZ: 1.74, height: 0.82, speed: -0.14, offset: 4.25, tilt: -0.2 },
  { label: "Build pipeline ready", radiusX: 1.98, radiusZ: 1.32, height: -0.02, speed: 0.13, offset: 5.2, tilt: 0.26 }
];

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

function createCrystalGeometry() {
  const tableCenter = new THREE.Vector3(0, 0.94, 0);
  const tableRing = [
    new THREE.Vector3(0.34, 0.9, 0.14),
    new THREE.Vector3(0.12, 0.94, 0.34),
    new THREE.Vector3(-0.24, 0.88, 0.28),
    new THREE.Vector3(-0.36, 0.92, -0.1),
    new THREE.Vector3(-0.1, 0.95, -0.32),
    new THREE.Vector3(0.28, 0.89, -0.26)
  ];
  const girdleRing = [
    new THREE.Vector3(0.78, 0.06, 0.1),
    new THREE.Vector3(0.42, 0.1, 0.64),
    new THREE.Vector3(-0.12, 0.02, 0.74),
    new THREE.Vector3(-0.66, 0.08, 0.36),
    new THREE.Vector3(-0.78, 0.04, -0.16),
    new THREE.Vector3(-0.32, 0.09, -0.68),
    new THREE.Vector3(0.26, 0.01, -0.72),
    new THREE.Vector3(0.7, 0.08, -0.32)
  ];
  const pavilionPoint = new THREE.Vector3(0, -1.34, 0);

  const vertices: number[] = [];
  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  tableRing.forEach((point, index) => {
    pushTriangle(tableCenter, point, tableRing[(index + 1) % tableRing.length]);
  });

  girdleRing.forEach((point, index) => {
    const nextGirdle = girdleRing[(index + 1) % girdleRing.length];
    const table = tableRing[Math.floor((index / girdleRing.length) * tableRing.length)];
    const nextTable = tableRing[Math.floor(((index + 1) / girdleRing.length) * tableRing.length) % tableRing.length];
    pushTriangle(table, point, nextTable);
    pushTriangle(nextTable, point, nextGirdle);
  });

  girdleRing.forEach((point, index) => {
    pushTriangle(point, pavilionPoint, girdleRing[(index + 1) % girdleRing.length]);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createLabelTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(2, 10, 24, 0.28)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(158, 247, 255, 0.75)";
  context.lineWidth = 3;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(42, 42);
  context.lineTo(canvas.width - 42, 42);
  context.moveTo(42, 86);
  context.lineTo(canvas.width - 138, 86);
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.font = "700 30px Sora, Space Grotesk, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "2px";
  context.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function CameraRig({ reducedMotion }: SceneProps) {
  const rigRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame((state) => {
    const rig = rigRef.current;
    if (!rig) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    const intensity = reducedMotion ? 0.16 : 1;
    rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, pointer.x * 0.16 * intensity, 0.04);
    rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, -pointer.y * 0.1 * intensity, 0.04);
    rig.position.y = Math.sin(elapsed * 0.36) * 0.08 * intensity;
  });

  return (
    <group ref={rigRef}>
      <CrystalCore reducedMotion={reducedMotion} />
      <OrbitSystem reducedMotion={reducedMotion} />
      <Atmosphere reducedMotion={reducedMotion} />
      <EnergyRings reducedMotion={reducedMotion} />
    </group>
  );
}

function CrystalCore({ reducedMotion }: SceneProps) {
  const coreRef = useRef<THREE.Group>(null);
  const geometry = useMemo(createCrystalGeometry, []);
  const edgeGeometry = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: "#dffbff", transparent: true, opacity: 0.62 }), []);
  const edgeLines = useMemo(() => new THREE.LineSegments(edgeGeometry, edgeMaterial), [edgeGeometry, edgeMaterial]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    };
  }, [edgeGeometry, edgeMaterial, geometry]);

  useFrame((state) => {
    const core = coreRef.current;
    if (!core || reducedMotion) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    core.rotation.y = elapsed * 0.22;
    core.rotation.z = Math.sin(elapsed * 0.42) * 0.045;
    core.scale.setScalar(1 + Math.sin(elapsed * 1.1) * 0.012);
  });

  return (
    <group ref={coreRef}>
      <mesh geometry={geometry} scale={[1.06, 1.2, 1.06]} castShadow>
        <meshPhysicalMaterial
          color="#74e8ff"
          emissive="#1fb6ff"
          emissiveIntensity={0.62}
          metalness={0.12}
          roughness={0.04}
          transmission={0.18}
          thickness={0.92}
          ior={1.56}
          transparent
          opacity={0.9}
          clearcoat={1}
          clearcoatRoughness={0.08}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      <primitive object={edgeLines} />

      <mesh geometry={geometry} scale={[0.66, 0.84, 0.66]}>
        <meshBasicMaterial color="#38e8ff" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh scale={[1.55, 1.72, 1.55]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.075} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <Glints reducedMotion={reducedMotion} />
      <pointLight position={[0, 0.2, 0.25]} color="#7df8ff" intensity={6.2} distance={7} />
    </group>
  );
}

function Glints({ reducedMotion }: SceneProps) {
  const glintRef = useRef<THREE.Group>(null);
  const points = useMemo(
    () => [
      [-0.34, 0.74, 0.48],
      [0.42, 0.22, 0.58],
      [-0.52, -0.14, -0.28],
      [0.25, -0.68, -0.48],
      [0.58, -0.18, 0.12]
    ] as const,
    []
  );

  useFrame((state) => {
    const group = glintRef.current;
    if (!group || reducedMotion) {
      return;
    }

    group.children.forEach((child, index) => {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 1.8 + index * 0.9) * 0.3;
      child.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={glintRef}>
      {points.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitSystem({ reducedMotion }: SceneProps) {
  return (
    <group>
      {panelConfigs.map((panel) => (
        <OrbitingPanel key={panel.label} panel={panel} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function OrbitingPanel({ panel, reducedMotion }: { panel: PanelConfig; reducedMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const panelMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const labelMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const { camera } = useThree();
  const labelTexture = useMemo(() => createLabelTexture(panel.label), [panel.label]);

  useEffect(() => {
    return () => labelTexture.dispose();
  }, [labelTexture]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const time = reducedMotion ? panel.offset : state.clock.elapsedTime * panel.speed + panel.offset;
    const x = Math.cos(time) * panel.radiusX;
    const z = Math.sin(time) * panel.radiusZ;
    const y = panel.height + Math.sin(time * 1.7) * 0.2;
    const depth = THREE.MathUtils.clamp((z + panel.radiusZ) / (panel.radiusZ * 2), 0, 1);
    const opacity = THREE.MathUtils.lerp(0.16, 0.7, depth);

    group.position.set(x, y, z);
    group.lookAt(camera.position);
    group.rotateZ(panel.tilt);
    group.scale.setScalar(THREE.MathUtils.lerp(0.78, 1.08, depth));

    if (panelMaterialRef.current) {
      panelMaterialRef.current.opacity = opacity * 0.18;
    }

    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = opacity;
    }

    if (labelMaterialRef.current) {
      labelMaterialRef.current.opacity = opacity * 0.95;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[1.22, 0.4]} />
        <meshBasicMaterial ref={panelMaterialRef} color="#9eefff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <HudFrame materialRef={lineMaterialRef} />
      <sprite position={[0, 0.02, 0.032]} scale={[1.08, 0.32, 1]}>
        <spriteMaterial ref={labelMaterialRef} map={labelTexture} color="#dffbff" transparent opacity={0.78} depthWrite={false} />
      </sprite>
    </group>
  );
}

function HudFrame({ materialRef }: { materialRef: MutableRefObject<THREE.LineBasicMaterial | null> }) {
  const frame = useMemo(
    () => [
      new THREE.Vector3(-0.84, -0.23, 0.012),
      new THREE.Vector3(0.84, -0.23, 0.012),
      new THREE.Vector3(0.84, 0.23, 0.012),
      new THREE.Vector3(-0.84, 0.23, 0.012),
      new THREE.Vector3(-0.84, -0.23, 0.012)
    ],
    []
  );
  const scan = useMemo(
    () => [
      new THREE.Vector3(-0.64, -0.06, 0.016),
      new THREE.Vector3(0.64, -0.06, 0.016),
      new THREE.Vector3(-0.52, 0.08, 0.016),
      new THREE.Vector3(0.3, 0.08, 0.016)
    ],
    []
  );
  const frameGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(frame), [frame]);
  const scanGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(scan), [scan]);
  const frameMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: "#9ef7ff", transparent: true, opacity: 0.7 }), []);
  const scanMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.22 }), []);
  const frameLine = useMemo(() => new THREE.Line(frameGeometry, frameMaterial), [frameGeometry, frameMaterial]);
  const scanLine = useMemo(() => new THREE.LineSegments(scanGeometry, scanMaterial), [scanGeometry, scanMaterial]);

  useEffect(() => {
    materialRef.current = frameMaterial;
  }, [frameMaterial, materialRef]);

  useEffect(() => {
    return () => {
      frameGeometry.dispose();
      scanGeometry.dispose();
      frameMaterial.dispose();
      scanMaterial.dispose();
    };
  }, [frameGeometry, frameMaterial, scanGeometry, scanMaterial]);

  return (
    <>
      <primitive object={frameLine} />
      <primitive object={scanLine} />
      <mesh position={[-0.68, 0.14, 0.018]}>
        <boxGeometry args={[0.12, 0.018, 0.01]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.66} />
      </mesh>
      <mesh position={[0.66, -0.14, 0.018]}>
        <boxGeometry args={[0.16, 0.016, 0.01]} />
        <meshBasicMaterial color="#7df8ff" transparent opacity={0.54} />
      </mesh>
    </>
  );
}

function EnergyRings({ reducedMotion }: SceneProps) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = ringRef.current;
    if (!group || reducedMotion) {
      return;
    }

    group.rotation.y = state.clock.elapsedTime * 0.08;
    group.rotation.z = Math.sin(state.clock.elapsedTime * 0.34) * 0.035;
  });

  return (
    <group ref={ringRef}>
      <mesh rotation={[Math.PI / 2.3, 0, Math.PI / 8]}>
        <torusGeometry args={[1.58, 0.01, 10, 180]} />
        <meshBasicMaterial color="#75f6ff" transparent opacity={0.36} />
      </mesh>
      <mesh rotation={[Math.PI / 2.75, 0, -Math.PI / 5]}>
        <torusGeometry args={[2.12, 0.008, 10, 180]} />
        <meshBasicMaterial color="#b7a4ff" transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[Math.PI / 2.05, 0, Math.PI / 2.7]}>
        <torusGeometry args={[2.7, 0.006, 10, 180]} />
        <meshBasicMaterial color="#e0fbff" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function Atmosphere({ reducedMotion }: SceneProps) {
  const dustRef = useRef<THREE.Points>(null);
  const hazeRef = useRef<THREE.Mesh>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(170 * 3);

    for (let index = 0; index < 170; index += 1) {
      const radius = 1.5 + Math.random() * 3.7;
      const angle = Math.random() * Math.PI * 2;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = (Math.random() - 0.5) * 3.3;
      values[index * 3 + 2] = Math.sin(angle) * radius * 0.82;
    }

    return values;
  }, []);

  useFrame((state) => {
    if (!reducedMotion && dustRef.current) {
      dustRef.current.rotation.y = state.clock.elapsedTime * 0.018;
    }

    if (!reducedMotion && hazeRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.44) * 0.035;
      hazeRef.current.scale.set(pulse * 3.1, pulse * 1.55, pulse * 3.1);
    }
  });

  return (
    <>
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d8fbff" size={0.015} transparent opacity={0.46} sizeAttenuation depthWrite={false} />
      </points>
      <mesh ref={hazeRef} scale={[3.1, 1.55, 3.1]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.045} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function CrystalOpenerFallback() {
  return (
    <div className="hero-scene-fallback crystal-opener-fallback" aria-hidden="true">
      <div className="hero-scene-fallback-core" />
      <div className="hero-scene-fallback-panel hero-scene-fallback-panel-a" />
      <div className="hero-scene-fallback-panel hero-scene-fallback-panel-b" />
      <div className="hero-scene-fallback-orbit" />
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
    return <CrystalOpenerFallback />;
  }

  return (
    <div className="hero-scene-shell crystal-opener-shell" aria-hidden="true">
      <div className="crystal-opener-css-fallback">
        <div className="crystal-opener-css-core">
          <span className="crystal-opener-css-facet crystal-opener-css-facet-a" />
          <span className="crystal-opener-css-facet crystal-opener-css-facet-b" />
          <span className="crystal-opener-css-facet crystal-opener-css-facet-c" />
          <span className="crystal-opener-css-facet crystal-opener-css-facet-d" />
        </div>
        <div className="crystal-opener-css-orbit crystal-opener-css-orbit-a">
          <span>Strategy locked</span>
        </div>
        <div className="crystal-opener-css-orbit crystal-opener-css-orbit-b">
          <span>Interface system online</span>
        </div>
        <div className="crystal-opener-css-orbit crystal-opener-css-orbit-c">
          <span>Client route mapped</span>
        </div>
        <div className="crystal-opener-css-orbit crystal-opener-css-orbit-d">
          <span>Automation flow active</span>
        </div>
      </div>
      <Suspense fallback={<CrystalOpenerFallback />}>
        <div className="crystal-opener-canvas-layer">
          <Canvas
            camera={{ position: [0, 0.16, 6.35], fov: 38 }}
            dpr={[1, 1.55]}
            frameloop={reducedMotion ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          >
            <fog attach="fog" args={["#020617", 4.8, 11.5]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[3.8, 3.4, 4.8]} color="#f4fdff" intensity={2.4} />
            <directionalLight position={[-3.2, -0.8, 3.4]} color="#60a5fa" intensity={0.82} />
            <pointLight position={[-2.8, 1.7, 2.4]} color="#8b5cf6" intensity={2.1} distance={8} />
            <pointLight position={[2.7, -1.4, 2.2]} color="#22d3ee" intensity={2} distance={7} />
            <CameraRig reducedMotion={reducedMotion} />
          </Canvas>
        </div>
      </Suspense>
    </div>
  );
}
