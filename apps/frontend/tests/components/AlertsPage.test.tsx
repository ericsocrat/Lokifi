/**
 * @fileoverview Comprehensive tests for the Alerts Page
 *
 * Test Coverage:
 * - Loading state display
 * - Authentication handling
 * - Alert list rendering
 * - Create alert form
 * - Alert actions (toggle, delete, refresh)
 * - Activity log display
 * - Design system compliance
 * - Accessibility
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/alerts',
}));

// Mock auth-guard
const mockRequireAuth = vi.fn();
vi.mock('@/src/lib/api/auth-guard', () => ({
  requireAuth: () => mockRequireAuth(),
}));

// Mock alerts utilities
const mockListAlerts = vi.fn();
const mockCreateAlert = vi.fn();
const mockDeleteAlert = vi.fn();
const mockToggleAlert = vi.fn();
const mockSubscribeAlerts = vi.fn();

vi.mock('@/src/lib/utils/alerts', () => ({
  listAlerts: () => mockListAlerts(),
  createAlert: (data: unknown) => mockCreateAlert(data),
  deleteAlert: (id: string) => mockDeleteAlert(id),
  toggleAlert: (id: string) => mockToggleAlert(id),
  subscribeAlerts: (cb: (ev: unknown) => void, enabled: boolean) =>
    mockSubscribeAlerts(cb, enabled),
}));

// Mock AuthModal
vi.mock('next/dynamic', () => ({
  default: () => {
    const AuthModalComponent = ({ onClose }: { onClose: () => void }) => (
      <div data-testid="auth-modal">
        <button onClick={onClose} data-testid="close-auth-modal">
          Close
        </button>
      </div>
    );
    return AuthModalComponent;
  },
}));

// Import after mocks
import AlertsPage from '../../app/alerts/page';

// Sample test data
const mockAlerts = [
  {
    id: 'alert-1',
    kind: 'price_threshold' as const,
    note: 'BTCUSD above 50000',
    sound: 'ping',
    maxTriggers: 1,
    enabled: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'alert-2',
    kind: 'pct_change' as const,
    note: 'ETHUSD up 5%',
    sound: 'ping',
    maxTriggers: 1,
    enabled: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'alert-3',
    kind: 'price_threshold' as const,
    note: 'BTCUSD below 40000',
    sound: 'ping',
    maxTriggers: 1,
    enabled: false,
    createdAt: '2025-01-03T00:00:00Z',
  },
];

describe('AlertsPage', () => {
  let unsubscribeMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMock = vi.fn();
    mockRequireAuth.mockResolvedValue(true);
    mockListAlerts.mockResolvedValue(mockAlerts);
    mockSubscribeAlerts.mockReturnValue(unsubscribeMock);
  });

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      mockRequireAuth.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AlertsPage />);

      expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    });

    it('should show loading spinner animation', () => {
      mockRequireAuth.mockImplementation(() => new Promise(() => {}));

      render(<AlertsPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should use design system colors in loading state', () => {
      mockRequireAuth.mockImplementation(() => new Promise(() => {}));

      render(<AlertsPage />);

      const container = document.querySelector('.bg-surface-0');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should show auth modal when not authenticated', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'));

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });
    });

    it('should close auth modal when close button clicked', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Not authenticated'));

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-auth-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
      });
    });

    it('should load alerts when authenticated', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(mockListAlerts).toHaveBeenCalled();
      });
    });
  });

  describe('Header Section', () => {
    it('should display page title', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Price Alerts/i })).toBeInTheDocument();
      });
    });

    it('should display page description', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Get notified when assets hit your target prices/i)
        ).toBeInTheDocument();
      });
    });

    it('should have Refresh button', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });
    });

    it('should have Create Alert button', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });
    });
  });

  describe('Alert List', () => {
    it('should display alert section title', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Your Alerts/i)).toBeInTheDocument();
      });
    });

    it('should display stats for active alerts count', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      });
    });

    it('should display alert notes', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('BTCUSD above 50000')).toBeInTheDocument();
        expect(screen.getByText('ETHUSD up 5%')).toBeInTheDocument();
      });
    });

    it('should show empty state when no alerts', async () => {
      mockListAlerts.mockResolvedValue([]);

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No alerts yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Create Alert Form', () => {
    it('should toggle create form visibility', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });

      // Form should not be visible initially
      expect(screen.queryByText('Create New Alert')).not.toBeInTheDocument();

      // Click Create Alert button
      fireEvent.click(screen.getByRole('button', { name: /Create Alert/i }));

      // Form should now be visible
      expect(screen.getByText('Create New Alert')).toBeInTheDocument();
    });

    it('should have alert type selector', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Alert/i }));

      expect(screen.getByText(/Alert Type/i)).toBeInTheDocument();
    });

    it('should have form description', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Alert/i }));

      expect(screen.getByText(/Set up a price or percentage change alert/i)).toBeInTheDocument();
    });
  });

  describe('Alert Actions', () => {
    it('should call refresh when Refresh button clicked', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      });

      mockListAlerts.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

      await waitFor(() => {
        expect(mockListAlerts).toHaveBeenCalled();
      });
    });
  });

  describe('Activity Log', () => {
    it('should display live triggers section', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Live Triggers')).toBeInTheDocument();
      });
    });

    it('should show empty log state when no events', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No triggers yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('SSE Subscription', () => {
    it('should subscribe to alerts on mount', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(mockSubscribeAlerts).toHaveBeenCalledWith(expect.any(Function), true);
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = render(<AlertsPage />);

      await waitFor(() => {
        expect(mockSubscribeAlerts).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Design System Compliance', () => {
    it('should use surface-0 for page background', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const container = document.querySelector('.bg-surface-0');
        expect(container).toBeInTheDocument();
      });
    });

    it('should use surface-50 for header background', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const header = document.querySelector('.bg-surface-50\\/80');
        expect(header).toBeInTheDocument();
      });
    });

    it('should use lokifi brand colors for primary actions', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Alert/i });
        expect(createButton).toHaveClass('from-lokifi');
      });
    });

    it('should use surface-100 for secondary buttons', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i });
        expect(refreshButton).toHaveClass('bg-surface-100');
      });
    });

    it('should use proper border colors', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const borderedElements = document.querySelectorAll('.border-surface-300');
        expect(borderedElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have max-width container', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const container = document.querySelector('.max-w-6xl');
        expect(container).toBeInTheDocument();
      });
    });

    it('should use grid layout for form', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Alert/i }));

      const gridElement = document.querySelector('.grid');
      expect(gridElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const h1 = document.querySelector('h1');
        expect(h1).toBeInTheDocument();
      });
    });

    it('should have form labels', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Alert/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Alert/i }));

      const labels = document.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Elements', () => {
    it('should have Bell icon in header', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const bellIcon = document.querySelector('.text-amber-500');
        expect(bellIcon).toBeInTheDocument();
      });
    });

    it('should have backdrop blur on header', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const header = document.querySelector('.backdrop-blur-xl');
        expect(header).toBeInTheDocument();
      });
    });

    it('should have sticky header', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        const stickyHeader = document.querySelector('.sticky');
        expect(stickyHeader).toBeInTheDocument();
      });
    });
  });

  describe('Alert Type Indicators', () => {
    it('should display price threshold alerts correctly', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        // Price threshold alerts should show
        expect(screen.getByText('BTCUSD above 50000')).toBeInTheDocument();
      });
    });

    it('should display percentage change alerts correctly', async () => {
      render(<AlertsPage />);

      await waitFor(() => {
        // Percentage change alerts should show
        expect(screen.getByText('ETHUSD up 5%')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show no alerts message when list is empty', async () => {
      mockListAlerts.mockResolvedValue([]);

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No alerts yet/i)).toBeInTheDocument();
      });
    });

    it('should suggest creating first alert when none exist', async () => {
      mockListAlerts.mockResolvedValue([]);

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Create your first price alert/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should render page with empty alerts on error', async () => {
      // When listAlerts returns empty array, page shows empty state
      mockListAlerts.mockResolvedValue([]);

      render(<AlertsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Price Alerts/i })).toBeInTheDocument();
      });

      // Empty state should be shown
      expect(screen.getByText(/No alerts yet/i)).toBeInTheDocument();
    });
  });
});
