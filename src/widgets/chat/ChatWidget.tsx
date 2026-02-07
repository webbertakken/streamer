import { useRef, useEffect, useReducer, useState } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useTwitchStore } from "../../stores/twitch";
import { sendChatMessage } from "../../twitch/irc";

export interface ChatMessage {
  id: string;
  username: string;
  colour: string;
  text: string;
  timestamp: number;
}

/** Temporary in-memory store until Twitch IRC is connected */
const messages: ChatMessage[] = [];
const listeners = new Set<() => void>();

export function pushChatMessage(msg: ChatMessage) {
  messages.push(msg);
  if (messages.length > 200) messages.splice(0, messages.length - 200);
  listeners.forEach((fn) => fn());
}

export function getChatMessages(): ChatMessage[] {
  return messages;
}

export function loadChatMessages(saved: ChatMessage[]): void {
  messages.length = 0;
  messages.push(...saved);
  listeners.forEach((fn) => fn());
}

/** Subscribe to message changes. Returns an unsubscribe function. */
export function subscribeChatMessages(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function useChatMessages(): ChatMessage[] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return messages;
}

function ChatContent() {
  const msgs = useChatMessages();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-1 scrollbar-thin">
      {msgs.length === 0 && (
        <p className="text-white/40 text-sm italic">No messages yet</p>
      )}
      {msgs.map((msg) => (
        <div key={msg.id} className="text-sm leading-snug">
          <span className="font-bold" style={{ color: msg.colour }}>
            {msg.username}
          </span>
          <span className="text-white/90">: {msg.text}</span>
        </div>
      ))}
    </div>
  );
}

function ChatInput() {
  const [text, setText] = useState("");
  const authenticated = useTwitchStore((s) => s.authenticated);
  const connected = useTwitchStore((s) => s.connected);

  const disabled = !authenticated || !connected;
  const placeholder = !connected
    ? "Not connected"
    : !authenticated
      ? "Log in to chat"
      : "Send a message…";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !disabled && text.trim()) {
      sendChatMessage(text.trim());
      setText("");
    }
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full bg-white/10 text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
    />
  );
}

export function ChatWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Chat">
      <div className="h-full bg-black/50 rounded-lg backdrop-blur-sm flex flex-col">
        <div className="flex-1 min-h-0">
          <ChatContent />
        </div>
        <div className="p-2 pt-0">
          <ChatInput />
        </div>
      </div>
    </Widget>
  );
}
