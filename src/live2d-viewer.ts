import { LitElement, html, css, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Application, Graphics, extensions } from "pixi.js";
import { unzipSync } from "fflate";
import { Live2DModel, Live2DPlugin, MotionPriority } from "untitled-pixi-live2d-engine/cubism";

import preflight from './preflight.css?inline';

extensions.add(Live2DPlugin);

interface MotionItem {
  label: string;
  value: string;
}

interface ExpressionItem {
  name: string;
  value: string;
}

interface FrameBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExportDimensions {
  width: number;
  height: number;
}

interface TouchPoint {
  x: number;
  y: number;
}

@customElement("live2d-viewer")
export class Live2DViewer extends LitElement {
  @property({ type: String }) selectedModelPath: string = "";
  @property({ type: String }) archivePath?: string;
  @property({ type: Boolean }) disableImportFile: boolean = false;
  @property({ type: Array }) motionGroups: string[] = [];
  @property({ type: String }) selectedGroup: string = "";
  @property({ type: Array }) motions: MotionItem[] = [];
  @property({ type: String }) selectedMotion: string = "";
  @property({ type: Array }) expressions: ExpressionItem[] = [];
  @property({ type: String }) selectedExpression: string = "";
  @property({ type: Number }) scale: number = 0.9;
  @property({ type: String }) resolution: "device" | string = "device";
  @property({ type: String }) exportResolution: string = "viewport";
  @property({ type: Number }) customWidth: number = 1920;
  @property({ type: Number }) customHeight: number = 1080;
  @property({ type: Boolean }) showFramingPreview: boolean = true;
  @property({ type: Boolean }) mouseTracking: boolean = false;
  @property({ type: Boolean }) enableArrowKeyPan: boolean = false;
  @property({ type: String }) statusMsg: string = "";
  @property({ type: Boolean }) isDragging: boolean = false;
  @property({ type: Boolean }) isRecording: boolean = false;
  @property({ type: Boolean, reflect: true }) isFullscreen: boolean = false;
  @property({ type: Number }) panX: number = 0;
  @property({ type: Number }) panY: number = 0;

  private app: Application | null = null;
  private currentModel: InstanceType<typeof Live2DModel> | null = null;
  private currentModelJson: Record<string, unknown> & { FileReferences?: { Motions?: Record<string, { File?: string }[]>; Expressions?: { Name?: string; File?: string }[] } } | null = null;
  private lastModelSource: string | File[] | null = null;
  private overlayGraphics: Graphics | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private rootResizeObserver: ResizeObserver | null = null;
  private recordedChunks: Blob[] = [];
  private isPanning: boolean = false;
  private abortController: AbortController = new AbortController();

  private touchPointers: Map<number, TouchPoint> = new Map();
  private ignoredPointerIds: Set<number> = new Set();
  private initialPinchDist: number = 0;
  private initialScaleOnPinch: number = 0.9;
  private initialPinchMid: TouchPoint = { x: 0, y: 0 };
  private initialPanOnPinch: TouchPoint = { x: 0, y: 0 };

