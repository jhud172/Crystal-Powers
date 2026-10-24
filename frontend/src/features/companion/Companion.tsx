import { PrivacyLink } from "../privacy/PrivacyPublication";
import { Component, lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from "react";
import { useLocation, Link } from "react-router-dom";
import { useSiteTheme } from "../../app/Layout";
import { useExperience } from "../experience/ExperienceContext";
import { api, usePublishedProjects } from "../portfolio/projectApi";
import type { StudioControls } from "./StudioCanvas";
import "../../styles/pages/companion.css";
const Studio=lazy(()=>import("./StudioCanvas"));
const key="crystal_prism_visit_v1"; let visited=false;
function seen(){try{return visited||!!localStorage.getItem(key);}catch{return visited;}}
function mark(status:string){visited=true;try{localStorage.setItem(key,JSON.stringify({status,version:1}));}catch{/* Session memory remains available. */}}
const titles=["A little introduction.","Make the crystal yours.","Make yourself at home.","Ideas, made real.","Ready when you are."];
const copy=["I’m Prism, your studio companion. James designs and develops websites, apps and bespoke systems. Let me show you around.","A different angle can change everything. Try the size, lighting and finish of the Crystal Powers logo.","Choose the atmosphere that feels right. This changes the real website, and your choice stays with you.","Explore three examples of what James builds. These little demonstrations are illustrative; published projects are linked below.","That’s the studio. I’ll be in the corner if you have questions about James, the work or starting a project."];
const defaults:StudioControls={size:1,angle:0,light:3,finish:"#a9e9ff"};
const options=[['futuristic','Dark'],['clean','Light'],['classic','Warm dark'],['fresh','Fresh light'],['summer-vibes','Warm light']] as const;
type Reply={answer:string;sources:{label:string;href:string}[];availability:string};
type Message={role:'user'|'assistant';content:string;sources?:Reply['sources']};
class SceneBoundary extends Component<PropsWithChildren<{fallback:React.ReactNode}>,{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export function Companion(){
 const location=useLocation();const {theme,setTheme}=useSiteTheme();const experience=useExperience();
 const [phase,setPhase]=useState<'docked'|'touring'|'exiting'|'chat'>(()=>location.pathname==='/'&&!seen()&&import.meta.env.VITE_PRISM_TOUR_ENABLED!=='false'?'touring':'docked');
 const [chapter,setChapter]=useState(0);const [skip,setSkip]=useState(false);const [hidden,setHidden]=useState(false);const [failed,setFailed]=useState(false);
 const [controls,setControls]=useState(defaults);const [demo,setDemo]=useState(0);const [demoAction,setDemoAction]=useState(false);
 const [messages,setMessages]=useState<Message[]>([]);const [input,setInput]=useState('');const [busy,setBusy]=useState(false);
 const flight=useRef({x:0,y:0});const dialog=useRef<HTMLDialogElement>(null);const launcher=useRef<HTMLButtonElement>(null);const heading=useRef<HTMLHeadingElement>(null);const request=useRef<AbortController|null>(null);const pending=useRef(false);
 const {projects}=usePublishedProjects();const tour=phase==='touring';
 const still=<img className="prism-portrait" src={tour&&!experience.reducedMotion&&experience.pageVisible?"/renders/prism-wave.webp":"/renders/prism-companion.png"} alt="Prism, a pearl robot with a glowing crystal heart"/>;
 function exit(){const room=dialog.current?.querySelector('.prism-room')?.getBoundingClientRect();flight.current={x:(room?room.left+room.width*.65:innerWidth/2)-(innerWidth-114),y:(room?room.top+room.height*.5:innerHeight/2)-(innerHeight-114)};mark('skipped');setPhase('exiting');}
 useEffect(()=>{if(!tour)return;mark('started');setSkip(false);dialog.current?.showModal();experience.activate('prism-tour');const timer=setTimeout(()=>setSkip(true),3000);return()=>{clearTimeout(timer);dialog.current?.close();experience.release('prism-tour');};},[tour]);
 useEffect(()=>{if(tour)heading.current?.focus();},[chapter,tour]);
 useEffect(()=>{if(phase!=='exiting')return;const timer=setTimeout(()=>{setPhase('docked');launcher.current?.focus();},experience.reducedMotion?0:500);return()=>clearTimeout(timer);},[phase,experience.reducedMotion]);

 const initialPath=useRef(location.pathname);
 useEffect(()=>{request.current?.abort();pending.current=false;setBusy(false);if(location.pathname!==initialPath.current&&tour)exit();initialPath.current=location.pathname;},[location.pathname]);
 useEffect(()=>()=>{request.current?.abort();},[]);
 useEffect(()=>{if(phase==='chat')document.getElementById('prism-question')?.focus();},[phase]);
 async function send(question:string){
  if(pending.current||!question.trim())return;pending.current=true;setBusy(true);setInput('');
  const history=messages.slice(-6).map(({role,content})=>({role,content:content.slice(0,1200)}));setMessages(old=>[...old,{role:'user',content:question}]);
  const controller=new AbortController();request.current=controller;
  try{const result=await api<Reply>('/api/assistant/chat',{method:'POST',signal:controller.signal,body:JSON.stringify({message:question,history,page:location.pathname})});if(!controller.signal.aborted)setMessages(old=>[...old,{role:'assistant',content:result.answer,sources:result.sources}]);}
  catch{if(!controller.signal.aborted)setMessages(old=>[...old,{role:'assistant',content:'I can’t answer right now. Explore the services or contact James for help.',sources:[{label:'Services',href:'/services'},{label:'Contact James',href:'/contact'}]}]);}
  finally{if(request.current===controller){pending.current=false;setBusy(false);}}
 }
 function replay(){setHidden(false);setChapter(0);setFailed(false);setPhase('touring');}
 return <div className="prism-companion" data-theme={theme} data-reduced={experience.reducedMotion}>
 <dialog ref={dialog} className="prism-tour" aria-labelledby="prism-companion-title" onCancel={e=>{e.preventDefault();exit();}}>
 <a href="#main-content" className="prism-accessible-skip" onClick={exit}>Skip to website</a>
 <header className="prism-top"><span>CRYSTAL POWERS / MEET PRISM</span>{skip&&<button onClick={exit}>Skip introduction ↗</button>}</header>
 <div className="prism-tour-grid"><div className="prism-room">
 {experience.threeDAllowed&&experience.pageVisible&&!failed&&experience.activeStage==='prism-tour'?<SceneBoundary fallback={still}><Suspense fallback={still}><Studio chapter={chapter} controls={controls} accent={theme==='futuristic'?'#b9acff':theme==='fresh'?'#73b69b':'#dac09a'} onFailure={()=>setFailed(true)}/></Suspense></SceneBoundary>:still}
 {!experience.threeDAllowed&&chapter===1&&<div className="prism-preview"><img src="/branding/crystal-powers-liquid-mark.svg" alt="Illustrative logo preview" style={{transform:`scale(${controls.size}) rotateY(${controls.angle}rad)`,filter:`drop-shadow(${controls.light*3}px 0 12px ${controls.finish})`}}/><small>Lightweight logo preview</small></div>}
 <span className="prism-room-label">PRISM’S STUDIO / {String(chapter+1).padStart(2,'0')}</span></div>
 <section className="prism-story"><p className="prism-eyebrow">YOUR PERSONAL INTRODUCTION</p><h1 ref={heading} tabIndex={-1} id="prism-companion-title">{titles[chapter]}</h1><p>{copy[chapter]}</p>
 {chapter===1&&<div className="prism-controls">{([['size','Size',.6,1.4,.1],['angle','Viewing angle',-3.14,3.14,experience.threeDAllowed?.1:.785],['light','Light position',-5,5,1]] as const).map(([name,label,min,max,step])=><label key={name}>{label}<input type="range" min={min} max={max} step={step} value={controls[name]} onChange={e=>setControls({...controls,[name]:Number(e.target.value)})}/></label>)}<label>Light finish<select value={controls.finish} onChange={e=>setControls({...controls,finish:e.target.value})}><option value="#a9e9ff">Glacier</option><option value="#ffd9a2">Amber</option><option value="#c4b5fd">Amethyst</option></select></label><button onClick={()=>setControls(defaults)}>Reset room</button></div>}
 {chapter===2&&<div className="prism-choices">{options.map(([id,label])=><button key={id} aria-pressed={theme===id} onClick={()=>setTheme(id)}>{label}</button>)}</div>}
 {chapter===3&&<><div className="prism-choices">{['Website','App','Bespoke system'].map((name,i)=><button key={name} aria-pressed={demo===i} onClick={()=>{setDemo(i);setDemoAction(false);}}>{name}</button>)}</div><div className="prism-demo"><small>ILLUSTRATIVE DEMONSTRATION</small><h2>{['A clear first impression','A simple daily interaction','A more organised workflow'][demo]}</h2><button onClick={()=>setDemoAction(!demoAction)}>{demoAction?['Enquiry panel opened','Task marked complete ✓','Project moved to review ✓'][demo]:['Open an enquiry','Complete a task','Move project to review'][demo]}</button></div>{projects.slice(0,2).map(project=><Link onClick={exit} key={project.id} to={`/portfolio/${project.slug}`}>{project.content.title} ↗</Link>)}</>}
 <footer className="prism-progress"><span>{chapter+1} / 5</span><button disabled={!chapter} onClick={()=>setChapter(chapter-1)}>Back</button><button className="prism-primary" onClick={()=>{if(chapter===4){exit();mark('completed');}else setChapter(chapter+1);}}>{chapter===4?'Explore the website':'Next chapter'} →</button></footer></section></div></dialog>
 {phase==='exiting'&&!experience.reducedMotion&&<div className="prism-flight" aria-hidden="true" style={{'--prism-flight-x':`${flight.current.x}px`,'--prism-flight-y':`${flight.current.y}px`} as CSSProperties}><img src="/renders/prism-companion.png" alt=""/></div>}
 {!tour&&phase!=='exiting'&&<aside className="prism-dock" aria-label="Prism companion">
 {phase==='chat'&&!hidden&&<section className="prism-chat" aria-label="Chat with Prism" onKeyDown={e=>{if(e.key==='Escape'){setPhase('docked');launcher.current?.focus();}}}><header><h2>Ask Prism</h2><button onClick={()=>setPhase('docked')} aria-label="Close chat">×</button></header><p className="prism-small">AI studio assistant. Answers may be imperfect. Free-text questions are processed by OpenAI. Please leave out private information. <PrivacyLink/></p><div className="prism-messages" role="log" aria-live="polite">{messages.map((m,i)=><div key={i} className={`prism-message prism-${m.role}`}><strong>{m.role==='user'?'You':'Prism'}</strong><p>{m.content}</p>{m.sources?.filter(s=>/^\/(about|services|support|contact|portfolio)(\/[-a-z0-9]+)?$/.test(s.href)).map(s=><Link key={s.href} to={s.href}>{s.label} ↗</Link>)}</div>)}{busy&&<p role="status">Prism is thinking…</p>}</div><div className="prism-choices">{['What do you build?','How do I start?'].map(q=><button disabled={busy} key={q} onClick={()=>void send(q)}>{q}</button>)}</div><form onSubmit={e=>{e.preventDefault();void send(input);}}><label htmlFor="prism-question">Your question</label><textarea id="prism-question" value={input} maxLength={1200} onChange={e=>setInput(e.target.value)}/><button disabled={busy||!input.trim()} type="submit">Send question →</button></form><div className="prism-choices"><button onClick={()=>{request.current?.abort();pending.current=false;setBusy(false);setMessages([]);}}>Clear conversation</button><button onClick={replay}>Replay introduction</button><button onClick={()=>{setHidden(true);setPhase('docked');}}>Hide companion</button></div></section>}
 <button ref={launcher} className="prism-launcher" onClick={()=>{setHidden(false);setPhase(phase==='chat'?'docked':'chat');}} aria-expanded={phase==='chat'}>{!hidden&&<img src="/renders/prism-companion.png" alt=""/>}<span>{hidden?'Show Prism':'Ask Prism'}</span></button></aside>}
 </div>;
}
