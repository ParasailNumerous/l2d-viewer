import { test, expect } from '@playwright/test';
import { loadFixture, dispatchPinchZoom, dispatchPointerPan, dispatchWheelZoom } from './helpers';

test.describe('P2 viewport interactions', () => {
  test('pan via pointer drag (directional)', async ({ page }) => {
    await loadFixture(page);
    const before = await page.evaluate(() => { const el = document.querySelector('live2d-viewer') as any; return { x: el.panX, y: el.panY }; });
    await dispatchPointerPan(page, 100, 60);
    // direction: dragging +dx should change panX, not exact pixels (survives speed tweaks)
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).panX)).not.toBe(before.x);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).panY)).not.toBe(before.y);
  });

  test('pinch zoom changes scale (directional, clamp-invariant)', async ({ page }) => {
    await loadFixture(page);
    const before = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale);
    await dispatchPinchZoom(page, 1.8);
    // invariant: scale stays in clamp, and pinch-out increases scale (direction) - survives zoomSpeed/panSpeed changes at src/live2d-viewer.ts:1295
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBeGreaterThan(before);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBeGreaterThanOrEqual(0.1);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBeLessThanOrEqual(40);
    // pinch-in should decrease
    await dispatchPinchZoom(page, 0.6);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBeLessThan(before * 1.8);
  });

  test('wheel zoom via dispatched WheelEvent (desktop, directional)', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' && test.info().project.name.includes('Mobile'), 'mouse wheel not supported on mobile WebKit - covered by pinch test');
    await loadFixture(page);
    const before = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale);
    await dispatchWheelZoom(page, -200); // negative deltaY = zoom in per src/live2d-viewer.ts:670
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale), { timeout: 3000 }).toBeGreaterThan(before);
    await dispatchWheelZoom(page, 400);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBeLessThan(before * 1.5);
  });

  test('keyboard pan and zoom (poll, direction only)', async ({ page }) => {
    await loadFixture(page);
    await page.evaluate(() => (document.querySelector('live2d-viewer') as HTMLElement).focus());
    const before = await page.evaluate(() => { const el = document.querySelector('live2d-viewer') as any; return { y: el.panY, s: el.scale }; });
    await page.keyboard.down('ArrowUp');
    // poll instead of fixed timeout - survives panSpeed changes at src/live2d-viewer.ts:1295 (10 * timeScale)
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).panY), { timeout: 3000 }).not.toBe(before.y);
    await page.keyboard.up('ArrowUp');
    // zoom direction only, not exact amount - survives zoomSpeed 0.05 at src/live2d-viewer.ts:1296
    const midScale = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale);
    await page.keyboard.down('Equal');
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale), { timeout: 3000 }).not.toBe(midScale);
    await page.keyboard.up('Equal');
    // release stops loop
    await page.waitForTimeout(100);
    const afterStop = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (document.querySelector('live2d-viewer') as any).scale)).toBe(afterStop);
  });

  test('camera inputs and reset', async ({ page }) => {
    await loadFixture(page);
    await page.evaluate(() => { const el = document.querySelector('live2d-viewer') as any; el.panX = 50; el.panY = -30; el.scale = 1.5; });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (document.querySelector('live2d-viewer') as any).panX)).toBe(50);
    await page.evaluate(() => {
      const el = document.querySelector('live2d-viewer') as any;
      (Array.from(el.shadowRoot.querySelectorAll('button')).find((b: any) => b.textContent.trim() === 'Reset') as HTMLElement)?.click();
    });
    await page.waitForTimeout(200);
    const vals = await page.evaluate(() => { const el = document.querySelector('live2d-viewer') as any; return { x: el.panX, y: el.panY, s: el.scale }; });
    expect(vals).toEqual({ x: 0, y: 0, s: 0.9 });
  });
});
