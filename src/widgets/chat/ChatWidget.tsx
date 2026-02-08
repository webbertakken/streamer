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

const DEFAULT_NAME_COLOUR = "#FFFFFF";

function ChatContent() {
  const msgs = useChatMessages();
  const editMode = useOverlayStore((s) => s.editMode);
  const twitchColours = useOverlayStore((s) => s.twitchColours);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const lineBg = `px-1 w-fit ${editMode ? "" : "bg-black/30 rounded"}`;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 space-y-1 scrollbar-thin">
      {msgs.length === 0 && (
        <p className={`text-white/40 text-sm italic ${lineBg}`}>No messages yet</p>
      )}
      {msgs.map((msg) => (
        <div key={msg.id} className={`text-sm leading-snug ${lineBg}`}>
          <span className="font-bold" style={{ color: twitchColours ? msg.colour : DEFAULT_NAME_COLOUR }}>
            {msg.username}
          </span>
          <span className="text-white/90">: {msg.text}</span>
        </div>
      ))}
    </div>
  );
}

const LONG_HOVER_MS = 500;
const POLL_INTERVAL_MS = 200;

function ChatInputContainer() {
  const [text, setText] = useState("");
  const editMode = useOverlayStore((s) => s.editMode);
  const authenticated = useTwitchStore((s) => s.authenticated);
  const connected = useTwitchStore((s) => s.connected);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverStartRef = useRef<number | null>(null);

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
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  }

  function handleBlur() {
    if (!editMode) invoke("set_ignore_cursor", { ignore: true }).catch(console.error);
  }

  // Poll OS cursor position to detect long hover when cursor events are ignored
  useEffect(() => {
    if (editMode) return;

    const interval = setInterval(async () => {
      if (!containerRef.current || !inputRef.current) return;
      if (document.activeElement === inputRef.current) return;

      try {
        const [cx, cy] = await invoke<[number, number]>("get_cursor_position");
        const rect = containerRef.current.getBoundingClientRect();

        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          if (hoverStartRef.current === null) {
            hoverStartRef.current = Date.now();
          } else if (Date.now() - hoverStartRef.current >= LONG_HOVER_MS) {
            await invoke("set_ignore_cursor", { ignore: false });
            inputRef.current.focus();
            hoverStartRef.current = null;
          }
        } else {
          hoverStartRef.current = null;
        }
      } catch {
        // cursor position unavailable
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      hoverStartRef.current = null;
    };
  }, [editMode]);

  return (
    <div ref={containerRef} className="p-2 pt-0">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="bg-black/30 text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
        style={{ fieldSizing: "content" } as React.CSSProperties}
      />
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
