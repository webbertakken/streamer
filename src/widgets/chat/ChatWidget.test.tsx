import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useOverlayStore } from "../../stores/overlay";
import { pushChatMessage, messages } from "./chat-state";
import type { ChatMessage } from "./chat-state";

// jsdom does not implement scrollTo
Element.prototype.scrollTo = vi.fn();

// Mock Tauri invoke to prevent native calls during tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock badges to avoid network calls
vi.mock("../../twitch/badges", () => ({
  getBadgeUrl: () => null,
}));

// Minimal Widget wrapper that only renders children (avoids full Widget dependency chain)
vi.mock("../Widget", () => ({
  Widget: ({ children }: { children: React.ReactNode }) => <div data-testid="widget-wrapper">{children}</div>,
  useContentAlign: () => "left" as const,
  contentAlignClass: () => "items-start",
}));

// Mock IRC functions
vi.mock("../../twitch/irc", () => ({
  sendChatMessage: vi.fn(),
  defaultColourForUsername: (username: string) => {
    const COLOURS = [
      "#FF0000", "#0000FF", "#00FF00", "#B22222", "#FF7F50",
      "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E",
      "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = (hash * 31 + username.charCodeAt(i)) | 0;
    }
    return COLOURS[Math.abs(hash) % COLOURS.length];
  },
}));

// Import after mocks are set up
const { ChatWidget, splitMessageFragments } = await import("./ChatWidget");

function addTestMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  const msg: ChatMessage = {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: "TestUser",
    colour: "#FF4500",
    text: "Hello world",
    timestamp: Date.now(),
    ...overrides,
  };
  pushChatMessage(msg);
  return msg;
}

beforeEach(() => {
  messages.length = 0;
  useOverlayStore.setState({
    editMode: false,
    twitchColours: true,
    borderRadius: 8,
    instances: [
      {
        instanceId: "chat-1",
        typeId: "chat",
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        visible: true,
        locked: false,
      },
    ],
  });
});

afterEach(cleanup);

describe("ChatWidget colour rendering", () => {
  it("renders username with Twitch colour when twitchColours is enabled", () => {
    addTestMessage({ username: "ColouredUser", colour: "#FF4500" });

    render(<ChatWidget instanceId="chat-1" />);

    const username = screen.getByText("ColouredUser");
    expect(username.style.color).toBe("rgb(255, 69, 0)");
  });

  it("renders username in white when twitchColours is disabled", () => {
    useOverlayStore.setState({ twitchColours: false });
    addTestMessage({ username: "AnyUser", colour: "#FF4500" });

    render(<ChatWidget instanceId="chat-1" />);

    const username = screen.getByText("AnyUser");
    expect(username.style.color).toBe("rgb(255, 255, 255)");
  });

  it("renders different colours for different users", () => {
    addTestMessage({ username: "RedUser", colour: "#FF0000" });
    addTestMessage({ username: "BlueUser", colour: "#0000FF" });

    render(<ChatWidget instanceId="chat-1" />);

    const redUser = screen.getByText("RedUser");
    const blueUser = screen.getByText("BlueUser");
    expect(redUser.style.color).toBe("rgb(255, 0, 0)");
    expect(blueUser.style.color).toBe("rgb(0, 0, 255)");
  });

  it("renders default white when message has no custom colour", () => {
    addTestMessage({ username: "DefaultUser", colour: "#FFFFFF" });

    render(<ChatWidget instanceId="chat-1" />);

    const username = screen.getByText("DefaultUser");
    expect(username.style.color).toBe("rgb(255, 255, 255)");
  });

  it("falls back to defaultColourForUsername when colour is empty", () => {
    addTestMessage({ username: "EmptyColourUser", colour: "" });

    render(<ChatWidget instanceId="chat-1" />);

    const username = screen.getByText("EmptyColourUser");
    expect(username.style.color).not.toBe("");
    expect(username.style.color).not.toBe("rgb(255, 255, 255)");
  });

  it("renders username as a bold span", () => {
    addTestMessage({ username: "BoldUser", colour: "#9ACD32" });

    render(<ChatWidget instanceId="chat-1" />);

    const username = screen.getByText("BoldUser");
    expect(username.tagName).toBe("SPAN");
    expect(username.classList.contains("font-bold")).toBe(true);
  });

  it("renders message text alongside the username", () => {
    addTestMessage({ username: "Chatter", text: "great stream!" });

    render(<ChatWidget instanceId="chat-1" />);

    expect(screen.getByText("Chatter")).toBeTruthy();
    expect(screen.getByText(/great stream!/)).toBeTruthy();
  });
});

describe("splitMessageFragments", () => {
  it("returns full text when no emotes are present", () => {
    const result = splitMessageFragments("Hello world", undefined);

    expect(result).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("returns full text when emotes array is empty", () => {
    const result = splitMessageFragments("Hello world", []);

    expect(result).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("splits text around a single emote", () => {
    const result = splitMessageFragments("Hello Kappa world", [
      { id: "25", start: 6, end: 10 },
    ]);

    expect(result).toEqual([
      { type: "text", text: "Hello " },
      { type: "emote", id: "25", name: "Kappa" },
      { type: "text", text: " world" },
    ]);
  });

  it("handles emote at the start of the message", () => {
    const result = splitMessageFragments("Kappa hello", [
      { id: "25", start: 0, end: 4 },
    ]);

    expect(result).toEqual([
      { type: "emote", id: "25", name: "Kappa" },
      { type: "text", text: " hello" },
    ]);
  });

  it("handles emote at the end of the message", () => {
    const result = splitMessageFragments("hello Kappa", [
      { id: "25", start: 6, end: 10 },
    ]);

    expect(result).toEqual([
      { type: "text", text: "hello " },
      { type: "emote", id: "25", name: "Kappa" },
    ]);
  });

  it("handles multiple emotes", () => {
    const result = splitMessageFragments("Kappa hi PogChamp", [
      { id: "25", start: 0, end: 4 },
      { id: "305954156", start: 9, end: 17 },
    ]);

    expect(result).toEqual([
      { type: "emote", id: "25", name: "Kappa" },
      { type: "text", text: " hi " },
      { type: "emote", id: "305954156", name: "PogChamp" },
    ]);
  });
});

describe("ChatWidget emote rendering", () => {
  it("renders emotes as images", () => {
    addTestMessage({
      username: "EmoteUser",
      text: "Hello Kappa world",
      emotes: [{ id: "25", start: 6, end: 10 }],
    });

    render(<ChatWidget instanceId="chat-1" />);

    const img = screen.getByAltText("Kappa");
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toContain("/25/default/dark/1.0");
  });

  it("renders plain text when no emotes are present", () => {
    addTestMessage({ username: "PlainUser", text: "no emotes here" });

    render(<ChatWidget instanceId="chat-1" />);

    expect(screen.getByText(/no emotes here/)).toBeTruthy();
  });
});
