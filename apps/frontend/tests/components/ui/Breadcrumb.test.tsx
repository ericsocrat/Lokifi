import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbHome,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  type BreadcrumbSize,
  type BreadcrumbVariant,
} from '@/components/ui/Breadcrumb';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Breadcrumb (Root) Tests
// ============================================================================

describe('Breadcrumb', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders as nav element', () => {
      render(
        <Breadcrumb data-testid="breadcrumb">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('breadcrumb').tagName).toBe('NAV');
    });

    it('has aria-label for accessibility', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('renders ordered list for items', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(document.querySelector('ol')).toBeInTheDocument();
    });

    it('has data-breadcrumb attribute', () => {
      render(
        <Breadcrumb data-testid="breadcrumb">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('breadcrumb')).toHaveAttribute('data-breadcrumb');
    });

    it('applies custom className', () => {
      render(
        <Breadcrumb className="custom-class" data-testid="breadcrumb">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('breadcrumb')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = vi.fn();
      render(
        <Breadcrumb ref={ref}>
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Separators', () => {
    it('adds separators between items', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
          <BreadcrumbItem>Three</BreadcrumbItem>
        </Breadcrumb>
      );
      const separators = document.querySelectorAll('[data-breadcrumb-separator]');
      expect(separators).toHaveLength(2);
    });

    it('does not add separator before first item', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>First</BreadcrumbItem>
          <BreadcrumbItem>Second</BreadcrumbItem>
        </Breadcrumb>
      );
      const list = document.querySelector('[data-breadcrumb-list]');
      expect(list?.firstElementChild?.getAttribute('data-breadcrumb-separator')).toBeNull();
    });

    it('uses custom separator', () => {
      render(
        <Breadcrumb separator={<span data-testid="custom-sep">|</span>}>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('custom-sep')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    const variants: BreadcrumbVariant[] = ['default', 'chevron', 'slash', 'dot', 'arrow'];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(
          <Breadcrumb variant={variant} data-testid="breadcrumb">
            <BreadcrumbItem>One</BreadcrumbItem>
            <BreadcrumbItem>Two</BreadcrumbItem>
          </Breadcrumb>
        );
        expect(screen.getByTestId('breadcrumb')).toHaveAttribute('data-variant', variant);
      });
    });

    it('uses default variant when not specified', () => {
      render(
        <Breadcrumb data-testid="breadcrumb">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('breadcrumb')).toHaveAttribute('data-variant', 'default');
    });

    it('slash variant uses / separator', () => {
      render(
        <Breadcrumb variant="slash">
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('/')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    const sizes: BreadcrumbSize[] = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        render(
          <Breadcrumb size={size}>
            <BreadcrumbItem>Item</BreadcrumbItem>
          </Breadcrumb>
        );
        const list = document.querySelector('[data-breadcrumb-list]');
        expect(list).toBeInTheDocument();
      });
    });

    it('uses md size by default', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      const list = document.querySelector('[data-breadcrumb-list]');
      expect(list).toHaveClass('text-sm');
    });

    it('applies sm size classes', () => {
      render(
        <Breadcrumb size="sm">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      const list = document.querySelector('[data-breadcrumb-list]');
      expect(list).toHaveClass('text-xs');
    });

    it('applies lg size classes', () => {
      render(
        <Breadcrumb size="lg">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      const list = document.querySelector('[data-breadcrumb-list]');
      expect(list).toHaveClass('text-base');
    });
  });

  describe('Collapsing', () => {
    it('collapses items when exceeding maxItems', () => {
      render(
        <Breadcrumb maxItems={3}>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
          <BreadcrumbItem>Three</BreadcrumbItem>
          <BreadcrumbItem>Four</BreadcrumbItem>
          <BreadcrumbItem>Five</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(document.querySelector('[data-breadcrumb-ellipsis]')).toBeInTheDocument();
    });

    it('does not collapse when within maxItems', () => {
      render(
        <Breadcrumb maxItems={5}>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
          <BreadcrumbItem>Three</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(document.querySelector('[data-breadcrumb-ellipsis]')).not.toBeInTheDocument();
    });

    it('shows correct items before and after collapse', () => {
      render(
        <Breadcrumb maxItems={3} itemsBeforeCollapse={1} itemsAfterCollapse={1}>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/cat">Category</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/sub">Subcategory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/item">Item</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.queryByText('Category')).not.toBeInTheDocument();
      expect(screen.queryByText('Subcategory')).not.toBeInTheDocument();
      expect(screen.queryByText('Item')).not.toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('respects itemsBeforeCollapse', () => {
      render(
        <Breadcrumb maxItems={4} itemsBeforeCollapse={2} itemsAfterCollapse={1}>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
          <BreadcrumbItem>Three</BreadcrumbItem>
          <BreadcrumbItem>Four</BreadcrumbItem>
          <BreadcrumbItem>Five</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Two')).toBeInTheDocument();
      expect(screen.getByText('Five')).toBeInTheDocument();
      expect(screen.queryByText('Three')).not.toBeInTheDocument();
    });

    it('respects itemsAfterCollapse', () => {
      render(
        <Breadcrumb maxItems={4} itemsBeforeCollapse={1} itemsAfterCollapse={2}>
          <BreadcrumbItem>One</BreadcrumbItem>
          <BreadcrumbItem>Two</BreadcrumbItem>
          <BreadcrumbItem>Three</BreadcrumbItem>
          <BreadcrumbItem>Four</BreadcrumbItem>
          <BreadcrumbItem>Five</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Four')).toBeInTheDocument();
      expect(screen.getByText('Five')).toBeInTheDocument();
      expect(screen.queryByText('Two')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// BreadcrumbItem Tests
// ============================================================================

describe('BreadcrumbItem', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>Test Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('renders as li element', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem data-testid="item">Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item').tagName).toBe('LI');
    });

    it('has data-breadcrumb-item attribute', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem data-testid="item">Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item')).toHaveAttribute('data-breadcrumb-item');
    });

    it('applies custom className', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem className="custom-class" data-testid="item">
            Item
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = vi.fn();
      render(
        <Breadcrumb>
          <BreadcrumbItem ref={ref}>Item</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Current Page', () => {
    it('sets aria-current when isCurrent is true', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem isCurrent data-testid="item">
            Current
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item')).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current by default', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem data-testid="item">Not Current</BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item')).not.toHaveAttribute('aria-current');
    });

    it('has data-current attribute when isCurrent', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem isCurrent data-testid="item">
            Current
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByTestId('item')).toHaveAttribute('data-current');
    });
  });
});

// ============================================================================
// BreadcrumbLink Tests
// ============================================================================

describe('BreadcrumbLink', () => {
  describe('Basic Rendering', () => {
    it('renders as anchor element', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/test">Link</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('has correct href', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/path">Link</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('link')).toHaveAttribute('href', '/path');
    });

    it('has data-breadcrumb-link attribute', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Link</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('link')).toHaveAttribute('data-breadcrumb-link');
    });

    it('applies custom className', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="custom-class">
              Link
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('link')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = vi.fn();
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink ref={ref} href="/">
              Link
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Current State', () => {
    it('renders as span when isCurrent is true', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" isCurrent>
              Current
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Current').tagName).toBe('SPAN');
    });

    it('has data-current attribute when isCurrent', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" isCurrent>
              Current
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('Current')).toHaveAttribute('data-current');
    });

    it('has pointer-events-none when isCurrent', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" isCurrent>
              Current
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByText('Current')).toHaveClass('pointer-events-none');
    });

    it('applies hover styles when not current', () => {
      render(
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Link</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      );
      expect(screen.getByRole('link')).toHaveClass('hover:text-white');
    });
  });
});

