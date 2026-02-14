import { describe, it, expect, beforeEach } from "vitest";
import { useOverlayStore } from "./overlay";
import defaultSettings from "../assets/default-settings.json";

describe("overlay store – textBgOpacity", () => {
  beforeEach(() => {
    useOverlayStore.setState({ textBgOpacity: defaultSettings.textBgOpacity });
  });

  it("initialises with the default textBgOpacity", () => {
    expect(useOverlayStore.getState().textBgOpacity).toBe(80);
  });

  it("handles setTextBgOpacity", () => {
    useOverlayStore.getState().setTextBgOpacity(75);
    expect(useOverlayStore.getState().textBgOpacity).toBe(75);
  });

  it("handles setTextBgOpacity to zero", () => {
    useOverlayStore.getState().setTextBgOpacity(0);
    expect(useOverlayStore.getState().textBgOpacity).toBe(0);
  });

  it("resets textBgOpacity on restoreDefaults", () => {
    useOverlayStore.getState().setTextBgOpacity(99);
    useOverlayStore.getState().restoreDefaults();
    expect(useOverlayStore.getState().textBgOpacity).toBe(defaultSettings.textBgOpacity);
  });
});
