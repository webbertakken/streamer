import { pushChatMessage } from "../widgets/chat/ChatWidget";
import { useTwitchStore } from "../stores/twitch";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const RECONNECT_DELAY_MS = 3000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentChannel: string | null = null;

/** Parse a PRIVMSG IRC line into a chat message, or null if not parseable. */
function parsePRIVMSG(raw: string): { username: string; colour: string; text: string } | null {
  // Tagged message format: @badges=...;color=#FF0000;display-name=Foo;... :foo!foo@foo.tmi.twitch.tv PRIVMSG #channel :message text
  const tagEnd = raw.startsWith("@") ? raw.indexOf(" ") : -1;
  const tags = tagEnd > 0 ? raw.slice(1, tagEnd) : "";
  const rest = tagEnd > 0 ? raw.slice(tagEnd + 1) : raw;

  const privmsgIdx = rest.indexOf(" PRIVMSG ");
  if (privmsgIdx === -1) return null;

  const afterPrivmsg = rest.slice(privmsgIdx + " PRIVMSG ".length);
  const textStart = afterPrivmsg.indexOf(" :");
  if (textStart === -1) return null;

  const text = afterPrivmsg.slice(textStart + 2);

  let displayName = "";
  let colour = "";
  for (const pair of tags.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (key === "display-name") displayName = value;
    else if (key === "color") colour = value;
  }

  // Fallback: extract username from prefix if display-name tag is absent
  if (!displayName) {
    const match = rest.match(/^:(\w+)!/);
    if (match) displayName = match[1];
  }

  if (!displayName) return null;

  return { username: displayName, colour: colour || "#FFFFFF", text };
}

function handleMessage(event: MessageEvent<string>) {
  const lines = (event.data as string).split("\r\n").filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("PING")) {
      ws?.send("PONG :tmi.twitch.tv");
      continue;
    }

    const parsed = parsePRIVMSG(line);
    if (parsed) {
      pushChatMessage({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        username: parsed.username,
        colour: parsed.colour,
        text: parsed.text,
        timestamp: Date.now(),
      });
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (currentChannel) connectChat(currentChannel);
  }, RECONNECT_DELAY_MS);
}

/** Connect to a Twitch channel's chat anonymously. */
export function connectChat(channel: string): void {
  disconnectChat();
  const normalised = channel.toLowerCase().replace(/^#/, "");
  if (!normalised) return;

  currentChannel = normalised;
  const socket = new WebSocket(IRC_URL);
  ws = socket;

  socket.addEventListener("open", () => {
    socket.send("CAP REQ :twitch.tv/tags");
    socket.send("NICK justinfan12345");
    socket.send(`JOIN #${normalised}`);
    useTwitchStore.getState().setConnected(true);
  });

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    useTwitchStore.getState().setConnected(false);
    if (currentChannel) scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket.close();
  });
}

/** Disconnect from Twitch chat. */
export function disconnectChat(): void {
  currentChannel = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  useTwitchStore.getState().setConnected(false);
}
