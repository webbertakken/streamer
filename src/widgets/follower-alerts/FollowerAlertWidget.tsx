import { useEffect, useState, useCallback } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";

export interface FollowerAlert {
  id: string;
  username: string;
}

const alertQueue: FollowerAlert[] = [];
const listeners = new Set<() => void>();

/** Queue a follower alert to be displayed */
export function pushFollowerAlert(username: string) {
  alertQueue.push({ id: crypto.randomUUID(), username });
  listeners.forEach((fn) => fn());
}

function FollowerAlertContent() {
  const [current, setCurrent] = useState<FollowerAlert | null>(null);

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

  if (!current) return <div className="h-full" />;

  return (
    <div className="h-full flex items-center justify-center">
      <div
        key={current.id}
        className="bg-gradient-to-r from-purple-600/80 to-pink-500/80 backdrop-blur-sm rounded-xl px-6 py-4 text-center animate-[alertIn_0.5s_ease-out]"
      >
        <div className="text-white/80 text-sm font-medium">New follower!</div>
        <div className="text-white text-xl font-bold mt-1">{current.username}</div>
      </div>
    </div>
  );
}

export function FollowerAlertWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Follower alerts">
      <FollowerAlertContent />
    </Widget>
  );
}
