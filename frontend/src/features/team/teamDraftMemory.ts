import type { ProjectEditorDraft, ProjectCreationDraft } from "../portfolio/projectApi";
export type { ProjectEditorDraft } from "../portfolio/projectApi";
export type ComposerDraft = {
  body: string;
  reply: { id: number; author: string; body: string } | null;
  mentions?: string[];
};
export type RefundFormDraft={requestId:string;payment:string;amount:string;reason:string;note:string;submission:{signature:string;key:string} | null};
export type TeamDraftMemory = {
  scope: string | null;
  refunds: Record<string,RefundFormDraft>;
  drafts: Record<string, ComposerDraft>;
  submissions: Record<string, { signature: string; key: string }>;
  projects: {selected:string;creation:ProjectCreationDraft | null;drafts:Record<string,ProjectEditorDraft>};
  support: { selected: string; drafts: Record<string, SupportDraft> };
};
export type SupportDraft = {
  message: { body: string; kind: "CLIENT" | "INTERNAL"; submission: { signature: string; key: string } | null } | null;
  tracking: { state: string; progress: number; nextStep: string; assignedMemberId: string; expectedVersion: number } | null;
};
export const hasTeamDrafts = (memory: TeamDraftMemory) => Object.keys(memory.refunds).length>0 || Object.values(memory.drafts).some(draft => !!draft.body.trim() || !!draft.reply || !!draft.mentions?.length) || !!memory.projects.creation || Object.keys(memory.projects.drafts).length>0 || Object.values(memory.support.drafts).some(draft => !!draft.message?.body.trim() || !!draft.tracking);
export const emptyTeamDraftMemory = (): TeamDraftMemory => ({ scope: null, refunds:{}, drafts: {}, submissions: {}, projects:{selected:"",creation:null,drafts:{}}, support: { selected: "", drafts: {} } });
