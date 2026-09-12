import type { AgentActionStep, AgentRun } from "@/lib/types";

/**
 * Phase 1 demo runner.
 *
 * This does NOT call a model or a real tool. It produces a plausible
 * sequence of AgentActionStep updates so the UI (AgentAction component)
 * has something real to animate through. Every run is labeled `isDemo:
 * true` so it can never be mistaken for a live tool execution — see
 * AgentAction's "Demo" chip.
 *
 * Replace this with a call into /lib/agent's real runtime once a model
 * provider and at least one connector are wired up server-side.
 */
export function buildDemoSteps(userMessage: string): AgentActionStep[] {
  const topic = userMessage.trim().length > 0 ? userMessage.trim() : "your request";
  const steps: AgentActionStep[] = [
    { id: "understand", label: `Understanding: "${truncate(topic, 48)}"`, status: "pending" },
    { id: "plan", label: "Planning an approach", status: "pending" },
    { id: "tool", label: "Identifying a relevant tool", status: "pending" },
    { id: "done", label: "No connected tools yet — outlining next steps instead", status: "pending" },
  ];
  return steps;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function emptyAgentRun(conversationId: string, userMessage: string): AgentRun {
  return {
    id: `run_${Date.now()}`,
    conversationId,
    status: "understanding",
    steps: buildDemoSteps(userMessage),
    isDemo: true,
  };
}
