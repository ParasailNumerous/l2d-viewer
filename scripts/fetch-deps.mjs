#!/usr/bin/env node
// Fetches latest version of CDN scripts that cannot be installed via npm.
// - live2dcubismcore.min.js (Cubism SDK) -> public/live2dcubismcore.min.js
// For pixi.js, pixi-live2d-display, jszip the latest is managed via npm (see updateNpmDeps).

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CUBISM_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
const DEST = path.join(ROOT, "public/live2dcubismcore.min.js");

async function fetchCubismCore() {
  console.log(`[fetch-deps] Fetching ${CUBISM_URL} ...`);
  const res = await fetch(CUBISM_URL);
  if (!res.ok) throw new Error(`Failed to fetch cubismcore: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(DEST), { recursive: true });
  await writeFile(DEST, buf);
  console.log(`[fetch-deps] Saved ${DEST} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const shouldUpdateNpm = process.argv.includes("--update-npm");
  if (shouldUpdateNpm) {
    console.log("[fetch-deps] Updating npm deps to latest (pixi.js, pixi-live2d-display, jszip)...");
    const { spawnSync } = await import("node:child_process");
    const pm = existsSync(path.join(ROOT, "pnpm-lock.yaml")) ? "pnpm" : "npm";
    const args = pm === "pnpm"
      ? ["update", "pixi.js", "pixi-live2d-display", "jszip", "--latest"]
      : ["install", "pixi.js@latest", "pixi-live2d-display@latest", "jszip@latest"];
    const r = spawnSync(pm, args, { stdio: "inherit", cwd: ROOT });
    if (r.status !== 0) throw new Error(`${pm} update failed`);
  }

  await fetchCubismCore();
}

main().catch((e) => {
  console.error("[fetch-deps] Error:", e);
  process.exit(1);
});
