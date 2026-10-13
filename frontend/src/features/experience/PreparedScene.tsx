import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import { BackSide, ColorManagement, DoubleSide, Mesh, MeshPhysicalMaterial, NoToneMapping, WebGLRenderTarget } from "three";
import { waitForScenePrograms } from "./waitForScenePrograms";

type Props = { revision: string; environmentReady: boolean; onCompiled: () => void; onReady: () => void; onFailure: () => void };

/** Keep the first live draw behind shader completion, rather than blocking in render(). */
export function PreparedScene({ revision, environmentReady, onCompiled, onReady, onFailure }: Props) {
  const { gl, scene, camera, invalidate } = useThree();
  const ready = useRef(false);
  const announced = useRef(false);
  const callbacks = useRef({ onCompiled, onReady, onFailure });
  callbacks.current = { onCompiled, onReady, onFailure };

  // A DPR change clears the drawing buffer. Keep the reserved still visible
  // until the replacement frame is drawn, without resetting model playback.
  useLayoutEffect(() => {
    gl.domElement.dataset.preparing = "true";
    return () => { delete gl.domElement.dataset.preparing; };
  }, [gl, revision, environmentReady]);

  useEffect(() => {
    ready.current = false;
    if (!environmentReady) return;
    let cancelWait = () => {};
    try {
      gl.compile(scene, camera);
      const transmissive = new Set<MeshPhysicalMaterial>();
      scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof MeshPhysicalMaterial && material.transmission > 0) transmissive.add(material);
        }
      });
      if (transmissive.size) {
        // Transmission captures opaque/back-face objects into a linear target
        // without tone mapping. Its shader variants differ from the main draw.
        const target = new WebGLRenderTarget(1, 1);
        target.texture.colorSpace = ColorManagement.workingColorSpace;
        const previousTarget = gl.getRenderTarget();
        const previousFace = gl.getActiveCubeFace();
        const previousLevel = gl.getActiveMipmapLevel();
        const previousToneMapping = gl.toneMapping;
        try {
          gl.setRenderTarget(target);
          gl.toneMapping = NoToneMapping;
          gl.compile(scene, camera);
          // The transmission back-face pass also runs for GLTF materials that
          // use forceSinglePass. Normal compile() does not prepare that variant.
          const doubleSided = [...transmissive].filter(material => material.side === DoubleSide);
          try {
            for (const material of doubleSided) { material.side = BackSide; material.needsUpdate = true; }
            if (doubleSided.length) gl.compile(scene, camera);
          } finally {
            for (const material of doubleSided) { material.side = DoubleSide; material.needsUpdate = true; }
          }
        } finally {
          gl.setRenderTarget(previousTarget, previousFace, previousLevel);
          gl.toneMapping = previousToneMapping;
          target.dispose();
        }
      }
      callbacks.current.onCompiled();
      cancelWait = waitForScenePrograms(gl, () => {
        ready.current = true;
        invalidate();
      }, () => callbacks.current.onFailure());
    } catch {
      callbacks.current.onFailure();
    }
    return () => { cancelWait(); ready.current = false; };
  }, [gl, scene, camera, revision, environmentReady, invalidate]);

  // Positive priority takes ownership of the main draw only; model and controls
  // still update first. The procedural environment owns its separate cube pass.
  useFrame(() => {
    if (!environmentReady || !ready.current) return;
    gl.render(scene, camera);
    gl.domElement.dataset.preparing = "false";
    if (!announced.current) {
      announced.current = true;
      callbacks.current.onReady();
    }
  }, 1);
  return null;
}
