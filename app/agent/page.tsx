"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatMessage } from "@/components/agent/ChatMessage";
import { ChatInput } from "@/components/agent/ChatInput";
import { AgentAction } from "@/components/agent/AgentAction";
import { EmptyConversationState } from "@/components/agent/EmptyState";
import { ConfirmationCard } from "@/components/agent/ConfirmationCard";
import { buildDemoSteps } from "@/lib/agent/runAgentDemo";
import type { AgentActionStep, Message, PermissionRequestImpact } from "@/lib/types";

const CONVERSATION_ID = "demo-conversation";
const STEP_DELAY_MS = 550;

interface RunState {
  messageId: string;
  steps: AgentActionStep[];
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

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, run]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: makeId("msg"),
      conversationId: CONVERSATION_ID,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const steps = buildDemoSteps(trimmed);
    const runMessageId = makeId("msg");
    setRun({ messageId: runMessageId, steps });

    progressSteps(runMessageId, steps, trimmed);
  }

  function progressSteps(runMessageId: string, steps: AgentActionStep[], originalText: string) {
    steps.forEach((_, index) => {
      const t = setTimeout(() => {
        setRun((prev) => {
          if (!prev || prev.messageId !== runMessageId) return prev;
          const updated = prev.steps.map((s, i) => {
            if (i < index) return { ...s, status: "done" as const };
            if (i === index) return { ...s, status: "active" as const };
            return s;
          });
          return { ...prev, steps: updated };
        });
      }, index * STEP_DELAY_MS);
      timers.current.push(t);
    });

    const finalDelay = steps.length * STEP_DELAY_MS + 300;
    const finalTimer = setTimeout(() => {
      setRun((prev) => {
        if (!prev || prev.messageId !== runMessageId) return prev;
        return { ...prev, steps: prev.steps.map((s) => ({ ...s, status: "done" as const })) };
      });

      const agentMessage: Message = {
        id: runMessageId,
        conversationId: CONVERSATION_ID,
        role: "agent",
        content: buildAgentReply(originalText),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, agentMessage]);
      setRun(null);

      if (mentionsSensitiveAction(originalText)) {
        setConfirmation({
          messageId: runMessageId,
          description: "Send a follow-up email about this to your team?",
          impact: "send_message",
          details: {
            to: "team@example.com",
            subject: "Following up",
            note: "Demo only — no email will actually be sent.",
          },
          resolved: false,
        });
      }
    }, finalDelay);
    timers.current.push(finalTimer);
  }

  function resolveConfirmation(approved: boolean) {
    setConfirmation((prev) => (prev ? { ...prev, resolved: true, approved } : prev));
  }

  return (
    <AppShell>
      <div className="flex h-screen flex-col md:h-screen">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-medium text-ink">Agent workspace</p>
            <p className="text-xs text-ink-faint">Phase 1 demo — no tools connected yet</p>
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
                  <AgentAction steps={run.steps} />
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
    </AppShell>
  );
}

function mentionsSensitiveAction(text: string): boolean {
  const lower = text.toLowerCase();
  return ["email", "send", "message"].some((k) => lower.includes(k));
}

function buildAgentReply(originalText: string): string {
  const lower = originalText.toLowerCase();
  if (lower.includes("email") || lower.includes("send")) {
    return "I don't have Gmail connected yet, so I can't send anything. Once you connect it, I can draft the message and wait for your approval before sending.";
  }
  if (lower.includes("calendar") || lower.includes("schedule") || lower.includes("plan my day")) {
    return "I don't have Google Calendar connected yet, so I can't check your schedule. Connect it from the Connections page and I'll be able to find time and plan around it.";
  }
  if (lower.includes("task")) {
    return "I don't have Google Tasks connected yet. Once it's connected, I can create and track tasks for you here.";
  }
  if (lower.includes("research") || lower.includes("find")) {
    return "Web research isn't connected yet in this preview. Once the Browser tool is available, I'll be able to look this up and summarize what I find.";
  }
  return "I don't have any tools connected yet, so I can't act on this directly. Visit Connections to see what's available, or keep talking this through with me here.";
}
