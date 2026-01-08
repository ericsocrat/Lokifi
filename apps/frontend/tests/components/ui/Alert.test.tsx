import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertActions,
  AlertLink,
  InfoAlert,
  SuccessAlert,
  WarningAlert,
  ErrorAlert,
  AlertBanner,
  FinancialAlert,
  type AlertVariant,
  type AlertSize,
  type FinancialAlertType,
} from '@/components/ui/Alert';

// ============================================================================
// Alert (Root) Tests
// ============================================================================

describe('Alert', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(<Alert>Test content</Alert>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('has role alert', () => {
      render(<Alert>Content</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has data-alert attribute', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-alert');
    });

    it('applies custom className', () => {
      render(
        <Alert className="custom-class" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = vi.fn();
      render(<Alert ref={ref}>Content</Alert>);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    const variants: AlertVariant[] = ['default', 'info', 'success', 'warning', 'error', 'destructive'];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(
          <Alert variant={variant} data-testid="alert">
            Content
          </Alert>
        );
        expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', variant);
      });
    });

    it('uses default variant when not specified', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'default');
    });

    it('applies info variant styles', () => {
      render(
        <Alert variant="info" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('bg-blue-50');
    });

    it('applies success variant styles', () => {
      render(
        <Alert variant="success" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('bg-green-50');
    });

    it('applies warning variant styles', () => {
      render(
        <Alert variant="warning" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('bg-amber-50');
    });

    it('applies error variant styles', () => {
      render(
        <Alert variant="error" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('bg-red-50');
    });

    it('applies destructive variant styles', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('bg-red-600');
    });
  });

  describe('Sizes', () => {
    const sizes: AlertSize[] = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        render(
          <Alert size={size} data-testid="alert">
            Content
          </Alert>
        );
        expect(screen.getByTestId('alert')).toHaveAttribute('data-size', size);
      });
    });

    it('uses md size by default', () => {
      render(<Alert data-testid="alert">Content</Alert>);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-size', 'md');
    });

    it('applies sm size padding', () => {
      render(
        <Alert size="sm" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('p-3');
    });

    it('applies lg size padding', () => {
      render(
        <Alert size="lg" data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('p-5');
    });
  });

  describe('Icon', () => {
    it('shows default icon when icon prop is true', () => {
      render(<Alert icon>Content</Alert>);
      expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
    });

    it('does not show icon by default', () => {
      render(<Alert>Content</Alert>);
      expect(document.querySelector('[data-alert-icon]')).not.toBeInTheDocument();
    });

    it('shows custom icon when provided', () => {
      render(
        <Alert customIcon={<span data-testid="custom-icon">★</span>}>Content</Alert>
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('uses custom icon over default icon', () => {
      render(
        <Alert icon customIcon={<span data-testid="custom">★</span>}>
          Content
        </Alert>
      );
      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });

    it('adds flex layout when icon is shown', () => {
      render(
        <Alert icon data-testid="alert">
          Content
        </Alert>
      );
      expect(screen.getByTestId('alert')).toHaveClass('flex');
    });
  });

  describe('Dismissible', () => {
    it('shows dismiss button when dismissible', () => {
      render(<Alert dismissible>Content</Alert>);
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });

    it('does not show dismiss button by default', () => {
      render(<Alert>Content</Alert>);
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <Alert dismissible onDismiss={handleDismiss}>
          Content
        </Alert>
      );
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button has data attribute', () => {
      render(<Alert dismissible>Content</Alert>);
      expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveAttribute('data-alert-dismiss');
    });
  });
});

// ============================================================================
// AlertTitle Tests
// ============================================================================

