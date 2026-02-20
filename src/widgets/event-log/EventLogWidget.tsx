import { useEffect, useReducer, useRef } from "react";
import { Widget, useContentAlign, contentAlignClass } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import type { ChannelEvent, ChannelEventType } from "../../events/bus";
import { entries, listeners, ensureSubscribed } from "./event-log-state";

function useEventLog() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    ensureSubscribed();
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return entries;
}

const badgeColours: Record<ChannelEventType, string> = {
  chat: "bg-blue-500",
  join: "bg-teal-600",
  part: "bg-gray-500",
  follow: "bg-green-500",
  raid: "bg-purple-500",
  subscribe: "bg-yellow-500",
  gift_sub: "bg-yellow-600",
  cheer: "bg-pink-500",
  ban: "bg-red-600",
  unban: "bg-orange-500",
  stream_online: "bg-green-600",
  stream_offline: "bg-red-500",
  channel_update: "bg-indigo-500",
  follower_count_update: "bg-emerald-500",
  viewer_count_update: "bg-sky-500",
  channel_points_redemption: "bg-amber-500",
};

function summarise(event: ChannelEvent): string {
  const d = event.data;
  switch (event.type) {
    case "chat":
      return `${d.username}: ${d.text}`;
    case "join":
      return `${d.username} joined`;
    case "part":
      return `${d.username} left`;
    case "follow":
      return `${d.user_name || d.username} followed`;
    case "raid":
      return `Raided by ${d.from_broadcaster_user_name || d.username} (${d.viewers ?? "?"} viewers)`;
    case "subscribe":
      return `${d.user_name || d.username} subscribed`;
    case "gift_sub":
      return `${d.user_name || d.username} gifted ${d.total ?? 1} sub(s)`;
    case "cheer":
      return `${d.user_name || d.username} cheered ${d.bits ?? "?"} bits`;
    case "ban":
      return `${d.user_name || d.username} was banned`;
    case "unban":
      return `${d.user_name || d.username} was unbanned`;
    case "stream_online":
      return "Stream went live";
    case "stream_offline":
      return "Stream ended";
    case "channel_update":
      return `Channel updated: ${d.title || ""}`;
    case "follower_count_update":
      return `Follower count: ${d.total}`;
    case "viewer_count_update":
      return `Viewer count: ${d.count}`;
    case "channel_points_redemption":
      return `${d.user_name || d.username || "Someone"} redeemed ${(d.reward as Record<string, unknown>)?.title || "a reward"}`;
    default:
      return JSON.stringify(d);
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EventLogContent({ instanceId }: { instanceId: string }) {
  const log = useEventLog();
  const editMode = useOverlayStore((s) => s.editMode);
  const textBgOpacity = useOverlayStore((s) => s.textBgOpacity);
  const align = useContentAlign(instanceId);
  const alignCls = contentAlignClass(align);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);

  const lineBg = "px-1 w-fit";
  const lineBgStyle = editMode ? undefined : { backgroundColor: `rgba(0, 0, 0, ${textBgOpacity / 100})`, borderRadius: "0.25rem" };

  if (log.length === 0) {
    if (!editMode) return null;
    return <p className={`text-white/40 text-sm italic p-2 ${lineBg}`} style={lineBgStyle}>No events yet</p>;
  }

  return (
    <div ref={scrollRef} className={`h-full overflow-y-auto p-2 space-y-0.5 scrollbar-thin flex flex-col ${alignCls}`}>
      {log.map((entry) => (
        <div key={entry.id} className={`text-xs leading-snug flex items-start gap-1.5 ${lineBg}`} style={lineBgStyle}>
          <span className="text-white/30 shrink-0">{formatTime(entry.event.timestamp)}</span>
          <span
            className={`${badgeColours[entry.event.type]} text-white px-1 rounded text-[10px] uppercase shrink-0`}
          >
            {entry.event.type.replace(/_/g, " ")}
          </span>
          <span className="text-white/80 truncate">{summarise(entry.event)}</span>
        </div>
      ))}
    </div>
  );
}

export function EventLogWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Event log">
      <div className="h-full">
        <EventLogContent instanceId={instanceId} />
      </div>
    </Widget>
  );
}
