import { useCallback, useEffect, useRef, useState } from "react";
import { CubeTexture, HalfFloatType, LinearSRGBColorSpace, PMREMGenerator, WebGLRenderTarget, type Camera, type Object3D, type WebGLRenderer } from "three";
import { waitForScenePrograms } from "./waitForScenePrograms";

type Seed = { dispose: () => void };

/** Compile the exact filter programs through public APIs without filtering/drawing. */
function prepareFilterPrograms(gl: WebGLRenderer, resolution: number): Seed {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = resolution;
  const texture = new CubeTexture(Array(6).fill(canvas));
  texture.colorSpace = LinearSRGBColorSpace;
  const scratch = new WebGLRenderTarget(1, 1, { type: HalfFloatType, colorSpace: LinearSRGBColorSpace, depthBuffer: false });
  const previousTarget = gl.getRenderTarget();
  const previousFace = gl.getActiveCubeFace();
  const previousLevel = gl.getActiveMipmapLevel();
  const previousXr = gl.xr.enabled;
  // The generator gets a private adapter; the product renderer is never patched.
  // Virtual full-size targets provide shader defines but only the scratch target
  // is bound, so seed preparation does not allocate full-size GPU buffers.
  const compilingRenderer = new Proxy(gl, {
    get(renderer, property) {
      if (property === "render") return (object: Object3D, camera: Camera) => gl.compile(object, camera);
      if (property === "setRenderTarget") return (target: WebGLRenderTarget | null) => gl.setRenderTarget(target ? scratch : null);
      const value: unknown = Reflect.get(renderer, property);
      return typeof value === "function" ? value.bind(renderer) : value;
    },
  });
  const generator = new PMREMGenerator(compilingRenderer);
  let output: WebGLRenderTarget | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    output?.dispose();
    generator.dispose();
    texture.dispose();
  };
  try { output = generator.fromCubemap(texture); }
  catch (error) { dispose(); throw error; }
  finally {
    gl.setRenderTarget(previousTarget, previousFace, previousLevel);
    gl.xr.enabled = previousXr;
    scratch.dispose();
  }
  return { dispose };
}

export function useEnvironmentPreparation(gl: WebGLRenderer, resolution: number, onFailure: () => void) {
  const [preparedResolution, setPreparedResolution] = useState<number | null>(null);
  const resources = useRef<Seed | null>(null);
  const failure = useRef(onFailure);
  failure.current = onFailure;
  const release = useCallback(() => {
    resources.current?.dispose();
    resources.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cancelWait = () => {};
    let seed: Seed | undefined;
    setPreparedResolution(null);
    try {
      const context = gl.getContext();
      if (context.isContextLost()) throw new Error("Lost rendering context");
      if (!context.getExtension("KHR_parallel_shader_compile")) setPreparedResolution(resolution);
      else {
        seed = prepareFilterPrograms(gl, resolution);
        resources.current = seed;
        cancelWait = waitForScenePrograms(gl, () => {
          if (!cancelled) setPreparedResolution(resolution);
        }, () => { if (!cancelled) failure.current(); });
      }
    } catch { if (!cancelled) failure.current(); }
    return () => {
      cancelled = true;
      cancelWait();
      if (resources.current === seed) resources.current = null;
      seed?.dispose();
    };
  }, [gl, resolution]);

  // Release after the real environment/main compilation has acquired its own
  // references to these programs; early release would delete the cached seeds.
  return { ready: preparedResolution === resolution, release };
}
