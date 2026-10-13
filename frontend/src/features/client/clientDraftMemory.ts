export type ClientDraft = { body: string; submission: { body: string; key: string } | null };
export type ClientDraftMemory = { scope: string | null; selected: string; drafts: Record<string, ClientDraft> };
export const emptyClientDraftMemory = (): ClientDraftMemory => ({ scope: null, selected: "", drafts: {} });
