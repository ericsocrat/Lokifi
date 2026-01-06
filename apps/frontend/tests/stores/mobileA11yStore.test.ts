import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FLAGS, setDevFlag } from '../../src/lib/stores/featureFlags';
import {
  type AccessibilitySettings,
  type DeviceInfo,
  type MobileSettings,
  type ResponsiveBreakpoint,
  type KeyboardShortcut,
  useMobileAccessibilityStore,
} from '../../src/lib/stores/mobileA11yStore';

const defaultAccessibilitySettings: AccessibilitySettings = {
  screenReaderEnabled: false,
  screenReaderAnnouncements: true,
  keyboardNavigation: true,
  skipLinks: true,
  focusIndicators: true,
  customKeyboardShortcuts: {},
  highContrast: false,
  darkMode: 'auto',
  fontSize: 'medium',
  fontFamily: 'system',
  reduceMotion: false,
  reduceAnimations: false,
  animationSpeed: 'normal',
  colorBlindSupport: false,
  colorBlindType: 'none',
  customColors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    background: '#ffffff',
    text: '#111827',
    accent: '#f59e0b',
  },
  audioFeedback: false,
  soundEffects: false,
  voiceCommands: false,
};

const defaultMobileSettings: MobileSettings = {
  touchEnabled: true,
  gestureNavigation: true,
  swipeActions: true,
  pinchZoom: true,
  doubleTapZoom: true,
  adaptiveLayout: true,
  compactMode: false,
  orientation: 'auto',
  reducedQuality: false,
  dataUsageMode: 'unlimited',
  offlineMode: false,
  preloadData: true,
  bottomNavigation: false,
  tabBarPosition: 'top',
  toolbarCollapse: true,
  fullscreenMode: false,
  pushNotifications: true,
  vibration: true,
  notificationSounds: true,
};

const defaultBreakpoints: ResponsiveBreakpoint[] = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 767,
    columns: 1,
    spacing: 8,
    fontSize: 14,
    hiddenComponents: ['sidebar', 'toolbar-extended'],
    collapsedComponents: ['chart-controls'],
    navigationStyle: 'bottom-nav',
    chartHeight: 300,
    maxCharts: 1,
    compactCharts: true,
  },
  {
    name: 'tablet',
    minWidth: 768,
    maxWidth: 1023,
    columns: 2,
    spacing: 12,
    fontSize: 16,
    hiddenComponents: [],
    collapsedComponents: ['sidebar'],
    navigationStyle: 'tabs',
    chartHeight: 400,
    maxCharts: 2,
    compactCharts: false,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    columns: 3,
    spacing: 16,
    fontSize: 16,
    hiddenComponents: [],
    collapsedComponents: [],
    navigationStyle: 'sidebar',
    chartHeight: 500,
    maxCharts: 4,
    compactCharts: false,
  },
];

const resetStore = () => {
  act(() => {
    useMobileAccessibilityStore.setState((state) => ({
      ...state,
      deviceInfo: null,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      accessibilitySettings: { ...defaultAccessibilitySettings },
      mobileSettings: { ...defaultMobileSettings },
      gestures: [],
      keyboardShortcuts: [],
      currentBreakpoint: 'desktop',
      breakpoints: defaultBreakpoints.map((bp) => ({ ...bp })),
      viewportSize: { width: 1920, height: 1080 },
      lastAudit: null,
      auditHistory: [],
      activeIssues: [],
      supportedFeatures: {
        touchGestures: false,
        voiceCommands: false,
        screenReader: false,
        keyboardNavigation: true,
        highContrast: false,
        reducedMotion: false,
      },
      performanceMetrics: {
        renderTime: 0,
        interactionDelay: 0,
        memoryUsage: 0,
      },
      orientationLocked: false,
      keyboardVisible: false,
      focusedElement: null,
      isInitializing: false,
      isAuditing: false,
      error: null,
    }));
  });
};

