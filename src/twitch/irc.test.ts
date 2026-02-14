import { describe, it, expect } from "vitest";
import { parsePRIVMSG, parseColourTag, defaultColourForUsername, parseEmotes } from "./irc";

describe("parsePRIVMSG", () => {
  it("extracts username colour from IRC tags", () => {
    const raw =
      "@badge-info=;badges=broadcaster/1;color=#FF4500;display-name=TestUser;emotes=;flags=;id=abc123;mod=0;room-id=12345;subscriber=0;tmi-sent-ts=1234567890;turbo=0;user-id=67890;user-type= :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Hello world";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.colour).toBe("#FF4500");
    expect(result!.username).toBe("TestUser");
    expect(result!.text).toBe("Hello world");
  });

  it("assigns a deterministic default colour when no colour tag is present", () => {
    const raw =
      "@badge-info=;badges=;color=;display-name=NoColourUser;emotes=;id=abc;mod=0;room-id=123;subscriber=0;tmi-sent-ts=123;user-id=456;user-type= :nocolouruser!nocolouruser@nocolouruser.tmi.twitch.tv PRIVMSG #channel :Hi";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.colour).toBe(defaultColourForUsername("NoColourUser"));
    expect(result!.colour).not.toBe("#FFFFFF");
  });

  it("assigns a deterministic default colour when colour tag value is empty", () => {
    const raw =
      "@color=;display-name=User :user!user@user.tmi.twitch.tv PRIVMSG #ch :test";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.colour).toBe(defaultColourForUsername("User"));
  });

  it("extracts badges from IRC tags", () => {
    const raw =
      "@badges=broadcaster/1,subscriber/12;color=#9ACD32;display-name=Streamer :streamer!streamer@streamer.tmi.twitch.tv PRIVMSG #channel :Hey chat";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.badges).toEqual([
      { setId: "broadcaster", versionId: "1" },
      { setId: "subscriber", versionId: "12" },
    ]);
  });

  it("falls back to nick prefix when display-name is missing", () => {
    const raw =
      "@color=#1E90FF :someuser!someuser@someuser.tmi.twitch.tv PRIVMSG #channel :message";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.username).toBe("someuser");
    expect(result!.colour).toBe("#1E90FF");
  });

  it("returns null for non-PRIVMSG lines", () => {
    const raw = ":tmi.twitch.tv 001 justinfan12345 :Welcome, GLHF!";

    expect(parsePRIVMSG(raw)).toBeNull();
  });

  it("returns null when message text portion is missing", () => {
    const raw =
      "@display-name=User :user!user@user.tmi.twitch.tv PRIVMSG #channel";

    expect(parsePRIVMSG(raw)).toBeNull();
  });

  it("handles messages without tags", () => {
    const raw = ":user!user@user.tmi.twitch.tv PRIVMSG #channel :no tags here";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.username).toBe("user");
    expect(result!.colour).toBe(defaultColourForUsername("user"));
    expect(result!.text).toBe("no tags here");
  });

  it("preserves the full hex colour including hash", () => {
    const raw =
      "@color=#00FF7F;display-name=GreenUser :greenuser!greenuser@greenuser.tmi.twitch.tv PRIVMSG #channel :green message";

    const result = parsePRIVMSG(raw);

    expect(result!.colour).toBe("#00FF7F");
  });
});

describe("parseColourTag", () => {
  it("extracts colour from a GLOBALUSERSTATE line", () => {
    const raw =
      "@badge-info=;badges=;color=#8A2BE2;display-name=TestUser;emote-sets=0;user-id=12345;user-type= :tmi.twitch.tv GLOBALUSERSTATE";

    expect(parseColourTag(raw)).toBe("#8A2BE2");
  });

  it("returns null when no tags are present", () => {
    expect(parseColourTag(":tmi.twitch.tv GLOBALUSERSTATE")).toBeNull();
  });

  it("returns null when colour tag has empty value", () => {
    const raw = "@color=;display-name=User :tmi.twitch.tv USERSTATE #channel";

    expect(parseColourTag(raw)).toBeNull();
  });

  it("extracts colour from a USERSTATE line", () => {
    const raw =
      "@badge-info=subscriber/1;badges=subscriber/0;color=#DAA520;display-name=Sub;emote-sets=0;mod=0;subscriber=1;user-type= :tmi.twitch.tv USERSTATE #channel";

    expect(parseColourTag(raw)).toBe("#DAA520");
  });
});

describe("parseEmotes", () => {
  it("handles a single emote", () => {
    const result = parseEmotes("emotesv2_abc123:0-4");

    expect(result).toEqual([{ id: "emotesv2_abc123", start: 0, end: 4 }]);
  });

  it("handles multiple different emotes", () => {
    const result = parseEmotes("emotesv2_abc:0-4/emotesv2_def:6-10");

    expect(result).toEqual([
      { id: "emotesv2_abc", start: 0, end: 4 },
      { id: "emotesv2_def", start: 6, end: 10 },
    ]);
  });

  it("handles the same emote used at multiple positions", () => {
    const result = parseEmotes("emotesv2_abc:0-4,10-14");

    expect(result).toEqual([
      { id: "emotesv2_abc", start: 0, end: 4 },
      { id: "emotesv2_abc", start: 10, end: 14 },
    ]);
  });

  it("returns empty array for empty string", () => {
    expect(parseEmotes("")).toEqual([]);
  });

  it("handles numeric emote IDs", () => {
    const result = parseEmotes("25:0-4");

    expect(result).toEqual([{ id: "25", start: 0, end: 4 }]);
  });
});

describe("parsePRIVMSG emotes", () => {
  it("extracts emotes from IRC tags", () => {
    const raw =
      "@color=#FF4500;display-name=User;emotes=25:0-4 :user!user@user.tmi.twitch.tv PRIVMSG #channel :Kappa test";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.emotes).toEqual([{ id: "25", start: 0, end: 4 }]);
  });

  it("returns empty emotes when emotes tag is empty", () => {
    const raw =
      "@color=#FF4500;display-name=User;emotes= :user!user@user.tmi.twitch.tv PRIVMSG #channel :Hello";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.emotes).toEqual([]);
  });

  it("returns empty emotes when no emotes tag is present", () => {
    const raw =
      "@color=#FF4500;display-name=User :user!user@user.tmi.twitch.tv PRIVMSG #channel :Hello";

    const result = parsePRIVMSG(raw);

    expect(result).not.toBeNull();
    expect(result!.emotes).toEqual([]);
  });
});
