import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WakeTheDuneGame } from "@/components/mini-games/WakeTheDuneGame";
import { shouldReloadForControllerChange } from "@/components/PWA/PWAAppShell";
import { MINI_GAME_REGISTRY } from "@/lib/miniGames/registry";
import { WAKE_THE_DUNE_STEM_ORDER } from "@/lib/miniGames/wakeTheDuneAssets";
import {
  WAKE_THE_DUNE_COPY,
  WAKE_THE_DUNE_LEVELS,
  WAKE_THE_DUNE_MAX_SCORE,
  getExpectedTapTimesMs,
  getPhraseMarkerTimesMs,
  getWakeDuneLighting,
  judgeRhythmTap,
  scoreRhythmTap,
} from "@/lib/miniGames/wakeTheDune";
import {
  INITIAL_WAKE_THE_DUNE_PROGRESS,
  reduceWakeTheDuneProgress,
  type WakeTheDuneProgress,
} from "@/lib/miniGames/wakeTheDuneProgress";

const enterPlay = (state: WakeTheDuneProgress, attemptId: number) => {
  state = reduceWakeTheDuneProgress(state, { type: "begin-demo", attemptId });
  state = reduceWakeTheDuneProgress(state, { type: "handoff", attemptId });
  return reduceWakeTheDuneProgress(state, { type: "begin-play", attemptId });
};

const completeLevel = (state: WakeTheDuneProgress, attemptId: number) => {
  state = enterPlay(state, attemptId);
  state = reduceWakeTheDuneProgress(state, { type: "reward", attemptId });
  return reduceWakeTheDuneProgress(state, { type: "advance", totalLevels: 8 });
};

