"use client";

import { useRef, useState } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What's our total AUM right now?",
  "Which investments mature in the next 90 days?",
  "What payouts are due in the next 14 days?",
  "Are there any overdue payouts?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error ?? "Something went wrong."}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Could not reach the assistant." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden">
      <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-foreground">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-medium">Ask about the portfolio</p>
              <p className="text-sm text-muted-foreground">AUM, upcoming payouts, maturities, client positions.</p>
            </div>
            <div className="grid max-w-md gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-2 text-left" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-brand-gold/15 text-brand-gold-foreground"
              )}
            >
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-foreground">
              <Bot className="size-4" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the portfolio..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
