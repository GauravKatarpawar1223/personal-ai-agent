"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/agent/ChatMessage";
import { ChatInput } from "@/components/agent/ChatInput";
import { AgentAction } from "@/components/agent/AgentAction";
import { EmptyConversationState } from "@/components/agent/EmptyState";
import { ConfirmationCard } from "@/components/agent/ConfirmationCard";
import type { AgentActionStep, Message, PermissionRequestImpact } from "@/lib/types";

interface RunState {
  messageId: string;
  steps: AgentActionStep[];
  failed?: boolean;
}

interface ConfirmationState {
  messageId: string;
  permissionRequestId: string;
  title: string;
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
  resolved: boolean;
  approved?: boolean;
  resultMessage?: string;
  pending?: boolean;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ApiMessage {
  id: string;
  conversationId: string;
  role: "agent";
  content: string;
  createdAt: string;
}

interface ConfirmationPayload {
  permissionRequestId: string;
  title: string;
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
}

interface CommandApiSuccess {
  conversationId: string;
  message: ApiMessage;
  confirmation?: ConfirmationPayload;
}

interface ConfirmApiSuccess {
  conversationId?: string;
  message?: ApiMessage;
  outcome: { approved: boolean; resultMessage: string };
}

interface ApiError {
  error: string;
}

export function AgentWorkspace({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId?: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
  }, [initialConversationId, initialMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, run]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || run) return;

    const userMessage: Message = {
      id: makeId("msg"),
      conversationId: conversationId ?? "pending",
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setConfirmation(null);

    const runId = makeId("run");
    setRun({
      messageId: runId,
      steps: [{ id: "parse", label: "Reading your command", status: "active" }],
    });

    let response: Response;
    try {
      response = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
    } catch {
      setRun({
        messageId: runId,
        steps: [{ id: "parse", label: "Couldn't reach the server — check your connection.", status: "failed" }],
        failed: true,
      });
      return;
    }

    const payload = (await response.json().catch(() => null)) as CommandApiSuccess | ApiError | null;

    if (!response.ok || !payload || "error" in payload) {
      const message = payload && "error" in payload ? payload.error : `Something went wrong (${response.status}).`;
      setRun({
        messageId: runId,
        steps: [
          { id: "parse", label: "Reading your command", status: "done" },
          { id: "fail", label: message, status: "failed" },
        ],
        failed: true,
      });
      return;
    }

    const steps: AgentActionStep[] = [{ id: "parse", label: "Reading your command", status: "done" }];
    steps.push({
      id: "act",
      label: payload.confirmation ? "Prepared — waiting for your approval" : "Done",
      status: "done",
    });
    setRun({ messageId: runId, steps });

    if (!conversationId) {
      setConversationId(payload.conversationId);
      router.replace(`/agent?c=${payload.conversationId}`, { scroll: false });
    }

    const agentMessage: Message = {
      id: payload.message.id,
      conversationId: payload.conversationId,
      role: "agent",
      content: payload.message.content,
      createdAt: payload.message.createdAt,
    };
    setMessages((prev) => [...prev, agentMessage]);
    setRun(null);

    if (payload.confirmation) {
      setConfirmation({
        messageId: agentMessage.id,
        permissionRequestId: payload.confirmation.permissionRequestId,
        title: payload.confirmation.title,
        description: payload.confirmation.description,
        impact: payload.confirmation.impact,
        details: payload.confirmation.details,
        resolved: false,
      });
    }
  }

  async function resolveConfirmation(approved: boolean) {
    if (!confirmation || confirmation.pending) return;
    const permissionRequestId = confirmation.permissionRequestId;
    setConfirmation((prev) => (prev ? { ...prev, pending: true } : prev));

    let response: Response;
    try {
      response = await fetch("/api/agent/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissionRequestId, approved }),
      });
    } catch {
      setConfirmation((prev) =>
        prev
          ? { ...prev, pending: false, resolved: true, approved, resultMessage: "Couldn't reach the server." }
          : prev
      );
      return;
    }

    const payload = (await response.json().catch(() => null)) as ConfirmApiSuccess | ApiError | null;

    if (!response.ok || !payload || "error" in payload) {
      const message = payload && "error" in payload ? payload.error : "Something went wrong.";
      setConfirmation((prev) => (prev ? { ...prev, pending: false, resolved: true, approved, resultMessage: message } : prev));
      return;
    }

    setConfirmation((prev) =>
      prev
        ? { ...prev, pending: false, resolved: true, approved, resultMessage: payload.outcome.resultMessage }
        : prev
    );

    if (payload.message) {
      const resultMessage: Message = {
        id: payload.message.id,
        conversationId: payload.message.conversationId,
        role: "agent",
        content: payload.message.content,
        createdAt: payload.message.createdAt,
      };
      setMessages((prev) => [...prev, resultMessage]);
    }
  }

  return (
    <div className="flex h-screen flex-col md:h-screen">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-medium text-ink">Agent workspace</p>
          <p className="text-xs text-ink-faint">
            Deterministic commands — calendar, calculator, date/time, messaging. No AI in this phase.
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !run ? (
          <EmptyConversationState onSelectQuickAction={(text) => sendMessage(text)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <ChatMessage message={message} />
                {confirmation?.messageId === message.id && (
                  <div className="pl-9">
                    <ConfirmationCard
                      title={confirmation.title}
                      description={confirmation.description}
                      impact={confirmation.impact}
                      details={confirmation.details}
                      resolved={confirmation.resolved}
                      approved={confirmation.approved}
                      resultMessage={confirmation.resultMessage}
                      onApprove={() => resolveConfirmation(true)}
                      onCancel={() => resolveConfirmation(false)}
                    />
                  </div>
                )}
              </div>
            ))}
            {run && (
              <div className="pl-9">
                <AgentAction steps={run.steps} isDemo={false} />
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage(input)}
        disabled={Boolean(run)}
      />
    </div>
  );
}
