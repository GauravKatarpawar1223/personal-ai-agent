"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { IconMic, IconSend } from "@/components/ui/Icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const [voiceNotice, setVoiceNotice] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  }

  return (
    <div className="border-t border-line bg-paper px-4 py-3 sm:px-6 sm:py-4">
      {voiceNotice && (
        <p className="mb-2 text-xs text-ink-faint">Voice input is coming soon.</p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-2xl border border-line bg-panel px-3 py-2 focus-within:border-accent transition-colors"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Tell me what you need..."
          aria-label="Message the agent"
          className="flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none max-h-32"
        />
        <button
          type="button"
          onClick={() => setVoiceNotice((v) => !v)}
          aria-label="Voice input (coming soon)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink hover:bg-paper transition-colors"
        >
          <IconMic width={18} height={18} />
        </button>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <IconSend width={16} height={16} />
        </button>
      </form>
    </div>
  );
}
