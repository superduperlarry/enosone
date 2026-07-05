import type { AgentOsService } from "@enos/agentos-client";
import { MockAgentOs } from "./mock";

/**
 * The integration seam. ENOS_BACKEND selects the money-ops backend:
 *  - mock    — local Phase A implementation (default)
 *  - agentos — the real /v1 sandbox (wired in milestone 6)
 * Callers pass the authenticated owner; UI code never knows which backend.
 */
export function getAgentOs(userId: string): AgentOsService {
  const backend = process.env.ENOS_BACKEND ?? "mock";
  switch (backend) {
    case "mock":
      return new MockAgentOs(userId);
    case "agentos":
      throw new Error(
        "ENOS_BACKEND=agentos lands in milestone 6 (sandbox wiring).",
      );
    default:
      throw new Error(`Unknown ENOS_BACKEND: ${backend}`);
  }
}
