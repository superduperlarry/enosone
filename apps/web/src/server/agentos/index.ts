import { createAgentOsHttp, type AgentOsService } from "@enos/agentos-client";
import { MockAgentOs } from "./mock";

/**
 * The integration seam. ENOS_BACKEND selects the money-ops backend:
 *  - mock    — local Phase A implementation (default)
 *  - agentos — the real /v1 sandbox over HTTPS (owner-key scoped)
 * Callers pass the authenticated owner; UI code never knows which backend.
 */
export function getAgentOs(userId: string): AgentOsService {
  const backend = process.env.ENOS_BACKEND ?? "mock";
  switch (backend) {
    case "mock":
      return new MockAgentOs(userId);
    case "agentos": {
      const ownerKey = process.env.AGENTOS_OWNER_KEY;
      if (!ownerKey) {
        throw new Error("ENOS_BACKEND=agentos requires AGENTOS_OWNER_KEY");
      }
      return createAgentOsHttp({
        baseUrl:
          process.env.AGENTOS_BASE_URL ??
          "https://sandbox.api.enosone.com/v1",
        ownerKey,
      });
    }
    default:
      throw new Error(`Unknown ENOS_BACKEND: ${backend}`);
  }
}
