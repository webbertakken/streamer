import { create } from "zustand";

interface TwitchStore {
  channel: string;
  connected: boolean;
  setChannel: (channel: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useTwitchStore = create<TwitchStore>((set) => ({
  channel: "",
  connected: false,
  setChannel: (channel) => set({ channel }),
  setConnected: (connected) => set({ connected }),
}));
