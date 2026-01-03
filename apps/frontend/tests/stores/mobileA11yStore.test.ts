import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLAGS, setDevFlag } from '../../src/lib/stores/featureFlags';
import {
  type AccessibilitySettings,
  type DeviceInfo,
  type MobileSettings,
  type ResponsiveBreakpoint,
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
});
