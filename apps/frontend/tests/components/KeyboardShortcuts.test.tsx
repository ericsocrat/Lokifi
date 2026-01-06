/**
 * KeyboardShortcuts Component Tests
 *
 * Tests for keyboard shortcuts help modal
 */

import { KeyboardShortcuts } from '@/components/markets/KeyboardShortcuts';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('KeyboardShortcuts', () => {
  describe('Closed State (Button)', () => {
    it('should render keyboard button when closed', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have correct title on button', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByTitle('Keyboard Shortcuts (Press ?)');
      expect(button).toBeInTheDocument();
    });

    it('should apply fixed positioning styling', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('fixed', 'bottom-6', 'right-6');
    });

    it('should apply correct button styling', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-800', 'hover:bg-neutral-700', 'rounded-full', 'z-50');
    });

    it('should render Keyboard icon', () => {
      render(<KeyboardShortcuts />);

      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Opening Modal', () => {
    it('should open modal when button is clicked', () => {
      render(<KeyboardShortcuts />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should open modal when ? key is pressed', () => {
      render(<KeyboardShortcuts />);

      fireEvent.keyDown(window, { key: '?' });

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should not show button when modal is open', () => {
      render(<KeyboardShortcuts />);

      fireEvent.click(screen.getByRole('button'));

      // There should be a close button, not the keyboard button
      expect(screen.queryByTitle('Keyboard Shortcuts (Press ?)')).not.toBeInTheDocument();
    });
  });

  describe('Modal Structure', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should render modal with backdrop', () => {
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      expect(backdrop).toBeInTheDocument();
    });

    it('should render modal heading', () => {
      const heading = screen.getByRole('heading', { name: /keyboard shortcuts/i });
      expect(heading).toBeInTheDocument();
    });

    it('should render close button', () => {
      const buttons = screen.getAllByRole('button');
      // Find the close button (the one in the modal)
      const closeButton = buttons.find((btn) => btn.querySelector('svg'));
      expect(closeButton).toBeInTheDocument();
    });

    it('should apply correct modal styling', () => {
      const modalContent = document.querySelector(
        '.bg-neutral-900.border.border-neutral-800.rounded-xl'
      );
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Closing Modal', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should close modal when close button is clicked', () => {
      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      expect(screen.getByTitle('Keyboard Shortcuts (Press ?)')).toBeInTheDocument();
    });

    it('should close modal when Escape is pressed', () => {
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('should show button again after closing', () => {
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.getByTitle('Keyboard Shortcuts (Press ?)')).toBeInTheDocument();
    });
  });

  describe('Navigation Shortcuts Section', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should display Navigation section', () => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('should show Focus search shortcut', () => {
      expect(screen.getByText('Focus search')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('should show Clear search / Close modal shortcut', () => {
      expect(screen.getByText('Clear search / Close modal')).toBeInTheDocument();
      // 'Esc' appears multiple times, so we just check it exists in the document
      const escKeys = screen.getAllByText('Esc');
      expect(escKeys.length).toBeGreaterThan(0);
    });

    it('should show Show keyboard shortcuts shortcut', () => {
      expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('Actions Shortcuts Section', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should display Actions section', () => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should show Refresh data shortcut', () => {
      expect(screen.getByText('Refresh data')).toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();
    });

    it('should show Export to CSV shortcut', () => {
      expect(screen.getByText('Export to CSV')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('should show Toggle watchlist shortcut', () => {
      expect(screen.getByText('Toggle watchlist')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
    });
  });

  describe('Sorting Shortcuts Section', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should display Sorting section', () => {
      expect(screen.getByText('Sorting')).toBeInTheDocument();
    });

    it('should show Sort by symbol shortcut', () => {
      expect(screen.getByText('Sort by symbol')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should show Sort by price shortcut', () => {
      expect(screen.getByText('Sort by price')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('should show Sort by change % shortcut', () => {
      expect(screen.getByText('Sort by change %')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should show Sort by market cap shortcut', () => {
      expect(screen.getByText('Sort by market cap')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should display footer with Esc hint', () => {
      // The text contains "Press <kbd>Esc</kbd> to close" so we check for the full pattern
      const footerText = document.querySelector('.border-t.border-neutral-800 p');
      expect(footerText).toBeInTheDocument();
      expect(footerText?.textContent).toContain('Press');
      expect(footerText?.textContent).toContain('to close');
    });

    it('should have kbd element for Esc in footer', () => {
      const kbdElements = document.querySelectorAll('kbd');
      const escKbd = Array.from(kbdElements).find((kbd) => kbd.textContent === 'Esc');
      expect(escKbd).toBeInTheDocument();
    });
  });

  describe('Shortcut Item Styling', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should render kbd elements with correct styling', () => {
      const kbdElement = screen.getByText('R');
      expect(kbdElement.tagName).toBe('KBD');
      expect(kbdElement).toHaveClass('px-3', 'py-1.5', 'bg-neutral-800', 'rounded', 'font-mono');
    });

    it('should render descriptions with correct styling', () => {
      const description = screen.getByText('Refresh data');
      expect(description).toHaveClass('text-neutral-300', 'text-sm');
    });
  });

  describe('Section Styling', () => {
    beforeEach(() => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));
    });

    it('should render section headings with correct styling', () => {
      const sectionHeading = screen.getByText('Navigation');
      expect(sectionHeading.tagName).toBe('H3');
      expect(sectionHeading).toHaveClass('text-sm', 'font-semibold', 'text-neutral-400');
    });
  });

  describe('Keyboard Event Prevention', () => {
    it('should prevent default on ? key when opening', () => {
      render(<KeyboardShortcuts />);

      const event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not open modal again when already open', () => {
      render(<KeyboardShortcuts />);

      // Open modal
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Press ? again - should stay open without issues
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<KeyboardShortcuts />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive button title', () => {
      render(<KeyboardShortcuts />);

      expect(screen.getByTitle('Keyboard Shortcuts (Press ?)')).toBeInTheDocument();
    });

    it('should use semantic heading elements', () => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should use kbd elements for keys', () => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));

      const kbdElements = document.querySelectorAll('kbd');
      expect(kbdElements.length).toBeGreaterThan(10); // Multiple shortcuts displayed
    });

    it('should have clickable close button', () => {
      render(<KeyboardShortcuts />);
      fireEvent.click(screen.getByRole('button'));

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
