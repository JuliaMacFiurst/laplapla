import { useCallback, useEffect, useState } from "react";

import {
  advanceQuest1Progress,
  clearQuest1Progress,
  createInitialQuest1Progress,
  persistQuest1Progress,
  QUEST_1_LEGACY_MOBILE_PROGRESS_KEY,
  readQuest1Progress,
  type Quest1PageId,
} from "./progress";

function getBrowserStorage(kind: "localStorage" | "sessionStorage") {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function useQuest1Progress() {
  const [progress, setProgress] = useState(createInitialQuest1Progress);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(readQuest1Progress(
      getBrowserStorage("localStorage"),
      getBrowserStorage("sessionStorage"),
    ));
    setHydrated(true);
  }, []);

  useEffect(() => {
    persistQuest1Progress(getBrowserStorage("localStorage"), progress, hydrated);
  }, [hydrated, progress]);

  const go = useCallback((pageId: Quest1PageId) => {
    setProgress((current) => advanceQuest1Progress(current, pageId));
  }, []);

  const restart = useCallback(() => {
    clearQuest1Progress(getBrowserStorage("localStorage"));
    try {
      getBrowserStorage("sessionStorage")?.removeItem(QUEST_1_LEGACY_MOBILE_PROGRESS_KEY);
    } catch {
      // Storage may be unavailable in restricted browsing modes.
    }
    setProgress(createInitialQuest1Progress());
  }, []);

  return { pageId: progress.pageId, route: progress.route, hydrated, go, restart };
}
