export const UNKNOWN_SOUND_GUESSES = [
  "animal",
  "machine",
  "instrument",
  "natural-phenomenon",
  "no-idea",
] as const;

export type UnknownSoundGuess = (typeof UNKNOWN_SOUND_GUESSES)[number];

export type UnknownSoundSceneState =
  | { phase: "ready" }
  | { phase: "guessing"; selectedGuess?: UnknownSoundGuess }
  | { phase: "guess-recorded"; selectedGuess: UnknownSoundGuess }
  | { phase: "clue-obtained"; selectedGuess: UnknownSoundGuess };

export type UnknownSoundSceneAction =
  | { type: "audio-started" }
  | { type: "guess-selected"; guess: UnknownSoundGuess }
  | { type: "guess-confirmed" }
  | { type: "clue-obtained" }
  | { type: "progress-restored"; progress: UnknownSoundProgress };

export type UnknownSoundProgress = {
  version: 1;
  selectedGuess: UnknownSoundGuess;
  clueObtained: boolean;
};

export const INITIAL_UNKNOWN_SOUND_SCENE_STATE: UnknownSoundSceneState = {
  phase: "ready",
};

export function isUnknownSoundGuess(value: unknown): value is UnknownSoundGuess {
  return UNKNOWN_SOUND_GUESSES.some((guess) => guess === value);
}

export function reduceUnknownSoundScene(
  state: UnknownSoundSceneState,
  action: UnknownSoundSceneAction,
): UnknownSoundSceneState {
  switch (action.type) {
    case "audio-started":
      return state.phase === "ready" ? { phase: "guessing" } : state;
    case "guess-selected":
      return state.phase === "guessing"
        ? { phase: "guessing", selectedGuess: action.guess }
        : state;
    case "guess-confirmed":
      return state.phase === "guessing" && state.selectedGuess
        ? { phase: "guess-recorded", selectedGuess: state.selectedGuess }
        : state;
    case "clue-obtained":
      return state.phase === "guess-recorded"
        ? { phase: "clue-obtained", selectedGuess: state.selectedGuess }
        : state;
    case "progress-restored":
      return action.progress.clueObtained
        ? {
            phase: "clue-obtained",
            selectedGuess: action.progress.selectedGuess,
          }
        : {
            phase: "guess-recorded",
            selectedGuess: action.progress.selectedGuess,
          };
  }
}

export function getUnknownSoundProgress(
  state: UnknownSoundSceneState,
): UnknownSoundProgress | null {
  if (state.phase === "guess-recorded") {
    return {
      version: 1,
      selectedGuess: state.selectedGuess,
      clueObtained: false,
    };
  }

  if (state.phase === "clue-obtained") {
    return {
      version: 1,
      selectedGuess: state.selectedGuess,
      clueObtained: true,
    };
  }

  return null;
}

export function parseUnknownSoundProgress(
  value: unknown,
): UnknownSoundProgress | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    !("selectedGuess" in value) ||
    !("clueObtained" in value)
  ) {
    return null;
  }

  if (
    value.version !== 1 ||
    !isUnknownSoundGuess(value.selectedGuess) ||
    typeof value.clueObtained !== "boolean"
  ) {
    return null;
  }

  return {
    version: 1,
    selectedGuess: value.selectedGuess,
    clueObtained: value.clueObtained,
  };
}
