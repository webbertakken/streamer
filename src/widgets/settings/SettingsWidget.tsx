import { useState } from "react";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { connectChat, disconnectChat } from "../../twitch/irc";
import { login, logout } from "../../twitch/auth";
import { getWidgets } from "../registry";

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

function OptionsSection() {
  const fileLogging = useOverlayStore((s) => s.fileLogging);
  const toggleFileLogging = useOverlayStore((s) => s.toggleFileLogging);
  const presenceThreshold = useOverlayStore((s) => s.presenceThreshold);
  const setPresenceThreshold = useOverlayStore((s) => s.setPresenceThreshold);

  return (
    <div className="space-y-2">
      <h3 className="text-white/70 text-xs font-medium">Options</h3>
      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={fileLogging}
          onChange={toggleFileLogging}
          className="accent-blue-500"
        />
        Log events to file
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

export function SettingsWidget() {
  const editMode = useOverlayStore((s) => s.editMode);
  if (!editMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="w-72 pointer-events-auto">
      <div className="h-full bg-black/60 rounded-lg backdrop-blur-sm p-4 space-y-4">
        <h2 className="text-white text-sm font-semibold">Settings</h2>
        <AuthSection />
        <hr className="border-white/10" />
        <ChannelSection />
        <hr className="border-white/10" />
        <OptionsSection />
        <hr className="border-white/10" />
        <WidgetPicker />
      </div>
      </div>
    </div>
  );
}
