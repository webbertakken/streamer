import { create } from "zustand";
import { getWidget } from "../widgets/registry";

export interface WidgetInstance {
  instanceId: string;
  typeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

interface OverlayStore {
  overlayVisible: boolean;
  toggleOverlayVisible: () => void;
  editMode: boolean;
  toggleEditMode: () => void;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  instances: WidgetInstance[];
  seedIfNeeded: () => void;
  addInstance: (typeId: string) => void;
  removeInstance: (instanceId: string) => void;
  updateInstance: (instanceId: string, partial: Partial<WidgetInstance>) => void;
  fileLogging: boolean;
  toggleFileLogging: () => void;
  presenceThreshold: number;
  setPresenceThreshold: (threshold: number) => void;
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

/** Create initial instances for a fresh install */
function seedInstances(): WidgetInstance[] {
  const seeds = ["chat", "viewer-count", "chat-presence", "custom-text"] as const;
  return seeds.flatMap((typeId) => {
    const def = getWidget(typeId);
    if (!def) return [];
    const config = typeId === "custom-text"
      ? { ...def.defaultConfig, text: "Press \"Ctrl + Shift + I\" for overlay Edit-mode." }
      : def.defaultConfig ? { ...def.defaultConfig } : undefined;
    return [{ instanceId: `${typeId}-1`, typeId, ...def.defaults, visible: true, config }];
  });
}

let seeded = false;

export const useOverlayStore = create<OverlayStore>((set, get) => ({
  overlayVisible: true,
  toggleOverlayVisible: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
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
      instances: [...s.instances, { instanceId, typeId, ...def.defaults, visible: true, config }],
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
  presenceThreshold: 1000,
  setPresenceThreshold: (threshold) => set({ presenceThreshold: threshold }),
  restoreDefaults: () => set({ instances: seedInstances(), fileLogging: true, presenceThreshold: 1000 }),
}));
