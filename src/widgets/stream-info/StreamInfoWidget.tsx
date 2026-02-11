import { useEffect, useState, useRef } from "react";
import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { subscribe } from "../../events/bus";

export interface StreamInfoConfig {
  showTitle: boolean;
  showGame: boolean;
  showUptime: boolean;
  showViewers: boolean;
}

/** Formats elapsed milliseconds as "Xh Ym" or "Xm Ys". */
function formatUptime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function StreamInfoContent({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const config = instance?.config as StreamInfoConfig | undefined;

  const [title, setTitle] = useState<string | null>(null);
  const [game, setGame] = useState<string | null>(null);
  const [streamStartedAt, setStreamStartedAt] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [uptimeStr, setUptimeStr] = useState("Offline");

  // Subscribe to event bus
  useEffect(() => {
    return subscribe((event) => {
      switch (event.type) {
        case "channel_update":
          setTitle(event.data.title as string);
          setGame(event.data.category_name as string);
          break;
        case "stream_online":
          setIsLive(true);
          setStreamStartedAt(new Date(event.data.started_at as string));
          break;
        case "stream_offline":
          setIsLive(false);
          setStreamStartedAt(null);
          break;
        case "viewer_count_update":
          setViewerCount(event.data.count as number);
          break;
      }
    });
  }, []);

  // Update uptime display every second
  const streamStartedAtRef = useRef(streamStartedAt);
  const isLiveRef = useRef(isLive);
  streamStartedAtRef.current = streamStartedAt;
  isLiveRef.current = isLive;

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLiveRef.current && streamStartedAtRef.current) {
        const elapsed = Date.now() - streamStartedAtRef.current.getTime();
        setUptimeStr(formatUptime(elapsed));
      } else {
        setUptimeStr("Offline");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!config) return null;

  const hasData = title !== null || game !== null || isLive;

  if (!hasData && !config.showUptime && !config.showViewers) {
    return (
      <div className="h-full flex items-center justify-center text-white/40 text-xs">
        Waiting for data...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center gap-1 px-3 py-2 text-white text-sm">
      {config.showTitle && title && (
        <div className="truncate">
          <span className="text-white/50 text-xs">Title:</span> {title}
        </div>
      )}
      {config.showGame && game && (
        <div className="truncate">
          <span className="text-white/50 text-xs">Game:</span> {game}
        </div>
      )}
      {config.showUptime && (
        <div>
          <span className="text-white/50 text-xs">Uptime:</span> {uptimeStr}
        </div>
      )}
      {config.showViewers && (
        <div>
          <span className="text-white/50 text-xs">Viewers:</span> {viewerCount.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function StreamInfoSettings({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const config = (instance?.config ?? {}) as unknown as StreamInfoConfig;

  function update(partial: Partial<StreamInfoConfig>) {
    updateInstance(instanceId, { config: { ...config, ...partial } });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showTitle ?? true}
          onChange={(e) => update({ showTitle: e.target.checked })}
          className="accent-blue-500"
        />
        Show title
      </label>
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showGame ?? true}
          onChange={(e) => update({ showGame: e.target.checked })}
          className="accent-blue-500"
        />
        Show game
      </label>
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showUptime ?? true}
          onChange={(e) => update({ showUptime: e.target.checked })}
          className="accent-blue-500"
        />
        Show uptime
      </label>
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showViewers ?? false}
          onChange={(e) => update({ showViewers: e.target.checked })}
          className="accent-blue-500"
        />
        Show viewers
      </label>
    </div>
  );
}

export function StreamInfoWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Stream info">
      <StreamInfoContent instanceId={instanceId} />
    </Widget>
  );
}
