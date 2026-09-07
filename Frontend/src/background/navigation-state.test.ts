import { describe, it, expect, beforeEach } from 'vitest';
import { navigationState } from './navigation-state';

describe('NavigationStateManager (Phase 2A Stale Message Guard)', () => {
  beforeEach(() => {
    // Reset state for test isolation
    navigationState.clearTab(1);
    navigationState.clearTab(2);
  });

  it('accepts messages when a tab is first seen without a formal navigation start', () => {
    expect(navigationState.isNavigationValid(1, 'nav-123')).toBe(true);
  });

  it('rejects messages from an old navigation after a new navigation starts', () => {
    navigationState.startNavigation(1, 'nav-A');
    expect(navigationState.isNavigationValid(1, 'nav-A')).toBe(true);
    
    // Simulate navigation B starting
    navigationState.startNavigation(1, 'nav-B');
    
    // Old message from A arrives late
    expect(navigationState.isNavigationValid(1, 'nav-A')).toBe(false);
    
    // New message from B
    expect(navigationState.isNavigationValid(1, 'nav-B')).toBe(true);
  });

  it('keeps navigation state isolated between tabs', () => {
    navigationState.startNavigation(1, 'nav-A');
    navigationState.startNavigation(2, 'nav-B');
    
    expect(navigationState.isNavigationValid(1, 'nav-A')).toBe(true);
    expect(navigationState.isNavigationValid(1, 'nav-B')).toBe(false);
    
    expect(navigationState.isNavigationValid(2, 'nav-B')).toBe(true);
    expect(navigationState.isNavigationValid(2, 'nav-A')).toBe(false);
  });
});
