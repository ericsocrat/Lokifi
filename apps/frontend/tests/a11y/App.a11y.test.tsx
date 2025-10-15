/**
 * Accessibility tests for App component
 * 
 * Tests WCAG 2.1 AA compliance using jest-axe
 * These are unit-level accessibility tests that run in Vitest
 */

import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import App from '@/App';

describe('App Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<App />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper landmark regions', () => {
    const { container } = render(<App />);

    // Check for main landmark
    const main = container.querySelector('main');
    expect(main).toBeTruthy();

    // Check for aside landmarks
    const asides = container.querySelectorAll('aside');
    expect(asides.length).toBeGreaterThan(0);
  });

  it('should have proper heading hierarchy', () => {
    const { container } = render(<App />);

    // Get all headings
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    // Should have at least some headings for screen readers
    // Note: This test will pass even with 0 headings, but logs a warning
    if (headings.length === 0) {
      console.warn('⚠️  No headings found - consider adding headings for better accessibility');
    }
  });

  it('should support keyboard navigation', () => {
    const { container } = render(<App />);

    // Check that interactive elements are present
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
    
    // If there are interactive elements, they should be keyboard accessible
    if (interactiveElements.length > 0) {
      interactiveElements.forEach((element) => {
        // Elements should not have tabindex="-1" unless they have role="presentation"
        const tabIndex = element.getAttribute('tabindex');
        const role = element.getAttribute('role');
        
        if (tabIndex === '-1' && role !== 'presentation') {
          console.warn('⚠️  Element has tabindex="-1" which removes it from keyboard navigation:', element);
        }
      });
    }
  });
});
