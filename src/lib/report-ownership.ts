import { createHash, randomBytes } from "node:crypto";

export function creatorCookieName(shareId: string) {
  return `confirmationbi-creator-${shareId}`;
}

export function creatorCookiePath(shareId: string) {
  return `/api/validations/${shareId}/publish`;
}

export function creatorTokenHash(token: string | undefined) {
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}

export function newCreatorToken() {
  return randomBytes(32).toString("hex");
}

export function canPublishReport(
  report: { owner_id: string | null; creator_token_hash: string | null },
  userId: string,
  tokenHash: string | null,
) {
  if (report.owner_id) return report.owner_id === userId;
  return Boolean(tokenHash && report.creator_token_hash === tokenHash);
}
