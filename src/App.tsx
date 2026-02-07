import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { getWidget } from "./widgets/registry";
import { useOverlayStore } from "./stores/overlay";
import { SettingsWidget } from "./widgets/settings/SettingsWidget";
import "./App.css";

function App() {
  const overlayVisible = useOverlayStore((s) => s.overlayVisible);
  const toggleOverlayVisible = useOverlayStore((s) => s.toggleOverlayVisible);
  const editMode = useOverlayStore((s) => s.editMode);
  const toggleEditMode = useOverlayStore((s) => s.toggleEditMode);
  const seedIfNeeded = useOverlayStore((s) => s.seedIfNeeded);
  const instances = useOverlayStore((s) => s.instances);

  useEffect(() => {
    seedIfNeeded();
  }, [seedIfNeeded]);

  useEffect(() => {
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
  }, [toggleEditMode, toggleOverlayVisible]);

  useEffect(() => {
    invoke("set_ignore_cursor", { ignore: !editMode }).catch(console.error);
  }, [editMode]);

  if (!overlayVisible) return null;

  return (
    <div className="h-screen w-screen relative">
      {editMode && (
        <div className="fixed top-2 right-2 z-50 bg-blue-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          Edit mode — Ctrl+Shift+I to exit
        </div>
      )}
      {instances.map((inst) => {
        const def = getWidget(inst.typeId);
        if (!def) return null;
        const Component = def.component;
        return <Component key={inst.instanceId} instanceId={inst.instanceId} />;
      })}
      <SettingsWidget />
    </div>
  );
}

export default App;
