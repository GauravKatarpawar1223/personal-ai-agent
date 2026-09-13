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
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
  resolved: boolean;
  approved?: boolean;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ChatApiSuccess {
  conversationId: string;
  message: { id: string; conversationId: string; role: "agent"; content: string; createdAt: string };
  usedWebSearch: boolean;
}

interface ChatApiError {
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

    const runId = makeId("run");
    setRun({
      messageId: runId,
      steps: [{ id: "send", label: "Sending your message", status: "active" }],
    });

    let response: Response;
    try {
      response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
    } catch {
      setRun({
        messageId: runId,
        steps: [{ id: "send", label: "Couldn't reach the server — check your connection.", status: "failed" }],
        failed: true,
      });
      return;
    }

    const payload = (await response.json().catch(() => null)) as ChatApiSuccess | ChatApiError | null;

    if (!response.ok || !payload || "error" in payload) {
      const message = payload && "error" in payload ? payload.error : `Something went wrong (${response.status}).`;
      setRun({
        messageId: runId,
        steps: [
          { id: "send", label: "Sending your message", status: "done" },
          { id: "fail", label: message, status: "failed" },
        ],
        failed: true,
      });
      return;
    }

    const steps: AgentActionStep[] = [{ id: "send", label: "Sending your message", status: "done" }];
    if (payload.usedWebSearch) {
      steps.push({ id: "search", label: "Searched the web", status: "done" });
    }
    steps.push({ id: "reply", label: "Response ready", status: "done" });
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

    if (mentionsSensitiveAction(trimmed)) {
      setConfirmation({
        messageId: agentMessage.id,
        description: "Send a follow-up email about this to your team?",
        impact: "send_message",
        details: {
          to: "team@example.com",
          subject: "Following up",
          note: "Demo only — Gmail isn't connected, so nothing will actually be sent.",
        },
        resolved: false,
      });
    }
  }

  function resolveConfirmation(approved: boolean) {
    setConfirmation((prev) => (prev ? { ...prev, resolved: true, approved } : prev));
  }

  return (
    <div className="flex h-screen flex-col md:h-screen">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-medium text-ink">Agent workspace</p>
          <p className="text-xs text-ink-faint">Real AI, with web search as its only connected tool</p>
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
                      description={confirmation.description}
                      impact={confirmation.impact}
                      details={confirmation.details}
                      resolved={confirmation.resolved}
                      approved={confirmation.approved}
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

function mentionsSensitiveAction(text: string): boolean {
  const lower = text.toLowerCase();
  return ["email", "send", "message"].some((k) => lower.includes(k));
}
