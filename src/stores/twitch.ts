import { create } from "zustand";

interface TwitchStore {
  channel: string;
  connected: boolean;
  eventSubConnected: boolean;
  authenticated: boolean;
  username: string;
  userId: string;
  userColour: string;
  setChannel: (channel: string) => void;
  setConnected: (connected: boolean) => void;
  setEventSubConnected: (connected: boolean) => void;
  setAuth: (authenticated: boolean, username: string) => void;
  setUserId: (userId: string) => void;
  setUserColour: (colour: string) => void;
}

function createTwitchStore() {
  return create<TwitchStore>((set) => ({
    channel: "",
    connected: false,
    eventSubConnected: false,
    authenticated: false,
    username: "",
    userId: "",
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
    setUserId: (userId) => set({ userId }),
    setUserColour: (colour) => set({ userColour: colour }),
  }));
}

export const useTwitchStore: ReturnType<typeof createTwitchStore> =
  (import.meta.hot?.data?.twitchStore as ReturnType<typeof createTwitchStore>) ?? createTwitchStore();

if (import.meta.hot) {
  import.meta.hot.data.twitchStore = useTwitchStore;
  import.meta.hot.accept();
}
