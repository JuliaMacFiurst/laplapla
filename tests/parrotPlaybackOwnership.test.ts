import { describe, expect, it, vi } from "vitest";
import { createParrotPlaybackOwnership } from "@/lib/parrots/playbackOwnership";

function createActions(events: string[]) {
  let onEnded: (() => void) | null = null;
  return {
    actions: {
      stopMain: vi.fn(() => events.push("stop-main")),
      startMain: vi.fn(() => events.push("start-main")),
      stopPreview: vi.fn(() => events.push("stop-preview")),
      startPreview: vi.fn((ended: () => void) => {
        events.push("start-preview");
        onEnded = ended;
      }),
      onPreviewStateChange: vi.fn((playing: boolean) => events.push(playing ? "playing" : "idle")),
    },
    endPreview: () => onEnded?.(),
  };
}

describe("Parrot playback ownership", () => {
  it("starts Listen and exposes Stop state", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    createParrotPlaybackOwnership().togglePreview(fixture.actions);
    expect(events).toEqual(["stop-main", "playing", "start-preview"]);
  });

  it("stops an active preview without creating a second instance", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    const ownership = createParrotPlaybackOwnership();
    ownership.togglePreview(fixture.actions);
    ownership.togglePreview(fixture.actions);
    expect(fixture.actions.startPreview).toHaveBeenCalledTimes(1);
    expect(events.slice(-2)).toEqual(["stop-preview", "idle"]);
  });

  it("returns to idle when preview ends naturally", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    createParrotPlaybackOwnership().togglePreview(fixture.actions);
    fixture.endPreview();
    expect(events.at(-1)).toBe("idle");
  });

  it("stops preview before starting main playback", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    const ownership = createParrotPlaybackOwnership();
    ownership.togglePreview(fixture.actions);
    events.length = 0;
    ownership.toggleMain(false, fixture.actions);
    expect(events).toEqual(["stop-preview", "idle", "start-main"]);
  });

  it("stops main playback before starting Listen", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    createParrotPlaybackOwnership().togglePreview(fixture.actions);
    expect(events.indexOf("stop-main")).toBeLessThan(events.indexOf("start-preview"));
  });

  it("cleans up an active preview", () => {
    const events: string[] = [];
    const fixture = createActions(events);
    const ownership = createParrotPlaybackOwnership();
    ownership.togglePreview(fixture.actions);
    ownership.cleanup(fixture.actions);
    expect(events.slice(-2)).toEqual(["stop-preview", "idle"]);
  });
});
