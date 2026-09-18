"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconMic, IconSend } from "@/components/ui/Icons";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

// Minimal shape of the Web Speech API this component uses. Not every
// browser exposes it (notably Firefox, as of this writing), so it's
// feature-detected at runtime rather than assumed.
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "unsupported" | "denied" | "no-speech" | "error"
  >("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const gotResultRef = useRef(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleVoice() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceState("unsupported");
      return;
    }

    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      return;
    }

    baseTextRef.current = value ? `${value} ` : "";
    gotResultRef.current = false;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) gotResultRef.current = true;
      onChange(`${baseTextRef.current}${transcript}`);
    };
    recognition.onerror = (event: any) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "permission-denied" || code === "service-not-allowed") {
        setVoiceState("denied");
      } else if (code === "no-speech") {
        setVoiceState("no-speech");
      } else {
        setVoiceState("error");
      }
    };
    recognition.onend = () => {
      setVoiceState((current) => {
        // Only fall back to idle if onerror didn't already set a more
        // specific state (onend fires after onerror on most browsers).
        if (current === "listening") {
          return gotResultRef.current ? "idle" : "no-speech";
        }
        return current;
      });
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceState("listening");
    } catch {
      setVoiceState("error");
    }
  }

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
      {voiceState === "listening" && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          Listening — tap the mic again to stop.
        </p>
      )}
      {voiceState === "unsupported" && (
        <p className="mb-2 text-xs text-ink-faint">
          Voice input isn&apos;t supported in this browser yet. Try Chrome or Edge.
        </p>
      )}
      {voiceState === "denied" && (
        <p className="mb-2 text-xs text-danger">
          Microphone access was denied. Allow microphone permission for this site and try again.
        </p>
      )}
      {voiceState === "no-speech" && (
        <p className="mb-2 text-xs text-ink-faint">Didn&apos;t catch anything — tap the mic and try again.</p>
      )}
      {voiceState === "error" && (
        <p className="mb-2 text-xs text-danger">Voice input hit an error — tap the mic to try again.</p>
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
          onClick={toggleVoice}
          aria-pressed={voiceState === "listening"}
          aria-label={voiceState === "listening" ? "Stop voice input" : "Start voice input"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            voiceState === "listening"
              ? "bg-accent-soft text-accent"
              : "text-ink-faint hover:text-ink hover:bg-paper"
          }`}
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
