export function analyticsNavigationKey(path: string, language: string) {
  return `${language}:${path}`;
}

export function isNewAnalyticsNavigation(previousKey: string | null, nextKey: string) {
  return previousKey !== nextKey;
}
