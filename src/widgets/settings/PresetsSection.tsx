import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useOverlayStore, type WidgetInstance } from "../../stores/overlay";

/** Current preset schema version for forward-compatible migrations. */
const PRESET_VERSION = 1;

interface PresetInfo {
  name: string;
  path: string;
}

interface PresetData {
  version: number;
  instances: WidgetInstance[];
}

/**
 * Validates that a parsed object conforms to the preset data shape.
 * Returns the typed data or throws with a human-readable message.
 */
function validatePresetData(raw: unknown): PresetData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Preset data must be an object");
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.instances)) {
    throw new Error("Preset must contain an \"instances\" array");
  }
  return {
    version: typeof obj.version === "number" ? obj.version : 1,
    instances: obj.instances as WidgetInstance[],
  };
}

/** Presets management section for the Widgets settings tab. */
export function PresetsSection() {
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch the list of saved presets from the Rust backend. */
  const refreshPresets = useCallback(async () => {
    try {
      const list = await invoke<PresetInfo[]>("list_presets");
      setPresets(list);
    } catch (e) {
      console.error("Failed to list presets:", e);
    }
  }, []);

  useEffect(() => {
    refreshPresets().catch(console.error);
  }, [refreshPresets]);

  /** Save the current widget layout as a named preset. */
  async function handleSave() {
    const name = newName.trim();
    if (!name) return;

    setLoading(true);
    setError(null);
    try {
      const instances = useOverlayStore.getState().instances;
      const data: PresetData = { version: PRESET_VERSION, instances };
      await invoke("save_preset", { name, data: JSON.stringify(data, null, 2) });
      setNewName("");
      await refreshPresets();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  /** Load a preset and replace the current widget instances. */
  async function handleLoad(name: string) {
    setLoading(true);
    setError(null);
    try {
      const raw = await invoke<string>("load_preset", { name });
      const parsed = validatePresetData(JSON.parse(raw));
      useOverlayStore.setState({ instances: parsed.instances });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  /** Delete a preset file. */
  async function handleDelete(name: string) {
    setLoading(true);
    setError(null);
    try {
      await invoke("delete_preset", { name });
      await refreshPresets();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  /** Export a preset to a user-chosen file via save dialogue. */
  async function handleExport(name: string) {
    setError(null);
    try {
      const raw = await invoke<string>("load_preset", { name });
      const filePath = await save({
        defaultPath: `${name}.json`,
        filters: [{ name: "Preset", extensions: ["json"] }],
      });
      if (!filePath) return;
      await invoke("export_preset", { path: filePath, data: raw });
    } catch (e) {
      setError(String(e));
    }
  }

  /** Import a preset from a user-chosen file via open dialogue. */
  async function handleImport() {
    setError(null);
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "Preset", extensions: ["json"] }],
      });
      if (!filePath) return;

      await invoke<string>("import_preset", { path: filePath });
      await refreshPresets();
    } catch (e) {
      setError(String(e));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave().catch(console.error);
  }

  return (
    <div className="space-y-2">
      <h3 className="text-white/70 text-xs font-medium">Presets</h3>

      {/* Save new preset */}
      <div className="flex gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preset name"
          disabled={loading}
          className="flex-1 bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
        />
        <button
          onClick={() => { handleSave().catch(console.error); }}
          disabled={loading || !newName.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>

      {/* Preset list */}
      {presets.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {presets.map((preset) => (
            <div key={preset.name} className="flex items-center gap-1 text-xs">
              <span className="flex-1 text-white truncate" title={preset.name}>
                {preset.name}
              </span>
              <button
                onClick={() => { handleLoad(preset.name).catch(console.error); }}
                disabled={loading}
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                title="Load preset"
              >
                Load
              </button>
              <button
                onClick={() => { handleExport(preset.name).catch(console.error); }}
                disabled={loading}
                className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                title="Export preset"
              >
                Export
              </button>
              <button
                onClick={() => { handleDelete(preset.name).catch(console.error); }}
                disabled={loading}
                className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                title="Delete preset"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Import */}
      <button
        onClick={() => { handleImport().catch(console.error); }}
        disabled={loading}
        className="w-full bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
      >
        Import preset from file
      </button>

      {/* Error display */}
      {error && (
        <p className="text-red-400 text-xs break-words">{error}</p>
      )}
    </div>
  );
}
