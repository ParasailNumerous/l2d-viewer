import { test, expect } from '@playwright/test';
import { gotoViewer, loadFixture, fixturePath } from './helpers';
import fs from 'fs';

import type { Live2DViewer } from '../src/live2d-viewer';

test.describe('Core logic', () => {
  test('fixture model loads', async ({ page }) => {
    await loadFixture(page);
  });

  test('import file via drag-and-drop', async ({ page }) => {
    await gotoViewer(page);
    const b64 = fs.readFileSync(fixturePath).toString('base64');
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate(async (el: Live2DViewer, b64: string) => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const file = new File([bin], 'pacchivlnt.zip');
      const dt = new DataTransfer(); dt.items.add(file);
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    }, b64);
    await expect.poll(async () => await viewer.evaluate((el: Live2DViewer) => el.isDragging)).toBe(true);
    await viewer.evaluate(async (el: Live2DViewer, b64: string) => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const file = new File([bin], 'pacchivlnt.zip');
      const dt = new DataTransfer(); dt.items.add(file);
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    }, b64);
    await expect(page.getByTestId('status')).toContainText(/Loaded/, { timeout: 15000 });
  });

  test('motions can be selected', async ({ page }) => {
    await loadFixture(page);
    const viewer = page.getByTestId('viewer');
    const motions = await viewer.evaluate((el: Live2DViewer) => el.motions);
    expect(motions.length).toBeGreaterThan(0);
    await viewer.getByTestId('motion-collection').getByTestId('tile-btn').nth(1).click();
    const selectedMotion = await viewer.evaluate((el: Live2DViewer) => el.selectedMotion);
    expect(Number.parseInt(selectedMotion)).toBe(1);
  });

  test('invalid archive doesn\'t load', async ({ page }) => {
    await gotoViewer(page);
    await page.getByTestId('zip-input').setInputFiles({ name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip') });
    await expect(page.getByTestId('status')).not.toContainText(/Loaded/);
    await page.getByTestId('zip-input').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.getByTestId('status')).not.toContainText(/Loaded/);
  });

  test('archiveFile parameter loads file', async ({ page }) => {
    await gotoViewer(page);
    await page.getByTestId('viewer').evaluate((el: Live2DViewer) => el.archivePath = "https://cdn.jsdelivr.net/gh/ParasailNumerous/l2d-viewer@0.1.2/tests/fixtures/pacchivlnt.zip");
    await expect(page.getByTestId('status')).toContainText(/Loaded/, { timeout: 15000 });
  });
});
