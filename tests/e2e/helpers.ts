import { expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturePath = path.resolve(__dirname, 'fixtures/pacchivlnt.zip');

export async function gotoViewer(page: Page) {
  await page.goto('/');
  const viewer = page.getByTestId('viewer');
  await expect(viewer).toBeVisible();
  await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();
  return viewer;
}

export async function loadFixture(page: Page, filePath = fixturePath) {
  await gotoViewer(page);
  page.getByTestId('zip-input').setInputFiles(filePath);
  await expect(page.getByTestId('status')).toContainText(/Loaded|success/i, { timeout: 15000 });
}

export async function dispatchPinchZoom(page: Page, scaleFactor = 1.5) {
  await page.getByTestId('viewport').evaluate((vp, factor) => {
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dispatch = (type: string, id: number, x: number, y: number) => {
      const ev = new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: id === 1 });
      vp.dispatchEvent(ev);
    };
    const d0 = 60;
    const d1 = d0 * factor;
    // pointerdown two fingers
    dispatch('pointerdown', 1, cx - d0 / 2, cy);
    dispatch('pointerdown', 2, cx + d0 / 2, cy);
    // move apart
    dispatch('pointermove', 1, cx - d1 / 2, cy);
    dispatch('pointermove', 2, cx + d1 / 2, cy);
    // up
    dispatch('pointerup', 1, cx - d1 / 2, cy);
    dispatch('pointerup', 2, cx + d1 / 2, cy);
  }, scaleFactor);
}

export async function dispatchPointerPan(page: Page, dx: number, dy: number) {
  await page.getByTestId('viewport').evaluate((vp, { dx, dy }) => {
    const r = vp.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const mk = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', bubbles: true, isPrimary: true });
    vp.dispatchEvent(mk('pointerdown', x, y));
    vp.dispatchEvent(mk('pointermove', x + dx, y + dy));
    vp.dispatchEvent(mk('pointerup', x + dx, y + dy));
  }, { dx, dy });
}

export async function dispatchWheelZoom(page: Page, deltaY: number) {
  await page.getByTestId('viewport').evaluate((vp, deltaY) => {
    vp.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
  }, deltaY);
}
