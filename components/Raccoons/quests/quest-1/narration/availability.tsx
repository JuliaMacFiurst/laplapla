import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/i18n";
import type { Quest1PageId } from "../progress";
import QuestNarrationPlayer from "./QuestNarrationPlayer";
import {
  compareNarrationBlocks,
  type NarrationBlockId,
} from "./catalog";
import { normalizeAvailableNarrationBlocks } from "./context";

type Registration = {
  key: string;
  blockIds: readonly NarrationBlockId[];
};

type NarrationAvailabilityApi = {
  register: (registration: Registration) => () => void;
  setPlayerMount: (element: HTMLDivElement | null) => void;
};

const NarrationAvailabilityContext = createContext<NarrationAvailabilityApi | null>(null);

export function QuestNarrationScope({
  pageId,
  locale,
  children,
}: {
  pageId: Quest1PageId;
  locale: Lang;
  children: ReactNode;
}) {
  const [registrations, setRegistrations] = useState<Map<string, readonly NarrationBlockId[]>>(
    () => new Map(),
  );
  const [playerMount, setPlayerMount] = useState<HTMLDivElement | null>(null);

  const register = useCallback(({ key, blockIds }: Registration) => {
    setRegistrations((current) => {
      const next = new Map(current);
      next.set(key, blockIds);
      return next;
    });

    return () => {
      setRegistrations((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    };
  }, []);

  const value = useMemo(() => ({ register, setPlayerMount }), [register]);
  const availableBlockIds = useMemo(
    () => normalizeAvailableNarrationBlocks([...registrations.values()].flat()).sort(compareNarrationBlocks),
    [registrations],
  );

  const player = (
    <QuestNarrationPlayer
      pageId={pageId}
      locale={locale}
      availableBlockIds={availableBlockIds}
    />
  );

  return (
    <NarrationAvailabilityContext.Provider value={value}>
      {children}
      {playerMount ? createPortal(player, playerMount) : player}
    </NarrationAvailabilityContext.Provider>
  );
}

export function QuestNarrationSlot() {
  const context = useContext(NarrationAvailabilityContext);
  const setMount = useCallback((element: HTMLDivElement | null) => {
    context?.setPlayerMount(element);
  }, [context]);
  return <div className="quest-star-narration-slot" ref={setMount} />;
}

export function useAvailableNarrationBlocks(key: string, blockIds: readonly string[]) {
  const context = useContext(NarrationAvailabilityContext);
  const normalized = useMemo(() => normalizeAvailableNarrationBlocks(blockIds), [blockIds]);
  const signature = normalized.join("|");

  useEffect(() => {
    if (!context || normalized.length === 0) return undefined;
    return context.register({ key, blockIds: normalized });
  }, [context, key, signature]); // eslint-disable-line react-hooks/exhaustive-deps
}
