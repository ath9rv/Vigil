/**
 * Enforces INVARIANT 5: Old navigation events cannot mutate current navigation state.
 * 
 * This layer tracks the active navigation ID for every tab. It acts as a stale-message
 * guard, rejecting any messages (and thereby any findings) that belong to a previous
 * page lifecycle for that tab.
 */
class NavigationStateManager {
  private activeNavigations = new Map<number, string>();

  /**
   * Called when a new navigation starts (e.g. from the background webNavigation
   * events, or from the content script index.ts initializing).
   */
  public startNavigation(tabId: number, navigationId: string): void {
    if (tabId == null || !navigationId) return;
    this.activeNavigations.set(tabId, navigationId);
  }

  /**
   * Verifies if the provided navigationId is still the active one for this tab.
   * If there is no active navigation recorded yet (e.g. extension just reloaded),
   * we accept it and track it, but subsequent different IDs will be rejected until
   * a new startNavigation occurs.
   */
  public isNavigationValid(tabId: number, navigationId: string): boolean {
    if (tabId == null || !navigationId) return false;
    
    const active = this.activeNavigations.get(tabId);
    
    // If we haven't seen this tab yet, implicitly trust and track this navigation
    // (helps with extension reload edge cases where the content script survives).
    if (!active) {
      this.activeNavigations.set(tabId, navigationId);
      return true;
    }

    return active === navigationId;
  }

  /**
   * Called when a tab is closed.
   */
  public clearTab(tabId: number): void {
    this.activeNavigations.delete(tabId);
  }
}

export const navigationState = new NavigationStateManager();
