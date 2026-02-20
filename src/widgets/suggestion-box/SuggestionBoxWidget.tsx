import { useEffect, useReducer, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Widget, useContentAlign, contentAlignClass } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import {
  type Suggestion,
  getSortedActive,
  getDoneItems,
  subscribeSuggestions,
  ensureSubscribed,
  toggleDone,
  setConfig,
  loadSuggestions,
  saveSuggestions,
} from "./suggestion-box-state";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface SuggestionBoxConfig {
  rewardId: string;
  voteTrigger: string;
  suggestTrigger: string;
  maxActive: number;
  maxDone: number;
  autoHideDuration: number;
}

const DEFAULT_CONFIG: SuggestionBoxConfig = {
  rewardId: "",
  voteTrigger: "!vote",
  suggestTrigger: "!suggest",
  maxActive: 7,
  maxDone: 3,
  autoHideDuration: 30,
};

// ---------------------------------------------------------------------------
// Hook: subscribe to suggestion state changes
// ---------------------------------------------------------------------------

function useSuggestions() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    ensureSubscribed();
    const unsub = subscribeSuggestions(rerender);
    return unsub;
  }, [rerender]);
  return { active: getSortedActive(), done: getDoneItems() };
}

// ---------------------------------------------------------------------------
// Hover-to-reveal hook (mirrors ChatInputContainer pattern)
// ---------------------------------------------------------------------------

const LONG_HOVER_MS = 500;
const POLL_INTERVAL_MS = 200;

function useHoverReveal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  editMode: boolean,
): boolean {
  const [revealed, setRevealed] = useState(false);
  const hoverStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (editMode) {
      setRevealed(true);
      return;
    }

    setRevealed(false);

    const interval = setInterval(async () => {
      if (!containerRef.current) return;

      try {
        const [cx, cy] = await invoke<[number, number]>("get_cursor_position");
        const rect = containerRef.current.getBoundingClientRect();

        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          if (hoverStartRef.current === null) {
            hoverStartRef.current = Date.now();
          } else if (Date.now() - hoverStartRef.current >= LONG_HOVER_MS) {
            await invoke("set_ignore_cursor", { ignore: false });
            setRevealed(true);
          }
        } else {
          if (hoverStartRef.current !== null) {
            hoverStartRef.current = null;
            setRevealed(false);
            await invoke("set_ignore_cursor", { ignore: true });
          }
        }
      } catch {
        // cursor position unavailable
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      hoverStartRef.current = null;
    };
  }, [editMode, containerRef]);

  return revealed;
}

// ---------------------------------------------------------------------------
// Debounced auto-save
// ---------------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSuggestionSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSuggestions().catch(console.error);
  }, 500);
}

// ---------------------------------------------------------------------------
// Suggestion row
// ---------------------------------------------------------------------------

