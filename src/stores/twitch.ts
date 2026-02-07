import { create } from "zustand";

interface TwitchStore {
  channel: string;
  connected: boolean;
  authenticated: boolean;
  username: string;
  setChannel: (channel: string) => void;
  setConnected: (connected: boolean) => void;
  setAuth: (authenticated: boolean, username: string) => void;
}

export const useTwitchStore = create<TwitchStore>((set) => ({
  channel: "",
  connected: false,
  authenticated: false,
  username: "",
  setChannel: (channel) => set({ channel }),
  setConnected: (connected) => set({ connected }),
  setAuth: (authenticated, username) =>
    set((s) => ({
      authenticated,
      username,
      channel: !s.channel && authenticated ? username : s.channel,
    })),
}));
