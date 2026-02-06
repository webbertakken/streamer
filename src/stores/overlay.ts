import { create } from "zustand";
import { getWidget, getWidgets } from "../widgets/registry";

export interface WidgetState {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface WidgetInstance {
  instanceId: string;
  typeId: string;
}

interface OverlayStore {
  overlayVisible: boolean;
  toggleOverlayVisible: () => void;
  editMode: boolean;
  toggleEditMode: () => void;
  instances: WidgetInstance[];
  addInstance: (typeId: string) => void;
  removeInstance: (instanceId: string) => void;
  widgetStates: Record<string, WidgetState>;
  setWidgetState: (id: string, state: Partial<WidgetState>) => void;
  getWidgetState: (id: string) => WidgetState;
}

const defaultWidgetState: WidgetState = {
  x: 0,
  y: 0,
  width: 300,
  height: 200,
  visible: true,
};

/** Generate the next instance ID for a given type (e.g. "chat-1", "chat-2") */
function nextInstanceId(typeId: string, instances: WidgetInstance[]): string {
  const existing = instances.filter((i) => i.typeId === typeId);
  return `${typeId}-${existing.length + 1}`;
}

/** Create initial instances — one of each registered widget type */
function seedInstances(): { instances: WidgetInstance[]; widgetStates: Record<string, WidgetState> } {
  const instances: WidgetInstance[] = [];
  const widgetStates: Record<string, WidgetState> = {};
  for (const def of getWidgets()) {
    const instanceId = `${def.id}-1`;
    instances.push({ instanceId, typeId: def.id });
    widgetStates[instanceId] = { ...def.defaults, visible: true };
  }
  return { instances, widgetStates };
}

const seed = seedInstances();

export const useOverlayStore = create<OverlayStore>((set, get) => ({
  overlayVisible: true,
  toggleOverlayVisible: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
  editMode: false,
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  instances: seed.instances,
  addInstance: (typeId) => {
    const def = getWidget(typeId);
    if (!def) return;
    const instanceId = nextInstanceId(typeId, get().instances);
    set((s) => ({
      instances: [...s.instances, { instanceId, typeId }],
      widgetStates: {
        ...s.widgetStates,
        [instanceId]: { ...def.defaults, visible: true },
      },
    }));
  },
  removeInstance: (instanceId) =>
    set((s) => {
      const { [instanceId]: _, ...rest } = s.widgetStates;
      return {
        instances: s.instances.filter((i) => i.instanceId !== instanceId),
        widgetStates: rest,
      };
    }),
  widgetStates: seed.widgetStates,
  setWidgetState: (id, partial) =>
    set((s) => ({
      widgetStates: {
        ...s.widgetStates,
        [id]: { ...get().getWidgetState(id), ...partial },
      },
    })),
  getWidgetState: (id) => get().widgetStates[id] ?? { ...defaultWidgetState },
}));
