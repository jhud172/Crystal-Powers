import { PersonAvatar } from "../../components/PersonAvatar";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { MessageAttachments } from "./MessageAttachments";
import { TeamProjects } from "./TeamProjects";
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { TeamMembers } from "../admin/TeamMembers";
import { ArchivedChannels, ChannelSettings, type TeamChannel } from "./ChannelSettings";
import { SupportInbox } from "./SupportInbox";
import { UploadReview } from "./UploadReview";
import { ChannelPreferences, type ChannelPreference } from "./ChannelPreferences";
import { TeamSettings, type TeamSettingsView } from "./TeamSettings";
import { TeamGroups } from "./TeamGroups";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { PinnedMessages } from "./PinnedMessages";
import { MentionPicker } from "./MentionPicker";
import { MentionInbox } from "./MentionInbox";
import type { TeamMessage } from "./teamMessageTypes";
import { hasTeamDrafts } from "./teamDraftMemory";
import type { ComposerDraft, TeamDraftMemory } from "./teamDraftMemory";
import type { TeamSession } from "./TeamEntry";

type Channel = TeamChannel;
type Message = TeamMessage;
type Workspace = { displayName: string; ownerId: string | null; memberId: string | null; permissions: string[]; channels: Channel[]; settings: TeamSettingsView };
type Conversation = {version:number;unchanged:boolean;messages:Message[];hasEarlier:boolean;hasLater:boolean};
type Unread = { channelId: string; count: number; lastReadId: number; latestId: number };
export function TeamWorkspace({ session, onSignOut, busy, onExpired, onSecurityChanged, draftMemory, onDraftPresence }: { session: TeamSession; onSignOut: () => void; busy: boolean; onExpired: () => void; onSecurityChanged:(message:string)=>void; draftMemory: TeamDraftMemory; onDraftPresence: (present:boolean)=>void }) {
  const narrow=useMediaQuery("(max-width: 760px)"),[navigationOpen,setNavigationOpen]=useState(false);
  const conversationElement=useRef<HTMLDivElement>(null),contentFocusRequested=useRef(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null), [channelId, setChannelId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]), [drafts, setDrafts] = useState<Record<string, ComposerDraft>>({});
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [sending, setSending] = useState(false);
  const [manage, setManage] = useState(false), [editing, setEditing] = useState<Message | null>(null), [editBody, setEditBody] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [archivesOpen, setArchivesOpen] = useState(false), [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [projectsOpen,setProjectsOpen]=useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const [groupsOpen,setGroupsOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const settingsButton=useRef<HTMLButtonElement>(null);
  const [pinRevision,setPinRevision]=useState(0);
  const [historyBefore,setHistoryBefore]=useState<number | null>(null),[newerCursors,setNewerCursors]=useState<(number | null)[]>([]);
  const historyHeading=useRef<HTMLHeadingElement>(null);
  const [unread,setUnread]=useState<Record<string,Unread>>({}),[readNotice,setReadNotice]=useState("");
  const workspaceRef=useRef<Workspace | null>(null);workspaceRef.current=workspace;
  const unreadGeneration=useRef(0);
  const workspaceGeneration=useRef(0),workspaceRequest=useRef<AbortController | null>(null);
  const [olderBusy, setOlderBusy] = useState(false), [hasOlder, setHasOlder] = useState(false);
  const live = useRef(true), operation = useRef(false), generation = useRef(0);
  const historyExhausted = useRef(false);
  const conversationMutation=useRef(0);
  const conversationWindow=useRef<{version:number | null;floor:number | null;before:number | null}>({version:null,floor:null,before:null});
  const privateFormDirty = useRef(false), attachmentDirty = useRef(false);
  const [attachmentMessage,setAttachmentMessage]=useState<Message | null>(null);
  const channelPreferences=new Map(workspace?.settings.channelPreferences.map(value => [value.channelId,value]));
  function savedPreference(value:ChannelPreference){setWorkspace(current=>current ? {...current,settings:{...current.settings,channelPreferences:[...current.settings.channelPreferences.filter(item=>item.channelId!==value.channelId),value]}} : current);}
  const channel = workspace?.channels.find(item => item.id === channelId);
  const composer=useRef<HTMLTextAreaElement>(null),submissions=useRef<Record<string,{signature:string;key:string}>>({});
  const currentDraft=drafts[channelId] || {body:"",reply:null};
  const draftScope=useRef<string | null>(null),restored=useRef(false);
  const [recoveryNotice,setRecoveryNotice]=useState("");
  useLayoutEffect(()=>{if(draftScope.current && draftMemory.scope===draftScope.current){draftMemory.drafts=drafts;onDraftPresence(hasTeamDrafts(draftMemory));}},[drafts,draftMemory,onDraftPresence]);
  const draftDirty=Object.values(drafts).some(draft=>!!draft.body.trim() || !!draft.reply || !!draft.mentions?.length);
  const editDirty=!!editing && editBody!==editing.body;
  useNavigationProtection(draftDirty || editDirty || sending,"Leave the workspace and discard unsaved conversation input, or leave before its result is confirmed?");
  useLayoutEffect(()=>{if(contentFocusRequested.current || (narrow && !navigationOpen && document.getElementById("team-workspace-navigation")?.contains(document.activeElement))){contentFocusRequested.current=false;const heading=conversationElement.current?.querySelector<HTMLElement>("h1,h2");if(heading){heading.tabIndex=-1;heading.focus();}else conversationElement.current?.focus();}},[channelId,manage,membersOpen,archivesOpen,supportOpen,uploadsOpen,groupsOpen,settingsOpen,projectsOpen,navigationOpen,narrow]);
  function changeView(action: () => void,focusContent=true) {
    if (sending || busy || ((privateFormDirty.current || attachmentDirty.current || editDirty) && !window.confirm("Discard unsaved settings, project or message edits? Conversation drafts stay in this tab."))) return;
    if(supportOpen && privateFormDirty.current){for(const [bill,draft] of Object.entries(draftMemory.refunds))if(draft.requestId===draftMemory.support.selected)delete draftMemory.refunds[bill];onDraftPresence(hasTeamDrafts(draftMemory));}
    if(projectsOpen && privateFormDirty.current){const memory=draftMemory.projects;delete memory.drafts[memory.selected];memory.selected="";memory.creation=null;onDraftPresence(hasTeamDrafts(draftMemory));}
    privateFormDirty.current = false; attachmentDirty.current=false; setAttachmentMessage(null); if(focusContent){contentFocusRequested.current=true;setNavigationOpen(false);} action();
  }
  function fail(failure: unknown) { if (!live.current) return; setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); }
  async function loadWorkspace() {
    if(!live.current)return;
    const current=++workspaceGeneration.current;workspaceRequest.current?.abort();const abort=new AbortController();workspaceRequest.current=abort;
    try { const result = await api<Workspace>("/api/team/workspace",{signal:abort.signal}); if (live.current && !abort.signal.aborted && current===workspaceGeneration.current) {
      const scope=result.memberId ? `TEAM:${result.memberId}` : result.ownerId ? `OWNER:${result.ownerId}` : null;
      if(restored.current && draftScope.current!==scope)throw new ApiError(401,"Your account changed. Confirm it again before recovering workspace drafts.");
      if(!scope)throw new Error("Workspace identity could not be confirmed. Sign in again before recovering drafts.");
      const allowed=new Set(result.channels.map(channel=>channel.id));
      if(!restored.current){
        restored.current=true;draftScope.current=scope;
        if(draftMemory.scope!==scope){draftMemory.scope=scope;draftMemory.refunds={};draftMemory.drafts={};draftMemory.submissions={};draftMemory.projects={selected:"",creation:null,drafts:{}};draftMemory.support={selected:"",drafts:{}};}
        const recovered=Object.fromEntries(Object.entries(draftMemory.drafts).filter(([id])=>allowed.has(id)).map(([id,draft])=>[id,{body:draft.body,reply:draft.reply ? {id:draft.reply.id,author:"a previously selected message",body:"Reply access is checked when you send."} : null,mentions:draft.mentions || []}]));
        draftMemory.drafts=recovered;draftMemory.submissions=Object.fromEntries(Object.entries(draftMemory.submissions).filter(([id])=>allowed.has(id)));submissions.current=draftMemory.submissions;setDrafts(recovered);
        if(Object.values(recovered).some(draft=>!!draft.body.trim() || !!draft.reply || !!draft.mentions?.length))setRecoveryNotice("Your unsent conversation drafts were recovered for channels you can still access. Stored reply text was cleared; its target is checked before sending.");
      }else{
        setDrafts(values=>Object.keys(values).every(id=>allowed.has(id)) ? values : Object.fromEntries(Object.entries(values).filter(([id])=>allowed.has(id))));
        draftMemory.drafts=Object.fromEntries(Object.entries(draftMemory.drafts).filter(([id])=>allowed.has(id)));
        submissions.current=Object.fromEntries(Object.entries(submissions.current).filter(([id])=>allowed.has(id)));draftMemory.submissions=submissions.current;
      }
      if(!result.permissions.includes("READ_SUPPORT"))draftMemory.support={selected:"",drafts:{}};
      else for(const [id,draft] of Object.entries(draftMemory.support.drafts)){if(!result.permissions.includes("REPLY_SUPPORT"))draft.message=null;if(!result.permissions.includes("UPDATE_TRACKING"))draft.tracking=null;if(!draft.message && !draft.tracking)delete draftMemory.support.drafts[id];}
      if(!result.permissions.includes("READ_SUPPORT") || !result.permissions.includes("MANAGE_BILLING"))draftMemory.refunds={};
      else if(!workspaceRef.current && Object.values(draftMemory.refunds).length){draftMemory.support.selected=Object.values(draftMemory.refunds)[0].requestId;setSupportOpen(true);}
      onDraftPresence(hasTeamDrafts(draftMemory));
      if(!result.permissions.includes("EDIT_PROJECTS")){draftMemory.projects={selected:"",creation:null,drafts:{}};setProjectsOpen(false);}else if((draftMemory.projects.creation || (draftMemory.projects.selected && draftMemory.projects.drafts[draftMemory.projects.selected])) && !workspaceRef.current)setProjectsOpen(true);
      onDraftPresence(hasTeamDrafts(draftMemory));
      if(!workspaceRef.current)setError("");
      workspaceRef.current=result;setWorkspace(result); setChannelId(current => result.channels.some(item => item.id === current) ? current : result.channels[0]?.id || "");
    } } catch (failure) {
      if(!live.current || abort.signal.aborted || current!==workspaceGeneration.current)return;
      if(failure instanceof ApiError && [401,403,404].includes(failure.status)){
        ++generation.current;++unreadGeneration.current;workspaceRef.current=null;setWorkspace(null);setChannelId("");setMessages([]);setUnread({});setEditing(null);setAttachmentMessage(null);
        setManage(false);setEditingChannel(null);setMembersOpen(false);setArchivesOpen(false);setSupportOpen(false);setUploadsOpen(false);setGroupsOpen(false);setSettingsOpen(false);setProjectsOpen(false);
        privateFormDirty.current=false;attachmentDirty.current=false;
      }
      fail(failure);
    } finally { if (live.current && current===workspaceGeneration.current) setLoading(false); }
  }
  useEffect(() => { live.current = true; void loadWorkspace(); return () => { live.current = false; generation.current++;workspaceGeneration.current++;workspaceRequest.current?.abort(); }; }, []);
  async function loadUnread(signal?:AbortSignal){const current=++unreadGeneration.current;const result=await api<Unread[]>("/api/team/unread",signal ? {signal} : {});if(live.current && current===unreadGeneration.current && !signal?.aborted){setUnread(Object.fromEntries(result.map(item=>[item.channelId,item])));const known=workspaceRef.current?.channels;if(known && (known.length!==result.length || known.some(channel=>!result.some(item=>item.channelId===channel.id))))void loadWorkspace();}}
  useEffect(()=>{
    let stopped=false,refreshing=false,timer:ReturnType<typeof setTimeout> | undefined;const controller=new AbortController();
    async function refresh(){if(stopped || document.hidden || refreshing)return;refreshing=true;try{await loadUnread(controller.signal);}catch(failure){if(!stopped)fail(failure);}finally{refreshing=false;if(!stopped && !document.hidden)timer=setTimeout(()=>void refresh(),7000);}}
    function visibility(){if(timer)clearTimeout(timer);if(!document.hidden)void refresh();}
    void refresh();document.addEventListener("visibilitychange",visibility);return()=>{stopped=true;controller.abort();if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  useEffect(() => {
    const current = ++generation.current;
    let stopped = false, refreshing = false, timer: ReturnType<typeof setTimeout> | undefined;
    const controller=new AbortController();
    historyExhausted.current = false;conversationWindow.current={version:null,floor:null,before:null};setHistoryBefore(null);setNewerCursors([]);setReadNotice(""); setMessages([]); setHasOlder(false); setEditing(null);
    if (!channelId || manage || membersOpen || archivesOpen || supportOpen || uploadsOpen || groupsOpen || settingsOpen || projectsOpen) return;
    setError("");
    async function refresh() {
      if (stopped || document.hidden || refreshing) return;
      refreshing = true;
      try {
        const mutationAtRequest=conversationMutation.current,requestedFloor=conversationWindow.current.floor,requestedBefore=conversationWindow.current.before,query=new URLSearchParams();
        if(conversationWindow.current.version!==null)query.set("version",String(conversationWindow.current.version));
        if(requestedFloor!==null)query.set("floor",String(requestedFloor));if(requestedBefore!==null)query.set("before",String(requestedBefore));
        const result=await api<Conversation>(`/api/team/channels/${channelId}/conversation?${query}`,{signal:controller.signal});
        if(!stopped && current===generation.current && requestedFloor===conversationWindow.current.floor && requestedBefore===conversationWindow.current.before && mutationAtRequest===conversationMutation.current){
          conversationWindow.current.version=result.version;
          if(!result.unchanged){setMessages(result.messages);conversationWindow.current.floor=result.messages[0]?.id || null;setHasOlder(result.hasEarlier);historyExhausted.current=!result.hasEarlier;}
        }
      }
      catch (failure) { if (!stopped && current === generation.current && !(failure instanceof DOMException && failure.name==="AbortError")) { fail(failure); if (failure instanceof ApiError && [401, 403, 404].includes(failure.status)) { setMessages([]); setEditing(null); attachmentDirty.current=false;setAttachmentMessage(null); if (failure.status !== 401) void loadWorkspace(); } } }
      finally { refreshing = false; if (!stopped && !document.hidden) timer = setTimeout(() => void refresh(), 7000); }
    }
    function visibility() { if (timer) clearTimeout(timer); if (!document.hidden) void refresh(); }
    void refresh(); document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; controller.abort(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [channelId, manage, membersOpen, archivesOpen, supportOpen, uploadsOpen, groupsOpen, settingsOpen, projectsOpen]);
  async function historyPage(before:number | null,movement:"older" | "newer" | "latest"){
    if(olderBusy || operation.current || busy)return;
    if(editDirty && !window.confirm("Discard your unsaved message edit before changing history pages? Your composer draft remains."))return;
    const target=channelId,current=generation.current,previous=conversationWindow.current.before;
    conversationMutation.current++;setOlderBusy(true);setError("");
    const query=new URLSearchParams();if(before!==null)query.set("before",String(before));
    try{const result=await api<Conversation>(`/api/team/channels/${target}/conversation?${query}`);if(live.current && current===generation.current){
      conversationWindow.current={version:result.version,floor:result.messages[0]?.id || null,before};setHistoryBefore(before);setMessages(result.messages);setHasOlder(result.hasEarlier);setEditing(null);
      if(movement==="older")setNewerCursors(values=>[...values.slice(-99),previous]);
      else if(movement==="newer")setNewerCursors(values=>values.slice(0,-1));
      else setNewerCursors([]);
      historyHeading.current?.focus();
    }}catch(failure){fail(failure);}finally{if(live.current)setOlderBusy(false);}
  }
  async function older(){if(messages.length)await historyPage(messages[0].id,"older");}
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const captured=drafts[channelId] || {body:"",reply:null};const body=captured.body;
    if (operation.current || sending || busy || olderBusy || !body.trim()) return;
    const target = channelId, current = generation.current; operation.current = true; setSending(true); setError("");
    const mentionKeys=(captured.mentions || []).slice().sort();
    const signature=JSON.stringify(mentionKeys.length ? [body.trim(),captured.reply?.id || null,mentionKeys] : [body.trim(),captured.reply?.id || null]);
    if(submissions.current[target]?.signature!==signature)submissions.current[target]={signature,key:crypto.randomUUID()};
    try { const message = await api<Message>(`/api/team/channels/${target}/messages`, { method: "POST", body: JSON.stringify({ body,submissionKey:submissions.current[target].key,replyToId:captured.reply?.id || null,mentionKeys }) }); if (live.current) {conversationMutation.current++;conversationWindow.current.version=null; setDrafts(value => value[target]?.body===body && value[target]?.reply?.id===captured.reply?.id && JSON.stringify((value[target]?.mentions || []).slice().sort())===JSON.stringify(mentionKeys) ? ({...value,[target]:{body:"",reply:null}}) : value);delete submissions.current[target]; if (current === generation.current) {if(conversationWindow.current.before===null)setMessages(value => [...value.filter(item => item.id !== message.id), message].sort((a,b)=>a.id-b.id).slice(-500));else setReadNotice("Message sent to the latest conversation. Your earlier-history page stays in place.");} } }
    catch (failure) { fail(failure); } finally { operation.current = false; if (live.current) setSending(false); }
  }
  function savedChannel(result: Channel) {
    if (!live.current) return;
    privateFormDirty.current = false;
    setSending(false); setManage(false); setArchivesOpen(false); setEditingChannel(null);
    setWorkspace(current => current ? { ...current, channels: result.archived ? current.channels.filter(item => item.id !== result.id) : [...current.channels.filter(item => item.id !== result.id), result].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) } : current);
    setChannelId(result.archived ? workspace?.channels.find(item => item.id !== result.id)?.id || "" : result.id);
    void loadWorkspace();
  }
  async function saveEdit(deleted: boolean) {
    if (!editing || operation.current || olderBusy || (deleted && !window.confirm("Remove this message?"))) return;
    const target = channelId, message = editing, current = generation.current; operation.current = true; setSending(true); setError("");
    try { await api(`/api/team/channels/${target}/messages/${message.id}`, { method: "PATCH", body: JSON.stringify({ body: editBody, expectedVersion: message.version, deleted }) }); if (live.current && current === generation.current) {conversationMutation.current++;conversationWindow.current.version=null; setEditing(null);setPinRevision(value=>value+1); setMessages(previous => deleted ? previous.filter(item => item.id !== message.id).map(item=>item.replyToId===message.id ? {...item,replyAuthor:null,replyBody:null} : item) : previous.map(item => item.id === message.id ? { ...item, body: editBody, version: message.version + 1, editedAt: new Date().toISOString() } : item)); } } catch (failure) { fail(failure); } finally { operation.current = false; if (live.current) setSending(false); }
  }
  async function togglePin(message:Message){
    if(operation.current || olderBusy || busy)return;
    const target=channelId,current=generation.current;operation.current=true;setSending(true);setError("");
    try{const result=await api<Message>(`/api/team/channels/${target}/messages/${message.id}/pin`,{method:"PATCH",body:JSON.stringify({pinned:!message.pinned,expectedVersion:message.version})});if(live.current && current===generation.current){conversationMutation.current++;conversationWindow.current.version=null;setMessages(values=>values.map(value=>value.id===result.id ? result : value));setPinRevision(value=>value+1);}}
    catch(failure){fail(failure);if(live.current && current===generation.current)setPinRevision(value=>value+1);}
    finally{operation.current=false;if(live.current)setSending(false);}
  }
  async function markRead(){if(operation.current || olderBusy || busy || !messages.length)return;const target=channelId,through=messages[messages.length-1].id,current=generation.current;operation.current=true;setSending(true);setReadNotice("");setError("");try{await api(`/api/team/channels/${target}/read`,{method:"POST",body:JSON.stringify({throughId:through})});await loadUnread();if(live.current && current===generation.current)setReadNotice("Channel marked read through the newest loaded message. Later messages remain unread.");}catch(failure){fail(failure);}finally{operation.current=false;if(live.current)setSending(false);}}
  return <section className={`team-workspace${workspace?.settings.preferences.compact ? " team-workspace-compact" : ""}`}>
    <button className="team-navigation-toggle admin-secondary" disabled={sending || busy || olderBusy} aria-expanded={navigationOpen} aria-controls="team-workspace-navigation" onClick={()=>{if(navigationOpen)contentFocusRequested.current=true;setNavigationOpen(value=>!value);}}><span>{navigationOpen ? "Close workspace navigation" : "Open workspace navigation"}</span><small>{channel ? "# "+channel.name : workspace?.settings.branding.name || "Team workspace"}</small></button>
    <aside id="team-workspace-navigation" className={"team-sidebar"+(navigationOpen ? " is-open" : "")}><a className="team-content-shortcut" href="#team-conversation">Skip workspace navigation</a><p className="studio-eyebrow">CRYSTAL POWERS</p><h1>{workspace?.settings.branding.name || "Team workspace"}</h1>{workspace?.settings.branding.tagline && <p>{workspace.settings.branding.tagline}</p>}<div className="team-identity-card"><PersonAvatar name={workspace?.displayName || session.member?.displayName || "Team member"} /><div><strong>{workspace?.displayName || session.member?.displayName}</strong><span>{session.member?.role}</span></div></div><MentionInbox channelIds={workspace?.channels.map(item=>item.id) || []} disabled={!workspace || sending || busy || olderBusy || (narrow && !navigationOpen)} onBusy={value=>{if(live.current)setSending(value);}} onExpired={onExpired} onOpen={id=>changeView(()=>{setChannelId(id);setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false);setUploadsOpen(false);setSupportOpen(false);setMembersOpen(false);setManage(false);setArchivesOpen(false);})}/><nav aria-label="Team channels">{Array.from(new Set(workspace?.channels.map(item => item.category))).map(category => <div key={category}><h2>{category}</h2>{workspace?.channels.filter(item => item.category === category).sort((a,b)=>Number(!!channelPreferences.get(b.id)?.favourite)-Number(!!channelPreferences.get(a.id)?.favourite)).map(item => <button key={item.id} disabled={sending || busy || olderBusy} aria-current={item.id === channelId ? "page" : undefined} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setUploadsOpen(false); setSupportOpen(false); setChannelId(item.id); setManage(false); setMembersOpen(false); setArchivesOpen(false); })}># {item.name}{channelPreferences.get(item.id)?.favourite && <span aria-label="Favourite channel"> ★</span>}{workspace?.settings.preferences.unreadBadges && channelPreferences.get(item.id)?.unreadBadges!==false && !!unread[item.id]?.count && <span className="team-unread-badge" aria-label={`${unread[item.id].count} unread messages`}>{unread[item.id].count>999 ? "999+" : unread[item.id].count}</span>}</button>)}</div>)}</nav>
      {workspace?.permissions.includes("EDIT_PROJECTS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={()=>changeView(()=>{setSettingsOpen(false);setGroupsOpen(false);setUploadsOpen(false);setSupportOpen(false);setMembersOpen(false);setManage(false);setArchivesOpen(false);setProjectsOpen(true);})}>Business projects</button>}
      <button ref={settingsButton} aria-expanded={settingsOpen} className="admin-secondary" disabled={sending || busy || olderBusy || !workspace} onClick={() => changeView(() => { setGroupsOpen(false); setUploadsOpen(false); setSupportOpen(false); setMembersOpen(false); setManage(false); setArchivesOpen(false); setProjectsOpen(false);setSettingsOpen(true); })}>Workspace and account settings</button>
      {workspace?.permissions.includes("MANAGE_GROUPS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={()=>changeView(()=>{setUploadsOpen(false);setSupportOpen(false);setMembersOpen(false);setManage(false);setArchivesOpen(false);setProjectsOpen(false);setSettingsOpen(false);setGroupsOpen(true);})}>Private groups</button>}
      {workspace?.permissions.includes("REVIEW_UPLOADS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setMembersOpen(false); setManage(false); setArchivesOpen(false); setSupportOpen(false); setUploadsOpen(true); })}>Upload review</button>}
      {workspace?.permissions.includes("READ_SUPPORT") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setMembersOpen(false); setManage(false); setArchivesOpen(false); setUploadsOpen(false); setSupportOpen(true); })}>Client requests</button>}
      {workspace?.permissions.includes("MANAGE_MEMBERS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setUploadsOpen(false); setSupportOpen(false); setMembersOpen(true); setManage(false); setArchivesOpen(false); })}>Team members</button>}
      {workspace?.permissions.includes("MANAGE_CHANNELS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setUploadsOpen(false); setSupportOpen(false); setMembersOpen(false); setArchivesOpen(false); setEditingChannel(null); setManage(true); })}>Create channel</button>}
      {workspace?.permissions.includes("MANAGE_CHANNELS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setUploadsOpen(false); setSupportOpen(false); setMembersOpen(false); setManage(false); setArchivesOpen(true); })}>Archived channels</button>}<button className="admin-text-button" disabled={busy || sending || manage} onClick={() => void loadWorkspace()}>Refresh channels</button><button className="admin-text-button" disabled={busy || sending} onClick={() => { if(!hasTeamDrafts(draftMemory) || window.confirm("Discard retained conversation, request and project drafts, then sign out?")) changeView(onSignOut); }}>Sign out</button>
    </aside>
    <div ref={conversationElement} id="team-conversation" tabIndex={-1} className="team-conversation"><OwnerError message={error} />{recoveryNotice && <p role="status" className="admin-notice">{recoveryNotice}</p>}{loading ? <p role="status">Opening your channels…</p> : !workspace ? <button className="admin-secondary" onClick={() => void loadWorkspace()}>Try again</button> : projectsOpen ? <TeamProjects draftMemory={draftMemory} onDraftPresence={onDraftPresence} actorScope={draftScope.current || ""} canPublish={workspace.permissions.includes("PUBLISH_PROJECTS")} onBack={()=>changeView(()=>setProjectsOpen(false))} onExpired={onExpired} onDirty={value=>{privateFormDirty.current=value;}} onBusy={value=>{if(live.current)setSending(value);}}/> : settingsOpen ? <TeamSettings onSecurityChanged={onSecurityChanged} initial={workspace.settings} canManage={workspace.permissions.includes("MANAGE_SETTINGS")} onBack={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); settingsButton.current?.focus(); })} onSaved={settings => setWorkspace(current => current ? { ...current, settings, displayName: settings.displayName } : current)} onExpired={onExpired} onDirty={value => { privateFormDirty.current=value; }} onBusy={value => { if(live.current)setSending(value); }} /> : groupsOpen ? <TeamGroups onBack={()=>changeView(()=>setGroupsOpen(false))} onExpired={onExpired} onDirty={value=>{privateFormDirty.current=value;}} onBusy={value=>{if(live.current)setSending(value);}} onChanged={()=>void loadWorkspace()}/> : uploadsOpen ? <UploadReview permissions={workspace.permissions} onExpired={onExpired} onDirty={value => { privateFormDirty.current = value; }} onBusy={value => { if (live.current) setSending(value); }} /> : supportOpen ? <SupportInbox draftMemory={draftMemory} onDraftPresence={onDraftPresence} actorScope={draftScope.current || ""} permissions={workspace.permissions} onExpired={onExpired} onBusy={value => { if (live.current) setSending(value); }} onDirty={value => { privateFormDirty.current = value; }} /> : membersOpen ? <TeamMembers backLabel="Back to channels" canManageRoles={workspace.permissions.includes("MANAGE_ROLES")} onBack={() => changeView(() => setMembersOpen(false))} onSessionExpired={onExpired} onDirty={value => { privateFormDirty.current = value; }} onBusy={value => { if (live.current) setSending(value); }} /> : archivesOpen ? <ArchivedChannels onSaved={savedChannel} onBack={() => setArchivesOpen(false)} onExpired={onExpired} onBusy={value => { if (live.current) setSending(value); }} /> : manage ? <ChannelSettings key={editingChannel?.id || "new-channel"} channel={editingChannel} onDirty={() => { privateFormDirty.current = true; }} onSaved={savedChannel} onBack={() => changeView(() => setManage(false))} onExpired={onExpired} onBusy={value => { if (live.current) setSending(value); }} /> : channel ? <>
      <header><p className="studio-eyebrow">{channel.category} / {channel.audience}</p><h2 ref={historyHeading} tabIndex={-1}># {channel.name}</h2>{workspace.settings.preferences.unreadBadges && channelPreferences.get(channelId)?.unreadBadges!==false && !!unread[channelId]?.count && <p>{unread[channelId].count} unread messages</p>}<button className="admin-secondary" disabled={sending || busy || !messages.length} onClick={()=>void markRead()}>Mark channel read</button><p className="team-read-help">Clears unread messages up to the newest loaded message. Opening this channel does not mark it read.</p>{readNotice && <p role="status">{readNotice}</p>}{channel.groupId && <p>Private group channel · role access still applies</p>}<p>{channel.description}</p><ChannelPreferences key={channel.id} channelId={channel.id} disabled={sending || busy || olderBusy} onSaved={savedPreference} onExpired={onExpired} onDirty={value=>{privateFormDirty.current=value;}} onBusy={value=>{if(live.current)setSending(value);}} />{workspace.permissions.includes("MANAGE_CHANNELS") && <button className="admin-secondary" disabled={sending || busy || olderBusy} onClick={() => changeView(() => { setProjectsOpen(false);setSettingsOpen(false); setGroupsOpen(false); setEditingChannel(channel); setManage(true); })}>Channel settings</button>}</header>
      <PinnedMessages key={channelId} channelId={channelId} revision={pinRevision} canManage={workspace.permissions.includes("MANAGE_MESSAGES")} disabled={sending || busy || olderBusy} onPin={message=>void togglePin(message)} onExpired={onExpired}/>
      <nav className="team-history-nav" aria-label="Conversation history">{hasOlder && <button className="admin-secondary" disabled={olderBusy || sending || busy} onClick={()=>void older()}>Earlier messages</button>}{!!newerCursors.length && <button className="admin-secondary" disabled={olderBusy || sending || busy} onClick={()=>void historyPage(newerCursors[newerCursors.length-1],"newer")}>Newer messages</button>}{historyBefore!==null && <button className="admin-secondary" disabled={olderBusy || sending || busy} onClick={()=>void historyPage(null,"latest")}>Latest conversation</button>}</nav>{olderBusy && <p role="status">Loading history…</p>}{historyBefore!==null && <p>Viewing earlier history. New arrivals do not move this page; choose Latest conversation to catch up.</p>}<ol className="team-messages" tabIndex={0} aria-label={`${channel.name} messages`}>{messages.map(message => <li key={message.id} className="team-message" data-own={workspace.memberId ? workspace.memberId === message.authorTeamId : workspace.ownerId === message.authorOwnerId}><div className="team-message-meta"><PersonAvatar name={message.author} /><strong>{message.author}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-GB")}</time>{message.editedAt && <small>Edited</small>}{message.pinned && <small>Pinned</small>}</div>{message.replyToId!=null && <blockquote className="team-reply-preview"><strong>{message.replyAuthor || "Original message unavailable"}</strong>{message.replyBody && <p>{message.replyBody}</p>}</blockquote>}<p className="team-message-body">{message.body}</p><div className="team-message-actions" role="group" aria-label={`Actions for message by ${message.author}`}><button id={"message-attachments-"+message.id} type="button" className="admin-text-button" disabled={sending || busy || olderBusy} aria-expanded={attachmentMessage?.id===message.id} aria-controls={attachmentMessage?.id===message.id ? "active-message-attachments" : undefined} onClick={()=>changeView(()=>setAttachmentMessage(message),false)}>Attachments</button><button type="button" className="admin-text-button" disabled={sending || busy || olderBusy} onClick={()=>{setDrafts(value=>({...value,[channelId]:{...value[channelId],body:value[channelId]?.body || "",reply:{id:message.id,author:message.author,body:Array.from(message.body).slice(0,240).join("")}}}));composer.current?.focus();}}>Reply</button>{workspace.permissions.includes("MANAGE_MESSAGES") && <button type="button" className="admin-text-button" disabled={sending || busy || olderBusy} onClick={()=>void togglePin(message)}>{message.pinned ? "Unpin" : "Pin"}</button>}{(workspace.permissions.includes("MANAGE_MESSAGES") || (workspace.memberId ? workspace.memberId === message.authorTeamId : workspace.ownerId === message.authorOwnerId)) && <button className="admin-text-button" disabled={sending || olderBusy} onClick={() => { setEditing(message); setEditBody(message.body); }}>Message actions</button>}</div></li>)}</ol>
      {attachmentMessage && <div id="active-message-attachments"><MessageAttachments key={channelId+":"+attachmentMessage.id} channelId={channelId} messageId={attachmentMessage.id} ownerId={workspace.ownerId} memberId={workspace.memberId} canUpload={workspace.permissions.includes("UPLOAD_FILES") && workspace.permissions.includes("SEND_MESSAGES") && (workspace.memberId ? workspace.memberId===attachmentMessage.authorTeamId : workspace.ownerId===attachmentMessage.authorOwnerId)} canReview={workspace.permissions.includes("REVIEW_UPLOADS")} canRemove={workspace.permissions.includes("EDIT_UPLOADS")} disabled={sending || busy || olderBusy} onExpired={onExpired} onBusy={value=>{if(live.current)setSending(value);}} onDirty={value=>{attachmentDirty.current=value;}} onClose={()=>{const target=attachmentMessage.id;changeView(()=>{const trigger=document.getElementById("message-attachments-"+target);if(trigger)trigger.focus();else historyHeading.current?.focus();},false);}}/></div>}
      {!messages.length && <p>No messages yet. Start the conversation.</p>}
      {editing && <form className="admin-form" onSubmit={event => { event.preventDefault(); void saveEdit(false); }}><label>Edit message<textarea required maxLength={4000} value={editBody} onChange={event => setEditBody(event.target.value)} /></label><p>You can edit your own messages. Moderators and admins can moderate messages in channels they can access.</p><div><button className="admin-secondary" disabled={sending || olderBusy}>Save</button><button type="button" className="admin-secondary" disabled={sending || olderBusy} onClick={() => void saveEdit(true)}>Remove</button><button type="button" className="admin-text-button" disabled={sending || olderBusy} onClick={() => setEditing(null)}>Cancel</button></div></form>}
      <form className="team-composer" onSubmit={event => void send(event)}><MentionPicker key={channelId} channelId={channelId} selected={currentDraft.mentions || []} disabled={sending || busy || olderBusy} onExpired={onExpired} onChange={keys=>setDrafts(value=>({...value,[channelId]:{body:value[channelId]?.body || "",reply:value[channelId]?.reply || null,mentions:keys}}))}/>{currentDraft.reply && <div className="team-reply-selection"><p>Replying to {currentDraft.reply.author}</p><p>{currentDraft.reply.body}</p><button type="button" className="admin-text-button" disabled={sending || busy || olderBusy} onClick={()=>setDrafts(value=>({...value,[channelId]:{...value[channelId],body:value[channelId]?.body || "",reply:null}}))}>Remove reply selection</button></div>}<label htmlFor="team-message">Message #{channel.name}</label><textarea ref={composer} id="team-message" required maxLength={4000} value={currentDraft.body} onChange={event => {const body=event.target.value;setDrafts(value => ({ ...value, [channelId]: {...value[channelId],body,reply:value[channelId]?.reply || null} }));}} placeholder="Write to your team…" /><div className="team-composer-footer"><small>Drafts stay in this tab. Messages refresh while this page is visible.</small><button className="admin-primary" disabled={sending || busy || olderBusy}>{sending ? "Sending…" : "Send message"}</button></div></form>
    </> : <p>No channels are available for your role.</p>}</div>
  </section>;
}
