import { expect, test } from '@playwright/test';

test.describe('DrawingLayer (Playwright)', () => {
  test('draws a trendline on the canvas', async ({ page, browserName }) => {
    await page.goto('/dev/drawing');

    // Explicitly wait for canvas to be visible across browsers
    await page.waitForSelector('#drawing-container canvas', { state: 'visible' });
    const canvas = page.locator('#drawing-container canvas');

    // Ensure canvas is laid out and get its bounding box for coordinates
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return; // type guard

    const start = { x: Math.floor(box.x + 100), y: Math.floor(box.y + 100) };
    const end = { x: Math.floor(box.x + 300), y: Math.floor(box.y + 200) };

    // Simulate drawing gesture: mousedown -> mousemove -> mouseup
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();

    // WebKit needs longer render time
    await page.waitForTimeout(browserName === 'webkit' ? 400 : 150);

    // Verify canvas has non-transparent pixels (basic rendering assertion)
    const handle = await page.waitForSelector('#drawing-container canvas', { state: 'attached' });
    const hasPaint = await page.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const img = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < img.length; i += 4) {
        if (img[i] !== 0) return true; // alpha channel non-zero
      }
      return false;
    }, handle);

    expect(hasPaint).toBe(true);
  });

  test('draws a rectangle on the canvas', async ({ page, browserName }) => {
    await page.goto('/dev/drawing');
    await page.waitForSelector('#drawing-container canvas', { state: 'visible' });

    // Switch to rect tool via state store
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).useChartStore?.getState()?.setTool('rect');
    });

    const canvas = page.locator('#drawing-container canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const topLeft = { x: Math.floor(box.x + 150), y: Math.floor(box.y + 150) };
    const bottomRight = { x: Math.floor(box.x + 350), y: Math.floor(box.y + 300) };

    // Draw rectangle
    await page.mouse.move(topLeft.x, topLeft.y);
    await page.mouse.down();
    await page.mouse.move(bottomRight.x, bottomRight.y);
    await page.mouse.up();

    await page.waitForTimeout(browserName === 'webkit' ? 400 : 150);

    // Verify rendering
    const handle = await page.waitForSelector('#drawing-container canvas', { state: 'attached' });
    const hasPaint = await page.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const img = ctx.getImageData(0, 0, c.width, c.height).data;
      let count = 0;
      for (let i = 3; i < img.length; i += 4) {
        if (img[i] !== 0) count++;
      }
      return count > 50; // Expect more pixels for rect edges
    }, handle);

    expect(hasPaint).toBe(true);
  });
});
