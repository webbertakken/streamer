import { invoke } from "@tauri-apps/api/core";
import { useOverlayStore, type WidgetInstance } from "./overlay";
import { useTwitchStore } from "./twitch";
import { getWidget } from "../widgets/registry";
import type { SoundMapping } from "../audio/sounds";
import {
  type ChatMessage,
  MESSAGE_TTL_MS,
  getChatMessages,
  loadChatMessages,
  subscribeChatMessages,
} from "../widgets/chat/chat-state";
import { defaultColourForUsername } from "../twitch/irc";

/** Old split format had widgetStates as a separate record */
interface OldWidgetState {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface PersistedSettings {
  _v?: number;
  overlay?: {
    instances: (WidgetInstance | { instanceId: string; typeId: string })[];
    widgetStates?: Record<string, OldWidgetState>;
    fileLogging: boolean;
    twitchColours?: boolean;
    presenceThreshold: number;
    commands?: { trigger: string; response: string; enabled: boolean }[];
    soundEnabled?: boolean;
    soundVolume?: number;
    soundMappings?: Record<string, SoundMapping>;
    selectedMonitors?: string[];
    borderRadius?: number;
    panelWidth?: number;
    panelBgColour?: string;
    panelBgOpacity?: number;
    panelAlignH?: "left" | "center" | "right";
    panelAlignV?: "top" | "center" | "bottom";
    globalFont?: string;
    widgetBgColour?: string;
    widgetBgOpacity?: number;
    widgetTextColour?: string;
    widgetLiveBg?: boolean;
  };
  twitch?: {
    channel: string;
  };
  /** Legacy: custom text config was stored globally before being moved to instance config */
  customText?: {
    config: Record<string, unknown>;
  };
}

interface PersistedChatHistory {
  channel: string;
  savedAt: number;
  messages: ChatMessage[];
}

const TEN_MINUTES = 10 * 60 * 1000;

/** Load settings from disk and apply to stores. */
export async function hydrate(): Promise<void> {
  const data = (await invoke("read_settings")) as PersistedSettings | null;
  if (!data) return;

  if (data.overlay) {
    const instances: WidgetInstance[] = data.overlay.instances.map((inst) => {
      if ("visible" in inst) return inst as WidgetInstance;
      // Migrate old format: merge widgetStates or fall back to registry defaults
      const old = data.overlay!.widgetStates?.[inst.instanceId];
      const def = getWidget(inst.typeId);
      return {
        ...inst,
        x: old?.x ?? def?.defaults.x ?? 0,
        y: old?.y ?? def?.defaults.y ?? 0,
        width: old?.width ?? def?.defaults.width ?? 300,
        height: old?.height ?? def?.defaults.height ?? 200,
        visible: old?.visible ?? true,
        locked: false,
      };
    });

    // Migrate: add locked/opacity defaults for existing settings missing them
    for (const inst of instances) {
      if (inst.locked === undefined) inst.locked = false;
    }

    // Migrate v1: clear per-widget style overrides so they use new global defaults
    if ((data._v ?? 0) < 1) {
      for (const inst of instances) {
        delete inst.bgColour;
        delete inst.bgOpacity;
        delete inst.textColour;
      }
    }

    // Migrate v2: remove dead instance.opacity; carry panelBgOpacity forward as widgetBgOpacity
    let migratedWidgetBgOpacity: number | undefined;
    if ((data._v ?? 0) < 2) {
      for (const inst of instances) {
        delete (inst as unknown as Record<string, unknown>).opacity;
      }
      if (data.overlay.panelBgOpacity !== undefined) {
        migratedWidgetBgOpacity = data.overlay.panelBgOpacity;
      }
    }

    // Migrate v3: remove liveBg from instances
    if ((data._v ?? 0) < 3) {
      for (const inst of instances) {
        delete (inst as unknown as Record<string, unknown>).liveBg;
      }
    }

    // Migrate legacy global customText config into custom-text instances that lack config
    if (data.customText?.config) {
      for (const inst of instances) {
        if (inst.typeId === "custom-text" && !inst.config) {
          inst.config = { ...data.customText.config };
        }
      }
    }

    useOverlayStore.setState({
      instances,
      fileLogging: data.overlay.fileLogging,
      ...(data.overlay.twitchColours !== undefined && { twitchColours: data.overlay.twitchColours }),
      presenceThreshold: data.overlay.presenceThreshold,
      ...(data.overlay.commands && { commands: data.overlay.commands }),
      ...(data.overlay.soundEnabled !== undefined && { soundEnabled: data.overlay.soundEnabled }),
      ...(data.overlay.soundVolume !== undefined && { soundVolume: data.overlay.soundVolume }),
      ...(data.overlay.soundMappings && { soundMappings: data.overlay.soundMappings }),
      ...(data.overlay.selectedMonitors && { selectedMonitors: data.overlay.selectedMonitors }),
      ...(data.overlay.borderRadius !== undefined && { borderRadius: data.overlay.borderRadius }),
      ...(data.overlay.panelWidth !== undefined && { panelWidth: data.overlay.panelWidth }),
      ...(data.overlay.panelBgColour !== undefined && { panelBgColour: data.overlay.panelBgColour }),
      ...(data.overlay.panelAlignH && { panelAlignH: data.overlay.panelAlignH }),
      ...(data.overlay.panelAlignV && { panelAlignV: data.overlay.panelAlignV }),
      ...(data.overlay.globalFont !== undefined && { globalFont: data.overlay.globalFont }),
      ...(data.overlay.widgetBgColour !== undefined && { widgetBgColour: data.overlay.widgetBgColour }),
      ...(migratedWidgetBgOpacity !== undefined ? { widgetBgOpacity: migratedWidgetBgOpacity } : data.overlay.widgetBgOpacity !== undefined && { widgetBgOpacity: data.overlay.widgetBgOpacity }),
      ...(data.overlay.widgetTextColour !== undefined && { widgetTextColour: data.overlay.widgetTextColour }),
    });
  }

  if (data.twitch) {
    useTwitchStore.setState({ channel: data.twitch.channel });
  }
}

/** Restore chat history if same channel and within 10 minutes. */
export async function hydrateChatHistory(): Promise<void> {
  const data = (await invoke("read_chat_history")) as PersistedChatHistory | null;
  if (!data?.messages?.length) return;

  const channel = useTwitchStore.getState().channel;
  if (data.channel !== channel) return;
  if (Date.now() - data.savedAt > TEN_MINUTES) return;

  const cutoff = Date.now() - MESSAGE_TTL_MS;
  const fresh = data.messages
    .filter((m) => m.timestamp >= cutoff)
    .map((m) => ({ ...m, colour: m.colour || defaultColourForUsername(m.username) }));
  if (fresh.length === 0) return;

  loadChatMessages(fresh);
}

function gatherState(): PersistedSettings {
  const overlay = useOverlayStore.getState();
  const twitch = useTwitchStore.getState();

  return {
    _v: 3,
    overlay: {
      instances: overlay.instances,
      fileLogging: overlay.fileLogging,
      twitchColours: overlay.twitchColours,
      presenceThreshold: overlay.presenceThreshold,
      commands: overlay.commands,
      soundEnabled: overlay.soundEnabled,
      soundVolume: overlay.soundVolume,
      soundMappings: overlay.soundMappings,
      selectedMonitors: overlay.selectedMonitors,
      borderRadius: overlay.borderRadius,
      panelWidth: overlay.panelWidth,
      panelBgColour: overlay.panelBgColour,
      panelAlignH: overlay.panelAlignH,
      panelAlignV: overlay.panelAlignV,
      globalFont: overlay.globalFont,
      widgetBgColour: overlay.widgetBgColour,
      widgetBgOpacity: overlay.widgetBgOpacity,
      widgetTextColour: overlay.widgetTextColour,
    },
    twitch: { channel: twitch.channel },
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (!useOverlayStore.getState().hydrated) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    invoke("write_settings", { data: gatherState() }).catch(console.error);
  }, 500);
}

let chatSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleChatSave(): void {
  if (chatSaveTimer) clearTimeout(chatSaveTimer);
  chatSaveTimer = setTimeout(() => {
    const history: PersistedChatHistory = {
      channel: useTwitchStore.getState().channel,
      savedAt: Date.now(),
      messages: getChatMessages(),
    };
    invoke("write_chat_history", { data: history }).catch(console.error);
  }, 500);
}

/** Subscribe to all stores and auto-save on changes. */
export function startAutoSave(): void {
  useOverlayStore.subscribe(scheduleSave);
  useTwitchStore.subscribe(scheduleSave);
  subscribeChatMessages(scheduleChatSave);
}
