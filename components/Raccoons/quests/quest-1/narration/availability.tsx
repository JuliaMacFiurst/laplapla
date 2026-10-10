import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

  const value = useMemo(() => ({ register }), [register]);
  const availableBlockIds = useMemo(
    () => normalizeAvailableNarrationBlocks([...registrations.values()].flat()).sort(compareNarrationBlocks),
    [registrations],
  );

  return (
    <NarrationAvailabilityContext.Provider value={value}>
      {children}
      <QuestNarrationPlayer
        pageId={pageId}
        locale={locale}
        availableBlockIds={availableBlockIds}
      />
    </NarrationAvailabilityContext.Provider>
  );
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
