import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { create } from "zustand";

interface ViewerCountState {
  count: number;
  setCount: (count: number) => void;
}

export const useViewerCount = create<ViewerCountState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

function ViewerCountContent() {
  const count = useViewerCount((s) => s.count);

  return (
    <div className="h-full flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm px-4">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
        <span className="text-white/60 text-sm">viewers</span>
      </div>
    </div>
  );
}

export function ViewerCountWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Viewer count">
      <ViewerCountContent />
    </Widget>
  );
}
