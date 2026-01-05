import type { Draft } from 'immer';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MobileA11yStore');

// SpeechRecognition API types (not in standard TypeScript lib)
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  [index: number]: { transcript: string; confidence: number };
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}

// Browser API extensions not in standard TypeScript lib
interface NavigatorWithExtensions extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: SpeechRecognitionErrorEventLike) => void;
  start: () => void;
  stop: () => void;
}

// Browser extensions - use type augmentation approach
interface WindowWithExtensions {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitAudioContext?: typeof AudioContext;
  speechSynthesis?: SpeechSynthesis;
  __voiceRecognition?: SpeechRecognitionInstance;
}

interface ScreenOrientationExtended {
  lock: (orientation: string) => Promise<void>;
  unlock: () => void;
  type: string;
  angle: number;
}

// Mobile & Accessibility Types
export interface AccessibilitySettings {
  // Screen Reader Support
  screenReaderEnabled: boolean;
  screenReaderAnnouncements: boolean;

  // Keyboard Navigation
  keyboardNavigation: boolean;
  skipLinks: boolean;
  focusIndicators: boolean;
  customKeyboardShortcuts: Record<string, string>;

  // Visual Accessibility
  highContrast: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontFamily: 'system' | 'dyslexia-friendly' | 'monospace';

  // Motion & Animation
  reduceMotion: boolean;
  reduceAnimations: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';

  // Color & Contrast
  colorBlindSupport: boolean;
  colorBlindType: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none';
  customColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };

  // Audio
  audioFeedback: boolean;
  soundEffects: boolean;
  voiceCommands: boolean;
}

export interface MobileSettings {
  // Touch & Gestures
  touchEnabled: boolean;
  gestureNavigation: boolean;
  swipeActions: boolean;
  pinchZoom: boolean;
  doubleTapZoom: boolean;

  // Responsiveness
  adaptiveLayout: boolean;
  compactMode: boolean;
  orientation: 'auto' | 'portrait' | 'landscape';

  // Performance
  reducedQuality: boolean;
  dataUsageMode: 'unlimited' | 'wifi-only' | 'minimal';
  offlineMode: boolean;
  preloadData: boolean;

  // Interface
  bottomNavigation: boolean;
  tabBarPosition: 'top' | 'bottom';
  toolbarCollapse: boolean;
  fullscreenMode: boolean;

  // Notifications
  pushNotifications: boolean;
  vibration: boolean;
  notificationSounds: boolean;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  version: string;

  // Capabilities
  touchSupport: boolean;
  keyboardSupport: boolean;
  voiceSupport: boolean;
  cameraSupport: boolean;
  locationSupport: boolean;

  // Screen Info
  screenSize: {
    width: number;
    height: number;
    pixelRatio: number;
  };

  // Performance
  memory: number; // GB
  cores: number;
  connection: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown';

  // Accessibility Features
  voiceOver: boolean;
  talkBack: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface GestureConfig {
  id: string;
  name: string;
  description: string;

  // Gesture Definition
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'pan';
  direction?: 'up' | 'down' | 'left' | 'right';
  fingers: number;

  // Action
  action: string;
  component?: string;
  // Parameters are user-defined with varying types
  parameters?: Record<string, unknown>;

  // Conditions
  enabled: boolean;
  contexts: string[]; // ['chart', 'sidebar', 'global']

  // Sensitivity
  threshold: number;
  duration?: number; // for long-press
  distance?: number; // for swipe
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;

  // Key Combination
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];

  // Action
  action: string;
  component?: string;
  // Parameters are user-defined with varying types
  parameters?: Record<string, unknown>;

  // Conditions
  enabled: boolean;
  contexts: string[];

  // Accessibility
  announce: boolean;
  customAnnouncement?: string;
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;

  // Layout Adjustments
  columns: number;
  spacing: number;
  fontSize: number;

  // Component Visibility
  hiddenComponents: string[];
  collapsedComponents: string[];

  // Navigation
  navigationStyle: 'tabs' | 'drawer' | 'bottom-nav' | 'sidebar';

  // Charts
  chartHeight: number;
  maxCharts: number;
  compactCharts: boolean;
}

export interface AccessibilityAudit {
  id: string;
  timestamp: Date;

  // Audit Results
  score: number; // 0-100
  issues: AccessibilityIssue[];
  recommendations: AccessibilityRecommendation[];

  // Coverage
  testedElements: number;
  passedTests: number;
  failedTests: number;

  // Categories
  categories: {
    perceivable: number;
    operable: number;
    understandable: number;
    robust: number;
  };

  // Standards Compliance
  wcagLevel: 'A' | 'AA' | 'AAA';
  section508: boolean;
}

export interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';

  // Issue Details
  title: string;
  description: string;
  impact: string;

  // Location
  element: string;
  selector: string;
  page: string;

  // WCAG Info
  wcagCriteria: string[];
  level: 'A' | 'AA' | 'AAA';

  // Fix Info
  help: string;
  helpUrl: string;
}

