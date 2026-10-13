import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../portfolio/projectApi";

type Publication = { ready: boolean | null; confirmReady: (ready: boolean) => void };
const Context=createContext<Publication>({ready:null,confirmReady:()=>{}});
/** One public-shell status read; no private route or birthday background request. */
export function PrivacyPublication({enabled,children}:PropsWithChildren<{enabled:boolean}>){
  const [ready,setReady]=useState<boolean | null>(null);
  const evidence=useRef(0);
  const confirmReady=useCallback((value:boolean)=>{++evidence.current;setReady(value);},[]);
  useEffect(()=>{const current=++evidence.current;setReady(null);if(!enabled)return;let active=true;const abort=new AbortController();void api<{ready:boolean}>("/api/site/privacy/status",{signal:abort.signal}).then(result=>{if(active && current===evidence.current)setReady(result.ready===true);}).catch(()=>{if(active && current===evidence.current)setReady(false);});return()=>{active=false;abort.abort();};},[enabled]);
  const value=useMemo(()=>({ready,confirmReady}),[ready,confirmReady]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePrivacyPublication(){return useContext(Context);}
export function PrivacyLink({className,arrow=false}:{className?:string;arrow?:boolean}){const {ready}=usePrivacyPublication();return ready===true ? <NavLink to="/privacy" className={className}>Privacy and your data{arrow && <span aria-hidden="true">↗</span>}</NavLink> : null;}
