import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Recipient={key:string;name:string};
export function MentionPicker({channelId,selected,disabled,onChange,onExpired}:{channelId:string;selected:string[];disabled:boolean;onChange:(keys:string[])=>void;onExpired:()=>void}){
  const [recipients,setRecipients]=useState<Recipient[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const live=useRef(true),generation=useRef(0);
  async function load(){const current=++generation.current;setLoading(true);setError("");try{const rows=await api<Recipient[]>(`/api/team/channels/${channelId}/mention-recipients`);if(live.current && current===generation.current)setRecipients(rows);}catch(failure){if(live.current && current===generation.current){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();}}finally{if(live.current && current===generation.current)setLoading(false);}}
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;generation.current++;};},[channelId]);
  return <div className="team-mention-picker"><OwnerError message={error}/><label>Notify a team member<select value="" disabled={disabled || loading || selected.length>=10} onChange={event=>{if(event.target.value)onChange([...selected,event.target.value]);}}><option value="">Choose a person…</option>{recipients.filter(r=>!selected.includes(r.key)).map(r=><option value={r.key} key={r.key}>{r.name}</option>)}</select></label><p>Selected people receive an in-app mention when their personal preferences allow it. Email addresses and ordinary @text do not notify anyone.</p><div>{selected.map(key=><button type="button" className="admin-secondary" key={key} disabled={disabled} onClick={()=>onChange(selected.filter(value=>value!==key))}>{recipients.find(r=>r.key===key)?.name || "Recipient unavailable"} · Remove</button>)}</div><button type="button" className="admin-text-button" disabled={disabled || loading} onClick={()=>void load()}>Refresh eligible people</button></div>;
}
