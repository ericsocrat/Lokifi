/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/Avatar';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Test Setup
// ============================================================================

// Mock Image loading
const _mockImageLoad = (shouldSucceed = true) => {
  const originalImage = global.Image;

  // @ts-expect-error - Mocking Image constructor
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    _src = '';

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      setTimeout(() => {
        if (shouldSucceed && value) {
          this.onload?.();
        } else {
          this.onerror?.();
        }
      }, 0);
    }
  };

  return () => {
    global.Image = originalImage;
  };
};

beforeAll(() => {
  // Mock console.error to prevent noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ============================================================================
// Avatar (Root) Tests
// ============================================================================

describe('Avatar', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders with data-avatar attribute', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Avatar className="custom-avatar">
          <AvatarFallback>XY</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('.custom-avatar')).toBeInTheDocument();
    });

    it('forwards ref to container', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <Avatar ref={ref}>
          <AvatarFallback>RF</AvatarFallback>
        </Avatar>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Sizes', () => {
    it.each(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const)('renders %s size', (size) => {
      render(
        <Avatar size={size} data-testid="avatar">
          <AvatarFallback>SZ</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute('data-size', size);
    });

    it('uses md as default size', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute('data-size', 'md');
    });

    it('applies correct size classes for xs', () => {
      render(
        <Avatar size="xs">
          <AvatarFallback>XS</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toHaveClass('h-6', 'w-6');
    });

    it('applies correct size classes for 2xl', () => {
      render(
        <Avatar size="2xl">
          <AvatarFallback>2X</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toHaveClass('h-20', 'w-20');
    });
  });

  describe('Variants', () => {
    it.each(['circle', 'rounded', 'square'] as const)('renders %s variant', (variant) => {
      render(
        <Avatar variant={variant} data-testid="avatar">
          <AvatarFallback>V</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute('data-variant', variant);
    });

    it('uses circle as default variant', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute('data-variant', 'circle');
    });

    it('applies rounded-full for circle variant', () => {
      render(
        <Avatar variant="circle">
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toHaveClass('rounded-full');
    });

    it('applies rounded-lg for rounded variant', () => {
      render(
        <Avatar variant="rounded">
          <AvatarFallback>R</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toHaveClass('rounded-lg');
    });

    it('applies rounded-none for square variant', () => {
      render(
        <Avatar variant="square">
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar]')).toHaveClass('rounded-none');
    });
  });

  describe('Status Indicator', () => {
    it('does not show status by default', () => {
      render(
        <Avatar>
          <AvatarFallback>NS</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-status]')).not.toBeInTheDocument();
    });

    it.each(['online', 'offline', 'away', 'busy'] as const)('shows %s status', (status) => {
      render(
        <Avatar status={status}>
          <AvatarFallback>ST</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector(`[data-avatar-status="${status}"]`)).toBeInTheDocument();
    });

    it('applies green background for online status', () => {
      render(
        <Avatar status="online">
          <AvatarFallback>ON</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-status="online"]')).toHaveClass('bg-green-500');
    });

    it('applies red background for busy status', () => {
      render(
        <Avatar status="busy">
          <AvatarFallback>BS</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-status="busy"]')).toHaveClass('bg-red-500');
    });

    it('has aria-label for status', () => {
      render(
        <Avatar status="online">
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByLabelText('Status: online')).toBeInTheDocument();
    });
  });

  describe('Status Position', () => {
    it('positions status at bottom-right by default', () => {
      render(
        <Avatar status="online">
          <AvatarFallback>BR</AvatarFallback>
        </Avatar>
      );

      const status = document.querySelector('[data-avatar-status]');
      expect(status).toHaveClass('bottom-0', 'right-0');
    });

    it('positions status at top-right', () => {
      render(
        <Avatar status="online" statusPosition="top-right">
          <AvatarFallback>TR</AvatarFallback>
        </Avatar>
      );

      const status = document.querySelector('[data-avatar-status]');
      expect(status).toHaveClass('top-0', 'right-0');
    });

    it('positions status at top-left', () => {
      render(
        <Avatar status="online" statusPosition="top-left">
          <AvatarFallback>TL</AvatarFallback>
        </Avatar>
      );

      const status = document.querySelector('[data-avatar-status]');
      expect(status).toHaveClass('top-0', 'left-0');
    });

    it('positions status at bottom-left', () => {
      render(
        <Avatar status="online" statusPosition="bottom-left">
          <AvatarFallback>BL</AvatarFallback>
        </Avatar>
      );

      const status = document.querySelector('[data-avatar-status]');
      expect(status).toHaveClass('bottom-0', 'left-0');
    });
  });
});

// ============================================================================
// AvatarImage Tests
// ============================================================================

describe('AvatarImage', () => {
  describe('Loading States', () => {
    it('renders image with src', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('has data-avatar-image attribute', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-image]')).toBeInTheDocument();
    });

    it('applies object-cover class', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByRole('img')).toHaveClass('object-cover');
    });

    it('applies custom className', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User" className="custom-img" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByRole('img')).toHaveClass('custom-img');
    });

    it('shows fallback when image fails to load', async () => {
      render(
        <Avatar>
          <AvatarImage src="" alt="User" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      await waitFor(() => {
        expect(screen.getByText('FB')).toBeInTheDocument();
      });
    });

    it('does not render image when src is empty', async () => {
      render(
        <Avatar>
          <AvatarImage src="" alt="User" />
          <AvatarFallback>E</AvatarFallback>
        </Avatar>
      );

      await waitFor(() => {
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
      });
    });

    it('calls onLoadingStatusChange with error on empty src', async () => {
      const onStatusChange = vi.fn();
      render(
        <Avatar>
          <AvatarImage src="" alt="User" onLoadingStatusChange={onStatusChange} />
          <AvatarFallback>E</AvatarFallback>
        </Avatar>
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('error');
      });
    });
  });

  describe('Alt Text', () => {
    it('uses provided alt text', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="John Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });

    it('defaults to empty alt text', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      // Images with alt="" have role="presentation" not "img"
      // Use data attribute selector instead
      const img = document.querySelector('[data-avatar-image]') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', '');
    });
  });
});

