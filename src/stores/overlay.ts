import { create } from "zustand";
import { getWidget } from "../widgets/registry";
import { type SoundMapping, DEFAULT_SOUND_MAPPINGS } from "../audio/sounds";
import defaultLayout from "../assets/default-layout.json";

export interface WidgetInstance {
  instanceId: string;
  typeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  contentAlign?: "left" | "center" | "right";
  fontFamily?: string;
  bgColour?: string;
  bgOpacity?: number;
  textColour?: string;
  liveBg?: boolean;
  config?: Record<string, unknown>;
}

export interface ChatCommand {
  trigger: string;
  response: string;
  enabled: boolean;
}

const DEFAULT_COMMANDS: ChatCommand[] = [
  { trigger: "!uptime", response: "Uptime: {uptime}", enabled: true },
  { trigger: "!game", response: "Currently playing {game}", enabled: true },
];

interface OverlayStore {
  overlayVisible: boolean;
  toggleOverlayVisible: () => void;
  editMode: boolean;
  toggleEditMode: () => void;
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
  previewBg: boolean;
  setPreviewBg: (preview: boolean) => void;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  instances: WidgetInstance[];
  seedIfNeeded: () => void;
  addInstance: (typeId: string) => void;
  removeInstance: (instanceId: string) => void;
  updateInstance: (instanceId: string, partial: Partial<WidgetInstance>) => void;
  fileLogging: boolean;
  toggleFileLogging: () => void;
  twitchColours: boolean;
  toggleTwitchColours: () => void;
  presenceThreshold: number;
  setPresenceThreshold: (threshold: number) => void;
  commands: ChatCommand[];
  setCommands: (commands: ChatCommand[]) => void;
  soundEnabled: boolean;
  toggleSoundEnabled: () => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  soundMappings: Record<string, SoundMapping>;
  setSoundMappings: (mappings: Record<string, SoundMapping>) => void;
  selectedMonitors: string[];
  setSelectedMonitors: (monitors: string[]) => void;
  borderRadius: number;
  setBorderRadius: (px: number) => void;
  panelWidth: number;
  setPanelWidth: (px: number) => void;
  panelBgColour: string;
  setPanelBgColour: (colour: string) => void;
  panelBgOpacity: number;
  setPanelBgOpacity: (opacity: number) => void;
  panelAlignH: "left" | "center" | "right";
  panelAlignV: "top" | "center" | "bottom";
  setPanelAlign: (h: "left" | "center" | "right", v: "top" | "center" | "bottom") => void;
  globalFont: string;
  setGlobalFont: (font: string) => void;
  widgetBgColour: string;
  setWidgetBgColour: (colour: string) => void;
  widgetBgOpacity: number;
  setWidgetBgOpacity: (opacity: number) => void;
  widgetTextColour: string;
  setWidgetTextColour: (colour: string) => void;
  widgetLiveBg: boolean;
  toggleWidgetLiveBg: () => void;
  restoreDefaults: () => void;
}

/** Generate the next instance ID for a given type (e.g. "chat-1", "chat-2") */
function nextInstanceId(typeId: string, instances: WidgetInstance[]): string {
  let max = 0;
  for (const inst of instances) {
    if (inst.typeId !== typeId) continue;
    const suffix = Number(inst.instanceId.slice(typeId.length + 1));
    if (suffix > max) max = suffix;
  }
  return `${typeId}-${max + 1}`;
}

/** Create initial instances for a fresh install, reading from default-layout.json with registry fallback */
function seedInstances(): WidgetInstance[] {
  const layout = defaultLayout as unknown as WidgetInstance[];
  if (layout.length > 0) {
    // Ensure all instances have valid widget types, fill missing config from registry
    return layout.flatMap((inst) => {
      const def = getWidget(inst.typeId);
      if (!def) return [];
      return [{
        ...inst,
        config: inst.config ?? (def.defaultConfig ? { ...def.defaultConfig } : undefined),
      }];
    });
  }
  // Fallback to registry defaults
  const seeds = ["chat", "viewer-count", "chat-presence", "custom-text"] as const;
  return seeds.flatMap((typeId) => {
    const def = getWidget(typeId);
    if (!def) return [];
    const config = typeId === "custom-text"
      ? { ...def.defaultConfig, text: "Press \"Ctrl + Shift + I\" for overlay Edit-mode." }
      : def.defaultConfig ? { ...def.defaultConfig } : undefined;
    return [{ instanceId: `${typeId}-1`, typeId, ...def.defaults, visible: true, locked: false, opacity: 100, config }];
  });
}

