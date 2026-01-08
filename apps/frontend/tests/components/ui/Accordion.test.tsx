import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  SimpleAccordion,
} from '@/components/ui/Accordion';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Accordion', () => {
  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders accordion with items', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('hides content by default', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('shows content when expanded', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(
        <Accordion className="custom-accordion">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion')).toHaveClass('custom-accordion');
    });
  });

  // ============================================================================
  // Single Mode
  // ============================================================================

  describe('Single Mode', () => {
    it('expands one item at a time', () => {
      render(
        <Accordion type="single">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Click first item
      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      // Click second item - first should collapse
      fireEvent.click(screen.getByText('Item 2'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('does not collapse when clicking same item without collapsible', () => {
      render(
        <Accordion type="single" collapsible={false}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Click to expand
      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Click again - should stay expanded
      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('collapses when clicking same item with collapsible', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Click to expand
      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Click again - should collapse
      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Multiple Mode
  // ============================================================================

  describe('Multiple Mode', () => {
    it('allows multiple items to be expanded', () => {
      render(
        <Accordion type="multiple">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Expand both items
      fireEvent.click(screen.getByText('Item 1'));
      fireEvent.click(screen.getByText('Item 2'));

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('toggles individual items in multiple mode', () => {
      render(
        <Accordion type="multiple">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Expand both
      fireEvent.click(screen.getByText('Item 1'));
      fireEvent.click(screen.getByText('Item 2'));

      // Collapse first item only
      fireEvent.click(screen.getByText('Item 1'));

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('supports default value as array', () => {
      render(
        <Accordion type="multiple" defaultValue={['item-1', 'item-2']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Controlled Mode
  // ============================================================================

  describe('Controlled Mode', () => {
    it('respects controlled value in single mode', () => {
      const { rerender } = render(
        <Accordion type="single" value="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      rerender(
        <Accordion type="single" value="item-2">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('respects controlled value in multiple mode', () => {
      render(
        <Accordion type="multiple" value={['item-1', 'item-2']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('calls onValueChange in single mode', () => {
      const onValueChange = vi.fn();

      render(
        <Accordion type="single" onValueChange={onValueChange}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(onValueChange).toHaveBeenCalledWith('item-1');
    });

    it('calls onValueChange in multiple mode', () => {
      const onValueChange = vi.fn();

      render(
        <Accordion type="multiple" onValueChange={onValueChange}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(onValueChange).toHaveBeenCalledWith(['item-1']);

      fireEvent.click(screen.getByText('Item 2'));
      expect(onValueChange).toHaveBeenCalledWith(['item-1', 'item-2']);
    });
  });

  // ============================================================================
  // Variants
  // ============================================================================

  describe('Variants', () => {
    const variants = ['default', 'bordered', 'separated', 'flush'] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(
          <Accordion variant={variant}>
            <AccordionItem value="item-1">
              <AccordionTrigger>Item 1</AccordionTrigger>
              <AccordionContent>Content 1</AccordionContent>
            </AccordionItem>
          </Accordion>
        );

        expect(screen.getByTestId('accordion')).toBeInTheDocument();
      });
    });

    it('applies bordered variant styles', () => {
      render(
        <Accordion variant="bordered">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const accordion = screen.getByTestId('accordion');
      expect(accordion).toHaveClass('border');
      expect(accordion).toHaveClass('rounded-lg');
    });

    it('applies separated variant styles to items', () => {
      render(
        <Accordion variant="separated">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const item = screen.getByTestId('accordion-item');
      expect(item).toHaveClass('border');
      expect(item).toHaveClass('rounded-lg');
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================

  describe('Disabled State', () => {
    it('disables all items when accordion is disabled', () => {
      render(
        <Accordion disabled>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
    });

    it('disables individual items', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1" disabled>
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const triggers = screen.getAllByTestId('accordion-trigger');
      expect(triggers[0]).toBeDisabled();
      expect(triggers[1]).not.toBeDisabled();
    });

    it('does not expand disabled items on click', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1" disabled>
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Icon Position
  // ============================================================================

  describe('Icon Position', () => {
    it('renders icon on the right by default', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      const svg = trigger.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders icon on the left when specified', () => {
      render(
        <Accordion iconPosition="left">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      const svg = trigger.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('hides icon when hideIcon is true', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger hideIcon>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      const svg = trigger.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('renders custom icon', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger icon={<span data-testid="custom-icon">+</span>}>
              Item 1
            </AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('expands item on Enter key', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      fireEvent.keyDown(trigger, { key: 'Enter' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('expands item on Space key', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      fireEvent.keyDown(trigger, { key: ' ' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('does not respond to other keys', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      fireEvent.keyDown(trigger, { key: 'a' });

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('has correct ARIA attributes on trigger', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls');
    });

    it('has correct ARIA attributes on content', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const content = screen.getByTestId('accordion-content');
      expect(content).toHaveAttribute('role', 'region');
      expect(content).toHaveAttribute('aria-labelledby');
    });

    it('links trigger and content via ARIA attributes', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      const content = screen.getByTestId('accordion-content');

      const triggerId = trigger.id;
      const contentId = content.id;

      expect(trigger.getAttribute('aria-controls')).toBe(contentId);
      expect(content.getAttribute('aria-labelledby')).toBe(triggerId);
    });

    it('updates aria-expanded when toggled', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ============================================================================
  // Data Attributes
  // ============================================================================

  describe('Data Attributes', () => {
    it('sets data-state on item', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const item = screen.getByTestId('accordion-item');
      expect(item).toHaveAttribute('data-state', 'closed');

      fireEvent.click(screen.getByText('Item 1'));
      expect(item).toHaveAttribute('data-state', 'open');
    });

    it('sets data-state on trigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toHaveAttribute('data-state', 'closed');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('data-state', 'open');
    });

    it('sets data-state on content', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const content = screen.getByTestId('accordion-content');
      expect(content).toHaveAttribute('data-state', 'open');
    });

    it('sets data-disabled on disabled items', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1" disabled>
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const item = screen.getByTestId('accordion-item');
      const trigger = screen.getByTestId('accordion-trigger');

      expect(item).toHaveAttribute('data-disabled');
      expect(trigger).toHaveAttribute('data-disabled');
    });
  });

  // ============================================================================
  // Force Mount
  // ============================================================================

  describe('Force Mount', () => {
    it('keeps content in DOM when forceMount is true', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent forceMount>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const content = screen.getByTestId('accordion-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('hidden');
    });
  });

  // ============================================================================
  // SimpleAccordion
  // ============================================================================

  describe('SimpleAccordion', () => {
    const items = [
      { value: 'item-1', title: 'Item 1', content: 'Content 1' },
      { value: 'item-2', title: 'Item 2', content: 'Content 2' },
      { value: 'item-3', title: 'Item 3', content: 'Content 3' },
    ];

    it('renders all items', () => {
      render(<SimpleAccordion items={items} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('expands items on click', () => {
      render(<SimpleAccordion items={items} />);

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('passes props to underlying Accordion', () => {
      render(<SimpleAccordion items={items} type="multiple" defaultValue={['item-1', 'item-2']} />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('supports disabled items', () => {
      const itemsWithDisabled = [
        { value: 'item-1', title: 'Item 1', content: 'Content 1', disabled: true },
        { value: 'item-2', title: 'Item 2', content: 'Content 2' },
      ];

      render(<SimpleAccordion items={itemsWithDisabled} />);

      const triggers = screen.getAllByTestId('accordion-trigger');
      expect(triggers[0]).toBeDisabled();
      expect(triggers[1]).not.toBeDisabled();
    });

    it('supports custom icons per item', () => {
      const itemsWithIcons = [
        {
          value: 'item-1',
          title: 'Item 1',
          content: 'Content 1',
          icon: <span data-testid="custom-icon-1">★</span>,
        },
        { value: 'item-2', title: 'Item 2', content: 'Content 2' },
      ];

      render(<SimpleAccordion items={itemsWithIcons} />);

      expect(screen.getByTestId('custom-icon-1')).toBeInTheDocument();
    });

    it('hides all icons when hideIcons is true', () => {
      render(<SimpleAccordion items={items} hideIcons />);

      const triggers = screen.getAllByTestId('accordion-trigger');
      triggers.forEach((trigger) => {
        expect(trigger.querySelector('svg')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles empty accordion', () => {
      render(<Accordion />);
      expect(screen.getByTestId('accordion')).toBeInTheDocument();
    });

    it('handles complex content', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>
              <div>
                <h3>Title</h3>
                <p>Description</p>
                <button>Action</button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('handles nested accordions', () => {
      render(
        <Accordion defaultValue="outer">
          <AccordionItem value="outer">
            <AccordionTrigger>Outer</AccordionTrigger>
            <AccordionContent>
              <Accordion defaultValue="inner">
                <AccordionItem value="inner">
                  <AccordionTrigger>Inner</AccordionTrigger>
                  <AccordionContent>Inner content</AccordionContent>
                </AccordionItem>
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Outer')).toBeInTheDocument();
      expect(screen.getByText('Inner')).toBeInTheDocument();
      expect(screen.getByText('Inner content')).toBeInTheDocument();
    });

    it('handles rapid clicking', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByText('Item 1');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(trigger);
      }

      // Should be in a stable state (10 clicks = even = closed)
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('spreads additional props to accordion', () => {
      render(
        <Accordion data-custom="value">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion')).toHaveAttribute('data-custom', 'value');
    });

    it('spreads additional props to item', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1" data-custom="value">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-item')).toHaveAttribute('data-custom', 'value');
    });

    it('spreads additional props to trigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger data-custom="value">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-trigger')).toHaveAttribute('data-custom', 'value');
    });

    it('spreads additional props to content', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent data-custom="value">Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-content')).toHaveAttribute('data-custom', 'value');
    });
  });

  // ============================================================================
  // Custom Styling
  // ============================================================================

  describe('Custom Styling', () => {
    it('applies custom className to item', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1" className="custom-item">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-item')).toHaveClass('custom-item');
    });

    it('applies custom className to trigger', () => {
      render(
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger className="custom-trigger">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-trigger')).toHaveClass('custom-trigger');
    });

    it('applies custom className to content', () => {
      render(
        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent className="custom-content">Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion-content')).toHaveClass('custom-content');
    });
  });
});