// ============================================================================
// AvatarFallback Tests
// ============================================================================

describe('AvatarFallback', () => {
  describe('Initials Generation', () => {
    it('generates initials from name', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Doe" />
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('generates single initial for single word name', () => {
      render(
        <Avatar>
          <AvatarFallback name="John" />
        </Avatar>
      );

      expect(screen.getByText('JO')).toBeInTheDocument();
    });

    it('respects maxInitials prop', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Michael Doe" maxInitials={3} />
        </Avatar>
      );

      expect(screen.getByText('JMD')).toBeInTheDocument();
    });

    it('uses initials prop over name', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Doe" initials="XY" />
        </Avatar>
      );

      expect(screen.getByText('XY')).toBeInTheDocument();
    });

    it('uses children over initials and name', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Doe" initials="XY">
            Custom
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('converts initials to uppercase', () => {
      render(
        <Avatar>
          <AvatarFallback name="john doe" />
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('handles names with extra spaces', () => {
      render(
        <Avatar>
          <AvatarFallback name="  John   Doe  " />
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Default Icon', () => {
    it('shows user icon when no name or initials', () => {
      render(
        <Avatar>
          <AvatarFallback />
        </Avatar>
      );

      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('has aria-hidden on default icon', () => {
      render(
        <Avatar>
          <AvatarFallback />
        </Avatar>
      );

      expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Colorize', () => {
    it('applies generated color when colorize is true', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Doe" colorize />
        </Avatar>
      );

      const fallback = document.querySelector('[data-avatar-fallback]');
      expect(fallback).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('generates consistent color for same name', () => {
      const { container: container1 } = render(
        <Avatar>
          <AvatarFallback name="John Doe" colorize />
        </Avatar>
      );

      const { container: container2 } = render(
        <Avatar>
          <AvatarFallback name="John Doe" colorize />
        </Avatar>
      );

      const fallback1 = container1.querySelector('[data-avatar-fallback]');
      const fallback2 = container2.querySelector('[data-avatar-fallback]');

      expect(fallback1?.getAttribute('style')).toBe(fallback2?.getAttribute('style'));
    });

    it('generates different colors for different names', () => {
      const { container: container1 } = render(
        <Avatar>
          <AvatarFallback name="John Doe" colorize />
        </Avatar>
      );

      const { container: container2 } = render(
        <Avatar>
          <AvatarFallback name="Jane Smith" colorize />
        </Avatar>
      );

      const fallback1 = container1.querySelector('[data-avatar-fallback]');
      const fallback2 = container2.querySelector('[data-avatar-fallback]');

      expect(fallback1?.getAttribute('style')).not.toBe(fallback2?.getAttribute('style'));
    });

    it('does not apply color when colorize is false', () => {
      render(
        <Avatar>
          <AvatarFallback name="John Doe" colorize={false} data-testid="fallback" />
        </Avatar>
      );

      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('bg-gray-200');
    });
  });

  describe('Delay', () => {
    it('shows fallback immediately when delayMs is 0', () => {
      render(
        <Avatar>
          <AvatarFallback delayMs={0}>FB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('FB')).toBeInTheDocument();
    });

    it('delays showing fallback when delayMs is set', async () => {
      render(
        <Avatar>
          <AvatarFallback delayMs={50}>FB</AvatarFallback>
        </Avatar>
      );

      // Fallback should not be visible immediately
      expect(screen.queryByText('FB')).not.toBeInTheDocument();

      // Wait for delay to complete
      await waitFor(
        () => {
          expect(screen.getByText('FB')).toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });

  describe('Data Attributes', () => {
    it('has data-avatar-fallback attribute', () => {
      render(
        <Avatar>
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-fallback]')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">CF</AvatarFallback>
        </Avatar>
      );

      expect(document.querySelector('.custom-fallback')).toBeInTheDocument();
    });

    it('applies custom style', () => {
      render(
        <Avatar>
          <AvatarFallback style={{ fontWeight: 'bold' }} data-testid="fallback">
            ST
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('fallback')).toHaveStyle({ fontWeight: 'bold' });
    });
  });
});

// ============================================================================
// AvatarGroup Tests
// ============================================================================

describe('AvatarGroup', () => {
  describe('Basic Rendering', () => {
    it('renders all avatars', () => {
      render(
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('A2')).toBeInTheDocument();
      expect(screen.getByText('A3')).toBeInTheDocument();
    });

    it('has data-avatar-group attribute', () => {
      render(
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(document.querySelector('[data-avatar-group]')).toBeInTheDocument();
    });

    it('has group role', () => {
      render(
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('has aria-label with avatar count', () => {
      render(
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByLabelText('Group of 2 avatars')).toBeInTheDocument();
    });
  });

  describe('Max Avatars', () => {
    it('limits visible avatars when max is set', () => {
      render(
        <AvatarGroup max={2}>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('A2')).toBeInTheDocument();
      expect(screen.queryByText('A3')).not.toBeInTheDocument();
    });

    it('shows count of hidden avatars', () => {
      render(
        <AvatarGroup max={2}>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A3</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A4</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('hides count when showCount is false', () => {
      render(
        <AvatarGroup max={2} showCount={false}>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.queryByText('+1')).not.toBeInTheDocument();
    });

    it('does not show count when all avatars are visible', () => {
      render(
        <AvatarGroup max={5}>
          <Avatar>
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(document.querySelector('[data-avatar-count]')).not.toBeInTheDocument();
    });
  });

  describe('Size', () => {
    it('applies size to all child avatars', () => {
      render(
        <AvatarGroup size="lg">
          <Avatar data-testid="avatar1">
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar2">
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByTestId('avatar1')).toHaveAttribute('data-size', 'lg');
      expect(screen.getByTestId('avatar2')).toHaveAttribute('data-size', 'lg');
    });

    it('uses md as default size', () => {
      render(
        <AvatarGroup>
          <Avatar data-testid="avatar">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute('data-size', 'md');
    });
  });

  describe('Spacing', () => {
    it('applies default negative spacing for overlap', () => {
      render(
        <AvatarGroup>
          <Avatar data-testid="avatar1">
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar2">
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      const avatar2 = screen.getByTestId('avatar2');
      expect(avatar2).toHaveStyle({ marginLeft: '-8px' });
    });

    it('applies custom spacing', () => {
      render(
        <AvatarGroup spacing={-12}>
          <Avatar data-testid="avatar1">
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar2">
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      const avatar2 = screen.getByTestId('avatar2');
      expect(avatar2).toHaveStyle({ marginLeft: '-12px' });
    });

    it('first avatar has no margin', () => {
      render(
        <AvatarGroup>
          <Avatar data-testid="avatar1">
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar2">
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      const avatar1 = screen.getByTestId('avatar1');
      expect(avatar1).toHaveStyle({ marginLeft: '0px' });
    });
  });

  describe('Z-Index Stacking', () => {
    it('applies descending z-index to avatars', () => {
      render(
        <AvatarGroup>
          <Avatar data-testid="avatar1">
            <AvatarFallback>A1</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar2">
            <AvatarFallback>A2</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar3">
            <AvatarFallback>A3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByTestId('avatar1')).toHaveStyle({ zIndex: 3 });
      expect(screen.getByTestId('avatar2')).toHaveStyle({ zIndex: 2 });
      expect(screen.getByTestId('avatar3')).toHaveStyle({ zIndex: 1 });
    });
  });

  describe('Ring Styling', () => {
    it('applies ring styling to avatars', () => {
      render(
        <AvatarGroup>
          <Avatar data-testid="avatar">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      );

      expect(screen.getByTestId('avatar')).toHaveClass('ring-2');
    });
  });
});

// ============================================================================
// AvatarBadge Tests
// ============================================================================

describe('AvatarBadge', () => {
  describe('Basic Rendering', () => {
    it('renders badge content', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge>3</AvatarBadge>
        </Avatar>
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('has data-avatar-badge attribute', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge>5</AvatarBadge>
        </Avatar>
      );

      expect(document.querySelector('[data-avatar-badge]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge className="custom-badge">1</AvatarBadge>
        </Avatar>
      );

      expect(document.querySelector('.custom-badge')).toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('positions at bottom-right by default', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge>1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('bottom-0', 'right-0');
    });

    it('positions at top-right', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge position="top-right">1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('top-0', 'right-0');
    });

    it('positions at top-left', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge position="top-left">1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('top-0', 'left-0');
    });

    it('positions at bottom-left', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge position="bottom-left">1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('bottom-0', 'left-0');
    });
  });

  describe('Styling', () => {
    it('applies ring styling', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge>1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('ring-2');
    });

    it('applies rounded-full class', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
          <AvatarBadge>1</AvatarBadge>
        </Avatar>
      );

      const badge = document.querySelector('[data-avatar-badge]');
      expect(badge).toHaveClass('rounded-full');
    });
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('Accessibility', () => {
  it('avatar image has alt text', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User profile picture" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByAltText('User profile picture')).toBeInTheDocument();
  });

  it('status indicator has aria-label', () => {
    render(
      <Avatar status="online">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByLabelText('Status: online')).toBeInTheDocument();
  });

  it('avatar group has accessible label', () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A1</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>A2</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>A3</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    );

    expect(screen.getByLabelText('Group of 3 avatars')).toBeInTheDocument();
  });

  it('default user icon is hidden from screen readers', () => {
    render(
      <Avatar>
        <AvatarFallback />
      </Avatar>
    );

    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

// ============================================================================
// Financial Dashboard Use Cases
// ============================================================================

describe('Financial Dashboard Use Cases', () => {
  it('displays portfolio owner avatar with status', () => {
    render(
      <Avatar status="online" size="lg">
        <AvatarImage src="https://example.com/user.jpg" alt="John Doe" />
        <AvatarFallback name="John Doe" colorize />
      </Avatar>
    );

    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    expect(document.querySelector('[data-avatar-status="online"]')).toBeInTheDocument();
  });

  it('displays team members in a group', () => {
    render(
      <AvatarGroup max={4} size="sm">
        <Avatar>
          <AvatarFallback name="Alice Brown" colorize />
        </Avatar>
        <Avatar>
          <AvatarFallback name="Bob Smith" colorize />
        </Avatar>
        <Avatar>
          <AvatarFallback name="Carol White" colorize />
        </Avatar>
        <Avatar>
          <AvatarFallback name="David Lee" colorize />
        </Avatar>
        <Avatar>
          <AvatarFallback name="Eve Taylor" colorize />
        </Avatar>
      </AvatarGroup>
    );

    expect(screen.getByText('AB')).toBeInTheDocument();
    expect(screen.getByText('BS')).toBeInTheDocument();
    expect(screen.getByText('CW')).toBeInTheDocument();
    expect(screen.getByText('DL')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('displays account manager with notification badge', () => {
    render(
      <Avatar size="xl">
        <AvatarImage src="https://example.com/manager.jpg" alt="Account Manager" />
        <AvatarFallback name="Sarah Manager" colorize />
        <AvatarBadge>5</AvatarBadge>
      </Avatar>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays asset icon fallback', () => {
    render(
      <Avatar variant="rounded" size="md">
        <AvatarFallback initials="BTC" colorize />
      </Avatar>
    );

    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('displays user list with different statuses', () => {
    render(
      <div className="flex gap-2">
        <Avatar status="online">
          <AvatarFallback name="Active User" />
        </Avatar>
        <Avatar status="away">
          <AvatarFallback name="Away User" />
        </Avatar>
        <Avatar status="busy">
          <AvatarFallback name="Busy User" />
        </Avatar>
        <Avatar status="offline">
          <AvatarFallback name="Offline User" />
        </Avatar>
      </div>
    );

    expect(document.querySelector('[data-avatar-status="online"]')).toBeInTheDocument();
    expect(document.querySelector('[data-avatar-status="away"]')).toBeInTheDocument();
    expect(document.querySelector('[data-avatar-status="busy"]')).toBeInTheDocument();
    expect(document.querySelector('[data-avatar-status="offline"]')).toBeInTheDocument();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty name gracefully', () => {
    render(
      <Avatar>
        <AvatarFallback name="" />
      </Avatar>
    );

    // Should show default icon
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('handles undefined children in AvatarGroup', () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A1</AvatarFallback>
        </Avatar>
        {undefined}
        <Avatar>
          <AvatarFallback>A2</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    );

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
  });

  it('handles very long names', () => {
    render(
      <Avatar>
        <AvatarFallback name="Bartholomew Christopher Davidson" />
      </Avatar>
    );

    expect(screen.getByText('BC')).toBeInTheDocument();
  });

  it('handles special characters in name', () => {
    render(
      <Avatar>
        <AvatarFallback name="José García" />
      </Avatar>
    );

    expect(screen.getByText('JG')).toBeInTheDocument();
  });

  it('handles numeric badge content', () => {
    render(
      <Avatar>
        <AvatarFallback>U</AvatarFallback>
        <AvatarBadge>{99}</AvatarBadge>
      </Avatar>
    );

    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('handles zero hidden count in group', () => {
    render(
      <AvatarGroup max={3}>
        <Avatar>
          <AvatarFallback>A1</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>A2</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    );

    expect(document.querySelector('[data-avatar-count]')).not.toBeInTheDocument();
  });

  it('handles custom offset in badge', () => {
    render(
      <Avatar>
        <AvatarFallback>U</AvatarFallback>
        <AvatarBadge offset={5}>1</AvatarBadge>
      </Avatar>
    );

    const badge = document.querySelector('[data-avatar-badge]');
    expect(badge).toHaveStyle({ transform: 'translate(20%, 20%)' });
  });
});

// ============================================================================
// displayName Tests
// ============================================================================

describe('displayName', () => {
  it('Avatar has displayName', () => {
    expect(Avatar.displayName).toBe('Avatar');
  });

  it('AvatarImage has displayName', () => {
    expect(AvatarImage.displayName).toBe('AvatarImage');
  });

  it('AvatarFallback has displayName', () => {
    expect(AvatarFallback.displayName).toBe('AvatarFallback');
  });

  it('AvatarGroup has displayName', () => {
    expect(AvatarGroup.displayName).toBe('AvatarGroup');
  });

  it('AvatarBadge has displayName', () => {
    expect(AvatarBadge.displayName).toBe('AvatarBadge');
  });
});