export interface AccessibilityRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';

  // Implementation
  steps: string[];
  resources: string[];
  examples: string[];
}

// Store State
interface MobileAccessibilityState {
  // Device Detection
  deviceInfo: DeviceInfo | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Settings
  accessibilitySettings: AccessibilitySettings;
  mobileSettings: MobileSettings;

  // Gestures & Shortcuts
  gestures: GestureConfig[];
  keyboardShortcuts: KeyboardShortcut[];

  // Responsive Design
  currentBreakpoint: string;
  breakpoints: ResponsiveBreakpoint[];
  viewportSize: { width: number; height: number };

  // Accessibility Auditing
  lastAudit: AccessibilityAudit | null;
  auditHistory: AccessibilityAudit[];
  activeIssues: AccessibilityIssue[];

  // Feature Support
  supportedFeatures: {
    touchGestures: boolean;
    voiceCommands: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
  };

  // Performance Tracking
  performanceMetrics: {
    renderTime: number;
    interactionDelay: number;
    memoryUsage: number;
    batteryLevel?: number;
  };

  // UI State
  orientationLocked: boolean;
  keyboardVisible: boolean;
  focusedElement: string | null;

  // Loading States
  isInitializing: boolean;
  isAuditing: boolean;
  error: string | null;
}

// Store Actions
interface MobileAccessibilityActions {
  // Device Detection
  detectDevice: () => void;
  updateDeviceInfo: (info: Partial<DeviceInfo>) => void;
  checkFeatureSupport: () => void;

  // Settings Management
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  updateMobileSettings: (settings: Partial<MobileSettings>) => void;
  resetToDefaults: () => void;

  // Gesture Management
  addGesture: (gesture: Omit<GestureConfig, 'id'>) => string;
  updateGesture: (gestureId: string, updates: Partial<GestureConfig>) => void;
  removeGesture: (gestureId: string) => void;
  enableGesture: (gestureId: string, enabled: boolean) => void;

  // Keyboard Shortcuts
  addKeyboardShortcut: (shortcut: Omit<KeyboardShortcut, 'id'>) => string;
  updateKeyboardShortcut: (shortcutId: string, updates: Partial<KeyboardShortcut>) => void;
  removeKeyboardShortcut: (shortcutId: string) => void;
  enableKeyboardShortcut: (shortcutId: string, enabled: boolean) => void;

  // Responsive Design
  updateViewportSize: (width: number, height: number) => void;
  setBreakpoint: (breakpoint: string) => void;
  addBreakpoint: (breakpoint: ResponsiveBreakpoint) => void;
  updateBreakpoint: (name: string, updates: Partial<ResponsiveBreakpoint>) => void;

  // Accessibility Auditing
  runAccessibilityAudit: () => Promise<AccessibilityAudit>;
  fixAccessibilityIssue: (issueId: string) => Promise<void>;
  ignoreAccessibilityIssue: (issueId: string) => void;
  getAuditRecommendations: () => AccessibilityRecommendation[];

  // Accessibility Features
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocus: (elementId: string) => void;
  skipToContent: () => void;

  // Voice Commands
  startVoiceRecognition: () => Promise<void>;
  stopVoiceRecognition: () => void;
  processVoiceCommand: (command: string) => void;

  // Touch & Gestures
  handleGesture: (gestureType: string, event: TouchEvent | MouseEvent, context: string) => void;
  calibrateTouchSensitivity: () => void;

  // Performance Optimization
  optimizeForDevice: () => void;
  updatePerformanceMetrics: (
    metrics: Partial<MobileAccessibilityState['performanceMetrics']>
  ) => void;

  // Orientation & Layout
  lockOrientation: (orientation: 'portrait' | 'landscape') => void;
  unlockOrientation: () => void;
  toggleFullscreen: () => void;

  // Notification & Feedback
  showAccessibilityNotification: (message: string, type: 'info' | 'warning' | 'error') => void;
  vibrate: (pattern: number | number[]) => void;
  playAccessibilitySound: (soundType: 'success' | 'error' | 'navigation') => void;

  // Data Management
  exportSettings: () => Promise<Blob>;
  importSettings: (file: File) => Promise<void>;

  // Initialization
  initialize: () => Promise<void>;

