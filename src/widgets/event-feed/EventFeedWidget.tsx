import { useEffect, useReducer, useRef } from "react";
import { Widget, useContentAlign, contentAlignClass } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { events, listeners, type EventType } from "./event-feed-state";

const eventLabels: Record<EventType, string> = {
  follow: "Followed",
  sub: "Subscribed",
  "gift-sub": "Gifted a sub",
  raid: "Raided",
  bits: "Cheered",
};

const eventColours: Record<EventType, string> = {
  follow: "text-purple-400",
  sub: "text-blue-400",
  "gift-sub": "text-pink-400",
  raid: "text-orange-400",
  bits: "text-yellow-400",
};

function useStreamEvents() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return events;
}

function EventFeedContent({ instanceId }: { instanceId: string }) {
  const evts = useStreamEvents();
  const editMode = useOverlayStore((s) => s.editMode);
  const align = useContentAlign(instanceId);
  const alignCls = contentAlignClass(align);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [evts.length]);

  const lineBg = `px-1 w-fit ${editMode ? "" : "bg-black/30 rounded"}`;

  return (
    <div ref={scrollRef} className={`h-full overflow-y-auto p-2 space-y-1.5 scrollbar-thin flex flex-col ${alignCls}`}>
      {evts.length === 0 && editMode && (
        <p className={`text-white/40 text-sm italic ${lineBg}`}>No events yet</p>
      )}
      {evts.map((evt) => (
        <div key={evt.id} className={`text-sm flex items-baseline gap-1.5 ${lineBg}`}>
          <span className={`font-medium ${eventColours[evt.type]}`}>{eventLabels[evt.type]}</span>
          <span className="text-white font-bold">{evt.username}</span>
          {evt.detail && <span className="text-white/50">{evt.detail}</span>}
        </div>
      ))}
    </div>
  );
}

export function EventFeedWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Event feed">
      <div className="h-full">
        <EventFeedContent instanceId={instanceId} />
      </div>
    </Widget>
  );
}