// ============================================================================
// BreadcrumbSeparator Tests
// ============================================================================

describe('BreadcrumbSeparator', () => {
  it('renders children', () => {
    render(
      <Breadcrumb>
        <BreadcrumbSeparator>→</BreadcrumbSeparator>
      </Breadcrumb>
    );
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('has role presentation', () => {
    render(
      <Breadcrumb>
        <BreadcrumbSeparator data-testid="sep">/</BreadcrumbSeparator>
      </Breadcrumb>
    );
    expect(screen.getByTestId('sep')).toHaveAttribute('role', 'presentation');
  });

  it('has aria-hidden', () => {
    render(
      <Breadcrumb>
        <BreadcrumbSeparator data-testid="sep">/</BreadcrumbSeparator>
      </Breadcrumb>
    );
    expect(screen.getByTestId('sep')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has data-breadcrumb-separator attribute', () => {
    render(
      <Breadcrumb>
        <BreadcrumbSeparator data-testid="sep">/</BreadcrumbSeparator>
      </Breadcrumb>
    );
    expect(screen.getByTestId('sep')).toHaveAttribute('data-breadcrumb-separator');
  });

  it('applies custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbSeparator className="custom-class" data-testid="sep">
          /
        </BreadcrumbSeparator>
      </Breadcrumb>
    );
    expect(screen.getByTestId('sep')).toHaveClass('custom-class');
  });
});

// ============================================================================
// BreadcrumbEllipsis Tests
// ============================================================================

describe('BreadcrumbEllipsis', () => {
  it('renders ellipsis icon', () => {
    render(
      <Breadcrumb>
        <BreadcrumbEllipsis />
      </Breadcrumb>
    );
    expect(document.querySelector('[data-breadcrumb-ellipsis] svg')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(
      <Breadcrumb>
        <BreadcrumbEllipsis />
      </Breadcrumb>
    );
    expect(screen.getByText('More pages')).toBeInTheDocument();
    expect(screen.getByText('More pages')).toHaveClass('sr-only');
  });

  it('supports custom label', () => {
    render(
      <Breadcrumb>
        <BreadcrumbEllipsis label="Additional pages" />
      </Breadcrumb>
    );
    expect(screen.getByText('Additional pages')).toBeInTheDocument();
  });

  it('has data-breadcrumb-ellipsis attribute', () => {
    render(
      <Breadcrumb>
        <BreadcrumbEllipsis data-testid="ellipsis" />
      </Breadcrumb>
    );
    expect(screen.getByTestId('ellipsis')).toHaveAttribute('data-breadcrumb-ellipsis');
  });

  it('applies custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbEllipsis className="custom-class" data-testid="ellipsis" />
      </Breadcrumb>
    );
    expect(screen.getByTestId('ellipsis')).toHaveClass('custom-class');
  });
});

