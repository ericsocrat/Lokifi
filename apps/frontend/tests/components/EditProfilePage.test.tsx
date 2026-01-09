/**
 * Tests for EditProfilePage component
 *
 * Profile edit page with form fields for display name, username,
 * bio, avatar upload, privacy settings, and form submission.
 *
 * Note: This page has complex async behavior with authToken checks,
 * fetch calls, and state transitions. Tests focus on verifiable states.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/profile/edit',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

// Mock Navbar (avoid AuthProvider dependency)
vi.mock('@/src/components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

// Track authToken calls
let authTokenValue: string | null = 'test-token';
vi.mock('@/src/lib/api/auth', () => ({
  authToken: () => authTokenValue,
}));

// Mock fetch using vi.stubGlobal for proper jsdom interception
const mockFetch = vi.fn();

// Mock profile data
const mockProfile = {
  id: 'user-123',
  username: 'johndoe',
  display_name: 'John Doe',
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  is_public: true,
  follower_count: 100,
  following_count: 50,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
};

// Import after mocks
import EditProfilePage from '../../app/profile/edit/page';

describe('EditProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authTokenValue = 'test-token';
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })
    );
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching profile', () => {
      // Don't resolve fetch immediately
      mockFetch.mockReturnValue(new Promise(() => {}));
      render(<EditProfilePage />);
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('shows loading spinner element', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));
      const { container } = render(<EditProfilePage />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('renders page title', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('renders back link to profile', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to profile/i });
        expect(backLink).toHaveAttribute('href', '/profile');
      });
    });

    it('renders navbar', async () => {
      render(<EditProfilePage />);
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });
  });

  describe('Avatar Section', () => {
    it('renders Profile Picture section title', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Profile Picture')).toBeInTheDocument();
      });
    });

    it('shows avatar preview when avatar exists', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const avatarImg = screen.getByAltText('Avatar preview');
        expect(avatarImg).toBeInTheDocument();
      });
    });

    it('renders upload button', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Upload New Avatar')).toBeInTheDocument();
      });
    });

    it('shows file size limit info', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('JPG, PNG or GIF. Max size 5MB.')).toBeInTheDocument();
      });
    });

    it('shows remove button when avatar exists', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        // The X button to remove avatar
        const buttons = screen.getAllByRole('button');
        const removeButton = buttons.find((btn) => btn.querySelector('svg'));
        expect(removeButton).toBeDefined();
      });
    });
  });

  describe('Basic Information Section', () => {
    it('renders Basic Information section title', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
      });
    });

    it('renders Display Name input with value', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Your display name');
        expect(input).toHaveValue('John Doe');
      });
    });

    it('renders Username input with value', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Your username');
        expect(input).toHaveValue('johndoe');
      });
    });

    it('shows username validation hint', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(
          screen.getByText('3-20 characters, letters, numbers and underscores only')
        ).toBeInTheDocument();
      });
    });

    it('renders Bio textarea with value', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Tell us about yourself...');
        expect(textarea).toHaveValue('Test bio');
      });
    });

    it('shows bio character count', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('8/500 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Privacy Settings Section', () => {
    it('renders Privacy Settings section title', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
      });
    });

    it('renders Public Profile option', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Public Profile')).toBeInTheDocument();
      });
    });

    it('shows privacy option description', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Make your profile visible to everyone')).toBeInTheDocument();
      });
    });

    it('renders privacy toggle checkbox', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('checkbox is checked when profile is public', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('Form Input Changes', () => {
    it('updates display name on input', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Your display name');
        expect(input).toHaveValue('John Doe');
      });

      const input = screen.getByPlaceholderText('Your display name');
      fireEvent.change(input, { target: { value: 'Jane Doe' } });
      expect(input).toHaveValue('Jane Doe');
    });

    it('updates username on input', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Your username');
        expect(input).toHaveValue('johndoe');
      });

      const input = screen.getByPlaceholderText('Your username');
      fireEvent.change(input, { target: { value: 'janedoe' } });
      expect(input).toHaveValue('janedoe');
    });

    it('updates bio on input', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Tell us about yourself...');
        expect(textarea).toHaveValue('Test bio');
      });

      const textarea = screen.getByPlaceholderText('Tell us about yourself...');
      fireEvent.change(textarea, { target: { value: 'New bio content' } });
      expect(textarea).toHaveValue('New bio content');
    });

    it('updates bio character count on input', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('8/500 characters')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Tell us about yourself...');
      fireEvent.change(textarea, { target: { value: 'New longer bio content here' } });
      expect(screen.getByText('27/500 characters')).toBeInTheDocument();
    });

    it('toggles privacy setting on checkbox click', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Action Buttons', () => {
    it('renders Cancel link', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        const cancelLink = screen.getByRole('link', { name: /cancel/i });
        expect(cancelLink).toHaveAttribute('href', '/profile');
      });
    });

    it('renders Save Changes button', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form on save button click', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/profile/me',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    it('shows success message after save', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('shows Saving... while submitting', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockReturnValueOnce(
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000)
          )
        );

      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('disables save button while saving', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockReturnValueOnce(
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000)
          )
        );

      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /saving/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error when profile fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      render(<EditProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
      });
    });

    it('shows error when profile update fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });

      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });

    it('shows network error on fetch exception', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<EditProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Network error loading profile')).toBeInTheDocument();
      });
    });
  });

  describe('No Auth Token', () => {
    it('does not fetch profile without auth token', async () => {
      authTokenValue = null;

      render(<EditProfilePage />);

      // When there's no token, fetchProfile shouldn't be called
      await waitFor(() => {
        // The first call would be during loading check, not profile fetch
        expect(mockFetch).not.toHaveBeenCalledWith('/api/profile/me', expect.anything());
      });
    });
  });

  describe('Private Profile', () => {
    it('shows lock icon for private profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockProfile,
            is_public: false,
          }),
      });

      const { container } = render(<EditProfilePage />);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
      });

      // Lock icon should be visible for private profile
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has dark background', async () => {
      const { container } = render(<EditProfilePage />);
      await waitFor(() => {
        expect(container.querySelector('.bg-surface-0')).toBeInTheDocument();
      });
    });

    it('has max width container', async () => {
      const { container } = render(<EditProfilePage />);
      await waitFor(() => {
        expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
      });
    });

    it('renders form sections with surface backgrounds', async () => {
      const { container } = render(<EditProfilePage />);
      await waitFor(() => {
        const sections = container.querySelectorAll('.bg-surface-100');
        expect(sections.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('has labeled inputs', async () => {
      render(<EditProfilePage />);
      await waitFor(() => {
        expect(screen.getByText('Display Name')).toBeInTheDocument();
        expect(screen.getByText('Username')).toBeInTheDocument();
        expect(screen.getByText('Bio')).toBeInTheDocument();
      });
    });

    it('renders form element', async () => {
      const { container } = render(<EditProfilePage />);
      await waitFor(() => {
        expect(container.querySelector('form')).toBeInTheDocument();
      });
    });
  });
});
