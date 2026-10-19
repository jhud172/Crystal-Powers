import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Mention={id:number;channelId:string;channelName:string;author:string;preview:string;createdAt:string};
type Page={mentions:Mention[];nextCursor:number | null};
export function MentionInbox({channelIds,disabled,onBusy,onExpired,onOpen}:{channelIds:string[];disabled:boolean;onBusy:(value:boolean)=>void;onExpired:()=>void;onOpen:(channel:string)=>void}){
  const [open,setOpen]=useState(false),[page,setPage]=useState<Page | null>(null),[cursor,setCursor]=useState<number | null>(null),[history,setHistory]=useState<(number | null)[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const live=useRef(true),generation=useRef(0),pending=useRef(false);
  const request=useRef<AbortController | null>(null),callbacks=useRef({onBusy,onExpired});callbacks.current={onBusy,onExpired};
  const allowed=new Set(channelIds),accessKey=channelIds.slice().sort().join(":");
  function fail(value:unknown){if(live.current){setError((value as Error).message);if(value instanceof ApiError && [401,403,404].includes(value.status)){setPage(null);setCursor(null);setHistory([]);}if(value instanceof ApiError && value.status===401)callbacks.current.onExpired();}}
  async function load(before:number | null=cursor,movement:"refresh"|"older"|"newer"|"first"="refresh"){
    if(!live.current)return;
    const current=++generation.current;request.current?.abort();const abort=new AbortController();request.current=abort;
    setError("");setLoading(true);
    if(!channelIds.length){setPage(null);setLoading(false);return;}
    try{
      const result=await api<Page>(`/api/team/mentions${before===null ? "" : `?before=${before}`}`,{signal:abort.signal});
      if(live.current && !abort.signal.aborted && current===generation.current){setPage(result);setCursor(before);if(movement==="older")setHistory(values=>[...values.slice(-99),cursor]);else if(movement==="newer")setHistory(values=>values.slice(0,-1));else if(movement==="first")setHistory([]);}
    }catch(failure){if(!abort.signal.aborted && current===generation.current)fail(failure);}
    finally{if(live.current && current===generation.current)setLoading(false);}
  }
  useEffect(()=>{live.current=true;return()=>{live.current=false;generation.current++;request.current?.abort();callbacks.current.onBusy(false);};},[]);
  useEffect(()=>{setPage(null);setCursor(null);setHistory([]);setLoading(false);if(open)void load(null,"first");return()=>{generation.current++;request.current?.abort();};},[open,accessKey]);
  async function acknowledge(mention:Mention){
    if(pending.current || disabled || loading || !allowed.has(mention.channelId))return;
    const current=generation.current;pending.current=true;setBusy(true);callbacks.current.onBusy(true);setError("");
    try{await api(`/api/team/channels/${mention.channelId}/mentions/${mention.id}/acknowledge`,{method:"POST"});if(live.current && current===generation.current)await load();}
    catch(failure){if(current===generation.current)fail(failure);}
    finally{pending.current=false;if(live.current){setBusy(false);callbacks.current.onBusy(false);}}
  }
  const locked=disabled || busy || loading;
  return <details className="team-mention-inbox" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary>Your mentions</summary><OwnerError message={error}/><button className="admin-text-button" disabled={locked} onClick={()=>{setError("");void load();}}>Refresh mentions</button>{loading && <p role="status">Loading mentions…</p>}{page && !page.mentions.length && !loading && <p>No unacknowledged mentions on this page.</p>}<ul>{page?.mentions.filter(mention=>allowed.has(mention.channelId)).map(mention=><li key={mention.id}><strong>#{mention.channelName} · {mention.author}</strong><time dateTime={mention.createdAt}>{new Date(mention.createdAt).toLocaleString("en-GB")}</time><p>{mention.preview}</p><button className="admin-text-button" disabled={locked} onClick={()=>onOpen(mention.channelId)}>Open channel</button><button className="admin-text-button" disabled={locked} onClick={()=>void acknowledge(mention)}>Acknowledge mention</button></li>)}</ul><nav aria-label="Mention pages"><button className="admin-text-button" disabled={locked || !history.length} onClick={()=>void load(history[history.length-1],"newer")}>Newer mentions</button><button className="admin-text-button" disabled={locked || !page?.nextCursor} onClick={()=>{if(page?.nextCursor)void load(page.nextCursor,"older");}}>Older mentions</button><button className="admin-text-button" disabled={locked || cursor===null} onClick={()=>void load(null,"first")}>Latest mentions</button></nav><p>Opening a channel does not acknowledge a mention. Only you can clear your own mention inbox.</p></details>;
}
