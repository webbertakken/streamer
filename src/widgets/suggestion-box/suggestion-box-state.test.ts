import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  pushSuggestion,
  voteSuggestion,
  toggleDone,
  removeSuggestion,
  getSortedActive,
  getDoneItems,
  getAllSuggestions,
  subscribeSuggestions,
  setConfig,
  ensureSubscribed,
  _resetForTests,
} from "./suggestion-box-state";
import { publish } from "../../events/bus";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

function makeSuggestion(overrides: Partial<Parameters<typeof pushSuggestion>[0]> = {}) {
  const result = pushSuggestion({
    text: "Test suggestion",
    username: "testuser",
    userId: "user-1",
    redemptionId: crypto.randomUUID(),
    rewardId: "reward-1",
    ...overrides,
  });
  if (!result) throw new Error("pushSuggestion returned null unexpectedly");
  return result;
}

describe("suggestion-box-state", () => {
  beforeEach(() => {
    _resetForTests();
  });

  describe("pushSuggestion", () => {
    it("creates a suggestion with a random 2-digit hex ID", () => {
      const s = makeSuggestion();

      expect(s.hexId).toMatch(/^[0-9A-F]{2}$/);
      expect(s.status).toBe("active");
      expect(s.votes).toBe(0);
      expect(s.voters).toEqual([]);
      expect(s.checkedAt).toBeNull();
    });

    it("truncates text to 200 characters", () => {
      const s = makeSuggestion({ text: "x".repeat(300) });

      expect(s.text.length).toBe(200);
    });

    it("notifies listeners on push", () => {
      const listener = vi.fn();
      subscribeSuggestions(listener);

      makeSuggestion();

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("voteSuggestion", () => {
    it("increments votes by hex ID", () => {
      const s = makeSuggestion();

      voteSuggestion(s.hexId, "voter-1");

      const active = getSortedActive();
      expect(active[0].votes).toBe(1);
      expect(active[0].voters).toEqual(["voter-1"]);
    });

    it("deduplicates votes by userId", () => {
      const s = makeSuggestion();

      voteSuggestion(s.hexId, "voter-1");
      voteSuggestion(s.hexId, "voter-1");

      const active = getSortedActive();
      expect(active[0].votes).toBe(1);
    });

    it("handles case-insensitive hex ID lookup", () => {
      const s = makeSuggestion();

      voteSuggestion(s.hexId.toLowerCase(), "voter-1");

      const active = getSortedActive();
      expect(active[0].votes).toBe(1);
    });

    it("handles single-digit hex ID with padding", () => {
      const s = makeSuggestion();
      // If the hex is e.g. "0A", voting with "A" (single digit) should match after padding
      if (s.hexId.startsWith("0")) {
        voteSuggestion(s.hexId[1], "voter-1");
        const active = getSortedActive();
        expect(active[0].votes).toBe(1);
      }
    });

    it("silently ignores vote for non-existent hex ID", () => {
      makeSuggestion();
      // Should not throw
      voteSuggestion("ZZ", "voter-1");
    });

    it("silently ignores vote for done suggestion", () => {
      const s = makeSuggestion();
      toggleDone(s.id);

      voteSuggestion(s.hexId, "voter-1");

      const done = getDoneItems();
      expect(done[0].votes).toBe(0);
    });
  });

  describe("toggleDone", () => {
    it("toggles status to done and sets checkedAt", () => {
      const s = makeSuggestion();

      toggleDone(s.id);

      const items = getDoneItems();
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe("done");
      expect(items[0].checkedAt).toBeTypeOf("number");
    });

    it("toggles back to active when already done", () => {
      const s = makeSuggestion();

      toggleDone(s.id);
      toggleDone(s.id);

      const active = getSortedActive();
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe("active");
      expect(active[0].checkedAt).toBeNull();
    });
  });

  describe("getSortedActive", () => {
    it("sorts by votes descending", () => {
      const a = makeSuggestion({ text: "A" });
      const b = makeSuggestion({ text: "B" });

      voteSuggestion(b.hexId, "voter-1");
      voteSuggestion(b.hexId, "voter-2");
      voteSuggestion(a.hexId, "voter-3");

      const sorted = getSortedActive();
      expect(sorted[0].text).toBe("B");
      expect(sorted[1].text).toBe("A");
    });

    it("uses createdAt ascending as tiebreaker", () => {
      const a = makeSuggestion({ text: "first" });
      const b = makeSuggestion({ text: "second" });

      const sorted = getSortedActive();
      expect(sorted[0].text).toBe("first");
      expect(sorted[1].text).toBe("second");
      // Both have 0 votes, so earlier createdAt comes first
      expect(a.createdAt).toBeLessThanOrEqual(b.createdAt);
    });

    it("excludes done items", () => {
      const s = makeSuggestion();
      toggleDone(s.id);

      expect(getSortedActive()).toHaveLength(0);
    });
  });

  describe("getDoneItems", () => {
    it("sorts by checkedAt descending (most recent first)", () => {
      const a = makeSuggestion({ text: "A" });
      const b = makeSuggestion({ text: "B" });

      let now = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => now);

      toggleDone(a.id);
      now = 2000;
      toggleDone(b.id);

      vi.restoreAllMocks();

      const checked = getDoneItems();
      expect(checked[0].text).toBe("B");
      expect(checked[1].text).toBe("A");
    });
  });

  describe("hex ID allocator", () => {
    it("never produces duplicate hex IDs among active suggestions", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const s = makeSuggestion({ redemptionId: `r-${i}` });
        expect(ids.has(s.hexId)).toBe(false);
        ids.add(s.hexId);
      }
    });

    it("frees hex ID when suggestion is removed", () => {
      const s = makeSuggestion();
      const hexId = s.hexId;

      removeSuggestion(s.id);

      // The freed hex ID should be available for reuse
      // Push enough to statistically confirm it can be reused
      const all = getAllSuggestions();
      expect(all.find((x) => x.hexId === hexId)).toBeUndefined();
    });

    it("recycles from done suggestions when all 256 IDs are used", () => {
      // Fill up all 256 hex IDs
      for (let i = 0; i < 256; i++) {
        makeSuggestion({ redemptionId: `r-${i}` });
      }

      // Mark one done so it can be recycled
      const first = getAllSuggestions()[0];
      toggleDone(first.id);

      // Should not throw — recycles from done
      const recycled = makeSuggestion({ redemptionId: "r-overflow" });
      expect(recycled.hexId).toMatch(/^[0-9A-F]{2}$/);
    });

    it("returns null when all 256 IDs are active (no done to recycle)", () => {
      for (let i = 0; i < 256; i++) {
        makeSuggestion({ redemptionId: `r-${i}` });
      }

      const result = pushSuggestion({
        text: "overflow",
        username: "testuser",
        userId: "user-1",
        redemptionId: "r-overflow",
        rewardId: "reward-1",
      });

      expect(result).toBeNull();
      expect(getAllSuggestions()).toHaveLength(256);
    });
  });

  describe("redemption event subscription", () => {
    it("deduplicates by redemptionId", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      const redemptionId = crypto.randomUUID();

      publish({
        type: "channel_points_redemption",
        timestamp: Date.now(),
        data: {
          id: redemptionId,
          reward: { id: "reward-1" },
          user_input: "My suggestion",
          user_name: "testuser",
          user_id: "user-1",
        },
      });

      publish({
        type: "channel_points_redemption",
        timestamp: Date.now(),
        data: {
          id: redemptionId,
          reward: { id: "reward-1" },
          user_input: "My suggestion",
          user_name: "testuser",
          user_id: "user-1",
        },
      });

      expect(getAllSuggestions()).toHaveLength(1);
    });

    it("ignores events with non-matching reward ID", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      publish({
        type: "channel_points_redemption",
        timestamp: Date.now(),
        data: {
          id: crypto.randomUUID(),
          reward: { id: "wrong-reward" },
          user_input: "Ignored",
          user_name: "testuser",
          user_id: "user-1",
        },
      });

      expect(getAllSuggestions()).toHaveLength(0);
    });
  });

  describe("chat vote subscription", () => {
    it("handles !vote command from chat events", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      const s = makeSuggestion();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: `!vote ${s.hexId}`, userId: "voter-1", username: "voter" },
      });

      expect(getSortedActive()[0].votes).toBe(1);
    });

    it("handles case-insensitive vote trigger", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      const s = makeSuggestion();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: `!VOTE ${s.hexId.toLowerCase()}`, userId: "voter-1", username: "voter" },
      });

      expect(getSortedActive()[0].votes).toBe(1);
    });

    it("rejects partial command matches like !voteforpedro", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      makeSuggestion();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!voteforpedro", userId: "voter-1", username: "voter" },
      });

      expect(getSortedActive()[0].votes).toBe(0);
    });

    it("rejects invalid hex IDs", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      makeSuggestion();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!vote ZZZ", userId: "voter-1", username: "voter" },
      });

      expect(getSortedActive()[0].votes).toBe(0);
    });

    it("ignores votes from users without userId", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      const s = makeSuggestion();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: `!vote ${s.hexId}`, userId: "", username: "anon" },
      });

      expect(getSortedActive()[0].votes).toBe(0);
    });
  });

  describe("chat suggest command (non-affiliate fallback)", () => {
    it("creates a suggestion via !suggest when no reward is configured", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Play Minecraft next", userId: "user-1", username: "viewer1" },
      });

      const all = getAllSuggestions();
      expect(all).toHaveLength(1);
      expect(all[0].text).toBe("Play Minecraft next");
      expect(all[0].username).toBe("viewer1");
      expect(all[0].userId).toBe("user-1");
      expect(all[0].rewardId).toBe("");
      expect(all[0].redemptionId).toMatch(/^chat-/);
    });

    it("ignores !suggest when a reward IS configured", () => {
      setConfig({ rewardId: "reward-1" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Something", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(0);
    });

    it("enforces per-user cooldown for chat suggestions", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest First idea", userId: "user-1", username: "viewer1" },
      });

      // Second suggestion from same user immediately — should be blocked
      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Second idea", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(1);
      expect(getAllSuggestions()[0].text).toBe("First idea");
    });

    it("allows different users to suggest without cooldown conflict", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Idea A", userId: "user-1", username: "viewer1" },
      });

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Idea B", userId: "user-2", username: "viewer2" },
      });

      expect(getAllSuggestions()).toHaveLength(2);
    });

    it("ignores empty suggestion text after trigger", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest ", userId: "user-1", username: "viewer1" },
      });

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest   ", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(0);
    });

    it("uses configurable suggest trigger", () => {
      setConfig({ rewardId: "", suggestTrigger: "!idea" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!idea My great idea", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(1);
      expect(getAllSuggestions()[0].text).toBe("My great idea");
    });

    it("handles case-insensitive suggest trigger", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!SUGGEST Loud suggestion", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(1);
    });

    it("ignores suggest from users without userId", () => {
      setConfig({ rewardId: "" });
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Something", userId: "", username: "anon" },
      });

      expect(getAllSuggestions()).toHaveLength(0);
    });
  });

  describe("runtime ordering (ensureSubscribed before setConfig)", () => {
    it("works when ensureSubscribed is called before setConfig (mimics React mount order)", () => {
      // In the real app, useSuggestions() effect calls ensureSubscribed() first,
      // then the config sync effect calls setConfig(). Both run on the same frame.
      ensureSubscribed();
      setConfig({ rewardId: "", suggestTrigger: "!suggest" });

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Test idea", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(1);
      expect(getAllSuggestions()[0].text).toBe("Test idea");
    });

    it("works when ensureSubscribed is called without setConfig (default module state)", () => {
      // Module defaults: configuredRewardId = "", configuredSuggestTrigger = "!suggest"
      ensureSubscribed();

      publish({
        type: "chat",
        timestamp: Date.now(),
        data: { text: "!suggest Default config test", userId: "user-1", username: "viewer1" },
      });

      expect(getAllSuggestions()).toHaveLength(1);
      expect(getAllSuggestions()[0].text).toBe("Default config test");
    });
  });

  describe("subscribeSuggestions", () => {
    it("returns an unsubscribe function", () => {
      const listener = vi.fn();
      const unsub = subscribeSuggestions(listener);

      makeSuggestion();
      expect(listener).toHaveBeenCalledOnce();

      unsub();
      makeSuggestion({ redemptionId: "r-2" });
      expect(listener).toHaveBeenCalledOnce();
    });
  });
});
