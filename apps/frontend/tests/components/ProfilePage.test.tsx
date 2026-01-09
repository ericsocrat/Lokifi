import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    // eslint-disable-next-line @next/next/no-img-element
  }) => <img src={src} alt={alt} {...props} />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock authToken
const mockAuthToken = vi.fn();
vi.mock('../../src/lib/api/auth', () => ({
  authToken: () => mockAuthToken(),
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

const mockProfile = {
  id: '1',
  username: 'testuser',
  display_name: 'Test User',
  bio: 'This is my bio',
  avatar_url: 'https://example.com/avatar.jpg',
  is_public: true,
  follower_count: 100,
  following_count: 50,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
};

const mockStats = {
  profile_completeness: 85,
  activity_score: 42,
  account_age_days: 180,
  last_active_days_ago: 1,
  total_logins: 250,
};

// Import after mocks
import ProfilePage from '../../app/profile/page';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthToken.mockReturnValue('test-token');
    mockReload.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Helper to setup fetch mock for success case
  const setupSuccessFetch = (
    profile = mockProfile,
    stats: typeof mockStats | null = mockStats
  ) => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/profile/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(profile),
        });
      }
      if (url.includes('/api/profile/enhanced/stats')) {
        if (stats === null) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(stats),
        });
      }
      return Promise.resolve({ ok: false });
    });
  };

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      // Never resolve the fetch to keep loading state
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      render(<ProfilePage />);

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should render loading indicator with animation', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      render(<ProfilePage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when profile fetch fails', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/profile/me')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: false });
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
      });
    });

    it('should show network error message on fetch exception', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/profile/me')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: false });
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Network error loading profile')).toBeInTheDocument();
      });
    });

    it('should render Try Again button in error state', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should reload page when Try Again is clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Page Header', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render page title', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
      });
    });

    it('should render page subtitle', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Manage your account and preferences')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render all three tabs', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });
    });

    it('should highlight overview tab by default', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const overviewTab = screen.getByRole('button', { name: /overview/i });
        expect(overviewTab).toHaveClass('bg-lokifi');
      });
    });

    it('should switch to settings tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      const settingsTab = screen.getByRole('button', { name: /settings/i });
      expect(settingsTab).toHaveClass('bg-lokifi');
    });

    it('should switch to privacy tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      const privacyTab = screen.getByRole('button', { name: /privacy/i });
      expect(privacyTab).toHaveClass('bg-lokifi');
    });
  });

  describe('Overview Tab - Profile Header', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render user display name', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should render username with @ prefix', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('@testuser')).toBeInTheDocument();
      });
    });

    it('should render user bio', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('This is my bio')).toBeInTheDocument();
      });
    });

    it('should render profile avatar when avatar_url exists', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const avatar = screen.getByRole('img', { name: 'Profile' });
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('should render Edit Profile link', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should render Settings link', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // There may be multiple elements with Settings text
        const links = screen.getAllByRole('link', { name: /settings/i });
        expect(links.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Overview Tab - Stats Row', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should display follower count', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('followers')).toBeInTheDocument();
      });
    });

    it('should display following count', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('following')).toBeInTheDocument();
      });
    });

    it('should display joined date', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // Format will be locale-specific
        expect(screen.getByText(/joined/i)).toBeInTheDocument();
      });
    });

    it('should display public profile status for public profiles', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Public profile')).toBeInTheDocument();
      });
    });

    it('should display private profile status for private profiles', async () => {
      setupSuccessFetch({ ...mockProfile, is_public: false });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Private profile')).toBeInTheDocument();
      });
    });
  });

  describe('Overview Tab - Stats Cards', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render Profile Completeness card', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('should render Activity Score card', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Activity Score')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });

    it('should render Account Age card', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Account Age')).toBeInTheDocument();
        expect(screen.getByText('180 days')).toBeInTheDocument();
      });
    });

    it('should render Total Logins card', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Total Logins')).toBeInTheDocument();
        expect(screen.getByText('250')).toBeInTheDocument();
      });
    });

    it('should render progress bar for profile completeness', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // The progress bar has a style with width
        const progressBar = document.querySelector('[style*="width: 85%"]');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Overview Tab - Activity Feed', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render Recent Activity section', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('should render activity items', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Updated profile information')).toBeInTheDocument();
        expect(screen.getByText('Changed notification preferences')).toBeInTheDocument();
        expect(screen.getByText('Profile created')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Tab', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render Quick Settings section when settings tab is active', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      expect(screen.getByText('Quick Settings')).toBeInTheDocument();
    });

    it('should render Account Settings link', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your account information')).toBeInTheDocument();
    });

    it('should render Notifications link', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Control notification preferences')).toBeInTheDocument();
    });

    it('should render Privacy & Security link', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      // Use getAllByText since this text appears multiple times
      const elements = screen.getAllByText('Privacy & Security');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should render Preferences link', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /settings/i }));

      expect(screen.getByText('Preferences')).toBeInTheDocument();
      expect(screen.getByText('Language, timezone, and more')).toBeInTheDocument();
    });
  });

  describe('Privacy Tab', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render Privacy Overview section when privacy tab is active', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByText('Privacy Overview')).toBeInTheDocument();
    });

    it('should render Profile Visibility section', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    });

    it('should show public visibility message for public profiles', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByText(/public and visible to everyone/i)).toBeInTheDocument();
    });

    it('should show private visibility message for private profiles', async () => {
      const user = userEvent.setup();
      setupSuccessFetch({ ...mockProfile, is_public: false });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByText(/private and only visible to you/i)).toBeInTheDocument();
    });

    it('should render Data Export section', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByText('Data Export')).toBeInTheDocument();
      expect(screen.getByText(/download all your data/i)).toBeInTheDocument();
    });

    it('should render Export button', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should render Change link for visibility settings', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /privacy/i }));

      expect(screen.getByRole('link', { name: /change/i })).toBeInTheDocument();
    });
  });

  describe('Profile Without Avatar', () => {
    it('should render default user icon when no avatar_url', async () => {
      setupSuccessFetch({ ...mockProfile, avatar_url: undefined });

      render(<ProfilePage />);

      await waitFor(() => {
        // Should show gradient background with User icon instead of img
        expect(screen.queryByRole('img', { name: 'Profile' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Without Bio', () => {
    it('should not render bio section when bio is undefined', async () => {
      setupSuccessFetch({ ...mockProfile, bio: undefined });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.queryByText('This is my bio')).not.toBeInTheDocument();
    });
  });

  describe('Without Stats Data', () => {
    it('should render profile without stats cards when stats fetch fails', async () => {
      setupSuccessFetch(mockProfile, null);

      render(<ProfilePage />);

      await waitFor(() => {
        // Profile should still render
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // But stats cards shouldn't be there
      expect(screen.queryByText('Profile Completeness')).not.toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should not fetch data when not authenticated', () => {
      mockAuthToken.mockReturnValue(null);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      render(<ProfilePage />);

      // Should not call fetch when no token
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should include authorization header in profile fetch', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('stats') ? mockStats : mockProfile),
        });
      });
      global.fetch = fetchSpy;

      render(<ProfilePage />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/profile/me',
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer test-token',
            },
          })
        );
      });
    });

    it('should include authorization header in stats fetch', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('stats') ? mockStats : mockProfile),
        });
      });
      global.fetch = fetchSpy;

      render(<ProfilePage />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/profile/enhanced/stats',
          expect.objectContaining({
            headers: {
              Authorization: 'Bearer test-token',
            },
          })
        );
      });
    });
  });

  describe('Link Navigation', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should have Edit Profile link pointing to /profile/edit', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const editLink = screen.getByRole('link', { name: /edit profile/i });
        expect(editLink).toHaveAttribute('href', '/profile/edit');
      });
    });

    it('should have Settings link pointing to /settings', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // Find the Settings link in action buttons (not tab button)
        const settingsLinks = screen.getAllByRole('link');
        const settingsLink = settingsLinks.find(
          (link) => link.getAttribute('href') === '/settings'
        );
        expect(settingsLink).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should have accessible tab buttons', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const tabButtons = tabs.filter((btn) =>
          ['Overview', 'Settings', 'Privacy'].some((text) => btn.textContent?.includes(text))
        );

        tabButtons.forEach((button) => {
          expect(button).toBeEnabled();
        });
      });
    });

    it('should have heading hierarchy', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // Main page title
        expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
      });
    });

    it('should have accessible links', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        links.forEach((link) => {
          expect(link).toHaveAttribute('href');
        });
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should have proper grid layout for stats cards', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const statsContainer = screen
          .getByText('Profile Completeness')
          .closest('div')?.parentElement;
        expect(statsContainer).toHaveClass('grid');
      });
    });
  });

  describe('Visual Elements', () => {
    beforeEach(() => {
      setupSuccessFetch();
    });

    it('should render gradient banner in profile header', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const banner = document.querySelector('.h-32.bg-gradient-to-r');
        expect(banner).toBeInTheDocument();
      });
    });

    it('should have proper color coding for stats cards', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // Find the Profile Completeness card by its border class
        const completenessCards = document.querySelectorAll('.border-lokifi\\/30');
        expect(completenessCards.length).toBeGreaterThan(0);
      });
    });
  });
});
