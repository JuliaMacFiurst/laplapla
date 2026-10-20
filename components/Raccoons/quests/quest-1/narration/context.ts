import { isNarrationBlockId, type NarrationBlockId } from "./catalog";

export function normalizeAvailableNarrationBlocks(blockIds: readonly string[]) {
  return Array.from(new Set(blockIds)).filter(isNarrationBlockId);
}
export function selectNarrationBlock(
  available: readonly NarrationBlockId[],
  current: NarrationBlockId | null,
) {
  return current && available.includes(current) ? current : (available[0] ?? null);
}

export function adjacentNarrationBlock(
  available: readonly NarrationBlockId[],
  current: NarrationBlockId | null,
  direction: -1 | 1,
) {
  const index = current ? available.indexOf(current) : -1;
  if (index < 0) return direction === 1 ? (available[0] ?? null) : null;
  return available[index + direction] ?? null;
}
