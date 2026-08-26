import { test, expect } from '@playwright/test';
import { loadFixture, dispatchPinchZoom, dispatchPointerPan, dispatchWheelZoom } from './helpers';

import type { Live2DViewer } from '../src/live2d-viewer';

test.describe('Viewport interactions', () => {
  test('diagonal up left pan', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    const before = await viewer.evaluate((el: Live2DViewer) => ({ x: el.panX, y: el.panY }));
    await dispatchPointerPan(page, 100, 100);
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panX)).toBeGreaterThan(before.x);
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panY)).toBeGreaterThan(before.y);
  });

  test('two pointer pinch zoom changes scale', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    const before = await viewer.evaluate((el: Live2DViewer) => el.scale);
    await dispatchPinchZoom(page, 1.8); // zoom in  
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeGreaterThan(before);
    await dispatchPinchZoom(page, 0.6); // zoom out
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeLessThan(before * 1.8);
  });

  test('mouse scroll wheel zoom changes scale', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' && test.info().project.name.includes('Mobile'), 'mouse wheel not supported on mobile WebKit - covered by pinch test');
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    const before = await viewer.evaluate((el: Live2DViewer) => el.scale);
    await dispatchWheelZoom(page, -200); // zoom in
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeGreaterThan(before);
    await dispatchWheelZoom(page, 400); // zoom out
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeLessThan(before * 1.5);
  });

  test('keyboard pan and zoom', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => el.focus());
    const before = await viewer.evaluate((el: Live2DViewer) => ({ x: el.panX, y: el.panY, s: el.scale }));

    await page.keyboard.down('KeyA');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panX)).toBeGreaterThan(before.x);
    await page.keyboard.up('KeyA');

    await page.keyboard.down('KeyD');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panX)).toBeLessThan(before.x);
    await page.keyboard.up('KeyD');

    await page.keyboard.down('KeyW');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panY)).toBeGreaterThan(before.y);
    await page.keyboard.up('KeyW');

    await page.keyboard.down('KeyS');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panY)).toBeLessThan(before.y);
    await page.keyboard.up('KeyS');

    await page.keyboard.down('Equal');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeGreaterThan(before.s);
    await page.keyboard.up('Equal');

    await page.keyboard.down('Minus');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.scale)).toBeLessThan(before.s);
    await page.keyboard.up('Minus');
  });

  test('keyboard pan arrow keys argument', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => {
      el.focus();
      el.enableArrowKeyPan = true;
    });
    const before = await viewer.evaluate((el: Live2DViewer) => ({ x: el.panX, y: el.panY, s: el.scale }));

    await page.keyboard.down('ArrowLeft');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panX)).toBeGreaterThan(before.x);
    await page.keyboard.up('ArrowLeft');

    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panX)).toBeLessThan(before.x);
    await page.keyboard.up('ArrowRight');

    await page.keyboard.down('ArrowUp');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panY)).toBeGreaterThan(before.y);
    await page.keyboard.up('ArrowUp');

    await page.keyboard.down('ArrowDown');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.panY)).toBeLessThan(before.y);
    await page.keyboard.up('ArrowDown');
  });

  test('camera inputs and reset', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => { el.panX = 50; el.panY = -30; el.scale = 1.5; });
    await viewer.getByTestId('reset-action').click();
    const vals = await viewer.evaluate((el: Live2DViewer) => ({ x: el.panX, y: el.panY, s: el.scale }));
    expect(vals).toEqual({ x: 0, y: 0, s: 0.9 });
  });

  test('fullscreen toggle via button', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => {
      // stub el.requestFullscreen
      el.requestFullscreen = function () {
        Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
    });
    // stub document.exitFullscreen
    await page.evaluate(() => {
      document.exitFullscreen = () => {
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
    });
    // This is done because there's the small screen and large screen action.
    // Ideally, we would test these seperately... but this works for now.
    const btn = viewer.getByTestId('fullscreen-action').last();
    await btn.click();
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.isFullscreen)).toBe(true);
    await btn.click();
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.isFullscreen)).toBe(false);
  });

  test('fullscreen toggle via keyboard shortcut', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => {
      el.focus();
      el.requestFullscreen = function () {
        Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
    });
    await page.evaluate(() => {
      document.exitFullscreen = () => {
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
    });
    await page.keyboard.press('F');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.isFullscreen)).toBe(true);
    await page.keyboard.press('F');
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.isFullscreen)).toBe(false);
  });
});
