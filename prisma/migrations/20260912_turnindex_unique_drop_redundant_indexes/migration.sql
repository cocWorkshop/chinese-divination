-- Audit P2 + P13
-- P2: turnIndex uniqueness. Verified before applying: zero duplicate
-- (userId, sessionId, turnIndex) groups exist in the dev database. The
-- plain index is replaced by the unique constraint (same prefix).
CREATE UNIQUE INDEX "MasterChatMessage_userId_sessionId_turnIndex_key"
ON "MasterChatMessage"("userId", "sessionId", "turnIndex");

DROP INDEX "MasterChatMessage_userId_sessionId_turnIndex_idx";

-- P13: drop redundant indexes that duplicate @unique-backed access paths.
DROP INDEX "RateLimit_userId_windowStart_idx";
DROP INDEX "GiftLink_code_idx";
DROP INDEX "Compensation_token_idx";
DROP INDEX "MasterSession_userId_idx";
