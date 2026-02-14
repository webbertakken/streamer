import { create } from "zustand";
import { getWidget } from "../widgets/registry";
import { type SoundMapping, DEFAULT_SOUND_MAPPINGS } from "../audio/sounds";
import defaultLayout from "../assets/default-layout.json";
import defaultSettings from "../assets/default-settings.json";

export interface WidgetInstance {
  instanceId: string;
  typeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  contentAlign?: "left" | "center" | "right";
  fontFamily?: string;
  bgColour?: string;
  bgOpacity?: number;
  textColour?: string;
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
  panelAlignH: "left" | "center" | "right";
  panelAlignV: "top" | "center" | "bottom";
  setPanelAlign: (h: "left" | "center" | "right", v: "top" | "center" | "bottom") => void;
  globalFont: string;
  setGlobalFont: (font: string) => void;
  widgetBgColour: string;
  setWidgetBgColour: (colour: string) => void;
  widgetBgOpacity: number;
  setWidgetBgOpacity: (opacity: number) => void;
  textBgOpacity: number;
  setTextBgOpacity: (opacity: number) => void;
  widgetTextColour: string;
  setWidgetTextColour: (colour: string) => void;
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
    return [{ instanceId: `${typeId}-1`, typeId, ...def.defaults, visible: true, locked: false, config }];
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
      instances: [...s.instances, { instanceId, typeId, ...def.defaults, visible: true, locked: false, config }],
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
  twitchColours: defaultSettings.twitchColours,
  toggleTwitchColours: () => set((s) => ({ twitchColours: !s.twitchColours })),
  presenceThreshold: defaultSettings.presenceThreshold,
  setPresenceThreshold: (threshold) => set({ presenceThreshold: threshold }),
  commands: [...DEFAULT_COMMANDS],
  setCommands: (commands) => set({ commands }),
  soundEnabled: defaultSettings.soundEnabled,
  toggleSoundEnabled: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  soundVolume: defaultSettings.soundVolume,
  setSoundVolume: (volume) => set({ soundVolume: volume }),
  soundMappings: { ...DEFAULT_SOUND_MAPPINGS },
  setSoundMappings: (mappings) => set({ soundMappings: mappings }),
  selectedMonitors: [],
  setSelectedMonitors: (monitors) => set({ selectedMonitors: monitors }),
  borderRadius: defaultSettings.borderRadius,
  setBorderRadius: (px) => set({ borderRadius: px }),
  panelWidth: defaultSettings.panelWidth,
  setPanelWidth: (px) => set({ panelWidth: px }),
  panelBgColour: defaultSettings.panelBgColour,
  setPanelBgColour: (colour) => set({ panelBgColour: colour }),
  panelAlignH: defaultSettings.panelAlignH as "left" | "center" | "right",
  panelAlignV: defaultSettings.panelAlignV as "top" | "center" | "bottom",
  setPanelAlign: (h, v) => set({ panelAlignH: h, panelAlignV: v }),
  globalFont: defaultSettings.globalFont,
  setGlobalFont: (font) => set({ globalFont: font }),
  widgetBgColour: defaultSettings.widgetBgColour,
  setWidgetBgColour: (colour) => set({ widgetBgColour: colour }),
  widgetBgOpacity: defaultSettings.widgetBgOpacity,
  setWidgetBgOpacity: (opacity) => set({ widgetBgOpacity: opacity }),
  textBgOpacity: defaultSettings.textBgOpacity,
  setTextBgOpacity: (opacity) => set({ textBgOpacity: opacity }),
  widgetTextColour: defaultSettings.widgetTextColour,
  setWidgetTextColour: (colour) => set({ widgetTextColour: colour }),
  restoreDefaults: () => set({ instances: seedInstances(), fileLogging: true, twitchColours: defaultSettings.twitchColours, presenceThreshold: defaultSettings.presenceThreshold, commands: [...DEFAULT_COMMANDS], soundEnabled: defaultSettings.soundEnabled, soundVolume: defaultSettings.soundVolume, soundMappings: { ...DEFAULT_SOUND_MAPPINGS }, selectedMonitors: [], borderRadius: defaultSettings.borderRadius, panelWidth: defaultSettings.panelWidth, panelBgColour: defaultSettings.panelBgColour, panelAlignH: defaultSettings.panelAlignH as "left" | "center" | "right", panelAlignV: defaultSettings.panelAlignV as "top" | "center" | "bottom", globalFont: defaultSettings.globalFont, widgetBgColour: defaultSettings.widgetBgColour, widgetBgOpacity: defaultSettings.widgetBgOpacity, textBgOpacity: defaultSettings.textBgOpacity, widgetTextColour: defaultSettings.widgetTextColour }),
  }));
}

export const useOverlayStore: ReturnType<typeof createOverlayStore> =
  (import.meta.hot?.data?.overlayStore as ReturnType<typeof createOverlayStore>) ?? createOverlayStore();

if (import.meta.hot?.data) {
  import.meta.hot.data.overlayStore = useOverlayStore;
  import.meta.hot.accept();
}
