import { useEffect, useState, useCallback } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { subscribe, type ChannelEvent } from "../../events/bus";

export interface SubAlert {
  id: string;
  username: string;
  tier: string;
  isGift: boolean;
  gifterUsername?: string;
  message?: string;
}

const alertQueue: SubAlert[] = [];
const listeners = new Set<() => void>();

/** Queue a subscription alert to be displayed */
export function pushSubAlert(alert: Omit<SubAlert, "id">) {
  alertQueue.push({ ...alert, id: crypto.randomUUID() });
  listeners.forEach((fn) => fn());
}

/** Map Twitch tier codes to display labels */
function tierLabel(tier: string): string {
  switch (tier) {
    case "1000": return "Tier 1";
    case "2000": return "Tier 2";
    case "3000": return "Tier 3";
    default: return tier;
  }
}

function SubAlertContent() {
  const [current, setCurrent] = useState<SubAlert | null>(null);

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
      if (event.type === "subscribe") {
        pushSubAlert({
          username: event.data.user_name as string,
          tier: event.data.tier as string,
          isGift: event.data.is_gift as boolean,
          message: (event.data.message as Record<string, unknown> | undefined)?.text as string | undefined,
        });
      } else if (event.type === "gift_sub") {
        pushSubAlert({
          username: event.data.user_name as string,
          tier: event.data.tier as string,
          isGift: true,
          gifterUsername: event.data.gifter_user_name as string,
        });
      }
    });
  }, []);

  if (!current) return <div className="h-full" />;

  return (
    <div className="h-full flex items-center justify-center">
      <div
        key={current.id}
        className="bg-gradient-to-r from-blue-600/80 to-cyan-500/80 backdrop-blur-sm rounded-xl px-6 py-4 text-center animate-[alertIn_0.5s_ease-out]"
      >
        <div className="text-white/80 text-sm font-medium">
          {current.isGift ? "Gift sub!" : "New subscriber!"}
        </div>
        <div className="text-white text-xl font-bold mt-1">{current.username}</div>
        <div className="text-white/70 text-sm mt-0.5">
          {tierLabel(current.tier)}
          {current.isGift && current.gifterUsername && ` — gifted by ${current.gifterUsername}`}
        </div>
        {current.message && (
          <div className="text-white/60 text-xs mt-1 italic">{current.message}</div>
        )}
      </div>
    </div>
  );
}

export function SubAlertWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Subscription alerts">
      <SubAlertContent />
    </Widget>
  );
}
