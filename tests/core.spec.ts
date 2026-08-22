import { test, expect } from '@playwright/test';
import { gotoViewer, loadFixture, setInputFilesViaShadow, fixturePath } from './helpers';
import fs from 'fs';
import path from 'path';
import os from 'os';

test.describe('P1 core journeys', () => {
  test('ZIP via input setInputFiles loads model', async ({ page }) => {
    // Mirrors your example: await page.getByLabel(...).setInputFiles(path.join(__dirname, 'myfile.pdf'))
    // but #zipInput is in shadowRoot (src/live2d-viewer.ts:1609), so we pierce via evaluateHandle
    await gotoViewer(page);
    await setInputFilesViaShadow(page, fixturePath);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).statusMsg), { timeout: 15000 }).toMatch(/Loaded/);
    const groups = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).motionGroups);
    expect(groups.length).toBeGreaterThan(0);
  });

  test('ZIP via drag-drop overlay', async ({ page }) => {
    await gotoViewer(page);
    const b64 = fs.readFileSync(fixturePath).toString('base64');
    await page.evaluate(async (b64) => {
      const el = document.querySelector('live2d-viewer') as any;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const file = new File([bin], 'pacchivlnt.zip');
      const dt = new DataTransfer(); dt.items.add(file);
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
    }, b64);
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).isDragging)).toBe(true);
    await page.evaluate(async (b64) => {
      const el = document.querySelector('live2d-viewer') as any;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const file = new File([bin], 'pacchivlnt.zip');
      const dt = new DataTransfer(); dt.items.add(file);
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    }, b64);
    await expect(page.locator('live2d-viewer').locator('footer')).toContainText(/Loaded/, { timeout: 15000 });
  });

  test('motion group and motion selection', async ({ page }) => {
    await loadFixture(page);
    const motions = await page.evaluate(() => (document.querySelector('live2d-viewer') as any).motions);
    expect(motions.length).toBeGreaterThan(0);
    await page.evaluate(() => {
      const el = document.querySelector('live2d-viewer') as any;
      const grid = el.shadowRoot.querySelectorAll('.control-group')[1]?.querySelectorAll('.tile-btn');
      if (grid?.length > 1) (grid[1] as HTMLElement).click();
    });
    await page.waitForTimeout(300);
  });

  test('invalid ZIP shows error', async ({ page }) => {
    await gotoViewer(page);
    // Upload buffer from memory - same shape as your example: { name, mimeType, buffer }
    const handle = await page.evaluateHandle(() => (document.querySelector('live2d-viewer') as any).shadowRoot.querySelector('#zipInput'));
    await (handle as any).setInputFiles({ name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip') });
    await handle.dispose();
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).statusMsg), { timeout: 5000 }).toMatch(/failed|ZIP load failed/i);
  });

  test('non-zip file is ignored', async ({ page }) => {
    await gotoViewer(page);
    const handle = await page.evaluateHandle(() => (document.querySelector('live2d-viewer') as any).shadowRoot.querySelector('#zipInput'));
    await (handle as any).setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await handle.dispose();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (document.querySelector('live2d-viewer') as any).statusMsg)).not.toMatch(/Loaded model successfully/);
  });

  test('archiveFile parameter loads file', async ({ page }) => {
    await gotoViewer(page);
    await page.evaluate(() => ((document.querySelector("live2d-viewer") as any).archivePath = "https://cdn.jsdelivr.net/gh/ParasailNumerous/l2d-viewer@0.1.2/tests/fixtures/pacchivlnt.zip"));
    await expect.poll(async () => await page.evaluate(() => (document.querySelector('live2d-viewer') as any).statusMsg), { timeout: 15000 }).toMatch(/Loaded/);
  });
});
