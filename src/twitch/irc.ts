import { invoke } from "@tauri-apps/api/core";
import { pushChatMessage } from "../widgets/chat/ChatWidget";
import { useTwitchStore } from "../stores/twitch";
import { publish } from "../events/bus";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const RECONNECT_DELAY_MS = 3000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentChannel: string | null = null;
let botNick: string | null = null;

interface IrcTokenResponse {
  token: string;
  username: string;
}

/** Parse a PRIVMSG IRC line into a chat message, or null if not parseable. */
function parsePRIVMSG(raw: string): { username: string; colour: string; text: string } | null {
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

  if (!displayName) {
    const match = rest.match(/^:(\w+)!/);
    if (match) displayName = match[1];
  }

  if (!displayName) return null;

  return { username: displayName, colour: colour || "#FFFFFF", text };
}

/** Parse a JOIN or PART line, returning the username or null. */
function parseJoinPart(raw: string): { username: string; type: "join" | "part" } | null {
  // Format: :username!username@username.tmi.twitch.tv JOIN #channel
  const joinMatch = raw.match(/^:(\w+)!\w+@\w+\.tmi\.twitch\.tv JOIN /);
  if (joinMatch) return { username: joinMatch[1], type: "join" };

  const partMatch = raw.match(/^:(\w+)!\w+@\w+\.tmi\.twitch\.tv PART /);
  if (partMatch) return { username: partMatch[1], type: "part" };

  return null;
}

/** Extract the color tag value from an IRC tags string. */
function parseColourTag(raw: string): string | null {
  const tagEnd = raw.startsWith("@") ? raw.indexOf(" ") : -1;
  if (tagEnd <= 0) return null;
  const tags = raw.slice(1, tagEnd);
  for (const pair of tags.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq) === "color" && pair.length > eq + 1) return pair.slice(eq + 1);
  }
  return null;
}

function handleMessage(event: MessageEvent<string>) {
  const lines = (event.data as string).split("\r\n").filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("PING")) {
      ws?.send("PONG :tmi.twitch.tv");
      continue;
    }

    // Capture user colour from GLOBALUSERSTATE or USERSTATE
    if (line.includes(" GLOBALUSERSTATE") || line.includes(" USERSTATE ")) {
      const colour = parseColourTag(line);
      if (colour) useTwitchStore.getState().setUserColour(colour);
      continue;
    }

    const parsed = parsePRIVMSG(line);
    if (parsed) {
      // Skip echoed own messages to avoid duplicates when showOwnMessages is on
      if (botNick && parsed.username.toLowerCase() === botNick) continue;

      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        username: parsed.username,
        colour: parsed.colour,
        text: parsed.text,
        timestamp: Date.now(),
      };
      pushChatMessage(msg);
      publish({
        type: "chat",
        timestamp: msg.timestamp,
        data: { username: parsed.username, text: parsed.text },
      });
      continue;
    }

    // Strip tags before checking JOIN/PART
    const tagEnd = line.startsWith("@") ? line.indexOf(" ") : -1;
    const rest = tagEnd > 0 ? line.slice(tagEnd + 1) : line;
    const joinPart = parseJoinPart(rest);
    if (joinPart && joinPart.username.toLowerCase() !== botNick) {
      publish({
        type: joinPart.type,
        timestamp: Date.now(),
        data: { username: joinPart.username },
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

/** Connect to a Twitch channel's chat. Uses authenticated mode if logged in. */
export async function connectChat(channel: string): Promise<void> {
  disconnectChat();
  const normalised = channel.toLowerCase().replace(/^#/, "");
  if (!normalised) return;

  currentChannel = normalised;
  const socket = new WebSocket(IRC_URL);
  ws = socket;

  const { authenticated } = useTwitchStore.getState();

  socket.addEventListener("open", async () => {
    try {
      if (authenticated) {
        const { token, username }: IrcTokenResponse = await invoke("auth_get_irc_token");
        socket.send(
          `CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership`,
        );
        socket.send(`PASS oauth:${token}`);
        socket.send(`NICK ${username}`);
        botNick = username.toLowerCase();
      } else {
        socket.send("CAP REQ :twitch.tv/tags");
        socket.send("NICK justinfan12345");
        botNick = "justinfan12345";
      }
      socket.send(`JOIN #${normalised}`);
      useTwitchStore.getState().setConnected(true);
    } catch (e) {
      console.error("IRC auth failed, falling back to anonymous:", e);
      socket.send("CAP REQ :twitch.tv/tags");
      socket.send("NICK justinfan12345");
        botNick = "justinfan12345";
      socket.send(`JOIN #${normalised}`);
      useTwitchStore.getState().setConnected(true);
    }
  });

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    if (ws !== socket) return; // stale socket from a previous connection
    useTwitchStore.getState().setConnected(false);
    if (currentChannel) scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    if (ws !== socket) return;
    socket.close();
  });
}

/** Send a chat message to the current channel. */
export function sendChatMessage(text: string): void {
  if (!ws || !currentChannel || ws.readyState !== WebSocket.OPEN) return;
  ws.send(`PRIVMSG #${currentChannel} :${text}`);

  const { username, userColour } = useTwitchStore.getState();
  pushChatMessage({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: username || botNick || "me",
    colour: userColour,
    text,
    timestamp: Date.now(),
  });
}

/** Disconnect from Twitch chat. */
export function disconnectChat(): void {
  currentChannel = null;
  botNick = null;
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
