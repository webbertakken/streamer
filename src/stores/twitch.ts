import { create } from "zustand";

interface TwitchStore {
  channel: string;
  connected: boolean;
  eventSubConnected: boolean;
  authenticated: boolean;
  username: string;
  userColour: string;
  setChannel: (channel: string) => void;
  setConnected: (connected: boolean) => void;
  setEventSubConnected: (connected: boolean) => void;
  setAuth: (authenticated: boolean, username: string) => void;
  setUserColour: (colour: string) => void;
}

export const useTwitchStore = create<TwitchStore>((set) => ({
  channel: "",
  connected: false,
  eventSubConnected: false,
  authenticated: false,
  username: "",
  userColour: "#FFFFFF",
  setChannel: (channel) => set({ channel }),
  setConnected: (connected) => set({ connected }),
  setEventSubConnected: (connected) => set({ eventSubConnected: connected }),
  setAuth: (authenticated, username) =>
    set((s) => ({
      authenticated,
      username,
      channel: !s.channel && authenticated ? username : s.channel,
    })),
  setUserColour: (colour) => set({ userColour: colour }),
}));
