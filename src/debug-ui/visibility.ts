export function resolveDebugPanelExpanded(
  currentExpanded: boolean,
  previousHostEnabled: boolean,
  currentHostEnabled: boolean,
  debugFromQuery: boolean,
) {
  if (!currentHostEnabled && !debugFromQuery) return false;
  if (!previousHostEnabled && currentHostEnabled) return true;
  return currentExpanded;
}