function SuggestionRow({
  suggestion,
  showCheckbox,
  lineBg,
  lineBgStyle,
}: {
  suggestion: Suggestion;
  showCheckbox: boolean;
  lineBg: string;
  lineBgStyle: React.CSSProperties | undefined;
}) {
  const isDone = suggestion.status === "done";

  return (
    <div
      className={`text-xs leading-snug flex items-center gap-1.5 ${lineBg} ${isDone ? "line-through opacity-50" : ""}`}
      style={lineBgStyle}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggleDone(suggestion.id)}
          className="accent-blue-500 shrink-0 cursor-pointer"
        />
      )}
      <span className="font-mono text-white/30 shrink-0">{suggestion.hexId}</span>
      <span className="text-white/80 truncate flex-1">{suggestion.text}</span>
      <span className="text-white/40 shrink-0">{suggestion.username}</span>
      {suggestion.votes > 0 && (
        <span className="text-amber-400/80 shrink-0">+{suggestion.votes}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget content
// ---------------------------------------------------------------------------

function SuggestionBoxContent({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const editMode = useOverlayStore((s) => s.editMode);
  const textBgOpacity = useOverlayStore((s) => s.textBgOpacity);
  const align = useContentAlign(instanceId);
  const alignCls = contentAlignClass(align);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());

  const config: SuggestionBoxConfig = { ...DEFAULT_CONFIG, ...(instance?.config as Partial<SuggestionBoxConfig>) };
  const { active, done } = useSuggestions();

  const showCheckbox = useHoverReveal(containerRef, editMode);

  // Sync config to state module
  useEffect(() => {
    setConfig({ rewardId: config.rewardId, voteTrigger: config.voteTrigger, suggestTrigger: config.suggestTrigger });
  }, [config.rewardId, config.voteTrigger, config.suggestTrigger]);

  // Load suggestions on mount + subscribe for auto-save
  useEffect(() => {
    loadSuggestions().catch(console.error);
    const unsub = subscribeSuggestions(scheduleSuggestionSave);
    return unsub;
  }, []);

  // Auto-scroll when active list changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active.length]);

  // Tick every second for auto-hide expiry
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const lineBg = "px-1 max-w-full";
  const lineBgStyle = editMode ? undefined : { backgroundColor: `rgba(0, 0, 0, ${textBgOpacity / 100})`, borderRadius: "0.25rem" };

  const visibleActive = active.slice(0, config.maxActive);

  // Filter done items: hide those that exceed autoHideDuration
  const autoHideMs = config.autoHideDuration * 1_000;
  const visibleDone = done
    .filter((s) => s.checkedAt !== null && now - s.checkedAt < autoHideMs)
    .slice(0, config.maxDone);

  const isEmpty = visibleActive.length === 0 && visibleDone.length === 0;

  if (isEmpty) {
    if (!editMode) return null;
    return (
      <div ref={containerRef} className="h-full p-2">
        <p className={`text-white/40 text-sm italic ${lineBg}`} style={lineBgStyle}>No suggestions yet</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col min-w-0">
      <div ref={scrollRef} className={`flex-1 min-h-0 min-w-0 overflow-y-auto p-2 space-y-1 scrollbar-thin flex flex-col ${alignCls}`}>
        {visibleActive.map((s) => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            showCheckbox={showCheckbox}
            lineBg={lineBg}
            lineBgStyle={lineBgStyle}
          />
        ))}
        {visibleDone.length > 0 && visibleActive.length > 0 && (
          <hr className="border-white/10 w-full my-0.5" />
        )}
        {visibleDone.map((s) => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            showCheckbox={showCheckbox}
            lineBg={lineBg}
            lineBgStyle={lineBgStyle}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings component
// ---------------------------------------------------------------------------

interface Reward {
  id: string;
  title: string;
}

export function SuggestionBoxSettings({ instanceId }: { instanceId: string }) {
  const instance = useOverlayStore((s) => s.instances.find((i) => i.instanceId === instanceId));
  const updateInstance = useOverlayStore((s) => s.updateInstance);
  const userId = useTwitchStore((s) => s.userId);
  const authenticated = useTwitchStore((s) => s.authenticated);
  const config: SuggestionBoxConfig = { ...DEFAULT_CONFIG, ...(instance?.config as Partial<SuggestionBoxConfig>) };

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  function update(partial: Partial<SuggestionBoxConfig>) {
    updateInstance(instanceId, { config: { ...config, ...partial } });
  }

  // Fetch custom rewards when authenticated
  useEffect(() => {
    if (!authenticated || !userId) return;

    setLoadingRewards(true);
    invoke<string>("helix_get", {
      path: `/channel_points/custom_rewards?broadcaster_id=${userId}`,
    })
      .then((raw) => {
        const resp = JSON.parse(raw) as { data?: Reward[] };
        setRewards(resp.data ?? []);
      })
      .catch((err) => {
        console.error("Failed to fetch custom rewards:", err);
        setRewards([]);
      })
      .finally(() => setLoadingRewards(false));
  }, [authenticated, userId]);

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-white/60 block mb-0.5">Channel point reward</label>
        {loadingRewards ? (
          <div className="text-xs text-white/40">Loading rewards...</div>
        ) : (
          <select
            value={config.rewardId}
            onChange={(e) => update({ rewardId: e.target.value })}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">None (use chat command)</option>
            {rewards.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        )}
        {!config.rewardId && (
          <p className="text-xs text-amber-400/70 mt-0.5">
            No reward selected — accepting suggestions via <code className="bg-white/10 px-0.5 rounded">{config.suggestTrigger}</code> chat command
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Vote command</label>
          <input
            type="text"
            value={config.voteTrigger}
            onChange={(e) => update({ voteTrigger: e.target.value })}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Suggest command</label>
          <input
            type="text"
            value={config.suggestTrigger}
            onChange={(e) => update({ suggestTrigger: e.target.value })}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Max active</label>
          <input
            type="number"
            value={config.maxActive}
            onChange={(e) => update({ maxActive: Math.max(1, Number(e.target.value) || 7) })}
            min={1}
            max={50}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/60 block mb-0.5">Max done</label>
          <input
            type="number"
            value={config.maxDone}
            onChange={(e) => update({ maxDone: Math.max(0, Number(e.target.value) || 3) })}
            min={0}
            max={20}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/60 block mb-0.5">Auto-hide done (seconds)</label>
        <input
          type="number"
          value={config.autoHideDuration}
          onChange={(e) => update({ autoHideDuration: Math.max(5, Number(e.target.value) || 30) })}
          min={5}
          max={600}
          className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget export
// ---------------------------------------------------------------------------

export function SuggestionBoxWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Suggestion box">
      <div className="h-full">
        <SuggestionBoxContent instanceId={instanceId} />
      </div>
    </Widget>
  );
}
