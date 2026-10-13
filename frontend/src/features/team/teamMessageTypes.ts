export type TeamMessage = {
  id: number;
  author: string;
  authorOwnerId: string | null;
  authorTeamId: string | null;
  body: string;
  version: number;
  createdAt: string;
  editedAt: string | null;
  replyToId: number | null;
  replyAuthor: string | null;
  replyBody: string | null;
  pinned: boolean;
};