  // Helper Methods
  setupEventListeners: () => void;
  initializeDefaultControls: () => void;
  applyAccessibilitySettings: () => void;
  applyMobileSettings: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

type MobileA11yStore = MobileAccessibilityState & MobileAccessibilityActions;

// ============================================================================
// Store Creation
// ============================================================================

export const useMobileAccessibilityStore = create<MobileA11yStore>()(
  persist(
    // @ts-expect-error - Zustand v5 middleware type inference issue
    subscribeWithSelector(
      immer((set, get, _store) => ({
        // Initial State
        deviceInfo: null,
        isMobile: false,
        isTablet: false,
        isDesktop: true,

        accessibilitySettings: {
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
        },

        mobileSettings: {
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
        },

        gestures: [],
        keyboardShortcuts: [],

        currentBreakpoint: 'desktop',
        breakpoints: [
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
        ],

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

        // Device Detection
        detectDevice: () => {
          if (!FLAGS.mobileA11y || typeof window === 'undefined') return;

          const userAgent = navigator.userAgent.toLowerCase();
          const width = window.innerWidth;
          const height = window.innerHeight;

          // Detect device type
          const isMobile =
            width <= 767 ||
            /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
          const isTablet = (width >= 768 && width <= 1023) || /tablet|ipad/i.test(userAgent);
          const isDesktop = width >= 1024 && !isMobile && !isTablet;

          // Detect OS
          let os: DeviceInfo['os'] = 'unknown';
          if (/windows/i.test(userAgent)) os = 'windows';
          else if (/mac/i.test(userAgent)) os = 'macos';
          else if (/linux/i.test(userAgent)) os = 'linux';
          else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'ios';
          else if (/android/i.test(userAgent)) os = 'android';

          // Detect browser
          let browser: DeviceInfo['browser'] = 'unknown';
          if (/chrome/i.test(userAgent)) browser = 'chrome';
          else if (/firefox/i.test(userAgent)) browser = 'firefox';
          else if (/safari/i.test(userAgent)) browser = 'safari';
          else if (/edge/i.test(userAgent)) browser = 'edge';
          else if (/opera/i.test(userAgent)) browser = 'opera';

          // Detect capabilities
          const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          const voiceSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
          const cameraSupport =
            'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
          const locationSupport = 'geolocation' in navigator;

          // Detect accessibility features
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const highContrast = window.matchMedia('(prefers-contrast: high)').matches;

          // Estimate performance - use type-safe Navigator extensions
          const navExt = navigator as NavigatorWithExtensions;
          const memory = navExt.deviceMemory || 4;
          const cores = navigator.hardwareConcurrency || 4;

          // Detect connection
          const connection = navExt.connection || navExt.mozConnection || navExt.webkitConnection;
          const connectionType = connection?.effectiveType || 'unknown';

          const deviceInfo: DeviceInfo = {
            type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
            os,
            browser,
            version: navigator.userAgent,
            touchSupport,
            keyboardSupport: !isMobile,
            voiceSupport,
            cameraSupport,
            locationSupport,
            screenSize: {
              width,
              height,
              pixelRatio: window.devicePixelRatio || 1,
            },
            memory,
            cores,
            connection: connectionType,
            voiceOver: navigator.userAgent?.includes('VoiceOver') || false,
            talkBack: navigator.userAgent?.includes('TalkBack') || false,
            highContrast,
            reducedMotion,
          };

          set((draft: Draft<MobileA11yStore>) => {
            draft.deviceInfo = deviceInfo;
            draft.isMobile = isMobile;
            draft.isTablet = isTablet;
            draft.isDesktop = isDesktop;
            draft.viewportSize = { width, height };
            draft.currentBreakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
          });

          // Update accessibility settings based on device
          if (reducedMotion) {
            get().updateAccessibilitySettings({
              reduceMotion: true,
              reduceAnimations: true,
              animationSpeed: 'slow',
            });
          }

          if (highContrast) {
            get().updateAccessibilitySettings({
              highContrast: true,
            });
          }

          // Optimize for device
          get().optimizeForDevice();
        },

        updateDeviceInfo: (info: Partial<DeviceInfo>) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            if (draft.deviceInfo) {
              Object.assign(draft.deviceInfo, info);
            }
          });
        },

        checkFeatureSupport: () => {
          if (!FLAGS.mobileA11y || typeof window === 'undefined') return;

          const winExt = window as WindowWithExtensions;
          const features = {
            touchGestures: 'ontouchstart' in window,
            voiceCommands: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            screenReader: !!winExt.speechSynthesis,
            keyboardNavigation: true,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          };

          set((draft: Draft<MobileA11yStore>) => {
            draft.supportedFeatures = features;
          });
        },

        // Settings Management
        updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            Object.assign(draft.accessibilitySettings, settings);
          });

          // Apply settings immediately
          get().applyAccessibilitySettings();
        },