describe("Wake the Dune mini-game", () => {
  it("registers a stable standalone route associated with Sound Case 001", () => {
    expect(MINI_GAME_REGISTRY).toContainEqual(expect.objectContaining({
      id: "wake-the-dune", route: "/mini-games/wake-the-dune", sourceCaseId: "sound-case-001",
    }));
  });

  it("has exactly eight increasingly complex rhythms in canonical stem order", () => {
    expect(WAKE_THE_DUNE_LEVELS).toHaveLength(8);
    expect(WAKE_THE_DUNE_LEVELS.map((level) => level.stem)).toEqual(WAKE_THE_DUNE_STEM_ORDER);
    for (const level of WAKE_THE_DUNE_LEVELS) {
      const times = getExpectedTapTimesMs(level);
      expect(times.length).toBeGreaterThanOrEqual(3);
      expect(times.every((time, index) => index === 0 || time > times[index - 1])).toBe(true);
      expect(level.toleranceMs).toBeGreaterThanOrEqual(200);
    }
    expect(WAKE_THE_DUNE_LEVELS[0].beatPositions).toHaveLength(3);
    expect(WAKE_THE_DUNE_LEVELS[1].beatPositions).toHaveLength(3);
    expect(WAKE_THE_DUNE_LEVELS.at(-1)?.guide).toBe("memory");
    expect(WAKE_THE_DUNE_LEVELS.at(-1)?.phraseStarts).toEqual([0, 3, 5, 7]);
  });

  it("uses one canonical lighting progress for sun position and dune light direction", () => {
    const morning = getWakeDuneLighting(0.12);
    const midday = getWakeDuneLighting(0.41);
    const afternoon = getWakeDuneLighting(0.68);
    expect(morning.progress).toBe(0.12);
    expect(morning.sunX).toBeGreaterThan(midday.sunX);
    expect(midday.sunX).toBeGreaterThan(afternoon.sunX);
    expect(morning.lightRight).toBeGreaterThan(morning.lightLeft);
    expect(morning.shadowLeft).toBeGreaterThan(morning.shadowRight);
    expect(Math.abs(midday.lightLeft - midday.lightRight)).toBeLessThan(0.02);
    expect(afternoon.lightLeft).toBeGreaterThan(afternoon.lightRight);
    expect(afternoon.shadowRight).toBeGreaterThan(afternoon.shadowLeft);
  });

  it("progresses sequentially through all eight levels without returning to level 1", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 7; attemptId += 1) {
      state = completeLevel(state, attemptId);
      expect(state.levelIndex).toBe(attemptId);
      expect(state.phase).toBe("ready");
    }
    state = enterPlay(state, 8);
    state = reduceWakeTheDuneProgress(state, { type: "reward", attemptId: 8 });
    expect(state.levelIndex).toBe(7);
    expect(state.unlockedStems).toBe(8);
    state = reduceWakeTheDuneProgress(state, { type: "advance", totalLevels: 8 });
    expect(state.phase).toBe("complete");
    expect(state.levelIndex).toBe(7);
  });

  it.each(["early", "late"] as const)("keeps an %s miss and retry on level 4", (failure) => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 3; attemptId += 1) state = completeLevel(state, attemptId);
    state = enterPlay(state, 4);
    state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId: 4, failure });
    expect(state.levelIndex).toBe(3);
    expect(state.phase).toBe("failed");
    state = reduceWakeTheDuneProgress(state, { type: "begin-demo", attemptId: 5 });
    expect(state.levelIndex).toBe(3);
    expect(state.phase).toBe("listen");
  });

  it("ignores delayed level 1–3 LISTEN, PLAY, and audio/reward callbacks after reaching level 4", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 3; attemptId += 1) state = completeLevel(state, attemptId);
    state = enterPlay(state, 4);
    state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId: 4, failure: "late" });
    state = reduceWakeTheDuneProgress(state, { type: "begin-demo", attemptId: 5 });
    const current = state;
    for (const oldAttempt of [1, 2, 3, 4]) {
      expect(reduceWakeTheDuneProgress(state, { type: "handoff", attemptId: oldAttempt })).toBe(current);
      expect(reduceWakeTheDuneProgress(state, { type: "begin-play", attemptId: oldAttempt })).toBe(current);
      expect(reduceWakeTheDuneProgress(state, { type: "reward", attemptId: oldAttempt })).toBe(current);
    }
    expect(state.levelIndex).toBe(3);
    expect(state.phase).toBe("listen");
  });

  it("ignores input during LISTEN and keeps ordinary phase transitions on the same level", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 3; attemptId += 1) state = completeLevel(state, attemptId);
    state = reduceWakeTheDuneProgress(state, { type: "begin-demo", attemptId: 4 });
    const listening = state;
    expect(reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 4, points: 100, accuracy: "perfect" })).toBe(listening);
    state = reduceWakeTheDuneProgress(state, { type: "handoff", attemptId: 4 });
    expect(state.levelIndex).toBe(3);
    state = reduceWakeTheDuneProgress(state, { type: "begin-play", attemptId: 4 });
    expect(state.levelIndex).toBe(3);
    expect(state.phase).toBe("play");
  });

  it("does not reload when the first service worker claims the active page", () => {
    expect(shouldReloadForControllerChange(false, false)).toBe(false);
    expect(shouldReloadForControllerChange(true, false)).toBe(true);
    expect(shouldReloadForControllerChange(true, true)).toBe(false);
  });

  it("allows the 127.0.0.1 dev origin so HMR cannot force a full-document recovery reload", () => {
    const config = readFileSync(join(process.cwd(), "next.config.js"), "utf8");
    expect(config).toContain('["192.168.*.*", "127.0.0.1"]');
    expect(config).toContain("  allowedDevOrigins,");
  });

  it("only the explicit restart action can create level-one progress", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 4; attemptId += 1) state = completeLevel(state, attemptId);
    expect(state.levelIndex).toBe(4);
    const ordinaryActions = [
      { type: "begin-demo", attemptId: 5 } as const,
      { type: "handoff", attemptId: 5 } as const,
      { type: "begin-play", attemptId: 5 } as const,
      { type: "fail", attemptId: 5, failure: "late" } as const,
      { type: "reward", attemptId: 5 } as const,
      { type: "advance", totalLevels: 8 } as const,
    ];
    for (const action of ordinaryActions) {
      state = reduceWakeTheDuneProgress(state, action);
      expect(state.levelIndex).toBe(4);
    }
    expect(reduceWakeTheDuneProgress(state, { type: "restart" }).levelIndex).toBe(0);
  });

  it("judges normalized monotonic offsets with forgiving windows", () => {
    expect(judgeRhythmTap(1000, 780, 250)).toBe("hit");
    expect(judgeRhythmTap(1000, 749, 250)).toBe("early");
    expect(judgeRhythmTap(1000, 1251, 250)).toBe("late");
  });

  it("scores PERFECT, GREAT, and GOOD without changing pass tolerance", () => {
    expect(scoreRhythmTap(1000, 1070)).toEqual({ accuracy: "perfect", points: 100 });
    expect(scoreRhythmTap(1000, 1140)).toEqual({ accuracy: "great", points: 75 });
    expect(scoreRhythmTap(1000, 1200)).toEqual({ accuracy: "good", points: 50 });
    expect(judgeRhythmTap(1000, 1251, 250)).toBe("late");
    expect(WAKE_THE_DUNE_MAX_SCORE).toBe(7300);
  });

  it("discards failed attempt points and commits a successful attempt once", () => {
    let state = enterPlay(INITIAL_WAKE_THE_DUNE_PROGRESS, 1);
    state = reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 1, points: 100, accuracy: "perfect" });
    state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId: 1, failure: "late" });
    expect(state.attemptScore).toBe(0);
    expect(state.totalScore).toBe(0);
    state = enterPlay(state, 2);
    state = reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 2, points: 75, accuracy: "great" });
    state = reduceWakeTheDuneProgress(state, { type: "reward", attemptId: 2 });
    expect(state.totalScore).toBe(325);
    expect(state.attemptScore).toBe(0);
    expect(state.lastLevelResult).toEqual({ rhythm: 75, firstTry: 0, levelBonus: 250, total: 325 });
    expect(reduceWakeTheDuneProgress(state, { type: "reward", attemptId: 2 })).toBe(state);
  });

  it("awards first try once and rejects stale score callbacks", () => {
    let state = enterPlay(INITIAL_WAKE_THE_DUNE_PROGRESS, 1);
    state = reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 1, points: 100, accuracy: "perfect" });
    state = reduceWakeTheDuneProgress(state, { type: "reward", attemptId: 1 });
    expect(state.totalScore).toBe(500);
    expect(state.lastLevelResult?.firstTry).toBe(150);
    const committed = state;
    expect(reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 1, points: 100, accuracy: "perfect" })).toBe(committed);
  });

  it("cancels a paused attempt without losing level progress and replay resets everything", () => {
    let state = completeLevel(INITIAL_WAKE_THE_DUNE_PROGRESS, 1);
    state = enterPlay(state, 2);
    state = reduceWakeTheDuneProgress(state, { type: "hit", attemptId: 2, points: 100, accuracy: "perfect" });
    state = reduceWakeTheDuneProgress(state, { type: "cancel-attempt", attemptId: 3 });
    expect(state.levelIndex).toBe(1);
    expect(state.phase).toBe("ready");
    expect(state.attemptScore).toBe(0);
    const replayed = reduceWakeTheDuneProgress(state, { type: "restart" });
    expect(replayed).toEqual(expect.objectContaining({ levelIndex: 0, totalScore: 0, perfectCount: 0, unlockedStems: 0 }));
  });

  it("offers the level 8 phrase hint only after three failures and repeats after two more", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 7; attemptId += 1) state = completeLevel(state, attemptId);
    for (let failure = 1; failure <= 2; failure += 1) {
      state = enterPlay(state, 20 + failure);
      state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId: 20 + failure, failure: "late" });
      expect(state.finalFailureCount).toBe(failure);
      expect(state.finalFailureCount >= state.finalHintNextOfferAt).toBe(false);
    }
    state = enterPlay(state, 23);
    state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId: 23, failure: "late" });
    expect(state.finalFailureCount).toBe(3);
    expect(state.finalFailureCount >= state.finalHintNextOfferAt).toBe(true);
    state = reduceWakeTheDuneProgress(state, { type: "decline-final-hint" });
    expect(state.finalHintEnabled).toBe(false);
    expect(state.finalHintNextOfferAt).toBe(5);
  });

  it("enables phrase markers from level metadata without changing the final rhythm", () => {
    const finalLevel = WAKE_THE_DUNE_LEVELS[7];
    const beatsBefore = [...finalLevel.beatPositions];
    const expected = getExpectedTapTimesMs(finalLevel);
    expect(getPhraseMarkerTimesMs(finalLevel)).toEqual([expected[3], expected[5], expected[7]]);
    expect(finalLevel.beatPositions).toEqual(beatsBefore);

    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 7; attemptId += 1) state = completeLevel(state, attemptId);
    for (let attemptId = 30; attemptId <= 32; attemptId += 1) {
      state = enterPlay(state, attemptId);
      state = reduceWakeTheDuneProgress(state, { type: "fail", attemptId, failure: "late" });
    }
    state = reduceWakeTheDuneProgress(state, { type: "enable-final-hint" });
    expect(state.finalHintEnabled).toBe(true);
  });

  it("moves final success through celebration into listening with all stems unlocked", () => {
    let state = INITIAL_WAKE_THE_DUNE_PROGRESS;
    for (let attemptId = 1; attemptId <= 7; attemptId += 1) state = completeLevel(state, attemptId);
    state = enterPlay(state, 8);
    state = reduceWakeTheDuneProgress(state, { type: "reward", attemptId: 8 });
    expect(state.unlockedStems).toBe(8);
    state = reduceWakeTheDuneProgress(state, { type: "celebrate" });
    expect(state.phase).toBe("celebration");
    state = reduceWakeTheDuneProgress(state, { type: "enter-listening" });
    expect(state.phase).toBe("listening");
    expect(state.unlockedStems).toBe(8);
  });

  it.each(["ru", "en", "he"] as const)("renders localized %s UI with intentional direction", (lang) => {
    const html = renderToStaticMarkup(<WakeTheDuneGame lang={lang} />);
    expect(html).toContain('data-mini-game="wake-the-dune"');
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain("8");
    expect(WAKE_THE_DUNE_COPY[lang].listenTitle).toBeTruthy();
    expect(WAKE_THE_DUNE_COPY[lang].playTitle).toBeTruthy();
    expect(WAKE_THE_DUNE_COPY[lang].transitionReady).toBeTruthy();
    expect(html).toContain('dir="ltr"');
  });

  it("keeps the timeline LTR and supplies a reduced-motion treatment", () => {
    const component = readFileSync(join(process.cwd(), "components/mini-games/WakeTheDuneGame.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "styles/WakeTheDune.css"), "utf8");
    expect(component).toContain('className="wake-dune-timeline');
    expect(component).toContain('dir="ltr"');
    expect(component).toContain('hiddenForMemory');
    expect(component).toContain('wake-dune-timeline__playhead');
    expect(css).toContain(".wake-dune-timeline.is-memory .wake-dune-timeline__beat { opacity: 0; }");
    expect(css).toContain(".wake-dune-timeline.is-memory { opacity: 1; filter: none; }");
    expect(component).toContain('aria-disabled={phase !== "play"}');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".wake-dune-finale__particles,.wake-dune-finale__resonance { display:none; }");
  });

  it("guards paused input and invalidates stale asynchronous resume callbacks", () => {
    const component = readFileSync(join(process.cwd(), "components/mini-games/WakeTheDuneGame.tsx"), "utf8");
    expect(component).toContain("isPaused || pausedRef.current");
    expect(component).toContain("pauseCycleRef.current !== resumeCycle || pausedRef.current");
    expect(component).toContain("audioRef.current?.suspend()");
  });

  it("uses a route-scoped fullscreen shell and keeps orientation/lifecycle pauses in the current session", () => {
    const app = readFileSync(join(process.cwd(), "pages/_app.tsx"), "utf8");
    const page = readFileSync(join(process.cwd(), "components/mini-games/WakeTheDuneGame.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "styles/WakeTheDune.css"), "utf8");
    expect(app).toContain('router.pathname === "/mini-games/wake-the-dune"');
    expect(app).toContain("!isWakeTheDunePage && <TopBar");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("body.wake-dune-game-active");
    expect(page).toContain('(orientation: landscape) and (max-height: 600px) and (pointer: coarse)');
    expect(page).toContain('window.addEventListener("pagehide", pauseForPageHide)');
    expect(page).not.toContain('dispatch({ type: "restart" });\n      setIsMobileLandscape');
    for (const lang of ["ru", "en", "he"] as const) {
      expect(WAKE_THE_DUNE_COPY[lang].turnPortrait).toBeTruthy();
      expect(WAKE_THE_DUNE_COPY[lang].audioRetry).toBeTruthy();
    }
  });

  it("uses the scoped same-origin audio rewrite for LAN device development", () => {
    const config = readFileSync(join(process.cwd(), "next.config.js"), "utf8");
    const assets = readFileSync(join(process.cwd(), "lib/miniGames/wakeTheDuneAssets.ts"), "utf8");
    expect(config).toContain('source: "/wake-the-dune-audio/:path*"');
    expect(config).toContain("...(!isProduction ?");
    expect(assets).toContain('const DEVELOPMENT_AUDIO_BASE = "/wake-the-dune-audio"');
    expect(assets).toContain('process.env.NODE_ENV !== "development"');
  });

  it("keeps the mobile tap hint outside the interactive dune stage", () => {
    const component = readFileSync(join(process.cwd(), "components/mini-games/WakeTheDuneGame.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "styles/WakeTheDune.css"), "utf8");
    const hintPosition = component.indexOf("wake-dune-mobile-tap-hint");
    const stagePosition = component.indexOf("wake-dune-stage wake-dune-stage--");
    expect(hintPosition).toBeGreaterThan(-1);
    expect(hintPosition).toBeLessThan(stagePosition);
    expect(css).toContain(".wake-dune-touch__hint { display:none; }");
    expect(css).toContain(".wake-dune-mobile-tap-hint.is-visible");
    expect(css).toContain("pointer-events:none;");
  });

  it("centers oversized game and finale stages independently of RTL direction", () => {
    const css = readFileSync(join(process.cwd(), "styles/WakeTheDune.css"), "utf8");
    expect(css).toContain(".wake-dune-stage { left:auto; width:100vw;");
    expect(css).toContain("align-self:center; transform:none;");
    expect(css).toContain(".wake-dune-finale { position:relative; left:auto;");
  });

  it("keeps the language switcher inside the mobile pause menu", () => {
    const component = readFileSync(join(process.cwd(), "components/mini-games/WakeTheDuneGame.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "styles/WakeTheDune.css"), "utf8");
    expect(component).toContain("wake-dune-pause-languages");
    expect(component).toContain("<LanguageSwitcher lang={lang} />");
    expect(css).toContain(".wake-dune-pause-languages { display:none; }");
    expect(css).toContain(".wake-dune-pause-languages { display:flex;");
  });
});
