import { useRef, useEffect, useReducer, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Widget, useContentAlign, contentAlignClass } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { sendChatMessage, defaultColourForUsername } from "../../twitch/irc";
import { messages, listeners, messageOpacity } from "./chat-state";
import type { ChatEmote } from "./chat-state";
import { getBadgeUrl } from "../../twitch/badges";

function useChatMessages() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return messages;
}

const DEFAULT_NAME_COLOUR = "#FFFFFF";
const EMOTE_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

export type MessageFragment =
  | { type: "text"; text: string }
  | { type: "emote"; id: string; name: string };

/** Split message text into text and emote fragments based on parsed emote positions. */
export function splitMessageFragments(text: string, emotes?: ChatEmote[]): MessageFragment[] {
  if (!emotes || emotes.length === 0) return [{ type: "text", text }];

  const sorted = [...emotes].sort((a, b) => a.start - b.start);
  const fragments: MessageFragment[] = [];
  let cursor = 0;

  for (const emote of sorted) {
    if (emote.start > cursor) {
      fragments.push({ type: "text", text: text.slice(cursor, emote.start) });
    }
    fragments.push({ type: "emote", id: emote.id, name: text.slice(emote.start, emote.end + 1) });
    cursor = emote.end + 1;
  }

  if (cursor < text.length) {
    fragments.push({ type: "text", text: text.slice(cursor) });
  }

  return fragments;
}

function MessageText({ text, emotes }: { text: string; emotes?: ChatEmote[] }) {
  const fragments = splitMessageFragments(text, emotes);

  return (
    <span className="text-white/90">
      {": "}
      {fragments.map((frag, i) =>
        frag.type === "text" ? (
          <span key={i}>{frag.text}</span>
        ) : (
          <img
            key={i}
            src={`${EMOTE_CDN}/${frag.id}/default/dark/1.0`}
            alt={frag.name}
            className="inline-block align-middle"
            style={{ height: "1.5em" }}
          />
        ),
      )}
    </span>
  );
}

function ChatContent({ instanceId }: { instanceId: string }) {
  const msgs = useChatMessages();
  const editMode = useOverlayStore((s) => s.editMode);
  const twitchColours = useOverlayStore((s) => s.twitchColours);
  const borderRadius = useOverlayStore((s) => s.borderRadius);
  const textBgOpacity = useOverlayStore((s) => s.textBgOpacity);
  const align = useContentAlign(instanceId);
  const alignCls = contentAlignClass(align);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  // Tick every second so opacity values update as messages age
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const lineBg = "px-1 w-fit";
  const lineBgStyle = editMode ? undefined : { backgroundColor: `rgba(0, 0, 0, ${textBgOpacity / 100})` };

  return (
    <div ref={scrollRef} className={`h-full overflow-y-auto p-2 space-y-1 scrollbar-thin flex flex-col ${alignCls}`}>
      {msgs.length === 0 && editMode && (
        <div className={`text-white/40 text-sm italic ${lineBg}`} style={{ ...lineBgStyle, borderRadius: editMode ? undefined : borderRadius }}>No messages yet</div>
      )}
      {msgs.map((msg) => (
        <div
          key={msg.id}
          className={`text-sm leading-snug ${lineBg}`}
          style={{ ...lineBgStyle, opacity: messageOpacity(msg.timestamp, now), transition: "opacity 1s linear", borderRadius: editMode ? undefined : borderRadius }}
        >
          {msg.badges?.map((b) => {
            const url = getBadgeUrl(b.setId, b.versionId);
            return url ? (
              <img
                key={`${b.setId}-${b.versionId}`}
                src={url}
                alt={b.setId}
                className="inline-block align-middle mr-0.5"
                width={18}
                height={18}
              />
            ) : null;
          })}
          <span className="font-bold" style={{ color: twitchColours ? (msg.colour || defaultColourForUsername(msg.username)) : DEFAULT_NAME_COLOUR }}>
            {msg.username}
          </span>
          <MessageText text={msg.text} emotes={msg.emotes} />
        </div>
      ))}
    </div>
  );
}

const LONG_HOVER_MS = 500;
const POLL_INTERVAL_MS = 200;

function ChatInputContainer({ instanceId }: { instanceId: string }) {
  const [text, setText] = useState("");
  const editMode = useOverlayStore((s) => s.editMode);
  const textBgOpacity = useOverlayStore((s) => s.textBgOpacity);
  const authenticated = useTwitchStore((s) => s.authenticated);
  const connected = useTwitchStore((s) => s.connected);
  const align = useContentAlign(instanceId);
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
    <div ref={containerRef} className={`p-2 pt-0 min-w-0 ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="max-w-full text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40"
        style={{ backgroundColor: `rgba(0, 0, 0, ${textBgOpacity / 100})`, fieldSizing: "content" } as React.CSSProperties}
      />
    </div>
  );
}

export function ChatWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Chat">
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <ChatContent instanceId={instanceId} />
        </div>
        <ChatInputContainer instanceId={instanceId} />
      </div>
    </Widget>
  );
}
