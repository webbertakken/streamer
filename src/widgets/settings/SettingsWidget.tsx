import { useState } from "react";
import { useOverlayStore } from "../../stores/overlay";
import { useTwitchStore } from "../../stores/twitch";
import { connectChat, disconnectChat } from "../../twitch/irc";
import { getWidgets } from "../registry";

function SettingsContent() {
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
    <div className="space-y-3">
      <h2 className="text-white text-sm font-semibold">Settings</h2>

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
  const widgetTypes = getWidgets();

  return (
    <div className="space-y-2">
      <h3 className="text-white/70 text-xs font-medium">Add widgets</h3>
      <div className="flex flex-wrap gap-1.5">
        {widgetTypes.map((def) => (
          <button
            key={def.id}
            onClick={() => addInstance(def.id)}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded transition-colors"
          >
            <span>+</span>
            <span>{def.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsWidget() {
  const editMode = useOverlayStore((s) => s.editMode);
  if (!editMode) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-72">
      <div className="h-full bg-black/60 rounded-lg backdrop-blur-sm p-4 space-y-4">
        <SettingsContent />
        <hr className="border-white/10" />
        <WidgetPicker />
      </div>
    </div>
  );
}
