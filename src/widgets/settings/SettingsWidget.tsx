import { useState, useEffect, useCallback, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useOverlayStore, type ChatCommand } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { connectChat, disconnectChat } from "../../twitch/irc";
import { login, logout } from "../../twitch/auth";
import { getWidgets } from "../registry";
import { BUILTIN_SOUNDS, BUILTIN_SOUND_LABELS, type BuiltinSound } from "../../audio/synth";
import { DEFAULT_SOUND_MAPPINGS, type SoundMapping } from "../../audio/sounds";
import { playSound } from "../../audio/player";
import { PresetsSection } from "./PresetsSection";
import { type MonitorInfo, syncMonitorWindows } from "../../multimonitor";
import { FontPicker } from "../shared/FontPicker";
import toast from "react-hot-toast";

const TABS = ["General", "Widgets", "Twitch", "Appearance"] as const;
type Tab = (typeof TABS)[number];

function AuthSection() {
  const authenticated = useTwitchStore((s) => s.authenticated);
  const username = useTwitchStore((s) => s.username);
  const [loading, setLoading] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setDeviceCode(null);
    try {
      await login({
        onCode: (code) => setDeviceCode(code),
        onDone: () => setDeviceCode(null),
      });
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setLoading(false);
      setDeviceCode(null);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-white/70 text-xs block">Twitch account</label>
      {authenticated ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-white text-sm">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            Log out
          </button>
        </div>
      ) : deviceCode ? (
        <div className="space-y-1.5">
          <p className="text-white/60 text-xs">
            Enter this code on the Twitch page that opened:
          </p>
          <div className="bg-white/10 rounded px-3 py-2 text-center">
            <span className="text-white text-lg font-mono font-bold tracking-widest">
              {deviceCode}
            </span>
          </div>
          <p className="text-white/40 text-xs text-center">Waiting for authorisation…</p>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Log in with Twitch"}
        </button>
      )}
    </div>
  );
}