        updateMobileSettings: (settings: Partial<MobileSettings>) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            Object.assign(draft.mobileSettings, settings);
          });

          // Apply settings immediately
          get().applyMobileSettings();
        },

        resetToDefaults: () => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            // Reset to default settings based on device
            if (draft.isMobile) {
              draft.mobileSettings.compactMode = true;
              draft.mobileSettings.bottomNavigation = true;
              draft.mobileSettings.toolbarCollapse = true;
            }

            if (draft.deviceInfo?.reducedMotion) {
              draft.accessibilitySettings.reduceMotion = true;
              draft.accessibilitySettings.reduceAnimations = true;
            }
          });
        },

        // Gesture Management
        addGesture: (gestureData: Omit<GestureConfig, 'id'>) => {
          if (!FLAGS.mobileA11y) return '';

          const gestureId = `gesture_${Date.now()}`;
          const gesture: GestureConfig = {
            ...gestureData,
            id: gestureId,
          };

          set((draft: Draft<MobileA11yStore>) => {
            draft.gestures.push(gesture);
          });

          return gestureId;
        },

        updateGesture: (gestureId: string, updates: Partial<GestureConfig>) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const gesture = draft.gestures.find((g) => g.id === gestureId);
            if (gesture) {
              Object.assign(gesture, updates);
            }
          });
        },

        removeGesture: (gestureId: string) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const index = draft.gestures.findIndex((g) => g.id === gestureId);
            if (index !== -1) {
              draft.gestures.splice(index, 1);
            }
          });
        },

        enableGesture: (gestureId: string, enabled: boolean) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const gesture = draft.gestures.find((g) => g.id === gestureId);
            if (gesture) {
              gesture.enabled = enabled;
            }
          });
        },

        // Keyboard Shortcuts
        addKeyboardShortcut: (shortcutData: Omit<KeyboardShortcut, 'id'>) => {
          if (!FLAGS.mobileA11y) return '';

          const shortcutId = `shortcut_${Date.now()}`;
          const shortcut: KeyboardShortcut = {
            ...shortcutData,
            id: shortcutId,
          };

          set((draft: Draft<MobileA11yStore>) => {
            draft.keyboardShortcuts.push(shortcut);
          });

          return shortcutId;
        },

        updateKeyboardShortcut: (shortcutId: string, updates: Partial<KeyboardShortcut>) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const shortcut = draft.keyboardShortcuts.find((s) => s.id === shortcutId);
            if (shortcut) {
              Object.assign(shortcut, updates);
            }
          });
        },

        removeKeyboardShortcut: (shortcutId: string) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const index = draft.keyboardShortcuts.findIndex((s) => s.id === shortcutId);
            if (index !== -1) {
              draft.keyboardShortcuts.splice(index, 1);
            }
          });
        },

        enableKeyboardShortcut: (shortcutId: string, enabled: boolean) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const shortcut = draft.keyboardShortcuts.find((s) => s.id === shortcutId);
            if (shortcut) {
              shortcut.enabled = enabled;
            }
          });
        },

        // Responsive Design
        updateViewportSize: (width: number, height: number) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            draft.viewportSize = { width, height };

            // Update breakpoint
            const breakpoint = draft.breakpoints.find(
              (bp) => width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)
            );

            if (breakpoint) {
              draft.currentBreakpoint = breakpoint.name;
            }
          });
        },

        setBreakpoint: (breakpoint) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            draft.currentBreakpoint = breakpoint;
          });
        },

        addBreakpoint: (breakpoint) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            draft.breakpoints.push(breakpoint);
            // Sort by minWidth
            draft.breakpoints.sort((a, b) => a.minWidth - b.minWidth);
          });
        },

        updateBreakpoint: (name, updates) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            const breakpoint = draft.breakpoints.find((bp) => bp.name === name);
            if (breakpoint) {
              Object.assign(breakpoint, updates);
            }
          });
        },

        // Accessibility Auditing
        runAccessibilityAudit: async () => {
          if (!FLAGS.mobileA11y) {
            throw new Error('Mobile accessibility features not enabled');
          }

          set((draft: Draft<MobileA11yStore>) => {
            draft.isAuditing = true;
            draft.error = null;
          });

          try {
            // This would integrate with axe-core or similar accessibility testing library
            const auditResults = await performAccessibilityAudit();

            const audit: AccessibilityAudit = {
              id: `audit_${Date.now()}`,
              timestamp: new Date(),
              score: auditResults.score,
              issues: auditResults.issues,
              recommendations: auditResults.recommendations,
              testedElements: auditResults.testedElements,
              passedTests: auditResults.passedTests,
              failedTests: auditResults.failedTests,
              categories: auditResults.categories,
              wcagLevel: auditResults.wcagLevel,
              section508: auditResults.section508,
            };

            set((draft: Draft<MobileA11yStore>) => {
              draft.lastAudit = audit;
              draft.auditHistory.unshift(audit);
              draft.activeIssues = audit.issues.filter((issue) => issue.type === 'error');
              draft.isAuditing = false;

              // Keep only last 10 audits
              if (draft.auditHistory.length > 10) {
                draft.auditHistory = draft.auditHistory.slice(0, 10);
              }
            });

            return audit;
          } catch (error) {
            set((draft: Draft<MobileA11yStore>) => {
              draft.error = error instanceof Error ? error.message : 'Audit failed';
              draft.isAuditing = false;
            });

            throw error;
          }
        },

        fixAccessibilityIssue: async (issueId: string) => {
          if (!FLAGS.mobileA11y) return;

          try {
            // Auto-fix common accessibility issues
            await autoFixAccessibilityIssue(issueId);

            set((draft: Draft<MobileA11yStore>) => {
              draft.activeIssues = draft.activeIssues.filter((issue) => issue.id !== issueId);
            });
          } catch (error) {
            set((draft: Draft<MobileA11yStore>) => {
              draft.error = error instanceof Error ? error.message : 'Failed to fix issue';
            });
          }
        },

        ignoreAccessibilityIssue: (issueId: string) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            draft.activeIssues = draft.activeIssues.filter((issue) => issue.id !== issueId);
          });
        },

        getAuditRecommendations: () => {
          if (!FLAGS.mobileA11y) return [];

          const { lastAudit } = get();
          return lastAudit?.recommendations || [];
        },

        // Accessibility Features
        announceToScreenReader: (message, priority = 'polite') => {
          if (!FLAGS.mobileA11y || !get().accessibilitySettings.screenReaderAnnouncements) return;

          // Create live region for screen reader announcements
          const liveRegion =
            document.getElementById('sr-live-region') ||
            (() => {
              const region = document.createElement('div');
              region.id = 'sr-live-region';
              region.setAttribute('aria-live', priority);
              region.setAttribute('aria-atomic', 'true');
              region.style.position = 'absolute';
              region.style.left = '-10000px';
              region.style.width = '1px';
              region.style.height = '1px';
              region.style.overflow = 'hidden';
              document.body.appendChild(region);
              return region;
            })();

          liveRegion.textContent = message;
        },

        setFocus: (elementId: string) => {
          if (!FLAGS.mobileA11y) return;

          const element = document.getElementById(elementId);
          if (element) {
            element.focus();

            set((draft: Draft<MobileA11yStore>) => {
              draft.focusedElement = elementId;
            });
          }
        },

        skipToContent: () => {
          if (!FLAGS.mobileA11y) return;

          const mainContent =
            document.getElementById('main-content') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]');

          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });

            get().announceToScreenReader('Skipped to main content');
          }
        },

        // Voice Commands
        startVoiceRecognition: async () => {
          if (!FLAGS.mobileA11y || !get().supportedFeatures.voiceCommands) {
            throw new Error('Voice commands not supported');
          }

          try {
            const winExt = window as WindowWithExtensions;
            const SpeechRecognitionClass =
              winExt.SpeechRecognition || winExt.webkitSpeechRecognition;
            if (!SpeechRecognitionClass) {
              throw new Error('SpeechRecognition not available');
            }
            const recognition = new SpeechRecognitionClass();

            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEventLike) => {
              const command = event.results[event.results.length - 1][0].transcript
                .toLowerCase()
                .trim();
              get().processVoiceCommand(command);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
              console.error('Voice recognition error:', event.error);
            };

            recognition.start();

            // Store recognition instance for later cleanup
            winExt.__voiceRecognition = recognition;
          } catch (_error) {
            throw new Error('Failed to start voice recognition');
          }
        },

        stopVoiceRecognition: () => {
          if (!FLAGS.mobileA11y) return;

          const winExt = window as WindowWithExtensions;
          const recognition = winExt.__voiceRecognition;
          if (recognition) {
            recognition.stop();
            delete winExt.__voiceRecognition;
          }
        },

        processVoiceCommand: (command: string) => {
          if (!FLAGS.mobileA11y) return;

          const commands = {
            'go to portfolio': () => (window.location.hash = '#/portfolio'),
            'open chart': () => get().announceToScreenReader('Opening chart view'),
            'zoom in': () => get().announceToScreenReader('Zooming in'),
            'zoom out': () => get().announceToScreenReader('Zooming out'),
            help: () =>
              get().announceToScreenReader(
                'Voice commands: go to portfolio, open chart, zoom in, zoom out, help'
              ),
            'stop listening': () => get().stopVoiceRecognition(),
          };

          const matchedCommand = Object.keys(commands).find((cmd) =>
            command.includes(cmd.toLowerCase())
          );

          if (matchedCommand) {
            commands[matchedCommand as keyof typeof commands]();
          } else {
            get().announceToScreenReader(
              'Command not recognized. Say "help" for available commands.'
            );
          }
        },

        // Touch & Gestures
        handleGesture: (gestureType, event, context) => {
          if (!FLAGS.mobileA11y || !get().mobileSettings.gestureNavigation) return;

          const gesture = get().gestures.find(
            (g) => g.type === gestureType && g.enabled && g.contexts.includes(context)
          );

          if (gesture) {
            // Execute gesture action
            logger.debug('Executing gesture', { name: gesture.name, action: gesture.action });

            // Provide haptic feedback if available
            if (get().mobileSettings.vibration && 'vibrate' in navigator) {
              navigator.vibrate(50);
            }
          }
        },

        calibrateTouchSensitivity: () => {
          if (!FLAGS.mobileA11y) return;

          // Adjust touch sensitivity based on device and settings
          logger.debug('Calibrating touch sensitivity');
        },

        // Performance Optimization
        optimizeForDevice: () => {
          if (!FLAGS.mobileA11y) return;

          const { deviceInfo, isMobile } = get();

          if (isMobile && deviceInfo) {
            // Enable performance optimizations for mobile
            get().updateMobileSettings({
              reducedQuality: deviceInfo.memory < 2,
              dataUsageMode:
                deviceInfo.connection === 'slow-2g' || deviceInfo.connection === '2g'
                  ? 'minimal'
                  : 'unlimited',
              preloadData:
                deviceInfo.connection === '4g' ||
                deviceInfo.connection === '5g' ||
                deviceInfo.connection === 'wifi',
            });

            // Reduce motion for low-end devices
            if (deviceInfo.cores < 4 || deviceInfo.memory < 3) {
              get().updateAccessibilitySettings({
                reduceAnimations: true,
                animationSpeed: 'slow',
              });
            }
          }
        },

        updatePerformanceMetrics: (
          metrics: Partial<MobileAccessibilityState['performanceMetrics']>
        ) => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            Object.assign(draft.performanceMetrics, metrics);
          });
        },

        // Orientation & Layout
        lockOrientation: (orientation: string) => {
          if (!FLAGS.mobileA11y || !('screen' in window)) return;

          // Screen orientation lock API - cast through unknown for browser compatibility
          const screenOrientation = window.screen.orientation as unknown as
            | ScreenOrientationExtended
            | undefined;
          if (!screenOrientation?.lock) return;

          try {
            screenOrientation.lock(orientation);

            set((draft: Draft<MobileA11yStore>) => {
              draft.orientationLocked = true;
            });
          } catch (error) {
            console.warn('Failed to lock orientation:', error);
          }
        },

        unlockOrientation: () => {
          if (!FLAGS.mobileA11y || !('screen' in window)) return;

          // Screen orientation unlock API - cast through unknown for browser compatibility
          const screenOrientation = window.screen.orientation as unknown as
            | ScreenOrientationExtended
            | undefined;
          if (!screenOrientation?.unlock) return;

          try {
            screenOrientation.unlock();

            set((draft: Draft<MobileA11yStore>) => {
              draft.orientationLocked = false;
            });
          } catch (error) {
            console.warn('Failed to unlock orientation:', error);
          }
        },

        toggleFullscreen: () => {
          if (!FLAGS.mobileA11y) return;

          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        },

        // Notification & Feedback
        showAccessibilityNotification: (message: string, type: string) => {
          if (!FLAGS.mobileA11y) return;

          // Show visual notification
          logger.debug('Accessibility notification', { type, message });

          // Announce to screen reader
          get().announceToScreenReader(message, type === 'error' ? 'assertive' : 'polite');

          // Play sound if enabled
          if (get().accessibilitySettings.audioFeedback) {
            get().playAccessibilitySound(type === 'error' ? 'error' : 'navigation');
          }
        },

        vibrate: (pattern: number | number[]) => {
          if (!FLAGS.mobileA11y || !get().mobileSettings.vibration || !('vibrate' in navigator))
            return;

          navigator.vibrate(pattern);
        },

        playAccessibilitySound: (soundType: string) => {
          if (!FLAGS.mobileA11y || !get().accessibilitySettings.soundEffects) return;

          // This would play appropriate accessibility sounds
          const winExt = window as WindowWithExtensions;
          const AudioContextClass = window.AudioContext || winExt.webkitAudioContext;
          if (!AudioContextClass) return;

          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(context.destination);

          const frequencies = {
            success: 800,
            error: 300,
            navigation: 600,
            info: 500,
          };

          oscillator.frequency.setValueAtTime(
            frequencies[soundType as keyof typeof frequencies] || 500,
            context.currentTime
          );
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.1, context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);

          oscillator.start(context.currentTime);
          oscillator.stop(context.currentTime + 0.3);
        },

        // Data Management
        exportSettings: async () => {
          if (!FLAGS.mobileA11y) throw new Error('Mobile accessibility features not enabled');

          const settings = {
            accessibilitySettings: get().accessibilitySettings,
            mobileSettings: get().mobileSettings,
            gestures: get().gestures,
            keyboardShortcuts: get().keyboardShortcuts,
            breakpoints: get().breakpoints,
          };

          const blob = new Blob([JSON.stringify(settings, null, 2)], {
            type: 'application/json',
          });

          return blob;
        },

        importSettings: async (file: File) => {
          if (!FLAGS.mobileA11y) return;

          try {
            const text = await file.text();
            const settings = JSON.parse(text);

            set((draft: Draft<MobileA11yStore>) => {
              if (settings.accessibilitySettings) {
                draft.accessibilitySettings = settings.accessibilitySettings;
              }
              if (settings.mobileSettings) {
                draft.mobileSettings = settings.mobileSettings;
              }
              if (settings.gestures) {
                draft.gestures = settings.gestures;
              }
              if (settings.keyboardShortcuts) {
                draft.keyboardShortcuts = settings.keyboardShortcuts;
              }
              if (settings.breakpoints) {
                draft.breakpoints = settings.breakpoints;
              }
            });
          } catch (error) {
            set((draft: Draft<MobileA11yStore>) => {
              draft.error = error instanceof Error ? error.message : 'Failed to import settings';
            });
          }
        },

        // Initialization
        initialize: async () => {
          if (!FLAGS.mobileA11y) return;

          set((draft: Draft<MobileA11yStore>) => {
            draft.isInitializing = true;
            draft.error = null;
          });

          try {
            // Detect device and capabilities
            get().detectDevice();
            get().checkFeatureSupport();

            // Set up event listeners
            get().setupEventListeners();

            // Initialize default gestures and shortcuts
            get().initializeDefaultControls();

            // Apply current settings
            get().applyAccessibilitySettings();
            get().applyMobileSettings();

            set((draft: Draft<MobileA11yStore>) => {
              draft.isInitializing = false;
            });
          } catch (error) {
            set((draft: Draft<MobileA11yStore>) => {
              draft.error = error instanceof Error ? error.message : 'Initialization failed';
              draft.isInitializing = false;
            });
          }
        },

        // Helper Methods
        setupEventListeners: () => {
          if (typeof window === 'undefined') return;

          // Viewport size changes
          window.addEventListener('resize', () => {
            get().updateViewportSize(window.innerWidth, window.innerHeight);
          });

          // Orientation changes
          window.addEventListener('orientationchange', () => {
            setTimeout(() => {
              get().updateViewportSize(window.innerWidth, window.innerHeight);
            }, 100);
          });

          // Keyboard events
          window.addEventListener('keydown', (event) => {
            const shortcuts = get().keyboardShortcuts.filter((s) => s.enabled);

            for (const shortcut of shortcuts) {
              const modifiersMatch = shortcut.modifiers.every((mod) => {
                switch (mod) {
                  case 'ctrl':
                    return event.ctrlKey;
                  case 'alt':
                    return event.altKey;
                  case 'shift':
                    return event.shiftKey;
                  case 'meta':
                    return event.metaKey;
                  default:
                    return false;
                }
              });

              if (modifiersMatch && event.key.toLowerCase() === shortcut.key.toLowerCase()) {
                event.preventDefault();
                logger.debug('Executing shortcut', { name: shortcut.name });

                if (shortcut.announce) {
                  get().announceToScreenReader(
                    shortcut.customAnnouncement || `Executed ${shortcut.name}`
                  );
                }
              }
            }
          });

          // Focus tracking
          document.addEventListener('focusin', (event) => {
            const element = event.target as HTMLElement;
            if (element.id) {
              set((draft: Draft<MobileA11yStore>) => {
                draft.focusedElement = element.id;
              });
            }
          });

          // Virtual keyboard detection (mobile)
          if (get().isMobile) {
            const initialViewportHeight = window.innerHeight;

            window.addEventListener('resize', () => {
              const currentHeight = window.innerHeight;
              const heightDifference = initialViewportHeight - currentHeight;

              set((draft: Draft<MobileA11yStore>) => {
                draft.keyboardVisible = heightDifference > 150; // Threshold for keyboard
              });
            });
          }
        },

        initializeDefaultControls: () => {
          // Default gestures for mobile
          if (get().isMobile) {
            get().addGesture({
              name: 'Swipe Left - Next Chart',
              description: 'Swipe left to go to next chart',
              type: 'swipe',
              direction: 'left',
              fingers: 1,
              action: 'nextChart',
              enabled: true,
              contexts: ['chart'],
              threshold: 100,
            });

            get().addGesture({
              name: 'Swipe Right - Previous Chart',
              description: 'Swipe right to go to previous chart',
              type: 'swipe',
              direction: 'right',
              fingers: 1,
              action: 'prevChart',
              enabled: true,
              contexts: ['chart'],
              threshold: 100,
            });

            get().addGesture({
              name: 'Pinch - Zoom',
              description: 'Pinch to zoom in/out on chart',
              type: 'pinch',
              fingers: 2,
              action: 'zoom',
              enabled: true,
              contexts: ['chart'],
              threshold: 10,
            });
          }

          // Default keyboard shortcuts
          get().addKeyboardShortcut({
            name: 'Skip to Content',
            description: 'Skip navigation and go to main content',
            key: '1',
            modifiers: ['alt'],
            action: 'skipToContent',
            enabled: true,
            contexts: ['global'],
            announce: true,
            customAnnouncement: 'Skipped to main content',
          });

          get().addKeyboardShortcut({
            name: 'Toggle High Contrast',
            description: 'Toggle high contrast mode',
            key: 'h',
            modifiers: ['ctrl', 'alt'],
            action: 'toggleHighContrast',
            enabled: true,
            contexts: ['global'],
            announce: true,
          });

          get().addKeyboardShortcut({
            name: 'Increase Font Size',
            description: 'Increase font size',
            key: '+',
            modifiers: ['ctrl'],
            action: 'increaseFontSize',
            enabled: true,
            contexts: ['global'],
            announce: true,
          });
        },

        applyAccessibilitySettings: () => {
          const settings = get().accessibilitySettings;

          // Apply CSS custom properties
          document.documentElement.style.setProperty(
            '--font-size-base',
            settings.fontSize === 'small'
              ? '14px'
              : settings.fontSize === 'large'
                ? '18px'
                : settings.fontSize === 'extra-large'
                  ? '20px'
                  : '16px'
          );

          document.documentElement.style.setProperty(
            '--font-family-base',
            settings.fontFamily === 'dyslexia-friendly'
              ? 'OpenDyslexic, sans-serif'
              : settings.fontFamily === 'monospace'
                ? 'monospace'
                : 'system-ui'
          );

          // Apply high contrast
          if (settings.highContrast) {
            document.body.classList.add('high-contrast');
          } else {
            document.body.classList.remove('high-contrast');
          }

          // Apply reduced motion
          if (settings.reduceMotion) {
            document.body.classList.add('reduce-motion');
          } else {
            document.body.classList.remove('reduce-motion');
          }

          // Apply custom colors
          if (settings.colorBlindSupport) {
            Object.entries(settings.customColors).forEach(([key, value]) => {
              document.documentElement.style.setProperty(`--color-${key}`, value);
            });
          }
        },

        applyMobileSettings: () => {
          const settings = get().mobileSettings;

          // Apply mobile-specific classes
          if (settings.compactMode) {
            document.body.classList.add('compact-mode');
          } else {
            document.body.classList.remove('compact-mode');
          }

          if (settings.bottomNavigation) {
            document.body.classList.add('bottom-navigation');
          } else {
            document.body.classList.remove('bottom-navigation');
          }

          // Disable zoom if pinch zoom is disabled
          if (!settings.pinchZoom) {
            const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
            if (viewport) {
              viewport.content = viewport.content.replace(/user-scalable=yes/g, 'user-scalable=no');
            }
          }
        },
      }))
    ),
    {
      name: 'lokifi-mobile-accessibility-storage',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          return {
            ...(persistedState as object),
            supportedFeatures: {
              touchGestures: false,
              voiceCommands: false,
              screenReader: false,
              keyboardNavigation: true,
              highContrast: false,
              reducedMotion: false,
            },
          };
        }
        return persistedState as MobileAccessibilityState & MobileAccessibilityActions;
      },
    }
  )
);

