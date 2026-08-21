import { expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturePath = path.resolve(__dirname, 'fixtures/pacchivlnt.zip');

export async function gotoViewer(page: Page) {
  await page.goto('/');
  const viewer = page.locator('live2d-viewer');
  await expect(viewer).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector('live2d-viewer') as any;
    return el && el.shadowRoot?.querySelector('#viewport canvas');
  });
  return viewer;
}

export async function setInputFilesViaShadow(page: Page, filePath: string) {
  // #zipInput is inside open shadowRoot (src/live2d-viewer.ts:1609), so getByLabel won't find it.
  // Use evaluateHandle to get the actual <input> then call setInputFiles on it - same pattern
  // as your example: await page.getByLabel(...).setInputFiles(path) but via shadow piercing.
  const handle = await page.evaluateHandle(() => {
    const el = document.querySelector('live2d-viewer') as any;
    return el.shadowRoot.querySelector('#zipInput') as HTMLInputElement;
  });
  // handle is ElementHandle<HTMLInputElement>
  await (handle as any).setInputFiles(filePath);
  await handle.dispose();
}

export async function loadFixture(page: Page, filePath = fixturePath) {
  await gotoViewer(page);
  await setInputFilesViaShadow(page, filePath);
  await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).statusMsg), { timeout: 15000 }).toMatch(/Loaded|success/i);
}

export async function dispatchPinchZoom(page: Page, scaleFactor = 1.5) {
  // Simulate 2-finger pinch via pointer events on #viewport (src/live2d-viewer.ts:528)
  // Works on all browsers including mobile WebKit - no mouse.wheel needed.
  await page.evaluate((factor) => {
    const el = document.querySelector('live2d-viewer') as any;
    const vp = el.shadowRoot.querySelector('#viewport') as HTMLElement;
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
  await page.waitForTimeout(300);
}

export async function dispatchPointerPan(page: Page, dx: number, dy: number) {
  await page.evaluate(({ dx, dy }) => {
    const el = document.querySelector('live2d-viewer') as any;
    const vp = el.shadowRoot.querySelector('#viewport') as HTMLElement;
    const r = vp.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const mk = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', bubbles: true, isPrimary: true });
    vp.dispatchEvent(mk('pointerdown', x, y));
    vp.dispatchEvent(mk('pointermove', x + dx, y + dy));
    vp.dispatchEvent(mk('pointerup', x + dx, y + dy));
  }, { dx, dy });
  await page.waitForTimeout(200);
}

export async function dispatchWheelZoom(page: Page, deltaY: number) {
  // Desktop-only fallback via WheelEvent dispatch (avoids page.mouse.wheel)
  await page.evaluate((deltaY) => {
    const el = document.querySelector('live2d-viewer') as any;
    const vp = el.shadowRoot.querySelector('#viewport') as HTMLElement;
    vp.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
  }, deltaY);
  await page.waitForTimeout(300);
}
