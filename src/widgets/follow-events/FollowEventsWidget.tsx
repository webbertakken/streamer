import { useEffect, useReducer } from "react";
import { Widget, useContentAlign, contentAlignClass } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { follows, listeners, ensureSubscribed } from "./follow-events-state";

function useFollows() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    ensureSubscribed();
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);
  return follows;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FollowEventsContent({ instanceId }: { instanceId: string }) {
  const entries = useFollows();
  const editMode = useOverlayStore((s) => s.editMode);
  const align = useContentAlign(instanceId);
  const alignCls = contentAlignClass(align);
  const lineBg = `px-1 w-fit ${editMode ? "" : "bg-black/30 rounded"}`;

  if (entries.length === 0) {
    if (!editMode) return null;
    return <p className={`text-white/40 text-sm italic p-2 ${lineBg}`}>No follows yet</p>;
  }

  return (
    <div className={`h-full overflow-y-auto p-2 space-y-1 scrollbar-thin flex flex-col ${alignCls}`}>
      {entries.map((f) => (
        <div key={f.id} className={`text-sm leading-snug ${lineBg}`}>
          <span className="text-white/40 text-xs mr-1">{formatTime(f.timestamp)}</span>
          <span className="text-green-400 font-medium">{f.username}</span>
          <span className="text-white/60"> followed</span>
        </div>
      ))}
    </div>
  );
}

export function FollowEventsWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Follow events">
      <div className="h-full">
        <FollowEventsContent instanceId={instanceId} />
      </div>
    </Widget>
  );
}