let seeded = false;

function createOverlayStore() {
  return create<OverlayStore>((set, get) => ({
  overlayVisible: true,
  toggleOverlayVisible: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  dragging: false,
  setDragging: (dragging) => set({ dragging }),
  previewBg: false,
  setPreviewBg: (preview) => set({ previewBg: preview }),
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
  instances: [],
  seedIfNeeded: () => {
    if (seeded) return;
    seeded = true;
    set({ instances: seedInstances() });
  },
  addInstance: (typeId) => {
    const def = getWidget(typeId);
    if (!def) return;
    if (def.singleton && get().instances.some((i) => i.typeId === typeId)) return;
    const instanceId = nextInstanceId(typeId, get().instances);
    const config = def.defaultConfig ? { ...def.defaultConfig } : undefined;
    set((s) => ({
      instances: [...s.instances, { instanceId, typeId, ...def.defaults, visible: true, locked: false, opacity: 100, config }],
    }));
  },
  removeInstance: (instanceId) =>
    set((s) => ({
      instances: s.instances.filter((i) => i.instanceId !== instanceId),
    })),
  updateInstance: (instanceId, partial) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, ...partial } : i,
      ),
    })),
  fileLogging: true,
  toggleFileLogging: () => set((s) => ({ fileLogging: !s.fileLogging })),
  twitchColours: true,
  toggleTwitchColours: () => set((s) => ({ twitchColours: !s.twitchColours })),
  presenceThreshold: 1000,
  setPresenceThreshold: (threshold) => set({ presenceThreshold: threshold }),
  commands: [...DEFAULT_COMMANDS],
  setCommands: (commands) => set({ commands }),
  soundEnabled: true,
  toggleSoundEnabled: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  soundVolume: 80,
  setSoundVolume: (volume) => set({ soundVolume: volume }),
  soundMappings: { ...DEFAULT_SOUND_MAPPINGS },
  setSoundMappings: (mappings) => set({ soundMappings: mappings }),
  selectedMonitors: [],
  setSelectedMonitors: (monitors) => set({ selectedMonitors: monitors }),
  borderRadius: 8,
  setBorderRadius: (px) => set({ borderRadius: px }),
  panelWidth: 320,
  setPanelWidth: (px) => set({ panelWidth: px }),
  panelBgColour: "#000000",
  setPanelBgColour: (colour) => set({ panelBgColour: colour }),
  panelBgOpacity: 60,
  setPanelBgOpacity: (opacity) => set({ panelBgOpacity: opacity }),
  panelAlignH: "center",
  panelAlignV: "center",
  setPanelAlign: (h, v) => set({ panelAlignH: h, panelAlignV: v }),
  globalFont: "inherit",
  setGlobalFont: (font) => set({ globalFont: font }),
  widgetBgColour: "#000000",
  setWidgetBgColour: (colour) => set({ widgetBgColour: colour }),
  widgetBgOpacity: 30,
  setWidgetBgOpacity: (opacity) => set({ widgetBgOpacity: opacity }),
  widgetTextColour: "#ffffff",
  setWidgetTextColour: (colour) => set({ widgetTextColour: colour }),
  widgetLiveBg: false,
  toggleWidgetLiveBg: () => set((s) => ({ widgetLiveBg: !s.widgetLiveBg })),
  restoreDefaults: () => set({ instances: seedInstances(), fileLogging: true, twitchColours: true, presenceThreshold: 1000, commands: [...DEFAULT_COMMANDS], soundEnabled: true, soundVolume: 80, soundMappings: { ...DEFAULT_SOUND_MAPPINGS }, selectedMonitors: [], borderRadius: 8, panelWidth: 320, panelBgColour: "#000000", panelBgOpacity: 60, panelAlignH: "center" as const, panelAlignV: "center" as const, globalFont: "inherit", widgetBgColour: "#000000", widgetBgOpacity: 30, widgetTextColour: "#ffffff", widgetLiveBg: false }),
  }));
}

export const useOverlayStore: ReturnType<typeof createOverlayStore> =
  (import.meta.hot?.data?.overlayStore as ReturnType<typeof createOverlayStore>) ?? createOverlayStore();

if (import.meta.hot) {
  import.meta.hot.data.overlayStore = useOverlayStore;
  import.meta.hot.accept();
}