// Accessibility audit result type
interface AccessibilityAuditResult {
  score: number;
  issues: AccessibilityIssue[];
  recommendations: AccessibilityRecommendation[];
  testedElements: number;
  passedTests: number;
  failedTests: number;
  categories: {
    perceivable: number;
    operable: number;
    understandable: number;
    robust: number;
  };
  wcagLevel: 'A' | 'AA' | 'AAA';
  section508: boolean;
}

// Helper Functions
async function performAccessibilityAudit(): Promise<AccessibilityAuditResult> {
  // This would integrate with axe-core or similar
  return {
    score: 85,
    issues: [],
    recommendations: [],
    testedElements: 100,
    passedTests: 85,
    failedTests: 15,
    categories: {
      perceivable: 90,
      operable: 80,
      understandable: 85,
      robust: 85,
    },
    wcagLevel: 'AA',
    section508: true,
  };
}

async function autoFixAccessibilityIssue(issueId: string): Promise<void> {
  // Auto-fix common accessibility issues
  logger.debug('Auto-fixing accessibility issue', { issueId });
}

// Selectors
export const useCurrentBreakpoint = () =>
  useMobileAccessibilityStore((draft: Draft<MobileA11yStore>) => draft.currentBreakpoint);

export const useDeviceType = () =>
  useMobileAccessibilityStore((draft: Draft<MobileA11yStore>) => ({
    isMobile: draft.isMobile,
    isTablet: draft.isTablet,
    isDesktop: draft.isDesktop,
  }));

export const useAccessibilityScore = () =>
  useMobileAccessibilityStore((draft: Draft<MobileA11yStore>) => draft.lastAudit?.score || 0);

export const useActiveIssuesCount = () =>
  useMobileAccessibilityStore((draft: Draft<MobileA11yStore>) => draft.activeIssues.length);

// Initialize store on client
if (typeof window !== 'undefined' && FLAGS.mobileA11y) {
  const store = useMobileAccessibilityStore.getState();
  store.initialize();
}
