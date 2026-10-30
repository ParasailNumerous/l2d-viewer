import { test, expect } from '@playwright/test';
import { gotoViewer, loadFixture, fixturePath } from './helpers';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { unzipSync, zipSync, strToU8 } from 'fflate';

import type { Live2DViewer } from '../../src/live2d-viewer';

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

  test('modelPath parameter loads file', async ({ page }) => {
    await gotoViewer(page);
    const viewer = page.getByTestId('viewer');
    await viewer.evaluate((el: Live2DViewer) => el.modelPath = 'https://cdn.jsdelivr.net/gh/ParasailNumerous/StellaSoraLive2Ds@unzipped/assets/Nazuna%2003/live2d/base/15603_base.model3.json');
    await expect(page.getByTestId('status')).toContainText(/Loaded/, { timeout: 15000 });
  });

  // THIS TEST IS A MESS TwT
  test('fixture exposes Base/Talent/Full groups', async ({ page }) => {
    const zip = unzipSync(new Uint8Array(fs.readFileSync(fixturePath)));
    const modelKey = Object.keys(zip).find((k) => k.endsWith('.model3.json'))!;
    const baseDir = modelKey.substring(0, modelKey.lastIndexOf('/') + 1);
    const rootPrefix = baseDir.split('live2d/')[0];
    const newZip: Record<string, Uint8Array> = {};

    // check each variant
    for (const variant of ['base', 'talent', 'full']) {
      const groupName = variant.charAt(0).toUpperCase() + variant.slice(1);
      for (const [p, data] of Object.entries(zip)) {
        if (!p.startsWith(baseDir)) continue;
        const rel = p.substring(baseDir.length);
        let buf = data;
        if (rel.endsWith('.model3.json')) {
          const json = JSON.parse(new TextDecoder().decode(data));
          const sourceMotions = json.FileReferences.Motions;
          const motions = sourceMotions[Object.keys(sourceMotions)[0]];
          // Keep the Talent variant's motion list distinct so the test can observe the switch.
          json.FileReferences.Motions = {
            [groupName]: variant === 'talent' ? motions.slice(0, 1) : motions,
          };
          buf = strToU8(JSON.stringify(json));
        }
        const targetRel = rel.replace('_base.model3.json', `_${variant}.model3.json`);
        newZip[`${rootPrefix}live2d/${variant}/${targetRel}`] = buf;
      }
    }

    const tmpFile = path.join(os.tmpdir(), `l2d-multi-variant-${process.pid}.zip`);
    fs.writeFileSync(tmpFile, Buffer.from(zipSync(newZip)));

    await gotoViewer(page);
    const viewer = page.getByTestId('viewer');
    await page.getByTestId('zip-input').setInputFiles(tmpFile);
    await expect(page.getByTestId('status')).toContainText(/Loaded/, { timeout: 15000 });
    const groups = await viewer.evaluate((el: Live2DViewer) => el.motionGroups);
    expect(groups).toEqual(['Base', 'Talent', 'Full']);

    const motionsBefore = await viewer.evaluate((el: Live2DViewer) => el.motions.length);
    await viewer.getByTestId('motion-group-collection').getByTestId('tile-btn').nth(1).click();
    await expect(page.getByTestId('status')).toContainText(/Loaded/, { timeout: 15000 });
    const selectedGroup = await viewer.evaluate((el: Live2DViewer) => el.selectedGroup);
    expect(selectedGroup).toBe('Talent');
    const motionsAfter = await viewer.evaluate((el: Live2DViewer) => el.motions.length);
    expect(motionsAfter).not.toBe(motionsBefore);
  });
});
