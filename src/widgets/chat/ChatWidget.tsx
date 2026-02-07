import { useRef, useEffect, useReducer, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
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
  const editMode = useOverlayStore((s) => s.editMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const lineBg = editMode ? "" : "bg-black/60 rounded px-1";

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-1 scrollbar-thin">
      {msgs.length === 0 && (
        <p className={`text-white/40 text-sm italic ${lineBg}`}>No messages yet</p>
      )}
      {msgs.map((msg) => (
        <div key={msg.id} className={`text-sm leading-snug ${lineBg}`}>
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
  const editMode = useOverlayStore((s) => s.editMode);
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

  function handleFocus() {
    if (!editMode) invoke("set_ignore_cursor", { ignore: false }).catch(console.error);
  }

  function handleBlur() {
    if (!editMode) invoke("set_ignore_cursor", { ignore: true }).catch(console.error);
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full bg-white/10 text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
    />
  );
}

function ChatInputContainer() {
  const editMode = useOverlayStore((s) => s.editMode);

  function handleMouseEnter() {
    if (!editMode) invoke("set_ignore_cursor", { ignore: false }).catch(console.error);
  }

  function handleMouseLeave() {
    if (!editMode) invoke("set_ignore_cursor", { ignore: true }).catch(console.error);
  }

  return (
    <div className="p-2 pt-0" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <ChatInput />
    </div>
  );
}

export function ChatWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Chat">
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <ChatContent />
        </div>
        <ChatInputContainer />
      </div>
    </Widget>
  );
}
