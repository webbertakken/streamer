import { useRef, useEffect, useReducer } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";

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

export function ChatWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Chat">
      <div className="h-full bg-black/50 rounded-lg backdrop-blur-sm">
        <ChatContent />
      </div>
    </Widget>
  );
}
