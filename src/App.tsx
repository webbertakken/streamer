import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { getWidget } from "./widgets/registry";
import { useOverlayStore } from "./stores/overlay";
import { useTwitchStore } from "./stores/twitch";
import { hydrate, hydrateChatHistory, startAutoSave } from "./stores/persistence";
import { startMessageExpiry, stopMessageExpiry } from "./widgets/chat/chat-state";
import { checkAuth } from "./twitch/auth";
import { connectEventSub, disconnectEventSub } from "./twitch/eventsub";
import { startFollowerPolling, stopFollowerPolling, startViewerPolling, stopViewerPolling } from "./twitch/helix";
import { startFileLogger, stopFileLogger } from "./events/file-logger";
import { initCommandEventListeners } from "./twitch/irc";
import { fetchBadges } from "./twitch/badges";
import { initSoundAlerts } from "./audio/listener";
import { useSecondaryWindow, startBroadcasting, stopBroadcasting, closeAllMonitorWindows } from "./multimonitor";
import { SettingsWidget } from "./widgets/settings/SettingsWidget";
import "./App.css";

const MARGIN = 8;
const GUIDE = "fixed pointer-events-none z-40";
const GUIDE_COLOUR = "rgba(59,130,246,0.3)";

/** Alignment guide lines shown during widget drag/resize. */
function GuideLines() {
  const dragging = useOverlayStore((s) => s.dragging);
  if (!dragging) return null;

  return (
    <>
      {/* Vertical: 8px from left, centre, 8px from right */}
      <div className={GUIDE} style={{ left: MARGIN, top: 0, width: 1, height: "100vh", backgroundColor: GUIDE_COLOUR }} />
      <div className={GUIDE} style={{ left: "50%", top: 0, width: 1, height: "100vh", backgroundColor: GUIDE_COLOUR }} />
      <div className={GUIDE} style={{ right: MARGIN, top: 0, width: 1, height: "100vh", backgroundColor: GUIDE_COLOUR }} />
      {/* Horizontal: 8px from top, centre, 8px from bottom */}
      <div className={GUIDE} style={{ top: MARGIN, left: 0, height: 1, width: "100vw", backgroundColor: GUIDE_COLOUR }} />
      <div className={GUIDE} style={{ top: "50%", left: 0, height: 1, width: "100vw", backgroundColor: GUIDE_COLOUR }} />
      <div className={GUIDE} style={{ bottom: MARGIN, left: 0, height: 1, width: "100vw", backgroundColor: GUIDE_COLOUR }} />
    </>
  );
}

function App() {
  const isSecondary = useSecondaryWindow();
  const overlayVisible = useOverlayStore((s) => s.overlayVisible);
  const toggleOverlayVisible = useOverlayStore((s) => s.toggleOverlayVisible);
  const editMode = useOverlayStore((s) => s.editMode);
  const toggleEditMode = useOverlayStore((s) => s.toggleEditMode);
  const seedIfNeeded = useOverlayStore((s) => s.seedIfNeeded);
  const hydrated = useOverlayStore((s) => s.hydrated);
  const instances = useOverlayStore((s) => s.instances);

  const authenticated = useTwitchStore((s) => s.authenticated);
  const username = useTwitchStore((s) => s.username);

  // Hydrate persisted state, seed if first run, then start auto-save (primary only)
  useEffect(() => {
    if (isSecondary) {
      // Secondary windows get state via sync events; just mark as hydrated
      useOverlayStore.getState().setHydrated(true);
      return;
    }
    hydrate()
      .then(() => {
        const { instances } = useOverlayStore.getState();
        if (instances.length === 0) seedIfNeeded();
        startAutoSave();
        startMessageExpiry();
        useOverlayStore.getState().setHydrated(true);
        return checkAuth().then(() => hydrateChatHistory());
      })
      .catch(console.error);
    startFileLogger();
    initCommandEventListeners();
    const unsubSoundAlerts = initSoundAlerts();
    return () => {
      stopFileLogger();
      stopMessageExpiry();
      unsubSoundAlerts();
    };
  }, [seedIfNeeded, isSecondary]);

  // Start broadcasting state to secondary windows (primary only)
  useEffect(() => {
    if (isSecondary) return;
    startBroadcasting();
    return () => {
      stopBroadcasting();
      closeAllMonitorWindows().catch(console.error);
    };
  }, [isSecondary]);

  // Global shortcuts (primary only)
  useEffect(() => {
    if (isSecondary) return;
    register("Ctrl+Shift+I", (e) => {
      if (e.state === "Pressed") toggleEditMode();
    }).catch(console.error);
    register("Ctrl+Shift+O", (e) => {
      if (e.state === "Pressed") toggleOverlayVisible();
    }).catch(console.error);
    return () => {
      unregister("Ctrl+Shift+I").catch(console.error);
      unregister("Ctrl+Shift+O").catch(console.error);
    };
  }, [toggleEditMode, toggleOverlayVisible, isSecondary]);

  // Cursor passthrough
  useEffect(() => {
    invoke("set_ignore_cursor", { ignore: !editMode }).catch(console.error);
  }, [editMode]);

  // EventSub + follower polling when authenticated (primary only)
  useEffect(() => {
    if (isSecondary) return;
    if (!authenticated || !username) {
      disconnectEventSub();
      stopFollowerPolling();
      stopViewerPolling();
      return;
    }

    // We need the broadcaster user ID for EventSub/Helix.
    // Fetch it via the validate endpoint (which auth_status already called).
    // For now, use helix_get to look up the user by login.
    invoke("helix_get", { path: `/users?login=${username}` })
      .then((raw: unknown) => {
        const resp = JSON.parse(raw as string);
        const userId: string | undefined = resp.data?.[0]?.id;
        if (userId) {
          useTwitchStore.getState().setUserId(userId);
          fetchBadges(userId).catch(console.error);
          connectEventSub(userId);
          startFollowerPolling(userId);
          startViewerPolling(userId);
        }
      })
      .catch(console.error);

    return () => {
      disconnectEventSub();
      stopFollowerPolling();
      stopViewerPolling();
    };
  }, [authenticated, username, isSecondary]);

  if (!hydrated) return null;
  if (!overlayVisible) return null;

  return (
    <div className="h-screen w-screen relative">
      {editMode && !isSecondary && (
        <>
          <div className="fixed top-2 right-2 z-50 bg-blue-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            Edit mode — Ctrl+Shift+I to exit
          </div>
          <GuideLines />
        </>
      )}
      {instances.map((inst) => {
        const def = getWidget(inst.typeId);
        if (!def) return null;
        const Component = def.component;
        return <Component key={inst.instanceId} instanceId={inst.instanceId} />;
      })}
      {!isSecondary && <SettingsWidget />}
      <Toaster position="bottom-center" toastOptions={{ style: { background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "0.75rem", backdropFilter: "blur(8px)" } }} />
    </div>
  );
}

export default App;