  private viewportPressedKeys: Set<string> = new Set();
  private viewportKeyAnimationFrame: number | null = null;
  private viewportKeyLastTime: number = 0;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [unsafeCSS(preflight), css`
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      user-select: none;
      contain: content;
      container-type: inline-size;

      --bg-color: oklch(0% 0 0);
      --fg-color: oklch(100% 0 0);
      --surface-color: oklch(70% 0 0);
      --primary-color: oklch(0.62 0.12 199.54);
      --primary-fg-color: oklch(1 0 0);
      --secondary-color: oklch(0.4203 0.1014 262.52);
      --secondary-fg-color: oklch(1 0 0);
      --small-screen-sheet-height: clamp(40%, 150px, 600px);
      --space: 4px;
      --hover-mix: 8%;
      --active-mix: 16%;

      accent-color: var(--primary-color);
      color-scheme: dark;
      background: var(--bg-color);
      color: var(--fg-color);
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }

    a {
      color: var(--primary-color);
      text-decoration: underline;
      text-underline-offset: 0.15em;
      @media (hover: hover) {
        &:hover {
          color: color-mix(in oklab, var(--primary-color), var(--fg-color) var(--hover-mix));
        }
      }
      &:active {
        color: color-mix(in oklab, var(--primary-color), var(--fg-color) var(--active-mix));
      }
    }

    kbd {
      min-width: 1.5em;
      padding: 0 0.25em;
      text-align: center;
      font-family: inherit;
      font-weight: 400;
      font-size: 0.8rem;
      line-height: 1.4;
      border: 1px solid color-mix(in oklab, currentColor 50%, transparent);
      border-bottom-width: 2px;
      border-radius: 4px;
      background: color-mix(in oklab, transparent, currentColor 10%);
      vertical-align: middle;
    }
    kbd, .keyboard-only {
      display: none;
    }
    @media (hover: hover) and (pointer: fine) {
      :host(:focus-within) {
        kbd, .keyboard-only {
          display: inline-block;
        }
      }
    }

    select, input[type="number"], button {
      --interactable-bg-color: transparent;
      background-color: var(--interactable-bg-color);
      border: 1px solid color-mix(in oklab, var(--fg-color) 50%, transparent);
      border-radius: 4px;
      min-width: 0;
      min-height: calc(var(--space) * 8);
      padding: 0 0.5rem;
      line-height: 1;
      text-align: start;
      &:where(:not(:disabled)) {
        @media (hover: hover) {
          &:hover {
            background: color-mix(in oklab, var(--interactable-bg-color), currentColor var(--hover-mix));
          }
        }
        &:active {
          background: color-mix(in oklab, var(--interactable-bg-color), currentColor var(--active-mix));
        }
      }
    }

    select option {
      background: var(--bg-color);
      color: inherit;
    }

    button {
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-custom {
      width: 1rem;
      height: 1rem;
      margin: 0;
      cursor: pointer;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space);
    }

    .cluster {
      display: flex;
      gap: var(--space);
      align-items: end;
    }

    .cluster--spread {
      align-items: center;
      justify-content: space-between;
    }

    .field {
      display: flex;
      min-width: 0;
      flex: 1;
      gap: var(--space);
    }

    .grid-underflow {
      display: grid;
      /* cap out at 2 columns but underflow to 1column */
      grid-template-columns: repeat(
        auto-fit,
        minmax(max(calc((100% - (var(--cols, 2) - 1) * var(--space)) / var(--cols, 2)), 9rem), 1fr)
      );
      gap: var(--space);
    }

    .grid-standard {
      display: grid;
      grid-template-columns: repeat(var(--cols, 2), 1fr);
      gap: var(--space);
    }

    .grid-2 {
      --cols: 2;
    }

    .grid-auto {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: var(--space);
    }

    .grid-span {
      grid-column: 1 / -1;
    }

    .section-label {
      font-weight: 500;
      &.section-label--spread {
        display: flex;
        flex-wrap: wrap;
        gap: 0 1rem;
        & .spacer {
          flex-grow: 1;
        }
      }
    }

    .credits {
      word-wrap: anywhere;
    }

    #viewport {
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
      &:focus-visible {
        outline: 1px dotted var(--primary-color);
        outline-offset: calc(var(--space) * -2);
      }
    }
    
    aside,
    #status {
      position: absolute;
      z-index: 10;
      background: color-mix(in oklab, var(--bg-color) 60%, transparent);
      backdrop-filter: blur(4px);
    }

    aside {
      top: 0;
      left: 0;
      width: 24rem;
      min-width: 14rem;
      resize: horizontal;
      max-width: calc(100% - calc(var(--space) * 8));
      max-height: calc(100% - calc(var(--space) * 8));
      padding: var(--space);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space);
    }

    #status {
      right: 0;
      top: 0;
    }

    .panel {
      padding: var(--space);
      border-radius: 4px;
      background: color-mix(in oklab, var(--surface-color) 20%, transparent);
      display: flex;
      flex-direction: column;
      gap: var(--space);
    }
    .tile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
      max-height: 24rem;
      overflow-y: auto;
    }

    .tile-btn {
      border: none;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: calc(var(--space) * 8);
      display: block;
      position: relative;
      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      &.active {
        --interactable-bg-color: var(--secondary-color);
        color: var(--secondary-fg-color);
      }
    }

    .empty-state {
      grid-column: 1 / -1;
      font-size: 0.8rem;
      opacity: 0.5;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      .field {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .field--start, .field--end {
        width: 1rem;
        svg {
          width: 1rem;
          height: 1rem;
          display: block;
        }
      }
      .field--start {
        inset-inline-start: 0.5rem;
      }
      .field--end {
        inset-inline-end: 0.5rem;
      }
      &:has(.field--start) input {
        padding-inline-start: 2rem;
      }
      &:has(.field--end) input {
        padding-inline-end: 2rem;
      }
    }

    .drop-btn {
      background: var(--primary-color);
      color: var(--primary-fg-color);
      border: none;
      &:not(:disabled) {
        @media (hover: hover) {
          &:hover {
            background: color-mix(in oklab, var(--primary-color), currentColor var(--hover-mix));
          }
        }
        &:active {
          background: color-mix(in oklab, var(--primary-color), currentColor var(--active-mix));
        }
      }
    }

    .fullscreen-action {
      --interactable-bg-color: color-mix(in oklab, var(--bg-color) 60%, transparent);
      position: absolute;
      padding: calc(var(--space) * 2);
      backdrop-filter: blur(4px);
      inset-inline-end: calc(var(--space) * 2);
      inset-block-end: calc(var(--space) * 2);
    }

    /* WebKit workaround */
    #zipInput {
      position: absolute;
      top: 0;
      left: -100%;
    }

    .small-screen-actions {
      display: none;
    }

    .drop-overlay {
      position: absolute;
      inset: 0;
      z-index: 20;
      background: color-mix(in oklab, var(--bg-color) 80%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      pointer-events: none;
    }

    .small-screen-actions-container {
      position: absolute;
      display: none;
      justify-content: space-between;
      flex-wrap: wrap;
      z-index: 11;
      inset-inline: calc(var(--space) * 2);
      gap: calc(var(--space) * 2);
      bottom: calc(var(--small-screen-sheet-height) + calc(var(--space) * 1));
      pointer-events: none;
    }
    .small-screen-actions {
      display: flex;
      gap: var(--space);
    }
    .small-screen-actions button {
      --interactable-bg-color: color-mix(in oklab, var(--bg-color) 60%, transparent);
      pointer-events: auto;
      backdrop-filter: blur(4px);
      padding: 0 0.75rem;
      min-height: 44px;
      border-radius: 0.25rem;
      &.drop-btn {
        --interactable-bg-color: var(--primary-color);
        border: none;
      }
    }

    @container (width < 768px) {
      aside {
        inset: 0;
        top: auto;
        resize: none;
        width: 100% !important;
        min-width: auto;
        max-width: none;
        height: var(--small-screen-sheet-height);
        padding: calc(var(--space) * 2) calc(var(--space) * 2) max(calc(var(--space) * 2), env(safe-area-inset-bottom));
        border-radius: 12px 12px 0 0;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: calc(var(--space) * 2);
        border: 1px solid color-mix(in oklab, var(--fg-color) 12%, transparent);
        background: color-mix(in oklab, var(--bg-color) 75%, transparent);
        backdrop-filter: blur(4px);
      }
      .small-screen-actions-container {
        display: flex;
      }
      .small-screen-hidden {
        display: none;
      }
    }

    :host(:fullscreen) {
      width: 100vw;
      height: 100vh;
    }

    [hidden] {
      display: none !important;
    }
  `];

  override connectedCallback(): void {
    super.connectedCallback();
    const wasAborted = this.abortController.signal.aborted;
    if (wasAborted) {
      this.abortController = new AbortController();
      this.setupDragAndDrop();
      this.setupPanListeners();
      this.setupZoomListeners();
      this.setupKeyboardShortcuts();
    }
    // WebGL context needs to be recreated
    // Events can stay
    // PIXI needs to be recreated because it is torn down on disconnect
    this.updateComplete.then(() => {
      if (!this.app) this.initPixi();
      if (this.lastModelSource && !this.currentModel && this.app) {
        void this.loadModelSource(this.lastModelSource);
      } else if (this.currentModel && this.app) {
        try { this.app.stage.addChild(this.currentModel); } catch { }
        this.fitModel();
      }
    });
  }

