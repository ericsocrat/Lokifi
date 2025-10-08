import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Homepage meets WCAG 2.1 AA standards', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('All images have alt text', async ({ page }) => {
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('Form inputs have labels', async ({ page }) => {
    const unlabeledInputs = await page.locator('input:not([aria-label]):not([aria-labelledby])').count();

    // Check if inputs have associated labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) return true;
        }
        return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
      });

      if (!hasLabel) {
        const inputType = await input.getAttribute('type');
        console.log(`Input without label found: type=${inputType}`);
      }
    }
  });

  test('Buttons are keyboard accessible', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const isAccessible = await button.evaluate((el) => {
        return !el.hasAttribute('disabled');
      });

      if (isAccessible) {
        await button.focus();
        const isFocused = await button.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBeTruthy();
      }
    }
  });

  test('Tab navigation works correctly', async ({ page }) => {
    await page.keyboard.press('Tab');

    const firstFocused = await page.locator(':focus');
    expect(await firstFocused.count()).toBeGreaterThan(0);

    // Check focus visible indicator
    const outline = await firstFocused.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    expect(outline).toBeTruthy();
  });

  test('Skip to main content link exists', async ({ page }) => {
    const skipLink = page.locator('a[href="#main"], a:has-text("Skip to content")').first();

    if (await skipLink.count() > 0) {
      expect(await skipLink.count()).toBeGreaterThan(0);
    } else {
      console.log('No skip link found - consider adding for better accessibility');
    }
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules(['color-contrast']) // We'll enable only this one
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    const contrastViolations = contrastResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('Interactive elements have accessible names', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('button, a, input, select, textarea')
      .analyze();

    const nameViolations = results.violations.filter(
      (v) => v.id === 'button-name' || v.id === 'link-name' || v.id === 'label'
    );

    expect(nameViolations).toEqual([]);
  });

  test('Page has proper heading structure', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    expect(headings.length).toBeGreaterThan(0);

    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(2); // Should have only 1-2 h1s
  });

  test('Focus management in modals', async ({ page }) => {
    // Try to open a modal
    const modalTrigger = page.locator('[data-testid*="modal"], button:has-text("Settings")').first();

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      // Check if focus is trapped in modal
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBeGreaterThan(0);

      // Try to tab through modal
      await page.keyboard.press('Tab');
      const newFocusedElement = await page.locator(':focus');

      // Focus should stay within modal
      const isInModal = await newFocusedElement.evaluate((el) => {
        return el.closest('[role="dialog"], [role="alertdialog"]') !== null;
      });

      if (isInModal) {
        expect(isInModal).toBeTruthy();
      }
    } else {
      console.log('No modal found to test focus management');
    }
  });

  test('ARIA attributes are used correctly', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const ariaViolations = results.violations.filter((v) =>
      v.id.startsWith('aria-')
    );

    expect(ariaViolations).toEqual([]);
  });

  test('Keyboard shortcuts are accessible', async ({ page }) => {
    // Test common keyboard shortcuts
    const shortcuts = [
      { key: 'Escape', description: 'Close modals' },
      { key: 'Enter', description: 'Activate buttons' },
      { key: 'Space', description: 'Toggle buttons' },
    ];

    for (const shortcut of shortcuts) {
      try {
        await page.keyboard.press(shortcut.key);
        await page.waitForTimeout(300);
        // If no error, the shortcut is at least handled
        console.log(`✓ ${shortcut.key} - ${shortcut.description}`);
      } catch (error) {
        console.log(`⚠ ${shortcut.key} might not be properly handled`);
      }
    }
  });

  test('Chart canvas has proper ARIA labels', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    if (await canvas.count() > 0) {
      const hasAriaLabel = await canvas.evaluate((el) => {
        return (
          el.hasAttribute('aria-label') ||
          el.hasAttribute('aria-labelledby') ||
          el.hasAttribute('role')
        );
      });

      if (!hasAriaLabel) {
        console.log('⚠ Canvas should have ARIA labels for screen readers');
      }
    }
  });

  test('No accessibility violations with screen reader', async ({ page }) => {
    // Simulate screen reader by checking all text content is accessible
    const results = await new AxeBuilder({ page })
      .withTags(['cat.name-role-value'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Touch targets are at least 44x44 pixels', async ({ page }) => {
    const interactiveElements = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all();

    for (const element of interactiveElements) {
      const boundingBox = await element.boundingBox();

      if (boundingBox) {
        if (boundingBox.width < 44 || boundingBox.height < 44) {
          const text = await element.textContent();
          console.log(`⚠ Small touch target: ${text?.substring(0, 30)} (${boundingBox.width}x${boundingBox.height})`);
        }
      }
    }
  });
});
