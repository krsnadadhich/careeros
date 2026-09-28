"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant, type AssistantTurn } from "@/features/assistant/actions";

const SUGGESTIONS = [
  "Which jobs should I apply to today?",
  "What happened in my inbox today?",
  "Do I have any interview deadlines?",
  "What skills should I learn?",
];

interface ThreadMessage {
  role: "user" | "assistant";
  text: string;
}

export function AskAiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function ask(question: string) {
    if (!question.trim()) return;
    const nextThread = [...thread, { role: "user" as const, text: question }];
    setThread(nextThread);
    setInput("");
    startTransition(async () => {
      const history: AssistantTurn[] = nextThread.map((m) => ({ role: m.role, content: m.text }));
      const answer = await askAssistant(history);
      setThread((t) => [...t, { role: "assistant", text: answer }]);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-70 flex w-[340px] flex-col border-l border-line-strong bg-surface-1 shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <span className="text-sm font-semibold">✦ CareerOS Assistant</span>
        <button onClick={onClose} aria-label="Close" className="text-text3 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
        {thread.length === 0 && (
          <p className="text-xs text-text3">
            Ask me anything about your job search, or try a suggestion below.
          </p>
        )}
        {thread.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-2.5 py-2 text-[12.5px] leading-relaxed",
              m.role === "user"
                ? "self-end bg-brand-dim text-foreground"
                : "self-start bg-surface-2 text-text2"
            )}
          >
            {m.text}
          </div>
        ))}
        {isPending && (
          <div className="self-start rounded-lg bg-surface-2 px-2.5 py-2 text-[12.5px] text-text3">
            Thinking…
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line px-4 py-3">
        {thread.length === 0 &&
          SUGGESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-md border border-line px-2.5 py-1.5 text-left text-xs text-text2 hover:bg-surface-2"
            >
              {q}
            </button>
          ))}
        <form
          className="mt-1 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" className="h-8" disabled={isPending}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
