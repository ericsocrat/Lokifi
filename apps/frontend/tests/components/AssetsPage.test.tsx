import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssetsPage from '../../app/dashboard/assets/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard/assets',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock PreferencesContext
vi.mock('@/src/components/dashboard/PreferencesContext', () => ({
  usePreferences: () => ({
    darkMode: true,
    setDarkMode: vi.fn(),
    currency: 'USD',
    setCurrency: vi.fn(),
  }),
}));

// Mock ToastProvider
vi.mock('@/src/components/dashboard/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock useCurrencyFormatter
vi.mock('@/src/components/dashboard/useCurrencyFormatter', () => ({
  useCurrencyFormatter: () => ({
    formatCurrency: (value: number) =>
      `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  }),
}));

// Mock ProfileDropdown
vi.mock('@/src/components/dashboard/ProfileDropdown', () => ({
  ProfileDropdown: ({
    userName,
    userEmail,
    onLogout,
  }: {
    userName?: string;
    userEmail?: string;
    onLogout?: () => void;
  }) => (
    <div data-testid="profile-dropdown">
      <span data-testid="user-name">{userName}</span>
      <span data-testid="user-email">{userEmail}</span>
      <button data-testid="logout-btn" onClick={onLogout}>
        Logout
      </button>
    </div>
  ),
}));

// Mock portfolioStorage
const mockLoadPortfolio = vi.fn();
const mockAddAssets = vi.fn();
const mockAddSection = vi.fn();
const mockDeleteAsset = vi.fn();
const mockTotalValue = vi.fn();

vi.mock('@/src/lib/data/portfolioStorage', () => ({
  loadPortfolio: () => mockLoadPortfolio(),
  addAssets: (...args: unknown[]) => mockAddAssets(...args),
  addSection: (...args: unknown[]) => mockAddSection(...args),
  deleteAsset: (...args: unknown[]) => mockDeleteAsset(...args),
  totalValue: () => mockTotalValue(),
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    reset: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Default mock data
const defaultSections = [
  {
    title: 'Default',
    assets: [
      { id: '1', name: 'Apple Inc', symbol: 'AAPL', shares: 10, value: 1500, change: 2.5 },
      { id: '2', name: 'Tesla Inc', symbol: 'TSLA', shares: 5, value: 1200, change: -1.2 },
    ],
  },
];

describe('AssetsPage', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.reset();

    // Default mock implementations
    mockLoadPortfolio.mockReturnValue(defaultSections);
    mockTotalValue.mockReturnValue(2700);

    // Mock fetch
    fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'test@example.com', name: 'Test User' }),
    } as Response);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching auth', async () => {
      // Delay the fetch response
      fetchMock.mockImplementation(() => new Promise(() => {}));

      render(<AssetsPage />);

      expect(screen.getByText('Loading assets...')).toBeInTheDocument();
    });

    it('shows loading spinner during initial load', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<AssetsPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('fetches user authentication on mount', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/me', {
          credentials: 'include',
        });
      });
    });

    it('displays user name when authenticated', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });

    it('falls back to demo user on auth failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Demo')).toBeInTheDocument();
      });
    });

    it('falls back to demo user when backend returns non-ok', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Demo')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Bar', () => {
    it('renders the Lokifi logo and branding', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Lokifi')).toBeInTheDocument();
      });
    });

    it('renders notification button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      });
    });

    it('renders search button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
      });
    });

    it('renders share button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Share')).toBeInTheDocument();
      });
    });

    it('renders currency indicator', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('EUR €')).toBeInTheDocument();
      });
    });

    it('renders ProfileDropdown with user info', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Navigation', () => {
    it('renders Net Worth link', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Net Worth')).toBeInTheDocument();
      });
    });

    it('renders Assets link as active', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        // There are multiple "Assets" - one in nav, one in header
        // Get the sidebar link which has gradient class
        const assetsLinks = screen.getAllByText('Assets');
        const sidebarLink = assetsLinks.find((el) =>
          el.closest('a')?.classList.contains('bg-gradient-to-r')
        );
        expect(sidebarLink?.closest('a')).toHaveClass('bg-gradient-to-r');
      });
    });

    it('renders Debts link', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Debts')).toBeInTheDocument();
      });
    });

    it('renders Recap link', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Recap')).toBeInTheDocument();
      });
    });

    it('renders Fast Forward link', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fast Forward')).toBeInTheDocument();
      });
    });

    it('renders Beneficiary link', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Beneficiary')).toBeInTheDocument();
      });
    });

    it('displays total value in sidebar', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        // Total value should appear multiple times
        const values = screen.getAllByText('$2,700.00');
        expect(values.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Main Content Header', () => {
    it('renders page title', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument();
      });
    });

    it('displays time period indicator', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('1 DAY')).toBeInTheDocument();
      });
    });

    it('shows hint about menu options', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('menu for more details')).toBeInTheDocument();
      });
    });
  });

  describe('Category Tabs', () => {
    it('renders Investments tab as active', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const investmentsTab = screen.getByRole('button', { name: 'Investments' });
        expect(investmentsTab).toHaveClass('border-lokifi', 'font-semibold');
      });
    });

    it('renders Real Estate tab', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Real Estate' })).toBeInTheDocument();
      });
    });

    it('renders Others tab', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Others' })).toBeInTheDocument();
      });
    });
  });

  describe('Asset Sections', () => {
    it('renders section title', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Default')).toBeInTheDocument();
      });
    });

    it('renders ASSET column header', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('ASSET')).toBeInTheDocument();
      });
    });

    it('renders asset items', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
        expect(screen.getByText('Tesla Inc')).toBeInTheDocument();
      });
    });

    it('renders asset symbols', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('TSLA')).toBeInTheDocument();
      });
    });

    it('renders asset values', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('$1,500.00')).toBeInTheDocument();
        expect(screen.getByText('$1,200.00')).toBeInTheDocument();
      });
    });

    it('calculates and displays section total', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        // Section total should be 1500 + 1200 = 2700
        const sectionTotals = screen.getAllByText('$2,700.00');
        expect(sectionTotals.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Add Asset Button', () => {
    it('renders ADD ASSET buttons', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        // There are multiple ADD ASSET buttons/links
        const addButtons = screen.getAllByRole('button', { name: /ADD ASSET/i });
        expect(addButtons.length).toBeGreaterThan(0);
      });
    });

    it('navigates to add-assets page on click', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const addButtons = screen.getAllByRole('button', { name: /ADD ASSET/i });
        fireEvent.click(addButtons[0]);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });

    it('renders + ADD ASSET link in footer actions', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const addAssetLinks = screen.getAllByText('+ ADD ASSET');
        expect(addAssetLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('New Section Button', () => {
    it('renders NEW SECTION button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('+ NEW SECTION')).toBeInTheDocument();
      });
    });

    it('adds new section on click', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const newSectionBtn = screen.getByText('+ NEW SECTION');
        fireEvent.click(newSectionBtn);
      });

      expect(mockAddSection).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no assets and no connecting banks', async () => {
      mockLoadPortfolio.mockReturnValue([{ title: 'Default', assets: [] }]);

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('No assets yet')).toBeInTheDocument();
      });
    });

    it('shows add first asset button in empty state', async () => {
      mockLoadPortfolio.mockReturnValue([{ title: 'Default', assets: [] }]);

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add your first asset' })).toBeInTheDocument();
      });
    });

    it('navigates to add-assets on empty state button click', async () => {
      mockLoadPortfolio.mockReturnValue([{ title: 'Default', assets: [] }]);

      render(<AssetsPage />);

      await waitFor(() => {
        const addFirstButton = screen.getByRole('button', { name: 'Add your first asset' });
        fireEvent.click(addFirstButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard/add-assets');
    });
  });

  describe('Connecting Banks', () => {
    it('loads connecting banks from localStorage', async () => {
      const connectingBanks = [
        { id: '1', name: 'Chase', status: 'connecting', message: 'Connecting...', value: 5000 },
      ];
      localStorageMock.setItem('connectingBanks', JSON.stringify(connectingBanks));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(connectingBanks));

      render(<AssetsPage />);

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('connectingBanks');
      });
    });

    it('renders connecting bank items', async () => {
      const connectingBanks = [
        {
          id: '1',
          name: 'Chase Bank',
          status: 'connecting',
          message: 'Connecting...',
          value: 5000,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(connectingBanks));

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Chase Bank')).toBeInTheDocument();
      });
    });

    it('shows connecting message for banks', async () => {
      const connectingBanks = [
        {
          id: '1',
          name: 'Chase',
          status: 'connecting',
          message: 'Syncing accounts...',
          value: 5000,
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(connectingBanks));

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Syncing accounts...')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Toggle', () => {
    it('renders theme toggle button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByTitle('Toggle Theme')).toBeInTheDocument();
      });
    });
  });

  describe('Options Menu', () => {
    it('renders options button for assets', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const optionButtons = screen.getAllByLabelText('Options');
        expect(optionButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Name Display', () => {
    it('displays first name from full name', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ email: 'john@example.com', name: 'John Doe' }),
      } as Response);

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('capitalizes email prefix when no name', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ email: 'alice@example.com' }),
      } as Response);

      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('hides user name on small screens', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const userNameSpan = screen.getByText('Test').closest('span');
        expect(userNameSpan).toHaveClass('hidden', 'sm:inline-block');
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible notification button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      });
    });

    it('has accessible search button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
      });
    });

    it('has accessible share button', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Share')).toBeInTheDocument();
      });
    });

    it('logo has proper aria-label', async () => {
      const { container } = render(<AssetsPage />);

      await waitFor(() => {
        const logo = container.querySelector('svg[aria-label="Lokifi Logo"]');
        expect(logo).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('links to dashboard', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const netWorthLink = screen.getByText('Net Worth').closest('a');
        expect(netWorthLink).toHaveAttribute('href', '/dashboard');
      });
    });

    it('links to assets page', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        // Multiple "Assets" elements - find the sidebar link
        const assetsLinks = screen.getAllByText('Assets');
        const sidebarLink = assetsLinks.find((el) => el.closest('a'));
        expect(sidebarLink?.closest('a')).toHaveAttribute('href', '/dashboard/assets');
      });
    });

    it('links to debts page', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const debtsLink = screen.getByText('Debts').closest('a');
        expect(debtsLink).toHaveAttribute('href', '/dashboard/debts');
      });
    });

    it('links to recap page', async () => {
      render(<AssetsPage />);

      await waitFor(() => {
        const recapLink = screen.getByText('Recap').closest('a');
        expect(recapLink).toHaveAttribute('href', '/dashboard/recap');
      });
    });
  });
});