describe('AlertTitle', () => {
  it('renders children', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders as h5 by default', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });

  it('renders as custom heading level', () => {
    render(
      <Alert>
        <AlertTitle as="h2">Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('has data-alert-title attribute', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByText('Title')).toHaveAttribute('data-alert-title');
  });

  it('applies custom className', () => {
    render(
      <Alert>
        <AlertTitle className="custom-class">Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByText('Title')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(
      <Alert>
        <AlertTitle ref={ref}>Title</AlertTitle>
      </Alert>
    );
    expect(ref).toHaveBeenCalled();
  });
});

// ============================================================================
// AlertDescription Tests
// ============================================================================

describe('AlertDescription', () => {
  it('renders children', () => {
    render(
      <Alert>
        <AlertDescription>Test description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders as paragraph', () => {
    render(
      <Alert>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Description').tagName).toBe('P');
  });

  it('has data-alert-description attribute', () => {
    render(
      <Alert>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Description')).toHaveAttribute('data-alert-description');
  });

  it('applies custom className', () => {
    render(
      <Alert>
        <AlertDescription className="custom-class">Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Description')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(
      <Alert>
        <AlertDescription ref={ref}>Description</AlertDescription>
      </Alert>
    );
    expect(ref).toHaveBeenCalled();
  });
});

// ============================================================================
// AlertActions Tests
// ============================================================================

describe('AlertActions', () => {
  it('renders children', () => {
    render(
      <Alert>
        <AlertActions>
          <button>Action</button>
        </AlertActions>
      </Alert>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('has data-alert-actions attribute', () => {
    render(
      <Alert>
        <AlertActions data-testid="actions">
          <button>Action</button>
        </AlertActions>
      </Alert>
    );
    expect(screen.getByTestId('actions')).toHaveAttribute('data-alert-actions');
  });

  it('applies flex gap styling', () => {
    render(
      <Alert>
        <AlertActions data-testid="actions">
          <button>Action</button>
        </AlertActions>
      </Alert>
    );
    expect(screen.getByTestId('actions')).toHaveClass('flex', 'gap-2');
  });

  it('applies custom className', () => {
    render(
      <Alert>
        <AlertActions className="custom-class" data-testid="actions">
          <button>Action</button>
        </AlertActions>
      </Alert>
    );
    expect(screen.getByTestId('actions')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(
      <Alert>
        <AlertActions ref={ref}>
          <button>Action</button>
        </AlertActions>
      </Alert>
    );
    expect(ref).toHaveBeenCalled();
  });
});

// ============================================================================
// AlertLink Tests
// ============================================================================

describe('AlertLink', () => {
  it('renders children', () => {
    render(
      <Alert>
        <AlertLink href="/test">Click here</AlertLink>
      </Alert>
    );
    expect(screen.getByText('Click here')).toBeInTheDocument();
  });

  it('renders as anchor', () => {
    render(
      <Alert>
        <AlertLink href="/test">Link</AlertLink>
      </Alert>
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('has correct href', () => {
    render(
      <Alert>
        <AlertLink href="/test">Link</AlertLink>
      </Alert>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/test');
  });

  it('has data-alert-link attribute', () => {
    render(
      <Alert>
        <AlertLink href="/test">Link</AlertLink>
      </Alert>
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-alert-link');
  });

  it('applies custom className', () => {
    render(
      <Alert>
        <AlertLink href="/test" className="custom-class">
          Link
        </AlertLink>
      </Alert>
    );
    expect(screen.getByRole('link')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(
      <Alert>
        <AlertLink ref={ref} href="/test">
          Link
        </AlertLink>
      </Alert>
    );
    expect(ref).toHaveBeenCalled();
  });
});

// ============================================================================
// Convenience Alert Components Tests
// ============================================================================

describe('InfoAlert', () => {
  it('renders with info variant', () => {
    render(<InfoAlert title="Info" description="Description" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'info');
  });

  it('shows icon', () => {
    render(<InfoAlert title="Info" />);
    expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<InfoAlert title="Info Title" />);
    expect(screen.getByText('Info Title')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<InfoAlert title="Info" description="Info description" />);
    expect(screen.getByText('Info description')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<InfoAlert title="Info">Extra content</InfoAlert>);
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });
});

describe('SuccessAlert', () => {
  it('renders with success variant', () => {
    render(<SuccessAlert title="Success" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'success');
  });

  it('shows icon', () => {
    render(<SuccessAlert title="Success" />);
    expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(<SuccessAlert title="Operation Complete" description="Your changes have been saved" />);
    expect(screen.getByText('Operation Complete')).toBeInTheDocument();
    expect(screen.getByText('Your changes have been saved')).toBeInTheDocument();
  });
});

describe('WarningAlert', () => {
  it('renders with warning variant', () => {
    render(<WarningAlert title="Warning" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'warning');
  });

  it('shows icon', () => {
    render(<WarningAlert title="Warning" />);
    expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
  });
});

describe('ErrorAlert', () => {
  it('renders with error variant', () => {
    render(<ErrorAlert title="Error" />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'error');
  });

  it('shows icon', () => {
    render(<ErrorAlert title="Error" />);
    expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
  });
});

// ============================================================================
// AlertBanner Tests
// ============================================================================

describe('AlertBanner', () => {
  it('renders children', () => {
    render(<AlertBanner>Banner content</AlertBanner>);
    expect(screen.getByText('Banner content')).toBeInTheDocument();
  });

  it('has data-alert-banner attribute', () => {
    render(<AlertBanner data-testid="banner">Content</AlertBanner>);
    expect(screen.getByTestId('banner')).toHaveAttribute('data-alert-banner');
  });

  it('renders inline position by default', () => {
    render(<AlertBanner data-testid="banner">Content</AlertBanner>);
    expect(screen.getByTestId('banner')).toHaveAttribute('data-position', 'inline');
  });

  it('renders top position', () => {
    render(
      <AlertBanner position="top" data-testid="banner">
        Content
      </AlertBanner>
    );
    expect(screen.getByTestId('banner')).toHaveClass('fixed', 'top-0');
  });

  it('renders bottom position', () => {
    render(
      <AlertBanner position="bottom" data-testid="banner">
        Content
      </AlertBanner>
    );
    expect(screen.getByTestId('banner')).toHaveClass('fixed', 'bottom-0');
  });

  it('applies centered text', () => {
    render(
      <AlertBanner centered data-testid="banner">
        Content
      </AlertBanner>
    );
    expect(screen.getByTestId('banner')).toHaveClass('text-center');
  });

  it('removes border radius', () => {
    render(<AlertBanner data-testid="banner">Content</AlertBanner>);
    expect(screen.getByTestId('banner')).toHaveClass('rounded-none');
  });

  it('uses info variant by default', () => {
    render(<AlertBanner data-testid="banner">Content</AlertBanner>);
    expect(screen.getByTestId('banner')).toHaveAttribute('data-variant', 'info');
  });
});

// ============================================================================
// FinancialAlert Tests
// ============================================================================

describe('FinancialAlert', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <FinancialAlert type="price-up" title="Test">
          Extra content
        </FinancialAlert>
      );
      expect(screen.getByText('Extra content')).toBeInTheDocument();
    });

    it('has data-financial-alert attribute', () => {
      render(<FinancialAlert type="price-up" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-financial-alert');
    });

    it('has data-alert-type attribute', () => {
      render(<FinancialAlert type="price-up" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-alert-type', 'price-up');
    });
  });

  describe('Alert Types', () => {
    const types: FinancialAlertType[] = [
      'price-up',
      'price-down',
      'trade-executed',
      'portfolio-update',
      'risk-warning',
    ];

    types.forEach((type) => {
      it(`renders ${type} type`, () => {
        render(<FinancialAlert type={type} data-testid="alert" />);
        expect(screen.getByTestId('alert')).toHaveAttribute('data-alert-type', type);
      });
    });

    it('price-up uses success variant', () => {
      render(<FinancialAlert type="price-up" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'success');
    });

    it('price-down uses error variant', () => {
      render(<FinancialAlert type="price-down" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'error');
    });

    it('trade-executed uses info variant', () => {
      render(<FinancialAlert type="trade-executed" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'info');
    });

    it('risk-warning uses warning variant', () => {
      render(<FinancialAlert type="risk-warning" data-testid="alert" />);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'warning');
    });
  });

  describe('Default Titles', () => {
    it('uses default title for price-up', () => {
      render(<FinancialAlert type="price-up" />);
      expect(screen.getByText('Price Increase')).toBeInTheDocument();
    });

    it('uses default title for price-down', () => {
      render(<FinancialAlert type="price-down" />);
      expect(screen.getByText('Price Decrease')).toBeInTheDocument();
    });

    it('uses default title for trade-executed', () => {
      render(<FinancialAlert type="trade-executed" />);
      expect(screen.getByText('Trade Executed')).toBeInTheDocument();
    });

    it('uses default title for portfolio-update', () => {
      render(<FinancialAlert type="portfolio-update" />);
      expect(screen.getByText('Portfolio Updated')).toBeInTheDocument();
    });

    it('uses custom title when provided', () => {
      render(<FinancialAlert type="price-up" title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('renders description', () => {
      render(<FinancialAlert type="price-up" description="BTC is up 5%" />);
      expect(screen.getByText('BTC is up 5%')).toBeInTheDocument();
    });

    it('renders symbol', () => {
      render(<FinancialAlert type="price-up" symbol="BTC" />);
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('renders value change', () => {
      render(<FinancialAlert type="price-up" valueChange="+5.2%" />);
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
    });

    it('renders symbol and value change together', () => {
      render(<FinancialAlert type="price-down" symbol="ETH" valueChange="-3.1%" />);
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('-3.1%')).toBeInTheDocument();
    });
  });

  describe('Financial Dashboard Use Cases', () => {
    it('displays price increase alert', () => {
      render(
        <FinancialAlert
          type="price-up"
          title="Price Alert"
          description="Your target price has been reached"
          symbol="AAPL"
          valueChange="+2.5%"
        />
      );
      expect(screen.getByText('Price Alert')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('+2.5%')).toBeInTheDocument();
    });

    it('displays trade execution alert', () => {
      render(
        <FinancialAlert
          type="trade-executed"
          title="Order Filled"
          description="Bought 10 shares of MSFT at $380.00"
        />
      );
      expect(screen.getByText('Order Filled')).toBeInTheDocument();
      expect(screen.getByText('Bought 10 shares of MSFT at $380.00')).toBeInTheDocument();
    });

    it('displays risk warning', () => {
      render(
        <FinancialAlert
          type="risk-warning"
          title="Portfolio Risk"
          description="Your portfolio is highly concentrated in tech stocks"
        />
      );
      expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'warning');
    });
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('Accessibility', () => {
  it('has alert role for screen readers', () => {
    render(<Alert>Important message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('dismiss button is accessible', () => {
    render(
      <Alert dismissible onDismiss={() => {}}>
        Content
      </Alert>
    );
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('dismiss button is keyboard accessible', () => {
    const handleDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Content
      </Alert>
    );
    const button = screen.getByRole('button', { name: 'Dismiss' });
    button.focus();
    fireEvent.click(button);
    expect(handleDismiss).toHaveBeenCalled();
  });

  it('icons are hidden from screen readers', () => {
    render(<Alert icon>Content</Alert>);
    const svg = document.querySelector('[data-alert-icon] svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('links are focusable', () => {
    render(
      <Alert>
        <AlertLink href="/test">Link</AlertLink>
      </Alert>
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
  it('Alert has displayName', () => {
    expect(Alert.displayName).toBe('Alert');
  });

  it('AlertTitle has displayName', () => {
    expect(AlertTitle.displayName).toBe('AlertTitle');
  });

  it('AlertDescription has displayName', () => {
    expect(AlertDescription.displayName).toBe('AlertDescription');
  });

  it('AlertActions has displayName', () => {
    expect(AlertActions.displayName).toBe('AlertActions');
  });

  it('AlertLink has displayName', () => {
    expect(AlertLink.displayName).toBe('AlertLink');
  });

  it('InfoAlert has displayName', () => {
    expect(InfoAlert.displayName).toBe('InfoAlert');
  });

  it('SuccessAlert has displayName', () => {
    expect(SuccessAlert.displayName).toBe('SuccessAlert');
  });

  it('WarningAlert has displayName', () => {
    expect(WarningAlert.displayName).toBe('WarningAlert');
  });

  it('ErrorAlert has displayName', () => {
    expect(ErrorAlert.displayName).toBe('ErrorAlert');
  });

  it('AlertBanner has displayName', () => {
    expect(AlertBanner.displayName).toBe('AlertBanner');
  });

  it('FinancialAlert has displayName', () => {
    expect(FinancialAlert.displayName).toBe('FinancialAlert');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty children', () => {
    render(<Alert>{null}</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('handles multiple children', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description</AlertDescription>
        <AlertActions>
          <button>Action 1</button>
          <button>Action 2</button>
        </AlertActions>
      </Alert>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
  });

  it('handles long content', () => {
    const longText = 'This is a very long alert message that might wrap to multiple lines.';
    render(<Alert>{longText}</Alert>);
    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('handles dismissible without onDismiss', () => {
    render(<Alert dismissible>Content</Alert>);
    const button = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(button);
    // Should not throw error
    expect(button).toBeInTheDocument();
  });

  it('handles all props together', () => {
    const handleDismiss = vi.fn();
    render(
      <Alert
        variant="warning"
        size="lg"
        icon
        dismissible
        onDismiss={handleDismiss}
        className="custom"
        data-testid="alert"
      >
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'warning');
    expect(screen.getByTestId('alert')).toHaveAttribute('data-size', 'lg');
    expect(screen.getByTestId('alert')).toHaveClass('custom');
    expect(document.querySelector('[data-alert-icon]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });
});
