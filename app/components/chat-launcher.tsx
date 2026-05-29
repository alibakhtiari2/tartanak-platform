"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const quickPrompts = ["پوشک می‌خوام", "لباس نوزاد", "کالسکه", "راهنمای سایز"];

export function ChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "سلام، من مشاور خرید تارتنک هستم. درباره پوشک، لباس نوزاد، کالسکه، مراقبت کودک یا راهنمای سایز بپرسید."
    }
  ]);
  const visitorId = useMemo(
    () => `site-${Math.random().toString(36).slice(2)}`,
    []
  );

  const sendMessage = async (value: string) => {
    const message = value.trim();

    if (!message || isSending) {
      return;
    }

    setInput("");
    setMessages((items) => [...items, { role: "user", text: message }]);
    setIsSending(true);

    try {
      const response = await fetch("/api/site-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId, message })
      });
      const data = (await response.json()) as { reply?: string };

      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data.reply || "پیام رسید، اما پاسخ آماده نشد. دوباره امتحان کنید."
        }
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "ارتباط با چت برقرار نشد. لطفاً چند لحظه دیگر دوباره امتحان کنید."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div
      data-component="ChatLauncher"
      className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3"
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] transition-all duration-300",
          isOpen
            ? "h-[min(620px,calc(100vh-112px))] w-[min(380px,calc(100vw-24px))] opacity-100"
            : "pointer-events-none h-0 w-0 opacity-0"
        )}
      >
        <div className="grid h-full grid-rows-[auto_1fr_auto] bg-[#f8fafc] text-[#0f172a]">
          <header className="flex items-center justify-between border-b border-[#d6dbe1] bg-white px-4 py-3">
            <div>
              <h2 className="font-black">Tartanak</h2>
              <p className="text-xs text-[#64748b]">مشاور خرید کودک</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#e2e8f0] text-[#0f172a]"
              aria-label="بستن چت"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex flex-col gap-3 overflow-y-auto bg-[#eef7f5] p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[86%] whitespace-pre-line rounded-lg border px-3 py-2 text-sm leading-7",
                  message.role === "user"
                    ? "self-end border-[#0f766e] bg-[#0f766e] text-white"
                    : "self-start border-[#d6dbe1] bg-white text-[#0f172a]"
                )}
              >
                {message.text}
              </div>
            ))}
            {isSending ? (
              <div className="self-start rounded-lg border border-[#d6dbe1] bg-white px-3 py-2 text-sm text-[#64748b]">
                در حال پاسخ...
              </div>
            ) : null}
            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-[#b7d7d0] bg-white px-3 py-1.5 text-xs font-bold text-[#0f766e] transition hover:border-[#0f766e]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#d6dbe1] bg-white p-3"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={2}
              placeholder="مثلاً: پوشک سایز ۳ و لباس نوزاد می‌خوام"
              className="resize-none rounded-lg border border-[#d6dbe1] px-3 py-2 text-sm outline-none focus:border-[#0f766e]"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="grid min-h-10 w-12 place-items-center rounded-lg bg-[#0f766e] text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="ارسال پیام"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={cn(
          "grid h-16 w-16 place-items-center rounded-full text-white shadow-[0_16px_44px_rgba(0,0,0,0.26)] transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]",
          isOpen
            ? "bg-[#171717] hover:bg-[#2a2a2a]"
            : "bg-gradient-to-br from-[#0f766e] to-[#111827] hover:scale-105"
        )}
        aria-label={isOpen ? "بستن چت" : "باز کردن چت"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-7 w-7" />
        ) : (
          <MessageCircle className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}
