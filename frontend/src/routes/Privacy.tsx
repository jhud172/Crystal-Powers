import { useEffect, useState } from "react";
import { api, ApiError } from "../features/portfolio/projectApi";
import { usePrivacyPublication } from "../features/privacy/PrivacyPublication";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { NotFound } from "./NotFound";

type Document={operator:string;contactEmail:string;updated:string;sections:{id:string;title:string;body:string}[]};
export function Privacy(){
  const {confirmReady}=usePrivacyPublication();const [document,setDocument]=useState<Document | null>(null),[loading,setLoading]=useState(true),[missing,setMissing]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  usePageMetadata(document ? "Privacy & your data | Crystal Powers" : "Privacy information | Crystal Powers","How Crystal Powers handles personal information, contact details and project communications.","/privacy");
  useEffect(()=>{let active=true;const abort=new AbortController();setLoading(true);setError("");setMissing(false);setDocument(null);void api<Document>("/api/site/privacy",{signal:abort.signal}).then(result=>{if(!result || typeof result.operator!=="string" || typeof result.contactEmail!=="string" || typeof result.updated!=="string" || !Array.isArray(result.sections) || result.sections.length!==8 || result.sections.some(section=>!section || typeof section.id!=="string" || typeof section.title!=="string" || typeof section.body!=="string"))throw new ApiError(503,"Published privacy information could not be verified. Reload it before relying on this page.");if(active){setDocument(result);confirmReady(true);}}).catch(failure=>{if(!active || (failure instanceof DOMException && failure.name==="AbortError"))return;if(failure instanceof ApiError && failure.status===404){setMissing(true);confirmReady(false);}else setError(failure instanceof Error ? failure.message : "Privacy information could not be loaded.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;abort.abort();};},[revision,confirmReady]);
  if(missing)return <NotFound/>;
  return <article className="privacy-page studio-section"><header><p className="studio-eyebrow">CRYSTAL POWERS / YOUR INFORMATION</p><h1>Privacy.<br/>Your data.</h1>{document && <><p>Operator: <strong>{document.operator}</strong></p><p>Updated <time dateTime={document.updated}>{document.updated}</time></p><p>Questions about your information: <a href={"mailto:"+document.contactEmail}>{document.contactEmail}</a></p></>}</header>
    {loading && <p role="status">Loading published privacy information…</p>}{error && <div><p role="alert">{error}</p><button type="button" className="studio-button" onClick={()=>setRevision(value=>value+1)}>Reload privacy information</button></div>}
    {document && <><nav aria-label="Privacy page sections">{document.sections.map(section=><a key={section.id} href={"#privacy-"+section.id}>{section.title}</a>)}</nav>{document.sections.map(section=><section key={section.id} id={"privacy-"+section.id} aria-labelledby={"privacy-heading-"+section.id}><h2 id={"privacy-heading-"+section.id}>{section.title}</h2><p>{section.body}</p></section>)}</>}
  </article>;
}