// ============================================================================
// BreadcrumbPage Tests
// ============================================================================

describe('BreadcrumbPage', () => {
  it('renders children', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Current Page</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('renders as span element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current').tagName).toBe('SPAN');
  });

  it('has aria-current page', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('has data-breadcrumb-page attribute', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current')).toHaveAttribute('data-breadcrumb-page');
  });

  it('applies font-medium style', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current')).toHaveClass('font-medium');
  });

  it('applies custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage className="custom-class">Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current')).toHaveClass('custom-class');
  });
});

// ============================================================================
// BreadcrumbHome Tests
// ============================================================================

describe('BreadcrumbHome', () => {
  it('renders home icon', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(document.querySelector('[data-breadcrumb-home] svg')).toBeInTheDocument();
  });

  it('links to / by default', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });

  it('supports custom href', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome href="/dashboard" />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard');
  });

  it('hides text by default', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Home')).toHaveClass('sr-only');
  });

  it('shows text when showText is true', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome showText />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Home')).not.toHaveClass('sr-only');
  });

  it('supports custom text', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome showText text="Dashboard" />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('has data-breadcrumb-home attribute', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-breadcrumb-home');
  });

  it('applies custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome className="custom-class" />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('link')).toHaveClass('custom-class');
  });
});

// ============================================================================
// Financial Dashboard Use Cases
// ============================================================================