function ChannelSection() {
  const connected = useTwitchStore((s) => s.connected);
  const channel = useTwitchStore((s) => s.channel);
  const setChannel = useTwitchStore((s) => s.setChannel);
  const [input, setInput] = useState(channel);

  function handleConnect() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setChannel(trimmed);
    connectChat(trimmed);
  }

  function handleDisconnect() {
    disconnectChat();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !connected) handleConnect();
  }

  return (
    <div className="space-y-2">
      <label className="text-white/70 text-xs block">Twitch channel</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={connected}
          placeholder="channel name"
          className="flex-1 bg-white/10 text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
        />
        {connected ? (
          <button
            onClick={handleDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
          >
            Connect
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-white/60">
          {connected ? `Connected to ${channel}` : "Disconnected"}
        </span>
      </div>
    </div>
  );
}

function WidgetPicker() {
  const addInstance = useOverlayStore((s) => s.addInstance);
  const instances = useOverlayStore((s) => s.instances);
  const widgetTypes = getWidgets();

  return (
    <div className="space-y-2">
      <h3 className="text-white/70 text-xs font-medium">Add widgets</h3>
      <div className="flex flex-wrap gap-1.5">
        {widgetTypes.map((def) => {
          const disabled = !!def.singleton && instances.some((i) => i.typeId === def.id);
          return (
            <button
              key={def.id}
              onClick={() => addInstance(def.id)}
              disabled={disabled}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10"
            >
              <span>+</span>
              <span>{def.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RestoreDefaults() {
  const restoreDefaults = useOverlayStore((s) => s.restoreDefaults);

  return (
    <button
      onClick={restoreDefaults}
      className="w-full bg-red-600/60 hover:bg-red-600/80 text-white text-xs px-3 py-1.5 rounded transition-colors"
    >
      Restore default settings
    </button>
  );
}

/* --- Tab content --- */

function GeneralTab() {
  const fileLogging = useOverlayStore((s) => s.fileLogging);
  const toggleFileLogging = useOverlayStore((s) => s.toggleFileLogging);
  const instances = useOverlayStore((s) => s.instances);

  function handleOpenLogFolder() {
    invoke("open_log_folder").catch(console.error);
  }

  async function handleSaveAsDefaults() {
    try {
      // Strip per-widget style overrides — defaults should use global settings
      const cleaned = instances.map(({ contentAlign: _a, fontFamily: _f, bgColour: _bg, bgOpacity: _bo, textColour: _tc, liveBg: _lb, ...rest }) => rest);
      await invoke("write_default_layout", { data: JSON.stringify(cleaned, null, 2) });

      const s = useOverlayStore.getState();
      const settings = {
        borderRadius: s.borderRadius,
        globalFont: s.globalFont,
        widgetBgColour: s.widgetBgColour,
        widgetBgOpacity: s.widgetBgOpacity,
        widgetTextColour: s.widgetTextColour,
        widgetLiveBg: s.widgetLiveBg,
        panelBgColour: s.panelBgColour,
        panelBgOpacity: s.panelBgOpacity,
        panelAlignH: s.panelAlignH,
        panelAlignV: s.panelAlignV,
        panelWidth: s.panelWidth,
        soundEnabled: s.soundEnabled,
        soundVolume: s.soundVolume,
        twitchColours: s.twitchColours,
        presenceThreshold: s.presenceThreshold,
      };
      await invoke("write_default_settings", { data: JSON.stringify(settings, null, 2) });

      toast.success("Defaults saved");
    } catch (e) {
      toast.error(`Failed to save defaults: ${e}`);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={fileLogging}
            onChange={toggleFileLogging}
            className="accent-blue-500"
          />
          Log events to file
        </label>
        <button
          onClick={handleOpenLogFolder}
          className="text-white/50 hover:text-white/80 transition-colors"
          title="Open log folder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
          </svg>
        </button>
      </div>
      {import.meta.env.DEV && (
        <>
          <hr className="border-white/10" />
          <button
            onClick={handleSaveAsDefaults}
            className="w-full bg-yellow-600/60 hover:bg-yellow-600/80 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            Save as defaults (dev)
          </button>
        </>
      )}
      <hr className="border-white/10" />
      <RestoreDefaults />
    </div>
  );
}

/** Checkbox list of available monitors for multi-monitor overlay. */
function MonitorSelection() {
  const selectedMonitors = useOverlayStore((s) => s.selectedMonitors);
  const setSelectedMonitors = useOverlayStore((s) => s.setSelectedMonitors);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    invoke<MonitorInfo[]>("list_monitors")
      .then(setMonitors)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleToggle(id: string, checked: boolean) {
    const next = checked
      ? [...selectedMonitors, id]
      : selectedMonitors.filter((m) => m !== id);

    // Reconcile windows and prune disconnected monitors
    const pruned = await syncMonitorWindows(next, monitors);
    setSelectedMonitors(pruned);
  }

  if (monitors.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-white/70 text-xs font-medium">Multi-monitor overlay</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-white/40 hover:text-white/70 text-xs transition-colors disabled:opacity-50"
          title="Refresh monitors"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>
      <div className="space-y-1">
        {monitors.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedMonitors.includes(m.id)}
              onChange={(e) => handleToggle(m.id, e.target.checked)}
              className="accent-blue-500"
            />
            <span>{m.name}</span>
            <span className="text-white/40">
              {m.width}x{m.height}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function WidgetsTab() {
  return (
    <div className="space-y-3">
      <WidgetPicker />
      <hr className="border-white/10" />
      <MonitorSelection />
      <hr className="border-white/10" />
      <PresetsSection />
    </div>
  );
}

function CommandsSection() {
  const commands = useOverlayStore((s) => s.commands);
  const setCommands = useOverlayStore((s) => s.setCommands);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");

  function addCommand() {
    const trigger = newTrigger.trim();
    const response = newResponse.trim();
    if (!trigger || !response) return;
    setCommands([...commands, { trigger, response, enabled: true }]);
    setNewTrigger("");
    setNewResponse("");
  }

  function removeCommand(index: number) {
    setCommands(commands.filter((_, i) => i !== index));
  }

  function toggleCommand(index: number) {
    setCommands(commands.map((cmd, i) => i === index ? { ...cmd, enabled: !cmd.enabled } : cmd));
  }

  function updateCommand(index: number, partial: Partial<ChatCommand>) {
    setCommands(commands.map((cmd, i) => i === index ? { ...cmd, ...partial } : cmd));
  }

  return (
    <div className="space-y-2">
      <h3 className="text-white/70 text-xs font-medium">Chat commands</h3>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {commands.map((cmd, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={cmd.enabled}
              onChange={() => toggleCommand(i)}
              className="accent-blue-500 shrink-0"
            />
            <input
              type="text"
              value={cmd.trigger}
              onChange={(e) => updateCommand(i, { trigger: e.target.value })}
              className="w-16 bg-white/10 text-white rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              type="text"
              value={cmd.response}
              onChange={(e) => updateCommand(i, { response: e.target.value })}
              className="flex-1 bg-white/10 text-white rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => removeCommand(i)}
              className="text-red-400 hover:text-red-300 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={newTrigger}
          onChange={(e) => setNewTrigger(e.target.value)}
          placeholder="!trigger"
          className="w-16 bg-white/10 text-white text-xs rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
        />
        <input
          type="text"
          value={newResponse}
          onChange={(e) => setNewResponse(e.target.value)}
          placeholder="Response text ({uptime}, {game}...)"
          className="flex-1 bg-white/10 text-white text-xs rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={addCommand}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-0.5 rounded transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TwitchTab() {
  return (
    <div className="space-y-3">
      <AuthSection />
      <hr className="border-white/10" />
      <ChannelSection />
      <hr className="border-white/10" />
      <CommandsSection />
    </div>
  );
}

/** Event types that support sound alerts. */
const SOUND_EVENT_TYPES = ["follow", "raid", "subscribe", "gift_sub"] as const;

/** Human-readable labels for sound event types. */
const EVENT_LABELS: Record<string, string> = {
  follow: "Follow",
  raid: "Raid",
  subscribe: "Subscribe",
  gift_sub: "Gift sub",
};

/** Pick a custom audio file via the Tauri file dialog. */
async function pickCustomSound(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4a"] }],
  });
  if (typeof result === "string") return result;
  return result ?? null;
}

/** Return a display label for a sound value (built-in name or file basename). */
function soundLabel(sound: string): string {
  if (BUILTIN_SOUNDS.includes(sound as BuiltinSound)) {
    return BUILTIN_SOUND_LABELS[sound as BuiltinSound];
  }
  // Custom file — show just the filename
  const parts = sound.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? sound;
}

function SoundMappingRow({ eventType }: { eventType: string }) {
  const soundMappings = useOverlayStore((s) => s.soundMappings);
  const setSoundMappings = useOverlayStore((s) => s.setSoundMappings);
  const soundVolume = useOverlayStore((s) => s.soundVolume);

  const mapping: SoundMapping = soundMappings[eventType] ?? DEFAULT_SOUND_MAPPINGS[eventType] ?? { enabled: false, sound: "chime" };

  function updateMapping(partial: Partial<SoundMapping>) {
    setSoundMappings({ ...soundMappings, [eventType]: { ...mapping, ...partial } });
  }

  function handleSoundChange(value: string) {
    if (value === "__custom__") {
      pickCustomSound()
        .then((path) => {
          if (path) updateMapping({ sound: convertFileSrc(path) });
        })
        .catch(console.error);
      return;
    }
    updateMapping({ sound: value });
  }

  function handlePreview() {
    playSound(mapping.sound, soundVolume);
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <input
        type="checkbox"
        checked={mapping.enabled}
        onChange={() => updateMapping({ enabled: !mapping.enabled })}
        className="accent-blue-500 shrink-0"
      />
      <span className="text-white/70 w-16 shrink-0">{EVENT_LABELS[eventType] ?? eventType}</span>
      <select
        value={BUILTIN_SOUNDS.includes(mapping.sound as BuiltinSound) ? mapping.sound : "__custom_selected__"}
        onChange={(e) => handleSoundChange(e.target.value)}
        className="flex-1 bg-white/10 text-white rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
      >
        {BUILTIN_SOUNDS.map((s) => (
          <option key={s} value={s}>{BUILTIN_SOUND_LABELS[s]}</option>
        ))}
        {!BUILTIN_SOUNDS.includes(mapping.sound as BuiltinSound) && (
          <option value="__custom_selected__">{soundLabel(mapping.sound)}</option>
        )}
        <option value="__custom__">Browse…</option>
      </select>
      <button
        onClick={handlePreview}
        className="text-white/50 hover:text-white/80 transition-colors shrink-0"
        title="Preview sound"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
        </svg>
      </button>
    </div>
  );
}

function AppearanceTab() {
  const twitchColours = useOverlayStore((s) => s.twitchColours);
  const toggleTwitchColours = useOverlayStore((s) => s.toggleTwitchColours);
  const presenceThreshold = useOverlayStore((s) => s.presenceThreshold);
  const setPresenceThreshold = useOverlayStore((s) => s.setPresenceThreshold);
  const soundEnabled = useOverlayStore((s) => s.soundEnabled);
  const toggleSoundEnabled = useOverlayStore((s) => s.toggleSoundEnabled);
  const soundVolume = useOverlayStore((s) => s.soundVolume);
  const setSoundVolume = useOverlayStore((s) => s.setSoundVolume);
  const borderRadius = useOverlayStore((s) => s.borderRadius);
  const setBorderRadius = useOverlayStore((s) => s.setBorderRadius);
  const globalFont = useOverlayStore((s) => s.globalFont);
  const setGlobalFont = useOverlayStore((s) => s.setGlobalFont);
  const widgetBgColour = useOverlayStore((s) => s.widgetBgColour);
  const setWidgetBgColour = useOverlayStore((s) => s.setWidgetBgColour);
  const widgetBgOpacity = useOverlayStore((s) => s.widgetBgOpacity);
  const setWidgetBgOpacity = useOverlayStore((s) => s.setWidgetBgOpacity);
  const widgetTextColour = useOverlayStore((s) => s.widgetTextColour);
  const setWidgetTextColour = useOverlayStore((s) => s.setWidgetTextColour);
  const panelBgColour = useOverlayStore((s) => s.panelBgColour);
  const setPanelBgColour = useOverlayStore((s) => s.setPanelBgColour);
  const panelBgOpacity = useOverlayStore((s) => s.panelBgOpacity);
  const setPanelBgOpacity = useOverlayStore((s) => s.setPanelBgOpacity);
  const panelAlignH = useOverlayStore((s) => s.panelAlignH);
  const panelAlignV = useOverlayStore((s) => s.panelAlignV);
  const setPanelAlign = useOverlayStore((s) => s.setPanelAlign);
  const widgetLiveBg = useOverlayStore((s) => s.widgetLiveBg);
  const toggleWidgetLiveBg = useOverlayStore((s) => s.toggleWidgetLiveBg);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={twitchColours}
          onChange={toggleTwitchColours}
          className="accent-blue-500"
        />
        Twitch name colours
      </label>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60">Presence threshold</label>
        <input
          type="number"
          value={presenceThreshold}
          onChange={(e) => setPresenceThreshold(Number(e.target.value) || 1000)}
          min={0}
          className="w-20 bg-white/10 text-white text-xs rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Rounded corners</label>
        <input
          type="range"
          min={0}
          max={24}
          value={borderRadius}
          onChange={(e) => setBorderRadius(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <span className="text-xs text-white/50 w-7 text-right">{borderRadius}</span>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-white/60 block">Font</label>
        <FontPicker value={globalFont} onChange={setGlobalFont} />
      </div>
      <hr className="border-white/10" />
      <h3 className="text-white/70 text-xs font-medium">Widget content</h3>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Background</label>
        <input
          type="color"
          value={widgetBgColour}
          onChange={(e) => setWidgetBgColour(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
        />
        <span className="text-xs text-white/40">{widgetBgColour}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">BG opacity</label>
        <input
          type="range"
          min={0}
          max={100}
          value={widgetBgOpacity}
          onChange={(e) => setWidgetBgOpacity(Number(e.target.value))}
          onPointerDown={() => useOverlayStore.getState().setPreviewBg(true)}
          onPointerUp={() => useOverlayStore.getState().setPreviewBg(false)}
          onLostPointerCapture={() => useOverlayStore.getState().setPreviewBg(false)}
          className="flex-1 accent-blue-500"
        />
        <span className="text-xs text-white/50 w-7 text-right">{widgetBgOpacity}%</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Text colour</label>
        <input
          type="color"
          value={widgetTextColour}
          onChange={(e) => setWidgetTextColour(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
        />
        <span className="text-xs text-white/40">{widgetTextColour}</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={widgetLiveBg}
          onChange={toggleWidgetLiveBg}
          className="accent-blue-500"
        />
        Show background in live mode
      </label>
      <hr className="border-white/10" />
      <h3 className="text-white/70 text-xs font-medium">Panel background</h3>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Colour</label>
        <input
          type="color"
          value={panelBgColour}
          onChange={(e) => setPanelBgColour(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
        />
        <span className="text-xs text-white/40">{panelBgColour}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Opacity</label>
        <input
          type="range"
          min={0}
          max={100}
          value={panelBgOpacity}
          onChange={(e) => setPanelBgOpacity(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <span className="text-xs text-white/50 w-7 text-right">{panelBgOpacity}%</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/60 shrink-0">Position</label>
        <div className="grid grid-cols-3 gap-0.5">
          {(["top", "center", "bottom"] as const).map((v) =>
            (["left", "center", "right"] as const).map((h) => (
              <button
                key={`${v}-${h}`}
                onClick={() => setPanelAlign(h, v)}
                className={`w-4 h-4 rounded-sm transition-colors ${panelAlignH === h && panelAlignV === v ? "bg-blue-500" : "bg-white/15 hover:bg-white/30"}`}
                title={`${v}-${h}`}
              />
            ))
          )}
        </div>
      </div>
      <hr className="border-white/10" />
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={toggleSoundEnabled}
            className="accent-blue-500"
          />
          Sound alerts
        </label>
        {soundEnabled && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/60 shrink-0">Volume</label>
              <input
                type="range"
                min={0}
                max={100}
                value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-white/50 w-7 text-right">{soundVolume}</span>
            </div>
            <div className="space-y-1">
              {SOUND_EVENT_TYPES.map((eventType) => (
                <SoundMappingRow key={eventType} eventType={eventType} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TAB_COMPONENTS: Record<Tab, () => React.JSX.Element> = {
  General: GeneralTab,
  Widgets: WidgetsTab,
  Twitch: TwitchTab,
  Appearance: AppearanceTab,
};

/** Convert a hex colour (#RRGGBB) + opacity (0-100) to an rgba string. */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

export function SettingsWidget() {
  const editMode = useOverlayStore((s) => s.editMode);
  const panelWidth = useOverlayStore((s) => s.panelWidth);
  const setPanelWidth = useOverlayStore((s) => s.setPanelWidth);
  const panelBgColour = useOverlayStore((s) => s.panelBgColour);
  const panelBgOpacity = useOverlayStore((s) => s.panelBgOpacity);
  const panelAlignH = useOverlayStore((s) => s.panelAlignH);
  const panelAlignV = useOverlayStore((s) => s.panelAlignV);
  const borderRadius = useOverlayStore((s) => s.borderRadius);
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!resizeRef.current) return;
      const delta = e.clientX - resizeRef.current.startX;
      const next = Math.max(260, Math.min(600, resizeRef.current.startW + delta * 2));
      setPanelWidth(next);
    }
    function onUp() {
      resizeRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setPanelWidth]);

  if (!editMode) return null;

  const TabContent = TAB_COMPONENTS[activeTab];

  const justifyClass = { left: "justify-start", center: "justify-center", right: "justify-end" }[panelAlignH];
  const alignClass = { top: "items-start", center: "items-center", bottom: "items-end" }[panelAlignV];

  return (
    <div className={`fixed inset-0 z-50 flex ${justifyClass} ${alignClass} p-8 pointer-events-none`}>
      <div className="pointer-events-auto relative" style={{ width: panelWidth }}>
        <div
          className="h-full backdrop-blur-sm p-4 space-y-3"
          style={{ backgroundColor: hexToRgba(panelBgColour, panelBgOpacity), borderRadius }}
        >
          <h2 className="text-white text-sm font-semibold">Settings</h2>
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <TabContent />
        </div>
        {/* Right-edge resize handle */}
        <div
          className="absolute top-0 -right-1 w-2 h-full cursor-ew-resize hover:bg-blue-500/30 rounded-r transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            resizeRef.current = { startX: e.clientX, startW: panelWidth };
          }}
        />
      </div>
    </div>
  );
}
