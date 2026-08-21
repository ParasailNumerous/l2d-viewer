import { test, expect } from '@playwright/test';
import { gotoViewer } from './helpers';

test.describe('P0 smoke', () => {
  test('viewer mounts with canvas and footer', async ({ page }) => {
    await gotoViewer(page);
    const hasCanvas = await page.evaluate(() => !!document.querySelector('live2d-viewer')?.shadowRoot?.querySelector('#viewport canvas'));
    expect(hasCanvas).toBe(true);
  });

  test('disableImportFile hides import buttons', async ({ page }) => {
    await gotoViewer(page);
    await page.evaluate(() => { (document.querySelector('live2d-viewer') as any).disableImportFile = true; });
    await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => {
      const el = document.querySelector('live2d-viewer') as any;
      return Array.from(el.shadowRoot.querySelectorAll('.drop-btn')).every((b: any) => b.hidden);
    });
    expect(hidden).toBe(true);
    await page.evaluate(() => {
      const el = document.querySelector('live2d-viewer') as any;
      el.isDragging = false;
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
    });
    expect(await page.evaluate(() => (document.querySelector('live2d-viewer') as any).isDragging)).toBe(false);
  });
});