describe('Financial Dashboard Use Cases', () => {
  it('displays portfolio navigation path', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/portfolios">Portfolios</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/portfolios/tech">Tech Growth</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>Holdings</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Portfolios')).toBeInTheDocument();
    expect(screen.getByText('Tech Growth')).toBeInTheDocument();
    expect(screen.getByText('Holdings')).toBeInTheDocument();
  });

  it('displays transaction history path', () => {
    render(
      <Breadcrumb variant="slash">
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/transactions">Transactions</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>TXN-2024-001234</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('TXN-2024-001234')).toBeInTheDocument();
  });

  it('displays collapsed deep navigation', () => {
    render(
      <Breadcrumb maxItems={3} itemsBeforeCollapse={1} itemsAfterCollapse={1}>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/accounts">Accounts</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/accounts/brokerage">Brokerage</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/accounts/brokerage/positions">Positions</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>AAPL</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(document.querySelector('[data-breadcrumb-ellipsis]')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('displays settings path with dot separator', () => {
    render(
      <Breadcrumb variant="dot">
        <BreadcrumbItem>
          <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/settings/account">Account</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>Security</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays report path with arrow separator', () => {
    render(
      <Breadcrumb variant="arrow" size="lg">
        <BreadcrumbItem>
          <BreadcrumbLink href="/reports">Reports</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/reports/annual">Annual</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>2024 Summary</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('2024 Summary')).toBeInTheDocument();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles single item breadcrumb', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbPage>Home</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(document.querySelector('[data-breadcrumb-separator]')).not.toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(<Breadcrumb>{null}</Breadcrumb>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('handles long text gracefully', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">
            This is a very long breadcrumb item that might overflow
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(
      screen.getByText('This is a very long breadcrumb item that might overflow')
    ).toBeInTheDocument();
  });

  it('handles special characters', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/test">{'Test & Special <Characters>'}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Test & Special <Characters>')).toBeInTheDocument();
  });

  it('handles maxItems equal to total items', () => {
    render(
      <Breadcrumb maxItems={3}>
        <BreadcrumbItem>One</BreadcrumbItem>
        <BreadcrumbItem>Two</BreadcrumbItem>
        <BreadcrumbItem>Three</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(document.querySelector('[data-breadcrumb-ellipsis]')).not.toBeInTheDocument();
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });

  it('handles maxItems of 2', () => {
    render(
      <Breadcrumb maxItems={2} itemsBeforeCollapse={1} itemsAfterCollapse={1}>
        <BreadcrumbItem>First</BreadcrumbItem>
        <BreadcrumbItem>Second</BreadcrumbItem>
        <BreadcrumbItem>Third</BreadcrumbItem>
        <BreadcrumbItem>Fourth</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(document.querySelector('[data-breadcrumb-ellipsis]')).toBeInTheDocument();
    expect(screen.getByText('Fourth')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility
// ============================================================================

describe('Accessibility', () => {
  it('has proper navigation landmark', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>Item</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has accessible name on navigation', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>Item</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('navigation')).toHaveAccessibleName('Breadcrumb');
  });

  it('uses ordered list for semantic structure', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>Item</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('uses list items for each breadcrumb', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>One</BreadcrumbItem>
        <BreadcrumbItem>Two</BreadcrumbItem>
      </Breadcrumb>
    );
    const listItems = screen.getAllByRole('listitem');
    // Including separators
    expect(listItems.length).toBeGreaterThanOrEqual(2);
  });

  it('marks current page with aria-current', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('hides separator from accessibility tree', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>One</BreadcrumbItem>
        <BreadcrumbItem>Two</BreadcrumbItem>
      </Breadcrumb>
    );
    const separator = document.querySelector('[data-breadcrumb-separator]');
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('provides screen reader text for home icon', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbHome />
        </BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('provides screen reader text for ellipsis', () => {
    render(
      <Breadcrumb maxItems={2}>
        <BreadcrumbItem>One</BreadcrumbItem>
        <BreadcrumbItem>Two</BreadcrumbItem>
        <BreadcrumbItem>Three</BreadcrumbItem>
        <BreadcrumbItem>Four</BreadcrumbItem>
      </Breadcrumb>
    );
    expect(screen.getByText('More pages')).toBeInTheDocument();
  });

  it('links are focusable', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/test">Test Link</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
    );
    const link = screen.getByRole('link');
    link.focus();
    expect(link).toHaveFocus();
  });
});

// ============================================================================
// displayName Tests
// ============================================================================

describe('displayName', () => {
  it('Breadcrumb has displayName', () => {
    expect(Breadcrumb.displayName).toBe('Breadcrumb');
  });

  it('BreadcrumbItem has displayName', () => {
    expect(BreadcrumbItem.displayName).toBe('BreadcrumbItem');
  });

  it('BreadcrumbLink has displayName', () => {
    expect(BreadcrumbLink.displayName).toBe('BreadcrumbLink');
  });

  it('BreadcrumbSeparator has displayName', () => {
    expect(BreadcrumbSeparator.displayName).toBe('BreadcrumbSeparator');
  });

  it('BreadcrumbEllipsis has displayName', () => {
    expect(BreadcrumbEllipsis.displayName).toBe('BreadcrumbEllipsis');
  });

  it('BreadcrumbPage has displayName', () => {
    expect(BreadcrumbPage.displayName).toBe('BreadcrumbPage');
  });

  it('BreadcrumbHome has displayName', () => {
    expect(BreadcrumbHome.displayName).toBe('BreadcrumbHome');
  });
});
