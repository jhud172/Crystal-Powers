import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Group, LoopOnce, Box3, Vector3 } from "three";
export type StudioControls = { size: number; angle: number; light: number; finish: string };
function Robot({ chapter }: {chapter:number}) {
 const gltf=useGLTF("/models/prism-companion.glb"); const scene=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
 const {invalidate}=useThree(); const until=useRef(0);
 const {actions}=useAnimations(gltf.animations,scene); const group=useRef<Group>(null);
 useEffect(()=>{until.current=performance.now()+2400;invalidate();const action=actions[["Wave","Point","Nod","Thinking","Dock"][chapter]]; action?.reset().setLoop(LoopOnce,1).play(); return ()=>{action?.stop();};},[chapter,actions,invalidate]);
 useFrame((_,delta)=>{if(performance.now()<until.current)invalidate();if(group.current) group.current.position.x+=( (chapter===1?-1.35:.85)-group.current.position.x)*Math.min(delta*4,1);});
 return <group ref={group} position={[.85,.3,0]} scale={.8}><primitive object={scene} /></group>;
}
function Logo({controls}:{controls:StudioControls}) {
 const gltf=useGLTF("/models/crystal-powers-logo-3d.glb?v=brand-01"); const scene=useMemo(()=>{const result=gltf.scene.clone(true);const box=new Box3().setFromObject(result);const size=box.getSize(new Vector3());result.position.sub(box.getCenter(new Vector3()));const wrapper=new Group();wrapper.add(result);wrapper.scale.setScalar(2/Math.max(size.x,size.y,size.z));return wrapper;},[gltf.scene]);
 return <group position={[-.2,.7,0]} scale={controls.size} rotation={[0,controls.angle,0]}><primitive object={scene}/></group>;
}
function ContextGuard({onFailure}:{onFailure:()=>void}) {
 const {gl}=useThree();
 useEffect(()=>{const canvas=gl.domElement;canvas.addEventListener("webglcontextlost",onFailure);return()=>canvas.removeEventListener("webglcontextlost",onFailure);},[gl,onFailure]);
 return null;
}
export default function StudioCanvas({chapter,controls,accent,onFailure}:{chapter:number;controls:StudioControls;accent:string;onFailure:()=>void}) {
 return <Canvas frameloop="demand" camera={{position:[0,2.4,7],fov:42}} dpr={[1,1.5]} >
 <ContextGuard onFailure={onFailure}/><color attach="background" args={["#101925"]}/><ambientLight intensity={1.5}/><directionalLight position={[controls.light,4,3]} intensity={3} color={controls.finish}/><pointLight position={[-3,2,2]} color={accent} intensity={12}/>
 <Robot chapter={chapter}/>{chapter===1&&<Logo controls={controls}/>}
 <mesh position={[0,-.6,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[8,64]}/><meshStandardMaterial color="#202e42" metalness={.3} roughness={.6}/></mesh>
 <mesh position={[0,-.4,0]}><cylinderGeometry args={[1.4,1.5,.3,48]}/><meshStandardMaterial color={accent} metalness={.6} roughness={.35}/></mesh>
 <gridHelper args={[16,16,"#40556e","#26384e"]} position={[0,-.59,0]}/>
 </Canvas>;
}
