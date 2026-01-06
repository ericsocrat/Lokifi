import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AuthProvider
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}));

// Mock Google OAuth - renders a simple button
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({
    onSuccess,
    onError,
    text,
  }: {
    onSuccess: (response: { credential: string }) => void;
    onError: () => void;
    text: string;
  }) => (
    <button
      data-testid="google-login-button"
      onClick={() => onSuccess({ credential: 'mock-google-credential' })}
    >
      Google Login ({text})
    </button>
  ),
}));

// Mock fetch for Google auth
global.fetch = vi.fn();

import { AuthModal } from '@/components/AuthModal';

describe('AuthModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with login/signup tabs', () => {
      render(<AuthModal onClose={mockOnClose} />);

      const tabs = screen.getAllByRole('button');
      const tabTexts = tabs.map((t) => t.textContent);
      expect(tabTexts).toContain('Log In');
      expect(tabTexts).toContain('Sign Up');
    });

    it('should render with register mode when initialMode is register', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      // Register mode shows Full Name field
      expect(screen.getByPlaceholderText('Enter your full name...')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<AuthModal onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
    });

    it('should render backdrop overlay', () => {
      render(<AuthModal onClose={mockOnClose} />);

      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('should render social auth buttons', () => {
      render(<AuthModal onClose={mockOnClose} />);

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
      expect(screen.getByText(/continue with binance/i)).toBeInTheDocument();
      expect(screen.getByText(/continue with wallet/i)).toBeInTheDocument();
    });

    it('should render divider text', () => {
      render(<AuthModal onClose={mockOnClose} />);

      expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should switch from login to register mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      // Initially no Full Name field
      expect(screen.queryByPlaceholderText('Enter your full name...')).not.toBeInTheDocument();

      // Click Sign Up tab
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      // Now Full Name field appears
      expect(screen.getByPlaceholderText('Enter your full name...')).toBeInTheDocument();
    });

    it('should switch from register to login mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      // Initially Full Name field present
      expect(screen.getByPlaceholderText('Enter your full name...')).toBeInTheDocument();

      // Click Log In tab
      await user.click(screen.getByRole('button', { name: 'Log In' }));

      // Full Name field removed
      expect(screen.queryByPlaceholderText('Enter your full name...')).not.toBeInTheDocument();
    });

    it('should update submit button text for register mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      // Click Sign Up tab
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      expect(screen.getByRole('button', { name: 'Create an account' })).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    describe('Login Mode', () => {
      it('should render email and password fields', () => {
        render(<AuthModal onClose={mockOnClose} initialMode="login" />);

        expect(screen.getByPlaceholderText('Enter your email address...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password...')).toBeInTheDocument();
      });

      it('should not render registration-only fields', () => {
        render(<AuthModal onClose={mockOnClose} initialMode="login" />);

        expect(screen.queryByPlaceholderText('Enter your full name...')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Choose a username...')).not.toBeInTheDocument();
      });
    });

    describe('Register Mode', () => {
      it('should render all form fields', () => {
        render(<AuthModal onClose={mockOnClose} initialMode="register" />);

        expect(screen.getByPlaceholderText('Enter your email address...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your full name...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Choose a username...')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password...')).toBeInTheDocument();
      });

      it('should show terms checkbox', () => {
        render(<AuthModal onClose={mockOnClose} initialMode="register" />);

        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        expect(screen.getByText(/keep me updated/i)).toBeInTheDocument();
      });

      it('should show terms notice', () => {
        render(<AuthModal onClose={mockOnClose} initialMode="register" />);

        expect(screen.getByText(/Terms of Use/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} />);

      const passwordInput = screen.getByPlaceholderText('Enter your password...');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find toggle button (inside the password input container)
      const toggleButton = passwordInput.parentElement?.querySelector('button');
      expect(toggleButton).toBeInTheDocument();

      await user.click(toggleButton!);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton!);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show weak password indicator', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(screen.getByPlaceholderText('Enter your password...'), 'abc');

      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('should show medium password indicator', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(screen.getByPlaceholderText('Enter your password...'), 'Abcd1234');

      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should show strong password indicator', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(screen.getByPlaceholderText('Enter your password...'), 'Abcd1234!@#$');

      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should not show strength indicator in login mode', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(screen.getByPlaceholderText('Enter your password...'), 'abc');

      expect(screen.queryByText('Weak')).not.toBeInTheDocument();
      expect(screen.queryByText('Medium')).not.toBeInTheDocument();
      expect(screen.queryByText('Strong')).not.toBeInTheDocument();
    });

    it('should show password requirements hint', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(screen.getByPlaceholderText('Enter your password...'), 'abc');

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(screen.getByPlaceholderText('Enter your email address...'), 'invalid');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should show validation error for short password in register', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your full name...'), 'Test User');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'short');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        // Password error message appears in validation
        const errorElements = document.querySelectorAll('.text-red-400');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should show error for invalid username characters', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your full name...'), 'Test');
      await user.type(screen.getByPlaceholderText('Choose a username...'), 'user@name!');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(
          screen.getByText('Username can only contain letters, numbers, and underscores')
        ).toBeInTheDocument();
      });
    });

    it('should clear validation error when input changes', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      // Submit with invalid email
      await user.type(screen.getByPlaceholderText('Enter your email address...'), 'invalid');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Clear and type valid email
      await user.clear(screen.getByPlaceholderText('Enter your email address...'));
      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'valid@example.com'
      );

      // Error should be cleared
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission - Login', () => {
    it('should call login with credentials on valid submit', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce(undefined);
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should close modal on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce(undefined);
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display error on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'wrongpassword');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        const errorContainer = document.querySelector('.bg-red-500\\/10');
        expect(errorContainer).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveLogin: () => void;
      mockLogin.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Please wait...')).toBeInTheDocument();
      });

      // Cleanup
      resolveLogin!();
    });
  });

  describe('Form Submission - Register', () => {
    it('should call register with all fields', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce(undefined);
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your full name...'), 'Test User');
      await user.type(screen.getByPlaceholderText('Choose a username...'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'Test User',
          'testuser'
        );
      });
    });

    it('should call register without username when empty', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce(undefined);
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      await user.type(
        screen.getByPlaceholderText('Enter your email address...'),
        'test@example.com'
      );
      await user.type(screen.getByPlaceholderText('Enter your full name...'), 'Test User');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'password123');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'Test User',
          undefined
        );
      });
    });
  });

  describe('Social Authentication Buttons', () => {
    it('should render Google login button', () => {
      render(<AuthModal onClose={mockOnClose} />);
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    it('should show coming soon for Apple auth', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} />);

      await user.click(screen.getByText(/continue with apple/i));

      await waitFor(() => {
        expect(screen.getByText(/Apple authentication coming soon/i)).toBeInTheDocument();
      });
    });

    it('should show coming soon for Binance auth', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} />);

      await user.click(screen.getByText(/continue with binance/i));

      await waitFor(() => {
        expect(screen.getByText(/Binance authentication coming soon/i)).toBeInTheDocument();
      });
    });

    it('should show coming soon for Wallet auth', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} />);

      await user.click(screen.getByText(/continue with wallet/i));

      await waitFor(() => {
        expect(screen.getByText(/Wallet authentication coming soon/i)).toBeInTheDocument();
      });
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} />);

      await user.click(screen.getByRole('button', { name: '×' }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Terms Checkbox', () => {
    it('should toggle terms checkbox', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have form element', () => {
      render(<AuthModal onClose={mockOnClose} />);
      expect(document.querySelector('form')).toBeInTheDocument();
    });

    it('should have text labels for inputs', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText(/Username/)).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('should have required attribute on mandatory fields', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      expect(screen.getByPlaceholderText('Enter your email address...')).toBeRequired();
      expect(screen.getByPlaceholderText('Enter your full name...')).toBeRequired();
      expect(screen.getByPlaceholderText('Enter your password...')).toBeRequired();
    });

    it('should not have required on optional username', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      expect(screen.getByPlaceholderText('Choose a username...')).not.toBeRequired();
    });

    it('should have proper input types', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="register" />);

      expect(screen.getByPlaceholderText('Enter your email address...')).toHaveAttribute(
        'type',
        'email'
      );
      expect(screen.getByPlaceholderText('Enter your password...')).toHaveAttribute(
        'type',
        'password'
      );
      expect(screen.getByPlaceholderText('Enter your full name...')).toHaveAttribute(
        'type',
        'text'
      );
    });
  });

  describe('Styling', () => {
    it('should have dark theme modal', () => {
      render(<AuthModal onClose={mockOnClose} />);
      expect(document.querySelector('.bg-neutral-900')).toBeInTheDocument();
    });

    it('should have bordered modal container', () => {
      render(<AuthModal onClose={mockOnClose} />);
      expect(document.querySelector('.border-neutral-700')).toBeInTheDocument();
    });

    it('should show active tab styling', () => {
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      const loginTabs = screen.getAllByRole('button', { name: 'Log In' });
      // First one is the tab, second is submit button
      const loginTab = loginTabs[0];
      expect(loginTab).toHaveClass('border-b-2');
    });

    it('should highlight validation errors with red styling', async () => {
      const user = userEvent.setup();
      render(<AuthModal onClose={mockOnClose} initialMode="login" />);

      await user.type(screen.getByPlaceholderText('Enter your email address...'), 'invalid');
      await user.type(screen.getByPlaceholderText('Enter your password...'), 'pass');

      const form = document.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Enter your email address...');
        expect(emailInput).toHaveClass('border-red-500');
      });
    });
  });
});
