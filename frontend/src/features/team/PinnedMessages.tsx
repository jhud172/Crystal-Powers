import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import type { TeamMessage } from "./teamMessageTypes";

type Props = { channelId: string; revision: number; canManage: boolean; disabled: boolean; onPin: (message: TeamMessage) => void; onExpired: () => void };
export function PinnedMessages({ channelId, revision, canManage, disabled, onPin, onExpired }: Props) {
  const [open,setOpen]=useState(false),[pins,setPins]=useState<TeamMessage[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const generation=useRef(0);
  useEffect(()=>{
    const current=++generation.current;
    if(!open)return;
    let stopped=false,refreshing=false,timer:ReturnType<typeof setTimeout> | undefined;
    const controller=new AbortController();setError("");setLoading(true);
    async function refresh(){
      if(stopped || document.hidden || refreshing)return;
      refreshing=true;
      try{const result=await api<TeamMessage[]>(`/api/team/channels/${channelId}/pins`,{signal:controller.signal});if(!stopped && current===generation.current){setPins(result);setError("");}}
      catch(failure){if(!stopped && current===generation.current){setError((failure as Error).message);if(failure instanceof ApiError && [401,403,404].includes(failure.status)){setPins([]);if(failure.status===401)onExpired();}}}
      finally{refreshing=false;if(!stopped && current===generation.current)setLoading(false);if(!stopped && !document.hidden)timer=setTimeout(()=>void refresh(),7000);}
    }
    function visibility(){if(timer)clearTimeout(timer);if(!document.hidden)void refresh();}
    void refresh();document.addEventListener("visibilitychange",visibility);
    return()=>{stopped=true;controller.abort();if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",visibility);};
  },[channelId,open,revision]);
  return <details className="team-pinned-messages" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}>
    <summary>Pinned messages</summary><OwnerError message={error}/>{loading && <p role="status">Loading pinned messages…</p>}{!loading && !error && !pins.length && <p>No pinned messages in this channel.</p>}
    <ol className="team-messages">{pins.map(message=><li key={message.id}><div><strong>{message.author}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-GB")}</time><small>Pinned</small></div>{message.replyToId!=null && <blockquote className="team-reply-preview"><strong>{message.replyAuthor || "Original message unavailable"}</strong>{message.replyBody && <p>{message.replyBody}</p>}</blockquote>}<p>{message.body}</p>{canManage && <button type="button" className="admin-text-button" disabled={disabled} onClick={()=>onPin(message)}>Unpin this message</button>}</li>)}</ol>
  </details>;
}