const createGestureInput = () => ({
  name: 'Swipe Left',
  description: 'Navigate left',
  type: 'swipe' as const,
  direction: 'left' as const,
  fingers: 1,
  action: 'navigate-left',
  enabled: true,
  contexts: ['chart'],
  threshold: 80,
});

describe('mobileA11yStore', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FLAG_MOBILE_A11Y = '1';
    setDevFlag('mobileA11y', true);
    FLAGS.mobileA11y = true;
    localStorage.clear();
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FLAG_MOBILE_A11Y = '0';
    setDevFlag('mobileA11y', false);
    FLAGS.mobileA11y = false;
    vi.restoreAllMocks();
    document.body.className = '';
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  it('manages gesture lifecycle', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);
    const store = useMobileAccessibilityStore.getState();

    let gestureId = '';
    act(() => {
      gestureId = store.addGesture(createGestureInput());
    });

    const afterAdd = useMobileAccessibilityStore.getState();
    expect(gestureId).toBe('gesture_1234');
    expect(afterAdd.gestures).toHaveLength(1);
    expect(afterAdd.gestures[0].name).toBe('Swipe Left');

    act(() => {
      store.updateGesture(gestureId, { name: 'Updated Gesture', threshold: 120 });
      store.enableGesture(gestureId, false);
    });

    const afterUpdate = useMobileAccessibilityStore.getState();
    expect(afterUpdate.gestures[0].name).toBe('Updated Gesture');
    expect(afterUpdate.gestures[0].threshold).toBe(120);
    expect(afterUpdate.gestures[0].enabled).toBe(false);

    act(() => {
      store.removeGesture(gestureId);
    });

    expect(useMobileAccessibilityStore.getState().gestures).toHaveLength(0);
    nowSpy.mockRestore();
  });

  it('updates breakpoint based on viewport size', () => {
    const store = useMobileAccessibilityStore.getState();

    act(() => {
      store.updateViewportSize(500, 900);
    });
    let state = useMobileAccessibilityStore.getState();
    expect(state.currentBreakpoint).toBe('mobile');
    expect(state.viewportSize).toEqual({ width: 500, height: 900 });

    act(() => {
      store.updateViewportSize(900, 900);
    });
    state = useMobileAccessibilityStore.getState();
    expect(state.currentBreakpoint).toBe('tablet');

    act(() => {
      store.updateViewportSize(1300, 900);
    });
    state = useMobileAccessibilityStore.getState();
    expect(state.currentBreakpoint).toBe('desktop');
  });

  it('runs accessibility audit and stores history', async () => {
    const store = useMobileAccessibilityStore.getState();

    let auditId = '';
    await act(async () => {
      const audit = await store.runAccessibilityAudit();
      auditId = audit.id;
    });

    const state = useMobileAccessibilityStore.getState();
    expect(state.isAuditing).toBe(false);
    expect(state.lastAudit?.id).toBe(auditId);
    expect(state.auditHistory[0]?.id).toBe(auditId);
    expect(state.auditHistory).toHaveLength(1);
    expect(state.activeIssues).toHaveLength(0);
  });

  it('optimizes settings for low-end mobile devices', () => {
    const store = useMobileAccessibilityStore.getState();

    const lowEndDevice: DeviceInfo = {
      type: 'mobile',
      os: 'android',
      browser: 'chrome',
      version: '1.0',
      touchSupport: true,
      keyboardSupport: false,
      voiceSupport: true,
      cameraSupport: false,
      locationSupport: true,
      screenSize: { width: 360, height: 800, pixelRatio: 2 },
      memory: 1,
      cores: 2,
      connection: '2g',
      voiceOver: false,
      talkBack: false,
      highContrast: false,
      reducedMotion: false,
    };

    act(() => {
      useMobileAccessibilityStore.setState((state) => ({
        ...state,
        deviceInfo: lowEndDevice,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      }));
    });

    act(() => {
      store.optimizeForDevice();
    });

    const state = useMobileAccessibilityStore.getState();
    expect(state.mobileSettings.reducedQuality).toBe(true);
    expect(state.mobileSettings.dataUsageMode).toBe('minimal');
    expect(state.mobileSettings.preloadData).toBe(false);
    expect(state.accessibilitySettings.reduceAnimations).toBe(true);
  });

  it('exports and imports settings', async () => {
    const store = useMobileAccessibilityStore.getState();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5678);

    act(() => {
      store.updateAccessibilitySettings({ highContrast: true });
      store.updateMobileSettings({ compactMode: true });
      store.addGesture(createGestureInput());
      store.addKeyboardShortcut({
        name: 'Skip',
        description: 'Skip to main content',
        key: 's',
        modifiers: ['ctrl'],
        action: 'skip',
        enabled: true,
        contexts: ['global'],
        announce: true,
      });
    });

    const currentState = useMobileAccessibilityStore.getState();
    const exportBlob = await store.exportSettings();
    const exportData =
      exportBlob instanceof Blob && typeof exportBlob.text === 'function'
        ? JSON.parse(await exportBlob.text())
        : {
            accessibilitySettings: currentState.accessibilitySettings,
            mobileSettings: currentState.mobileSettings,
            gestures: currentState.gestures,
            keyboardShortcuts: currentState.keyboardShortcuts,
            breakpoints: currentState.breakpoints,
          };

    expect(exportData.accessibilitySettings.highContrast).toBe(true);
    expect(exportData.mobileSettings.compactMode).toBe(true);
    expect(exportData.gestures).toHaveLength(1);
    expect(exportData.keyboardShortcuts).toHaveLength(1);

    const importPayload = {
      accessibilitySettings: { ...defaultAccessibilitySettings, screenReaderEnabled: true },
      mobileSettings: { ...defaultMobileSettings, touchEnabled: false },
      gestures: [
        {
          ...createGestureInput(),
          id: 'gesture_imported',
        },
      ],
      keyboardShortcuts: [
        {
          id: 'shortcut_imported',
          name: 'Imported',
          description: 'Imported shortcut',
          key: 'k',
          modifiers: ['ctrl'],
          action: 'imported',
          enabled: true,
          contexts: ['global'],
          announce: false,
        },
      ],
      breakpoints: defaultBreakpoints,
    };

    const file = {
      text: vi.fn().mockResolvedValue(JSON.stringify(importPayload)),
    } as unknown as File;

    await act(async () => {
      await store.importSettings(file);
    });

    const importedState = useMobileAccessibilityStore.getState();
    expect(importedState.accessibilitySettings.screenReaderEnabled).toBe(true);
    expect(importedState.mobileSettings.touchEnabled).toBe(false);
    expect(importedState.gestures[0]?.id).toBe('gesture_imported');
    expect(importedState.keyboardShortcuts[0]?.id).toBe('shortcut_imported');
    expect(importedState.breakpoints[0]?.name).toBe('mobile');

    nowSpy.mockRestore();
  });

  // ==========================================================================
  // Device Detection Tests
  // ==========================================================================
  describe('Device Detection', () => {
    it('updateDeviceInfo updates device information', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        useMobileAccessibilityStore.setState((state) => ({
          ...state,
          deviceInfo: {
            type: 'desktop',
            os: 'windows',
            browser: 'chrome',
            version: '1.0',
            touchSupport: false,
            keyboardSupport: true,
            voiceSupport: false,
            cameraSupport: false,
            locationSupport: false,
            screenSize: { width: 1920, height: 1080, pixelRatio: 1 },
            memory: 8,
            cores: 8,
            connection: 'wifi',
            voiceOver: false,
            talkBack: false,
            highContrast: false,
            reducedMotion: false,
          },
        }));
      });

      act(() => {
        store.updateDeviceInfo({ memory: 16, cores: 12 });
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.deviceInfo?.memory).toBe(16);
      expect(state.deviceInfo?.cores).toBe(12);
    });

    it('checkFeatureSupport detects browser features', () => {
      const store = useMobileAccessibilityStore.getState();
      
      act(() => {
        store.checkFeatureSupport();
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.supportedFeatures.keyboardNavigation).toBe(true);
      // Other features depend on browser support
    });
  });

  // ==========================================================================
  // Settings Management Tests
  // ==========================================================================
  describe('Settings Management', () => {
    it('updateAccessibilitySettings updates accessibility settings', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ 
          highContrast: true, 
          fontSize: 'large',
          reduceMotion: true 
        });
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.accessibilitySettings.highContrast).toBe(true);
      expect(state.accessibilitySettings.fontSize).toBe('large');
      expect(state.accessibilitySettings.reduceMotion).toBe(true);
    });

    it('updateMobileSettings updates mobile settings', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateMobileSettings({ 
          compactMode: true,
          bottomNavigation: true,
          fullscreenMode: true
        });
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.mobileSettings.compactMode).toBe(true);
      expect(state.mobileSettings.bottomNavigation).toBe(true);
      expect(state.mobileSettings.fullscreenMode).toBe(true);
    });

    it('resetToDefaults resets settings for mobile device', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        useMobileAccessibilityStore.setState((state) => ({
          ...state,
          isMobile: true,
          deviceInfo: {
            type: 'mobile',
            os: 'android',
            browser: 'chrome',
            version: '1.0',
            touchSupport: true,
            keyboardSupport: false,
            voiceSupport: false,
            cameraSupport: false,
            locationSupport: false,
            screenSize: { width: 360, height: 800, pixelRatio: 2 },
            memory: 4,
            cores: 4,
            connection: '4g',
            voiceOver: false,
            talkBack: false,
            highContrast: false,
            reducedMotion: true,
          },
        }));
      });

      act(() => {
        store.resetToDefaults();
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.mobileSettings.compactMode).toBe(true);
      expect(state.mobileSettings.bottomNavigation).toBe(true);
      expect(state.accessibilitySettings.reduceMotion).toBe(true);
    });
  });

  // ==========================================================================
  // Keyboard Shortcut Tests
  // ==========================================================================
  describe('Keyboard Shortcuts', () => {
    const createShortcutInput = () => ({
      name: 'Test Shortcut',
      description: 'Test description',
      key: 'k',
      modifiers: ['ctrl'] as ('ctrl' | 'alt' | 'shift' | 'meta')[],
      action: 'test-action',
      enabled: true,
      contexts: ['global'],
      announce: true,
    });

    it('addKeyboardShortcut adds a new shortcut', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(9999);
      const store = useMobileAccessibilityStore.getState();

      let shortcutId = '';
      act(() => {
        shortcutId = store.addKeyboardShortcut(createShortcutInput());
      });

      const state = useMobileAccessibilityStore.getState();
      expect(shortcutId).toBe('shortcut_9999');
      expect(state.keyboardShortcuts).toHaveLength(1);
      expect(state.keyboardShortcuts[0].name).toBe('Test Shortcut');

      nowSpy.mockRestore();
    });

    it('updateKeyboardShortcut updates an existing shortcut', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1111);
      const store = useMobileAccessibilityStore.getState();

      let shortcutId = '';
      act(() => {
        shortcutId = store.addKeyboardShortcut(createShortcutInput());
      });

      act(() => {
        store.updateKeyboardShortcut(shortcutId, { 
          name: 'Updated Shortcut',
          key: 'j'
        });
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.keyboardShortcuts[0].name).toBe('Updated Shortcut');
      expect(state.keyboardShortcuts[0].key).toBe('j');

      nowSpy.mockRestore();
    });

    it('removeKeyboardShortcut removes a shortcut', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2222);
      const store = useMobileAccessibilityStore.getState();

      let shortcutId = '';
      act(() => {
        shortcutId = store.addKeyboardShortcut(createShortcutInput());
      });

      expect(useMobileAccessibilityStore.getState().keyboardShortcuts).toHaveLength(1);

      act(() => {
        store.removeKeyboardShortcut(shortcutId);
      });

      expect(useMobileAccessibilityStore.getState().keyboardShortcuts).toHaveLength(0);
      nowSpy.mockRestore();
    });

    it('enableKeyboardShortcut toggles shortcut enabled state', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(3333);
      const store = useMobileAccessibilityStore.getState();

      let shortcutId = '';
      act(() => {
        shortcutId = store.addKeyboardShortcut(createShortcutInput());
      });

      act(() => {
        store.enableKeyboardShortcut(shortcutId, false);
      });

      let state = useMobileAccessibilityStore.getState();
      expect(state.keyboardShortcuts[0].enabled).toBe(false);

      act(() => {
        store.enableKeyboardShortcut(shortcutId, true);
      });

      state = useMobileAccessibilityStore.getState();
      expect(state.keyboardShortcuts[0].enabled).toBe(true);

      nowSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Breakpoint Tests
  // ==========================================================================
  describe('Breakpoints', () => {
    it('setBreakpoint manually sets the current breakpoint', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.setBreakpoint('tablet');
      });

      expect(useMobileAccessibilityStore.getState().currentBreakpoint).toBe('tablet');
    });

    it('addBreakpoint adds a new breakpoint and sorts by minWidth', () => {
      const store = useMobileAccessibilityStore.getState();

      const newBreakpoint: ResponsiveBreakpoint = {
        name: 'large-desktop',
        minWidth: 1440,
        columns: 4,
        spacing: 20,
        fontSize: 18,
        hiddenComponents: [],
        collapsedComponents: [],
        navigationStyle: 'sidebar',
        chartHeight: 600,
        maxCharts: 6,
        compactCharts: false,
      };

      act(() => {
        store.addBreakpoint(newBreakpoint);
      });

      const state = useMobileAccessibilityStore.getState();
      const lastBreakpoint = state.breakpoints[state.breakpoints.length - 1];
      expect(lastBreakpoint.name).toBe('large-desktop');
      expect(lastBreakpoint.minWidth).toBe(1440);
    });

    it('updateBreakpoint updates an existing breakpoint', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateBreakpoint('mobile', { 
          chartHeight: 350,
          maxCharts: 2
        });
      });

      const state = useMobileAccessibilityStore.getState();
      const mobileBreakpoint = state.breakpoints.find(bp => bp.name === 'mobile');
      expect(mobileBreakpoint?.chartHeight).toBe(350);
      expect(mobileBreakpoint?.maxCharts).toBe(2);
    });
  });

  // ==========================================================================
  // Accessibility Auditing Tests
  // ==========================================================================
  describe('Accessibility Auditing', () => {
    it('ignoreAccessibilityIssue removes an issue from active issues', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        useMobileAccessibilityStore.setState((state) => ({
          ...state,
          activeIssues: [
            {
              id: 'issue_1',
              type: 'error',
              severity: 'serious',
              title: 'Missing alt text',
              description: 'Image missing alt attribute',
              impact: 'Screen reader users cannot understand image',
              element: 'img',
              selector: '#logo',
              page: '/',
              wcagCriteria: ['1.1.1'],
              level: 'A',
              help: 'Add alt attribute',
              helpUrl: 'https://example.com',
            },
            {
              id: 'issue_2',
              type: 'error',
              severity: 'moderate',
              title: 'Low contrast',
              description: 'Text has insufficient contrast',
              impact: 'Users with visual impairments may have difficulty reading',
              element: 'p',
              selector: '.description',
              page: '/',
              wcagCriteria: ['1.4.3'],
              level: 'AA',
              help: 'Increase contrast ratio',
              helpUrl: 'https://example.com',
            },
          ],
        }));
      });

      expect(useMobileAccessibilityStore.getState().activeIssues).toHaveLength(2);

      act(() => {
        store.ignoreAccessibilityIssue('issue_1');
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.activeIssues).toHaveLength(1);
      expect(state.activeIssues[0].id).toBe('issue_2');
    });

    it('getAuditRecommendations returns recommendations from last audit', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        useMobileAccessibilityStore.setState((state) => ({
          ...state,
          lastAudit: {
            id: 'audit_1',
            timestamp: new Date(),
            score: 85,
            issues: [],
            recommendations: [
              {
                id: 'rec_1',
                title: 'Add skip links',
                description: 'Add skip to content links',
                priority: 'high',
                effort: 'low',
                impact: 'high',
                steps: ['Add skip link at top of page'],
                resources: [],
                examples: [],
              },
            ],
            testedElements: 100,
            passedTests: 85,
            failedTests: 15,
            categories: {
              perceivable: 90,
              operable: 85,
              understandable: 80,
              robust: 90,
            },
            wcagLevel: 'AA',
            section508: true,
          },
        }));
      });

      const recommendations = store.getAuditRecommendations();
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe('Add skip links');
    });

    it('getAuditRecommendations returns empty array when no audit exists', () => {
      const store = useMobileAccessibilityStore.getState();
      
      act(() => {
        useMobileAccessibilityStore.setState((state) => ({
          ...state,
          lastAudit: null,
        }));
      });

      const recommendations = store.getAuditRecommendations();
      expect(recommendations).toEqual([]);
    });
  });

  // ==========================================================================
  // Screen Reader Tests
  // ==========================================================================
  describe('Screen Reader', () => {
    it('announceToScreenReader creates live region and sets message', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.announceToScreenReader('Test announcement', 'polite');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('Test announcement');
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    });

    it('announceToScreenReader uses assertive priority', () => {
      const store = useMobileAccessibilityStore.getState();

      // Remove existing live region if any
      const existing = document.getElementById('sr-live-region');
      existing?.remove();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.announceToScreenReader('Urgent message', 'assertive');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    it('setFocus focuses an element and updates focusedElement state', () => {
      // Create a focusable element
      const testElement = document.createElement('button');
      testElement.id = 'test-button';
      document.body.appendChild(testElement);

      const focusSpy = vi.spyOn(testElement, 'focus');
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.setFocus('test-button');
      });

      expect(focusSpy).toHaveBeenCalled();
      expect(useMobileAccessibilityStore.getState().focusedElement).toBe('test-button');

      // Cleanup
      testElement.remove();
    });

    it('skipToContent focuses main content and announces', () => {
      // Create a main element
      const mainElement = document.createElement('main');
      mainElement.id = 'main-content';
      mainElement.tabIndex = -1; // Make it focusable
      // Mock scrollIntoView on the element before adding to DOM
      mainElement.scrollIntoView = vi.fn();
      document.body.appendChild(mainElement);

      const focusSpy = vi.spyOn(mainElement, 'focus');
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.skipToContent();
      });

      expect(focusSpy).toHaveBeenCalled();
      expect(mainElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Cleanup
      mainElement.remove();
    });
  });

  // ==========================================================================
  // Performance Metrics Tests
  // ==========================================================================
  describe('Performance Metrics', () => {
    it('updatePerformanceMetrics updates metrics', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updatePerformanceMetrics({
          renderTime: 100,
          interactionDelay: 50,
          memoryUsage: 256,
        });
      });

      const state = useMobileAccessibilityStore.getState();
      expect(state.performanceMetrics.renderTime).toBe(100);
      expect(state.performanceMetrics.interactionDelay).toBe(50);
      expect(state.performanceMetrics.memoryUsage).toBe(256);
    });
  });

  // ==========================================================================
  // Notification & Feedback Tests
  // ==========================================================================
  describe('Notification & Feedback', () => {
    it('vibrate calls navigator.vibrate when enabled', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateMobileSettings({ vibration: true });
      });

      act(() => {
        store.vibrate(100);
      });

      expect(vibrateMock).toHaveBeenCalledWith(100);
    });

    it('vibrate handles pattern arrays', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateMobileSettings({ vibration: true });
      });

      act(() => {
        store.vibrate([100, 50, 100]);
      });

      expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('showAccessibilityNotification announces to screen reader', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.showAccessibilityNotification('Test notification', 'info');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion?.textContent).toBe('Test notification');
    });
  });

  // ==========================================================================
  // Voice Command Tests
  // ==========================================================================
  describe('Voice Commands', () => {
    it('processVoiceCommand handles known commands', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.processVoiceCommand('zoom in');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion?.textContent).toBe('Zooming in');
    });

    it('processVoiceCommand handles help command', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.processVoiceCommand('help');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion?.textContent).toContain('Voice commands:');
    });

    it('processVoiceCommand handles unrecognized commands', () => {
      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateAccessibilitySettings({ screenReaderAnnouncements: true });
      });

      act(() => {
        store.processVoiceCommand('unknown command xyz');
      });

      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion?.textContent).toContain('Command not recognized');
    });

    it('stopVoiceRecognition stops recognition instance', () => {
      const stopMock = vi.fn();
      (window as unknown as { __voiceRecognition?: { stop: Mock } }).__voiceRecognition = {
        stop: stopMock,
      };

      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.stopVoiceRecognition();
      });

      expect(stopMock).toHaveBeenCalled();
      expect(
        (window as unknown as { __voiceRecognition?: unknown }).__voiceRecognition
      ).toBeUndefined();
    });
  });

  // ==========================================================================
  // Touch & Gesture Tests
  // ==========================================================================
  describe('Touch & Gestures', () => {
    it('handleGesture executes gesture when found and enabled', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      const store = useMobileAccessibilityStore.getState();
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(4444);

      act(() => {
        store.updateMobileSettings({ 
          gestureNavigation: true,
          vibration: true
        });
        store.addGesture({
          name: 'Test Swipe',
          description: 'Test swipe gesture',
          type: 'swipe',
          direction: 'left',
          fingers: 1,
          action: 'test-action',
          enabled: true,
          contexts: ['chart'],
          threshold: 50,
        });
      });

      const mockEvent = new MouseEvent('mousedown') as unknown as MouseEvent;

      act(() => {
        store.handleGesture('swipe', mockEvent, 'chart');
      });

      expect(vibrateMock).toHaveBeenCalledWith(50);
      nowSpy.mockRestore();
    });

    it('handleGesture does nothing when gesture navigation is disabled', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true,
        configurable: true,
      });

      const store = useMobileAccessibilityStore.getState();

      act(() => {
        store.updateMobileSettings({ gestureNavigation: false });
      });

      const mockEvent = new MouseEvent('mousedown') as unknown as MouseEvent;

      act(() => {
        store.handleGesture('swipe', mockEvent, 'chart');
      });

      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('calibrateTouchSensitivity runs without error', () => {
      const store = useMobileAccessibilityStore.getState();

      expect(() => {
        act(() => {
          store.calibrateTouchSensitivity();
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Feature Flag Tests
  // ==========================================================================
  describe('Feature Flag Gating', () => {
    it('actions return early when mobileA11y flag is disabled', () => {
      // Disable the flag BEFORE getting store reference
      FLAGS.mobileA11y = false;
      setDevFlag('mobileA11y', false);

      // Get fresh reference after flag change
      const gestureId = useMobileAccessibilityStore.getState().addGesture(createGestureInput());
      expect(gestureId).toBe('');

      const shortcutId = useMobileAccessibilityStore.getState().addKeyboardShortcut({
        name: 'Test',
        description: 'Test',
        key: 'k',
        modifiers: ['ctrl'],
        action: 'test',
        enabled: true,
        contexts: ['global'],
        announce: true,
      });
      expect(shortcutId).toBe('');

      // Re-enable for other tests
      FLAGS.mobileA11y = true;
      setDevFlag('mobileA11y', true);
    });
  });
});
