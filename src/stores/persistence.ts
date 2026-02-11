import { invoke } from "@tauri-apps/api/core";
import { useOverlayStore, type WidgetInstance } from "./overlay";
import { useTwitchStore } from "./twitch";
import { getWidget } from "../widgets/registry";
import type { SoundMapping } from "../audio/sounds";
import {
  type ChatMessage,
  getChatMessages,
  loadChatMessages,
  subscribeChatMessages,
} from "../widgets/chat/ChatWidget";

/** Old split format had widgetStates as a separate record */
interface OldWidgetState {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface PersistedSettings {
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
        opacity: 100,
      };
    });

    // Migrate: add locked/opacity defaults for existing settings missing them
    for (const inst of instances) {
      if (inst.locked === undefined) inst.locked = false;
      if (inst.opacity === undefined) inst.opacity = 100;
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

  loadChatMessages(data.messages);
}

function gatherState(): PersistedSettings {
  const overlay = useOverlayStore.getState();
  const twitch = useTwitchStore.getState();

  return {
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
    },
    twitch: { channel: twitch.channel },
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
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
