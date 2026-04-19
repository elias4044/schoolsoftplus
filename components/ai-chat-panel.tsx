"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiChatPanel({ open, onClose }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hi! I'm your Schoolsoft+ assistant. I can help with your schedule, assignments, grades, lunch menu, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await apiFetch<{ data: string }>("/api/ai", {
        method: "POST",
        body: JSON.stringify({ message: text }) as unknown as BodyInit,
      });
      setMessages(m => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.data,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setMessages(m => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ ${msg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col"
            style={{ background: "var(--surface-1)" }}
          >
            {/* Top accent */}
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 70%), transparent)",
              }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))",
                }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5",
                        msg.role === "assistant"
                          ? "bg-brand-dim"
                          : "bg-white/10"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "assistant"
                          ? "bg-surface-2 text-foreground rounded-tl-sm"
                          : "text-foreground rounded-tr-sm"
                      )}
                      style={
                        msg.role === "user"
                          ? {
                              background:
                                "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))",
                              border: "1px solid oklch(0.65 0.22 278 / 20%)",
                            }
                          : { border: "1px solid oklch(1 0 0 / 6%)" }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand-dim">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div
                      className="rounded-2xl rounded-tl-sm px-4 py-3"
                      style={{ border: "1px solid oklch(1 0 0 / 6%)", background: "var(--surface-2)" }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </motion.div>
                )}
              </div>
              <div ref={endRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); send(); }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything…"
                  className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  style={{
                    background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))",
                  }}
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
