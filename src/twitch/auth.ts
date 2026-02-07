import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTwitchStore } from "../stores/twitch";
import { connectChat } from "./irc";

interface AuthStatusResponse {
  authenticated: boolean;
  username: string | null;
}

interface DeviceCodeInfo {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/** Callbacks for the device code UI. */
export interface DeviceCodeCallbacks {
  /** Called with the code + URI the user needs to visit. */
  onCode: (userCode: string, verificationUri: string) => void;
  /** Called when the flow completes (success or failure). */
  onDone: () => void;
}

/** Start the Device Code Grant Flow. */
export async function login(callbacks: DeviceCodeCallbacks): Promise<void> {
  console.log("[auth] requesting device code…");
  const info: DeviceCodeInfo = await invoke("auth_device_start");
  console.log("[auth] device code: %s  uri: %s", info.user_code, info.verification_uri);

  // Show the code in the UI and open the browser
  callbacks.onCode(info.user_code, info.verification_uri);
  openUrl(info.verification_uri).catch((e) =>
    console.warn("[auth] failed to open browser:", e),
  );

  try {
    // Poll until the user authorises (blocks in Rust)
    console.log("[auth] polling for authorisation…");
    const status: AuthStatusResponse = await invoke("auth_device_poll", {
      deviceCode: info.device_code,
      interval: info.interval,
      expiresIn: info.expires_in,
    });
    console.log(
      "[auth] authorised — authenticated=%s user=%s",
      status.authenticated,
      status.username,
    );
    useTwitchStore.getState().setAuth(status.authenticated, status.username ?? "");
    const { channel } = useTwitchStore.getState();
    if (status.authenticated && channel) {
      connectChat(channel);
    }
  } finally {
    callbacks.onDone();
  }
}

/** Log out — revoke token and clear stored credentials. */
export async function logout(): Promise<void> {
  console.log("[auth] logging out…");
  await invoke("auth_logout");
  useTwitchStore.getState().setAuth(false, "");
  console.log("[auth] logged out");
}

/** Check if we have a valid stored session and auto-connect if so. */
export async function checkAuth(): Promise<void> {
  try {
    const status: AuthStatusResponse = await invoke("auth_status");
    console.log(
      "[auth] session check — authenticated=%s user=%s",
      status.authenticated,
      status.username,
    );
    useTwitchStore.getState().setAuth(status.authenticated, status.username ?? "");
    const { channel } = useTwitchStore.getState();
    if (status.authenticated && channel) {
      connectChat(channel);
    }
  } catch (e) {
    console.warn("[auth] session check failed:", e);
    useTwitchStore.getState().setAuth(false, "");
  }
}