  override firstUpdated(): void {
    this.initPixi();
    this.setupDragAndDrop();
    this.setupPanListeners();
    this.setupZoomListeners();
    this.setupKeyboardShortcuts();
    this.setupFullscreenListeners();
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("archivePath")) {
      this.processArchivePath();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.viewportPressedKeys.clear();
    this.stopKeyLoop();
    this.abortController.abort();
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== "inactive") this.mediaRecorder.stop();
      } catch { }
      try {
        // stop captureStream tracks to release canvas capture
        const stream = this.mediaRecorder.stream;
        stream.getTracks().forEach((t) => t.stop());
      } catch { }
      this.mediaRecorder = null;
      this.isRecording = false;
    }
    this.destroyPixi();
  }

  private ensureApp(): boolean {
    if (this.app) return true;
    this.initPixi();
    return !!this.app;
  }

  private destroyPixi(): void {
    if (this.rootResizeObserver) {
      this.rootResizeObserver.disconnect();
      this.rootResizeObserver = null;
    }
    if (this.currentModel) {
      // This fails because modelCount === 0?
      // Not sure if it leaks, debug later
      this.app?.stage.removeChild(this.currentModel);
      this.currentModel.destroy({ children: true });
      this.currentModel = null;
    }
    if (this.overlayGraphics) {
      this.overlayGraphics.destroy({ children: true });
      this.overlayGraphics = null;
    }
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
    this.touchPointers.clear();
    this.ignoredPointerIds.clear();
    this.initialPinchDist = 0;
    this.isPanning = false;
  }

  private async initPixi(): Promise<void> {
    if (this.app) return;
    const container = this.shadowRoot?.querySelector("#viewport");
    if (!container) return;

    this.app = new Application();
    await this.app.init({
      resizeTo: this,
      resolution: this.getResolutionValue(),
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      preserveDrawingBuffer: true,
    })

    container.appendChild(this.app.canvas);

    this.rootResizeObserver = new ResizeObserver(() => {
      this.resizeRenderer();
    });

    this.rootResizeObserver.observe(this);
  }

  private setupPanListeners(): void {
    const container = this.shadowRoot?.querySelector("#viewport");
    if (!container) return;

    let startX = 0,
      startY = 0,
      initialPanX = 0,
      initialPanY = 0;

    container.addEventListener("pointerdown", (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.button !== 0 && pe.pointerType === "mouse") return;
      if (this.ignoredPointerIds.has(pe.pointerId)) return;
      if (this.touchPointers.size >= 2) {
        this.ignoredPointerIds.add(pe.pointerId);
        return;
      }
      this.touchPointers.set(pe.pointerId, { x: pe.clientX, y: pe.clientY });

      if (this.touchPointers.size === 1) {
        this.isPanning = true;
        startX = pe.clientX;
        startY = pe.clientY;
        initialPanX = this.panX;
        initialPanY = this.panY;
      } else if (this.touchPointers.size === 2) {
        const pts = Array.from(this.touchPointers.values());
        this.initialPinchDist = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
        this.initialScaleOnPinch = this.scale;
        this.initialPinchMid = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        this.initialPanOnPinch = { x: this.panX, y: this.panY };
        this.isPanning = true;
        startX = this.initialPinchMid.x;
        startY = this.initialPinchMid.y;
        initialPanX = this.panX;
        initialPanY = this.panY;
      }
      try {
        container.setPointerCapture(pe.pointerId);
      } catch { }
    }, { signal: this.abortController.signal });

    container.addEventListener("pointermove", (e: Event) => {
      const pe = e as PointerEvent;
      if (this.ignoredPointerIds.has(pe.pointerId)) return;
      if (!this.touchPointers.has(pe.pointerId)) return;
      this.touchPointers.set(pe.pointerId, {
        x: pe.clientX,
        y: pe.clientY,
      });

      if (this.touchPointers.size === 2) {
        const pts = Array.from(this.touchPointers.values());
        const currentDist = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
        const currentMid = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        if (this.initialPinchDist > 0) {
          const rawScale = this.initialScaleOnPinch * (currentDist / this.initialPinchDist);
          const newScale = Math.min(
            40,
            Math.max(0.1, Number(rawScale.toFixed(3)))
          );
          const ratio = newScale / this.initialScaleOnPinch;
          this.scale = newScale;

          const frame = this.getFrameBounds();
          const frameCx = frame.x + frame.width / 2;
          const frameCy = frame.y + frame.height / 2;
          const initialCx = frameCx + this.initialPanOnPinch.x;
          const initialCy = frameCy + this.initialPanOnPinch.y;

          // Pan so zoom is anchored at initialPinchMid, plus follow finger drag
          this.panX = Math.round(
            this.initialPanOnPinch.x +
            (currentMid.x - this.initialPinchMid.x) +
            (this.initialPinchMid.x - initialCx) * (1 - ratio)
          );
          this.panY = Math.round(
            this.initialPanOnPinch.y +
            (currentMid.y - this.initialPinchMid.y) +
            (this.initialPinchMid.y - initialCy) * (1 - ratio)
          );
        } else {
          this.panX = Math.round(
            this.initialPanOnPinch.x +
            (currentMid.x - this.initialPinchMid.x)
          );
          this.panY = Math.round(
            this.initialPanOnPinch.y +
            (currentMid.y - this.initialPinchMid.y)
          );
        }
        this.updateView();
        return;
      }

      if (!this.isPanning) return;
      this.panX = Math.round(initialPanX + (pe.clientX - startX));
      this.panY = Math.round(initialPanY + (pe.clientY - startY));
      this.updateView();
    }, { signal: this.abortController.signal });

    const stopPointer = (e: Event) => {
      const pe = e as PointerEvent;
      if (this.ignoredPointerIds.has(pe.pointerId)) {
        this.ignoredPointerIds.delete(pe.pointerId);
        try { container.releasePointerCapture(pe.pointerId); } catch { }
        return;
      }
      this.touchPointers.delete(pe.pointerId);
      if (this.touchPointers.size < 2) this.initialPinchDist = 0;
      if (this.touchPointers.size === 1) {
        // Re-anchor single-finger pan to remaining finger to avoid jump
        const remaining = Array.from(this.touchPointers.values())[0];
        startX = remaining.x;
        startY = remaining.y;
        initialPanX = this.panX;
        initialPanY = this.panY;
        this.isPanning = true;
      }
      if (this.touchPointers.size === 0) this.isPanning = false;
      try {
        container.releasePointerCapture(pe.pointerId);
      } catch { }
    };

    container.addEventListener("pointerup", stopPointer, { signal: this.abortController.signal });
    container.addEventListener("pointercancel", stopPointer, { signal: this.abortController.signal });
  }

  private setupZoomListeners(): void {
    const container = this.shadowRoot?.querySelector("#viewport");
    if (!container) return;

    container.addEventListener(
      "wheel",
      (e: Event) => {
        const we = e as WheelEvent;
        we.preventDefault();
        const rect = this.getBoundingClientRect();
        const cursorX = we.clientX - rect.left;
        const cursorY = we.clientY - rect.top;
        const frame = this.getFrameBounds();
        const oldScale = this.scale;

        let deltaY = we.deltaY;
        if (we.deltaMode === 1) deltaY *= 16;
        else if (we.deltaMode === 2) deltaY *= 400;

        const zoomSpeed = 0.001;
        let newScale = oldScale * Math.exp(-deltaY * zoomSpeed);
        newScale = Math.min(40, Math.max(0.1, newScale));
        newScale = Number(newScale.toFixed(3));
        if (newScale === oldScale) return;

        const ratio = newScale / oldScale;
        const cx = frame.x + frame.width / 2 + this.panX;
        const cy = frame.y + frame.height / 2 + this.panY;
        this.panX = Math.round(this.panX + (cursorX - cx) * (1 - ratio));
        this.panY = Math.round(this.panY + (cursorY - cy) * (1 - ratio));
        this.scale = newScale;
        this.updateView();
      },
      { passive: false, signal: this.abortController.signal }
    );
  }

  private setupFullscreenListeners(): void {
    const handler = () => {
      this.isFullscreen = !!document.fullscreenElement && document.fullscreenElement === this;
    };
    document.addEventListener("fullscreenchange", handler, { signal: this.abortController.signal });
    document.addEventListener("fullscreenerror", handler, { signal: this.abortController.signal });
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await this.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.statusMsg = `Fullscreen failed: ${msg}`;
    }
  }

  private setupKeyboardShortcuts(): void {
    this.addEventListener("keydown", (e: KeyboardEvent) => this.handleViewportKeydown(e), { signal: this.abortController.signal });
    this.addEventListener("keyup", (e: KeyboardEvent) => this.handleViewportKeyup(e), { signal: this.abortController.signal });
    window.addEventListener("keyup", (e: KeyboardEvent) => this.handleViewportKeyup(e), { signal: this.abortController.signal });
    window.addEventListener("blur", () => this.handleViewportBlur(), { signal: this.abortController.signal });
    this.addEventListener("blur", () => this.handleViewportBlur(), { signal: this.abortController.signal });
    this.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = this.shadowRoot!.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (this.shadowRoot!.activeElement as HTMLElement | null)?.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();
      if (key === "i") {
        if (this.disableImportFile) return;
        e.preventDefault();
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click();
      } else if (key === "r") {
        e.preventDefault();
        this.toggleRecording();
      } else if (key === "e") {
        e.preventDefault();
        this.captureScreenshot();
      } else if (key === "f") {
        e.preventDefault();
        this.toggleFullscreen();
      }
    }, { signal: this.abortController.signal });
  }

  private updateView(): void {
    if (this.isRecording) {
      const target = this.getExportDimensions();
      this.renderModelForExport(target.width, target.height);
    } else {
      this.fitModel();
    }
  }

  private resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.scale = 0.9;
    this.fitModel();
  }

  private getResolutionValue(): number {
    return this.resolution === "device"
      ? Math.max(1, window.devicePixelRatio || 1)
      : Number.parseFloat(this.resolution) || 1;
  }

  private isSmallScreen(): boolean {
    return this.clientWidth < 768;
  }

  private getSmallScreenSheetHeightPx(): number {
    const raw =
      getComputedStyle(this)
        .getPropertyValue("--small-screen-sheet-height")
        .trim() || "40%";
    if (raw.endsWith("vh")) return Math.round((parseFloat(raw) / 100) * this.clientHeight);
    if (raw.endsWith("px")) return Math.round(parseFloat(raw));
    if (raw.endsWith("dvh") || raw.endsWith("svh") || raw.endsWith("lvh"))
      return Math.round((parseFloat(raw) / 100) * this.clientHeight);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.round(n) : Math.round(this.clientHeight * 40 / 100);
  }

  private getVisibleViewportHeight(): number {
    if (this.isSmallScreen()) {
      return Math.max(0, this.clientHeight - this.getSmallScreenSheetHeightPx());
    }
    return this.clientHeight;
  }

  private getExportDimensions(): ExportDimensions {
    if (this.exportResolution === "720p")
      return { width: 1280, height: 720 };
    if (this.exportResolution === "1080p")
      return { width: 1920, height: 1080 };
    if (this.exportResolution === "4k")
      return { width: 3840, height: 2160 };
    if (this.exportResolution === "custom")
      return {
        width: Math.max(100, this.customWidth || 1920),
        height: Math.max(100, this.customHeight || 1080),
      };
    if (this.isSmallScreen()) {
      return { width: this.clientWidth, height: this.getVisibleViewportHeight() };
    }
    return { width: this.clientWidth, height: this.clientHeight };
  }

  private getFrameBounds(): FrameBounds {
    const vw = this.clientWidth,
      vh = this.isSmallScreen()
        ? this.getVisibleViewportHeight()
        : this.clientHeight;
    if (this.exportResolution === "viewport")
      return { x: 0, y: 0, width: vw, height: vh };

    const target = this.getExportDimensions();
    const targetAR = target.width / target.height,
      viewportAR = vw / vh;
    let frameW = vw,
      frameH = vh;

    if (viewportAR > targetAR) frameW = vh * targetAR;
    else frameH = vw / targetAR;

    return {
      x: (vw - frameW) / 2,
      y: (vh - frameH) / 2,
      width: frameW,
      height: frameH,
    };
  }

  private updateFramingOverlay(): void {
    if (!this.app) return;
    if (!this.overlayGraphics) {
      this.overlayGraphics = new Graphics();
      this.app.stage.addChild(this.overlayGraphics);
    }

    this.app.stage.setChildIndex(
      this.overlayGraphics,
      this.app.stage.children.length - 1
    );
    this.overlayGraphics!.clear();

    if (
      !this.showFramingPreview ||
      this.exportResolution === "viewport" ||
      this.isRecording
    )
      return;

    const frame = this.getFrameBounds(),
      vw = this.clientWidth,
      vh = this.isSmallScreen() ? this.getVisibleViewportHeight() : this.clientHeight;

    this.overlayGraphics!.beginFill(0x000000, 0.55);
    if (frame.y > 0) this.overlayGraphics!.drawRect(0, 0, vw, frame.y);
    if (frame.y + frame.height < vh)
      this.overlayGraphics!.drawRect(
        0,
        frame.y + frame.height,
        vw,
        vh - (frame.y + frame.height)
      );
    if (frame.x > 0)
      this.overlayGraphics!.drawRect(0, frame.y, frame.x, frame.height);
    if (frame.x + frame.width < vw)
      this.overlayGraphics!.drawRect(
        frame.x + frame.width,
        frame.y,
        vw - (frame.x + frame.width),
        frame.height
      );
    this.overlayGraphics!.endFill();

    this.overlayGraphics!.lineStyle(2, 0x10cfcc, 0.9);
    this.overlayGraphics!.drawRect(
      frame.x,
      frame.y,
      frame.width,
      frame.height
    );
  }

  private fitModel(): void {
    if (!this.currentModel) return;
    this.currentModel.scale.set(1);
    const bounds = this.currentModel.getLocalBounds();
    this.currentModel.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );

    const frame = this.getFrameBounds();
    const scaleRatio =
      Math.min(frame.width / bounds.width, frame.height / bounds.height) *
      this.scale;

    this.currentModel.scale.set(scaleRatio);
    this.currentModel.position.set(
      frame.x + frame.width / 2 + this.panX,
      frame.y + frame.height / 2 + this.panY
    );
    this.updateFramingOverlay();
  }

  private renderModelForExport(exportW: number, exportH: number): void {
    if (!this.currentModel) return;
    const frame = this.getFrameBounds();
    const scaleMultiplier = exportH / frame.height;

    this.currentModel.scale.set(1);
    const bounds = this.currentModel.getLocalBounds();
    this.currentModel.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );

    const baseScaleRatio =
      Math.min(frame.width / bounds.width, frame.height / bounds.height) *
      this.scale;
    this.currentModel.scale.set(baseScaleRatio * scaleMultiplier);
    this.currentModel.position.set(
      exportW / 2 + this.panX * scaleMultiplier,
      exportH / 2 + this.panY * scaleMultiplier
    );
  }

  async captureScreenshot(): Promise<void> {
    if (!this.app || !this.currentModel) return;
    const target = this.getExportDimensions();
    const origW = this.clientWidth,
      origH = this.clientHeight,
      origRes = this.app.renderer.resolution;

    if (this.overlayGraphics) this.overlayGraphics!.visible = false;

    this.app.renderer.resolution = 1;
    this.app.renderer.resize(target.width, target.height);
    this.renderModelForExport(target.width, target.height);
    this.app.render();

    const link = document.createElement("a");
    link.download = `live2d-snapshot-${target.width}x${target.height}-${Date.now()}.png`;
    link.href = this.app.canvas.toDataURL("image/png");
    link.click();

    this.app.renderer.resolution = origRes;
    this.app.renderer.resize(origW, origH);
    if (this.overlayGraphics) this.overlayGraphics!.visible = true;
    this.fitModel();

    this.statusMsg = `Saved screenshot (${target.width}x${target.height})`;
  }

  toggleRecording(): void {
    if (this.isRecording) {
      if (this.mediaRecorder) this.mediaRecorder.stop();
      this.isRecording = false;
    } else {
      this.startRecording();
    }
  }

  startRecording(): void {
    if (!this.app || !this.currentModel) return;

    const target = this.getExportDimensions();
    if (this.overlayGraphics) this.overlayGraphics!.visible = false;

    this.app.renderer.resolution = 1;
    this.app.renderer.resize(target.width, target.height);
    this.renderModelForExport(target.width, target.height);

    this.recordedChunks = [];
    let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(
      this.app.canvas.captureStream(60),
      { mimeType }
    );
    this.mediaRecorder.addEventListener("dataavailable", (e: BlobEvent) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    }, { signal: this.abortController.signal });
    this.mediaRecorder.addEventListener("stop", () => {
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `live2d-recording-${target.width}x${target.height}-${Date.now()}.webm`;
      a.click();

      this.app!.renderer.resolution = this.getResolutionValue();
      this.app!.renderer.resize(this.clientWidth, this.clientHeight);
      if (this.overlayGraphics) this.overlayGraphics!.visible = true;
      this.fitModel();
      this.statusMsg = "Video export complete!";
    }, { signal: this.abortController.signal });

    this.abortController.signal.addEventListener("abort", () => {
      try { if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") this.mediaRecorder.stop(); } catch { }
      try { this.mediaRecorder!.stream.getTracks().forEach((tr) => tr.stop()); } catch { }
      this.mediaRecorder = null;
      this.isRecording = false;
    }, { once: true, signal: this.abortController.signal });
    this.mediaRecorder.start();
    this.isRecording = true;
    this.statusMsg = `Recording video (${target.width}x${target.height})...`;
  }

  async loadModelSource(source: string | File[]): Promise<void> {
    this.lastModelSource = source;
    if (typeof source === "string") this.selectedModelPath = source;
    this.statusMsg = `Loading model...`;

    if (!this.ensureApp()) {
      this.statusMsg = `Load failed: renderer not initialized`;
      return;
    }

    if (this.currentModel) {
      try { this.app!.stage.removeChild(this.currentModel!); } catch { }
      this.currentModel.destroy({ children: true });
      this.currentModel = null;
    }

    try {
      if (typeof source === "string") {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.currentModelJson = await res.json();
        this.populateMotionsAndExpressions();
        this.currentModel = await Live2DModel.from(source, {
          autoHitTest: this.mouseTracking,
          autoFocus: this.mouseTracking,
        });
      } else if (Array.isArray(source)) {
        const modelFile = source.find(
          (f) =>
            f.name.endsWith(".model3.json") ||
            f.name.endsWith(".model.json")
        );
        if (!modelFile) throw new Error("No model settings file found!");
        this.currentModelJson = JSON.parse(await modelFile.text());
        this.populateMotionsAndExpressions();
        this.currentModel = await Live2DModel.from(source, {
          autoHitTest: this.mouseTracking,
          autoFocus: this.mouseTracking,
        });
      }

      if (!this.app) throw new Error("PIXI app not initialized");
      this.app.stage.addChild(this.currentModel!);
      this.fitModel();
      this.playMotion();
      this.statusMsg = `Loaded model successfully!`;
    } catch (err: any) {
      console.error(err);
      this.statusMsg = `Load failed: ${err.message || err}`;
    }
  }

  private populateMotionsAndExpressions(): void {
    const fileRefs = this.currentModelJson?.FileReferences || {};

    this.motionGroups = Object.keys(fileRefs.Motions || {});
    this.selectedGroup = this.motionGroups[0] || "";
    this.updateMotionList();

    this.expressions = (fileRefs.Expressions || []).map((e: any, idx: number) => ({
      name:
        e.Name ||
        (e.File
          ? e.File.split("/").pop()!.replace(".exp3.json", "")
          : `Expr ${idx}`),
      value: String(idx),
    }));
    this.selectedExpression = this.expressions[0]?.value || "";
  }

  private updateMotionList(): void {
    const groupItems =
      (this.currentModelJson?.FileReferences?.Motions || {})[
      this.selectedGroup
      ] || [];
    this.motions = groupItems.map((m: any, idx: number) => ({
      label: m.File
        ? m.File.split("/").pop()!.replace(".motion3.json", "")
        : `Motion ${idx}`,
      value: String(idx),
    }));
    this.selectedMotion = this.motions[0]?.value || "";
  }

  private playMotion(): void {
    if (!this.currentModel || !this.selectedGroup || !this.selectedMotion)
      return;
    const index = Number.parseInt(this.selectedMotion, 10);
    if (!Number.isNaN(index))
      this.currentModel.motion(
        this.selectedGroup,
        index,
        MotionPriority.FORCE
      );
  }

  private playExpression(): void {
    if (!this.currentModel || !this.selectedExpression) return;
    const index = Number.parseInt(this.selectedExpression, 10);
    if (!Number.isNaN(index)) this.currentModel.expression(index);
  }

  private resizeRenderer(): void {
    if (!this.app || this.isRecording) return;
    this.app.renderer.resolution = this.getResolutionValue();
    this.app.renderer.resize(this.clientWidth, this.clientHeight);
    this.fitModel();
  }

  private setupDragAndDrop(): void {
    this.addEventListener("dragover", (e: DragEvent) => {
      if (this.disableImportFile) return;
      e.preventDefault();
      this.isDragging = true;
    }, { signal: this.abortController.signal });
    this.addEventListener("dragleave", (e: DragEvent) => {
      if (this.disableImportFile) return;
      if (!this.contains(e.relatedTarget as Node)) this.isDragging = false;
    }, { signal: this.abortController.signal });
    this.addEventListener("drop", async (e: DragEvent) => {
      if (this.disableImportFile) return;
      e.preventDefault();
      this.isDragging = false;
      const files = e.dataTransfer?.files;
      if (files && files.length) await this.processArchiveFile(files[0]);
    }, { signal: this.abortController.signal });
  }

  async processArchiveFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith(".zip")) return;
    this.statusMsg = `Extracting ZIP: ${file.name}...`;
    try {
      const archiveBuffer = await file.arrayBuffer()
      const data = new Uint8Array(archiveBuffer);
      const zip = unzipSync(data);

      // { 'nested/directory/structure.txt': Uint8Array(2) [97, 97] }
      const modelKey = Object.keys(zip).find((k) => k.endsWith(".model3.json") || k.endsWith(".model.json"))
      if (!modelKey)
        throw new Error("No .model3.json or .model.json found in ZIP!");

      const lastSlashIndex = modelKey.lastIndexOf("/");
      const baseDir = lastSlashIndex >= 0 ? modelKey.substring(0, lastSlashIndex + 1) : "";
      const normalizedFiles: File[] = [];

      for (const [path, entry] of Object.entries(zip)) {
        if (!path.startsWith(baseDir)) continue;
        if (entry.length === 0) continue;
        const relativePath = path.substring(baseDir.length);
        const fileObj = new File([entry], relativePath);
        // stub for other code
        Object.defineProperty(fileObj, "webkitRelativePath", {
          value: relativePath,
          writable: false
        })
        normalizedFiles.push(fileObj);
      }

      await this.loadModelSource(normalizedFiles);
    } catch (err: any) {
      this.statusMsg = `ZIP load failed: ${err.message || err}`;
    }
  }

  async processArchivePath(): Promise<void> {
    if (!this.archivePath) return;
    try {
      this.statusMsg = `Fetching archive: ${this.archivePath}...`;
      const response = await fetch(this.archivePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      let filename = "archive.zip";
      try {
        const url = new URL(this.archivePath, window.location.href);
        const last = url.pathname.split("/").pop();
        if (last?.toLowerCase().endsWith(".zip")) filename = last;
      } catch { }
      const file = new File([blob], filename);
      await this.processArchiveFile(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      this.statusMsg = `Archive load failed: ${msg}`;
    }
  }

  private handleTileKeydown<T>(
    e: KeyboardEvent,
    items: T[],
    selectedValue: string,
    onSelect: (val: string) => void,
    getValue?: (item: T) => string
  ): void {
    const target = e.currentTarget as HTMLElement;
    const cols = Math.max(
      1,
      Math.floor(target.offsetWidth / 100)
    );
    const vals = items.map((i) => (getValue ? getValue(i) : (i as unknown as string)));
    const idx = vals.indexOf(selectedValue);
    if (idx === -1) return;
    let next = idx;
    if (e.key === "ArrowRight") next = Math.min(vals.length - 1, idx + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown")
      next = Math.min(vals.length - 1, idx + cols);
    else if (e.key === "ArrowUp") next = Math.max(0, idx - cols);
    else return;
    e.preventDefault();
    onSelect(vals[next]);
    this.updateComplete.then(() => {
      const btns = target.querySelectorAll<HTMLButtonElement>(".tile-btn");
      btns[next]?.focus();
    });
  }

  private isViewportControlKey(code: string): boolean {
    return (
      (this.enableArrowKeyPan && (code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight")) ||
      code === "KeyW" ||
      code === "KeyA" ||
      code === "KeyS" ||
      code === "KeyD" ||
      code === "Minus" ||
      code === "Equal" ||
      code === "NumpadSubtract" ||
      code === "NumpadAdd"
    );
  }

  private handleViewportKeydown(e: KeyboardEvent): void {
    if (!this.isViewportControlKey(e.code)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = this.shadowRoot!.activeElement?.tagName;
    const isTyping =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      (this.shadowRoot!.activeElement as HTMLElement | null)?.isContentEditable;
    if (isTyping) return;
    e.preventDefault();
    const isFirstPress = !this.viewportPressedKeys.has(e.code);
    this.viewportPressedKeys.add(e.code);
    if (isFirstPress && this.viewportPressedKeys.size === 1) {
      this.tickPressedKeys();
    }
    if (this.viewportKeyAnimationFrame === null) {
      this.startKeyLoop();
    }
  }

  private handleViewportKeyup(e: KeyboardEvent): void {
    if (!this.viewportPressedKeys.has(e.code)) return;
    this.viewportPressedKeys.delete(e.code);
    if (this.viewportPressedKeys.size === 0) {
      this.stopKeyLoop();
    }
  }

  private handleViewportBlur(): void {
    if (this.viewportPressedKeys.size === 0) return;
    this.viewportPressedKeys.clear();
    this.stopKeyLoop();
  }

  private startKeyLoop(): void {
    if (this.viewportKeyAnimationFrame !== null) return;
    this.viewportKeyLastTime = performance.now();
    const loop = (_now: number) => {
      this.viewportKeyAnimationFrame = window.requestAnimationFrame((t) => {
        const dt = t - this.viewportKeyLastTime;
        this.viewportKeyLastTime = t;
        this.tickPressedKeys(dt);
        if (this.viewportPressedKeys.size > 0) {
          loop(t);
        } else {
          this.viewportKeyAnimationFrame = null;
        }
      });
    };
    this.viewportKeyAnimationFrame = window.requestAnimationFrame((t) => {
      this.viewportKeyLastTime = t;
      this.tickPressedKeys(0);
      if (this.viewportPressedKeys.size > 0) loop(t);
      else this.viewportKeyAnimationFrame = null;
    });
  }

  private stopKeyLoop(): void {
    if (this.viewportKeyAnimationFrame !== null) {
      cancelAnimationFrame(this.viewportKeyAnimationFrame);
      this.viewportKeyAnimationFrame = null;
    }
  }

  private tickPressedKeys(dt: number = 16.6): void {
    if (this.viewportPressedKeys.size === 0) return;
    let deltaX = 0;
    let deltaY = 0;
    let deltaZ = 0;
    if (this.enableArrowKeyPan) {
      if (this.viewportPressedKeys.has("ArrowUp")) deltaY += 1;
      if (this.viewportPressedKeys.has("ArrowDown")) deltaY -= 1;
      if (this.viewportPressedKeys.has("ArrowLeft")) deltaX -= 1;
      if (this.viewportPressedKeys.has("ArrowRight")) deltaX += 1;
    }
    if (this.viewportPressedKeys.has("KeyW")) deltaY += 1;
    if (this.viewportPressedKeys.has("KeyS")) deltaY -= 1;
    if (this.viewportPressedKeys.has("KeyA")) deltaX -= 1;
    if (this.viewportPressedKeys.has("KeyD")) deltaX += 1;
    if (this.viewportPressedKeys.has("Minus") || this.viewportPressedKeys.has("NumpadSubtract")) deltaZ += 1;
    if (this.viewportPressedKeys.has("Equal") || this.viewportPressedKeys.has("NumpadAdd")) deltaZ -= 1;

    if (deltaX === 0 && deltaY === 0 && deltaZ === 0) return;

    // Normalize diagonal so it isn't sqrt(2) faster
    if (deltaX !== 0 && deltaY !== 0) {
      const len = Math.hypot(deltaX, deltaY);
      deltaX /= len;
      deltaY /= len;
    }

    // Scale by deltaTime: base speed is per 60fps frame (16.6ms)
    const timeScale = dt / (1000 / 60);
    const panSpeed = 10 * timeScale;
    const zoomSpeed = 0.05 * timeScale;
    const oldScale = this.scale;
    let newScale = oldScale * Math.exp(-deltaZ * zoomSpeed);
    newScale = Math.min(40, Math.max(0.1, newScale));
    newScale = Number(newScale.toFixed(3));

    if (newScale !== oldScale) this.scale = newScale;

    this.panX += Math.round(-deltaX * panSpeed);
    this.panY += Math.round(deltaY * panSpeed);

    this.updateView();
  }

  private renderTileGrid<T>(
    items: T[],
    selectedValue: string,
    onSelect: (val: string) => void,
    getLabel?: (item: T) => string,
    getValue?: (item: T) => string
  ) {
    return html`
      <div
        class="tile-grid"
        @keydown=${(e: KeyboardEvent) =>
        this.handleTileKeydown(e, items, selectedValue, onSelect, getValue)}
      >
        ${items.length
        ? items.map((item) => {
          const val = getValue ? getValue(item) : (item as unknown as string);
          const lbl = getLabel ? getLabel(item) : (item as unknown as string);
          return html`
                  <button
                    type="button"
                    class="tile-btn ${selectedValue === val ? "active" : ""}"
                    title=${lbl}
                    tabindex=${selectedValue === val ? "0" : "-1"}
                    data-testid="tile-btn"
                    @click=${() => onSelect(val)}
                  >
                    <span class="tile-btn--label">${lbl}</span>
                  </button>
                `;
        })
        : html`
                <div class="empty-state">None available</div>
              `
      }
      </div>
    `;
  }

  override render() {
    return html`
      <section id="viewport" data-testid="viewport" autofocus tabindex="0"></section>

      ${this.isDragging
        ? html`
              <div class="drop-overlay"><span>Drop ZIP file</span></div>
            `
        : ""
      }

      <div class="small-screen-actions-container">
        <div class="small-screen-actions">
          <button
            type="button"
            class="drop-btn"
            data-testid="import-action"
            ?hidden=${this.disableImportFile}
            @click=${() =>
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click()}
          >
            Import <kbd>I</kbd>
          </button>
        </div>
        <div class="small-screen-actions">
          <button data-testid="fullscreen-action" aria-label="Toggle fullscreen" title="Toggle fullscreen" @click=${this.toggleFullscreen}>
            ${this.isFullscreen ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shrink-icon lucide-shrink"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg>` : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-expand-icon lucide-expand"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>`}
            <kbd>F</kbd>
          </button>
          <button data-testid="screenshot-action" @click=${this.captureScreenshot}>
            Screenshot <kbd>E</kbd>
          </button>
          <button data-testid="record-action" @click=${this.toggleRecording}>
            ${this.isRecording ? "Stop" : "Record"} <kbd>R</kbd>
          </button>
        </div>
      </div>

      <aside data-testid="controls">
        <section class="panel">
          <div class="stack" data-testid="motion-group-collection">
            <span class="section-label">Motion Group</span>
            ${this.renderTileGrid(
          this.motionGroups,
          this.selectedGroup,
          (g: string) => {
            this.selectedGroup = g;
            this.updateMotionList();
            this.playMotion();
          }
        )}
          </div>
          <div class="stack" data-testid="motion-collection">
            <span class="section-label">Motion</span>
            ${this.renderTileGrid(
          this.motions,
          this.selectedMotion,
          (mVal: string) => {
            this.selectedMotion = mVal;
            this.playMotion();
          },
          (m) => m.label,
          (m) => m.value
        )}
          </div>
          <div class="stack" data-testid="expression-collection">
            <span class="section-label">Expression</span>
            ${this.renderTileGrid(
          this.expressions,
          this.selectedExpression,
          (xVal: string) => {
            this.selectedExpression = xVal;
            this.playExpression();
          },
          (x) => x.name,
          (x) => x.value
        )}
          </div>
        </section>

        <section class="panel">
          <div class="grid-underflow grid-2 small-screen-hidden">
            <button
              type="button"
              class="drop-btn grid-span"
              data-testid="import-action"
              ?hidden=${this.disableImportFile}
              @click=${() =>
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click()}
            >
              Import
              <kbd>I</kbd>
            </button>
            <button data-testid="screenshot-action" @click=${this.captureScreenshot}>
              Screenshot
              <kbd>E</kbd>
            </button>
            <button data-testid="record-action" @click=${this.toggleRecording}>
              ${this.isRecording ? "Stop recording" : "Start recording"}
              <kbd>R</kbd>
            </button>
          </div>
          <div class="cluster cluster--spread grid-span">
            <label for="exportResolutionSelect">Export resolution</label>
            <select
              id="exportResolutionSelect"
              .value=${this.exportResolution}
              @change=${(e: Event) => {
        this.exportResolution = (e.target as HTMLSelectElement).value;
        this.fitModel();
      }}
            >
              <option value="viewport">Viewport</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          ${this.exportResolution === "custom"
        ? html`
                  <div class="grid-2 grid-standard">
                    <div class="field">
                      <label class="input-wrap" for="customW">
                        <span class="field field--start" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-horizontal-icon lucide-move-horizontal"><path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/></svg></span>
                        <input
                          id="customW"
                          aria-label="Custom export width"
                          title="Custom export width"
                          type="number"
                          min="100"
                          .value=${this.customWidth.toString()}
                          @input=${(e: Event) => {
            this.customWidth =
              Number.parseInt((e.target as HTMLInputElement).value, 10) || 1920;
            this.fitModel();
          }}
                        />
                      </label>
                    </div>
                    <div class="field">
                      <label class="input-wrap" for="customH">
                        <span class="field field--start" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-move-vertical-icon lucide-move-vertical"><path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/></svg></span>
                        <input
                          id="customH"
                          aria-label="Custom export height"
                          title="Custom export height"
                          type="number"
                          min="100"
                          .value=${this.customHeight.toString()}
                          @input=${(e: Event) => {
            this.customHeight =
              Number.parseInt((e.target as HTMLInputElement).value, 10) || 1080;
            this.fitModel();
          }}
                        />
                      </label>
                    </div>
                  </div>
                `
        : ""
      }
          <div class="stack">
            <span class="section-label section-label--spread">
              Camera
              <div class="spacer"></div>
              <span class="keyboard-only">Pan <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span>
              <span class="keyboard-only">Zoom <kbd>-</kbd> / <kbd>=</kbd></span>
            </span>
            <div class="cluster">
              <div class="field">
                <label class="input-wrap" for="panXInput">
                  <span class="field field--start" aria-hidden="true">X</span>
                  <input
                    id="panXInput"
                    aria-label="Pan X"
                    title="Pan X"
                    type="number"
                    .value=${this.panX.toString()}
                    @input=${(e: Event) => {
        this.panX = Number.parseFloat((e.target as HTMLInputElement).value) || 0;
        this.fitModel();
      }}
                  />
                </label>
              </div>
              <div class="field">
                <label class="input-wrap" for="panYInput">
                  <span class="field field--start" aria-hidden="true">Y</span>
                  <input
                    id="panYInput"
                    aria-label="Pan Y"
                    title="Pan Y"
                    type="number"
                    .value=${this.panY.toString()}
                    @input=${(e: Event) => {
        this.panY = Number.parseFloat((e.target as HTMLInputElement).value) || 0;
        this.fitModel();
      }}
                  />
                </label>
              </div>
              <div class="field">
                <label class="input-wrap" for="scaleInput">
                  <span class="field field--start" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scaling-icon lucide-scaling"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M14 15H9v-5"/><path d="M16 3h5v5"/><path d="M21 3 9 15"/></svg></span>
                  <input
                    id="scaleInput"
                    aria-label="Scale"
                    title="Scale"
                    type="number"
                    min="0.1"
                    step="0.05"
                    .value=${this.scale.toString()}
                    @input=${(e: Event) => {
        this.scale = Number.parseFloat((e.target as HTMLInputElement).value) || 0.9;
        this.fitModel();
      }}
                  />
                </label>
              </div>
              <button data-testid="reset-action" @click=${this.resetView}>
                Reset
              </button>
            </div>
          </div>
        </section>

        <details class="panel">
          <summary>Advanced</summary>
          <div class="cluster cluster--spread">
            <label for="displayResolutionSelect">Resolution scale</label>
            <select
              id="displayResolutionSelect"
              .value=${this.resolution}
              @change=${(e: Event) => {
        this.resolution = (e.target as HTMLSelectElement).value;
        this.resizeRenderer();
      }}
            >
              <option value="device">Device</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
              <option value="2.5">2.5x</option>
              <option value="3">3x</option>
            </select>
          </div>
          <div class="stack">
            <div class="cluster cluster--spread">
              <label for="showPreview">Framing guide</label>
              <input
                id="showPreview"
                class="checkbox-custom"
                type="checkbox"
                .checked=${this.showFramingPreview}
                @change=${(e: Event) => {
        this.showFramingPreview = (e.target as HTMLInputElement).checked;
        this.updateFramingOverlay();
      }}
              />
            </div>
            <div class="cluster cluster--spread">
              <label for="mouseTrack">Mouse tracking</label>
              <input
                id="mouseTrack"
                class="checkbox-custom"
                type="checkbox"
                .checked=${this.mouseTracking}
                @change=${(e: Event) => {
        this.mouseTracking = (e.target as HTMLInputElement).checked;
        if (this.lastModelSource) {
          this.loadModelSource(this.lastModelSource);
        } else {
          this.loadModelSource(this.selectedModelPath);
        }
      }}
              />
            </div>
          </div>
        </details>
        
        <!-- Credits -->
        <div class="panel credits">
          <span>Based on <a target="_blank" href="https://github.com/lihaohong6/StellaSoraBot/blob/7f0064dc5a6f2cee75d03b594fcc239f3873df53/tools/live2d_viewer.html">lihaohong6/StellaSoraBot Live2D viewer</a></span>
          <span><a target="_blank" href="https://github.com/ParasailNumerous/l2d-viewer">Source code</a></span>
        </div>
      </aside>

      <input
        id="zipInput"
        data-testid="zip-input"
        type="file"
        accept=".zip"
        inert
        aria-hidden="true"
        @change=${(e: Event) => {
        if (this.disableImportFile === true) return;
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) this.processArchiveFile(file);
      }}
        />

      <span id="status" role="status" data-testid="status">${this.statusMsg}</span>

      <button data-testid="fullscreen-action" class="fullscreen-action small-screen-hidden" aria-label="Toggle fullscreen" title="Toggle fullscreen" @click=${this.toggleFullscreen}>
        ${this.isFullscreen ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shrink-icon lucide-shrink"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg>` : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-expand-icon lucide-expand"><path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/></svg>`}
        <kbd>F</kbd>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "live2d-viewer": Live2DViewer;
  }
}
