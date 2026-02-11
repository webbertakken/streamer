import { useEffect, useState, useCallback } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { subscribe, type ChannelEvent } from "../../events/bus";

export interface RaidAlert {
  id: string;
  fromUsername: string;
  viewerCount: number;
}

const alertQueue: RaidAlert[] = [];
const listeners = new Set<() => void>();

/** Queue a raid alert to be displayed */
export function pushRaidAlert(fromUsername: string, viewerCount: number) {
  alertQueue.push({ id: crypto.randomUUID(), fromUsername, viewerCount });
  listeners.forEach((fn) => fn());
}

function RaidAlertContent() {
  const [current, setCurrent] = useState<RaidAlert | null>(null);

  const showNext = useCallback(() => {
    const next = alertQueue.shift();
    if (next) {
      setCurrent(next);
      setTimeout(() => setCurrent(null), 4000);
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (!current && alertQueue.length > 0) showNext();
    };
    listeners.add(check);
    return () => { listeners.delete(check); };
  }, [current, showNext]);

  useEffect(() => {
    return subscribe((event: ChannelEvent) => {
      if (event.type !== "raid") return;
      pushRaidAlert(
        event.data.from_broadcaster_user_name as string,
        event.data.viewers as number,
      );
    });
  }, []);

  if (!current) return <div className="h-full" />;

  return (
    <div className="h-full flex items-center justify-center">
      <div
        key={current.id}
        className="bg-gradient-to-r from-orange-600/80 to-red-500/80 backdrop-blur-sm rounded-xl px-6 py-4 text-center animate-[alertIn_0.5s_ease-out]"
      >
        <div className="text-white/80 text-sm font-medium">Raid!</div>
        <div className="text-white text-xl font-bold mt-1">{current.fromUsername}</div>
        <div className="text-white/70 text-sm mt-0.5">{current.viewerCount} viewers</div>
      </div>
    </div>
  );
}

export function RaidAlertWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Raid alerts">
      <RaidAlertContent />
    </Widget>
  );
}
