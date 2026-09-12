import "server-only";

import { cookies } from "next/headers";
import { creatorCookieName, creatorCookiePath, creatorTokenHash, newCreatorToken } from "./report-ownership";

export function prepareReportCreator(shareId: string, userId: string | undefined) {
  const token = userId ? null : newCreatorToken();
  return {
    fields: {
      owner_id: userId ?? null,
      creator_token_hash: creatorTokenHash(token ?? undefined),
    },
    // Call only after persistence succeeds; failed inserts grant no capability.
    async issueCookie() {
      if (!token) return;
      const store = await cookies();
      store.set(creatorCookieName(shareId), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: creatorCookiePath(shareId),
        maxAge: 30 * 24 * 60 * 60,
      });
    },
  };
}
