import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as PIXI from "pixi.js";
import JSZip from "jszip";
import { Live2DModel, MotionPriority } from "pixi-live2d-display/cubism4";

Live2DModel.registerTicker(PIXI.Ticker);

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
  @property({ type: Boolean }) enableImportFile: boolean = true;
  @property({ type: Array }) motionGroups: string[] = [];
  @property({ type: String }) selectedGroup: string = "";
  @property({ type: Array }) motions: MotionItem[] = [];
  @property({ type: String }) selectedMotion: string = "";
  @property({ type: Array }) expressions: ExpressionItem[] = [];
  @property({ type: String }) selectedExpression: string = "";
  @property({ type: Number, reflect: true }) scale: number = 0.9;
  @property({ type: String }) resolution: "device" | string = "device";
  @property({ type: String }) exportResolution: string = "viewport";
  @property({ type: Number }) customWidth: number = 1920;
  @property({ type: Number }) customHeight: number = 1080;
  @property({ type: Boolean }) showFramingPreview: boolean = true;
  @property({ type: Boolean }) mouseTracking: boolean = false;
  @property({ type: String }) statusMsg: string = "";
  @property({ type: Boolean }) isDragging: boolean = false;
  @property({ type: Boolean }) isRecording: boolean = false;
  @property({ type: Number, reflect: true }) panX: number = 0;
  @property({ type: Number, reflect: true }) panY: number = 0;

  private app: PIXI.Application | null = null;
  private currentModel: InstanceType<typeof Live2DModel> | null = null;
  private currentModelJson: Record<string, unknown> & { FileReferences?: { Motions?: Record<string, { File?: string }[]>; Expressions?: { Name?: string; File?: string }[] } } | null = null;
  private lastModelSource: string | File[] | null = null;
  private overlayGraphics: PIXI.Graphics | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private rootResizeObserver: ResizeObserver | null = null;
  private recordedChunks: Blob[] = [];
  private isPanning: boolean = false;

  private touchPointers: Map<number, TouchPoint> = new Map();
  private initialPinchDist: number = 0;
  private initialScaleOnPinch: number = 0.9;
  private initialPinchMid: TouchPoint = { x: 0, y: 0 };
  private initialPanOnPinch: TouchPoint = { x: 0, y: 0 };

  static override styles = css`
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      user-select: none;
      contain: content;
      container-type: inline-size;

      --bg-color: 0% 0 0;
      --fg-color: 100% 0 0;
      --primary-color: 0.62 0.12 199.54;
      --primary-fg-color: 1 0 0;
      --secondary-color: 0.4203 0.1014 262.52;
      --secondary-fg-color: 1 0 0;
      --small-screen-sheet-height: 35%;

      accent-color: oklch(var(--primary-color));
      color-scheme: dark;
      
      background: oklch(var(--bg-color));
      color: oklch(var(--fg-color));
    }

    * {
      box-sizing: border-box;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }

    #viewport {
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    }

    aside,
    footer {
      position: absolute;
      z-index: 10;
      background: oklch(var(--bg-color) / 0.6);
      backdrop-filter: blur(4px);
    }

    aside {
      top: 0;
      left: 0;
      width: 420px;
      max-height: calc(100% - 32px);
      padding: 4px;
      border-radius: 6px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    footer {
      right: 0;
      top: 0;
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .control-group {
      display: flex;
      flex-direction: column;
    }

    .tile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      overflow-y: auto;
    }

    .tile-btn {
      border: none;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: 32px;
    }
    .tile-btn:focus-visible {
      outline: 2px solid oklch(var(--primary-color));
      outline-offset: 2px;
    }

    .tile-btn.active {
      background: oklch(var(--secondary-color));
      color: oklch(var(--secondary-fg-color));
    }

    .tile-btn.active:hover {
      background: oklch(var(--secondary-color) / 0.9);
    }

    .empty-state {
      grid-column: 1 / -1;
      font-size: 0.8rem;
      opacity: 0.5;
    }

    select,
    input[type="number"],
    button {
      background: transparent;
      color: inherit;
      font: inherit;
      border: 1px solid oklch(var(--fg-color) / 0.5);
      padding: 0.1rem;

      &:not(:disabled):where(:hover) {
        background: oklch(var(--fg-color) / 0.1);
      }
    }

    select option {
      background: oklch(var(--bg-color));
      color: inherit;
    }

    button {
      cursor: pointer;
      border-radius: 4px;
    }

    .row-group {
      display: flex;
      gap: 4px;
      align-items: end;
    }

    .row-custom {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .input-item {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 4px;
      flex: 1;
    }

    .input-item label {
      color: oklch(var(--fg-color) / 0.8);
    }

    .toggle-row {
      display: flex;
      align-items: center;
    }

    .toggle-row label {
      flex-grow: 1;
    }

    .checkbox-custom {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
    }

    .section-label {
      padding: 0 0.25rem;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .drop-btn {
      grid-column: 1 / -1;
      background: oklch(var(--primary-color));
      color: oklch(var(--primary-fg-color));
      border: none;
    }
    .drop-btn:hover:not(:disabled) {
      background: oklch(var(--primary-color) / 0.9);
    }

    kbd {
      display: none;
      min-width: 1.5em;
      padding: 0 0.25em;
      text-align: center;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      border: 1px solid oklch(var(--fg-color) / 0.5);
      border-bottom-width: 3px;
      border-radius: 3px;
      background: oklch(var(--fg-color) / 0.1);
      margin-left: 0.25em;
      vertical-align: middle;
    }
    @media (hover: hover) and (pointer: fine) {
      kbd {
        display: inline-block;
      }
    }

    .panel {
      padding: 4px;
      border-radius: 4px;
      background: oklch(var(--fg-color) / 0.1);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .small-screen-actions {
      display: none;
    }
    @container (width < 640px) {
      aside {
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: var(--small-screen-sheet-height);
        padding: 8px 8px max(8px, env(safe-area-inset-bottom));
        border-radius: 12px 12px 0 0;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border: 1px solid oklch(var(--fg-color) / 0.12);
        background: oklch(var(--bg-color) / 0.75);
        backdrop-filter: blur(8px);
      }
      .tile-grid {
        gap: 4px;
      }
      .small-screen-actions-container {
        z-index: 11;
        position: absolute;
        inset-inline: 8px;
        gap: 8px;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        bottom: calc(var(--small-screen-sheet-height) + 8px);
        pointer-events: none;
      }
      .small-screen-actions {
        display: flex;
        gap: 4px;
      }
      :where(.small-screen-actions) button {
        pointer-events: auto;
        background: oklch(var(--bg-color) / 0.5);
        backdrop-filter: blur(8px);
        border: 1px solid oklch(var(--fg-color) / 0.25);
        padding: 0 0.75rem;
        min-height: 44px;
        border-radius: 4px;
        &:not(:disabled):hover {
          background: oklch(var(--bg-color) / 0.4);
        }
      }
      aside .action-buttons > button {
        display: none;
      }
    }

    .drop-overlay {
      position: absolute;
      inset: 0;
      z-index: 20;
      background: oklch(var(--bg-color) / 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      pointer-events: none;
    }
  `;

  override firstUpdated(): void {
    this.initPixi();
    this.setupDragAndDrop();
    this.setupPanListeners();
    this.setupZoomListeners();
    this.setupKeyboardShortcuts();
  }

  private initPixi(): void {
    const container = this.shadowRoot?.querySelector("#viewport");
    if (!container) return;

    this.app = new PIXI.Application({
      resizeTo: this,
      resolution: this.getResolutionValue(),
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      preserveDrawingBuffer: true,
    });

    container.appendChild(this.app!.view);
    
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
    });

    container.addEventListener("pointermove", (e: Event) => {
      const pe = e as PointerEvent;
      if (this.touchPointers.has(pe.pointerId)) {
        this.touchPointers.set(pe.pointerId, {
          x: pe.clientX,
          y: pe.clientY,
        });
      }

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
    });

    const stopPointer = (e: Event) => {
      const pe = e as PointerEvent;
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

    container.addEventListener("pointerup", stopPointer);
    container.addEventListener("pointercancel", stopPointer);
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
      { passive: false }
    );
  }

  private setupKeyboardShortcuts(): void {
    this.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();
      if (key === "i") {
        e.preventDefault();
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click();
      } else if (key === "r") {
        e.preventDefault();
        this.toggleRecording();
      } else if (key === "f") {
        e.preventDefault();
        this.captureScreenshot();
      }
    });
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
    return this.clientWidth < 640;
  }

  private getSmallScreenSheetHeightPx(): number {
    const raw =
      getComputedStyle(this)
        .getPropertyValue("--small-screen-sheet-height")
        .trim() || "35%";
    if (raw.endsWith("vh")) return Math.round((parseFloat(raw) / 100) * this.clientHeight);
    if (raw.endsWith("px")) return Math.round(parseFloat(raw));
    if (raw.endsWith("dvh") || raw.endsWith("svh") || raw.endsWith("lvh"))
      return Math.round((parseFloat(raw) / 100) * this.clientHeight);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.round(n) : Math.round(this.clientHeight * 0.35);
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
      this.overlayGraphics = new PIXI.Graphics();
      this.app!.stage.addChild(this.overlayGraphics);
    }

    this.app!.stage.setChildIndex(
      this.overlayGraphics,
      this.app!.stage.children.length - 1
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
      origRes = this.app!.renderer.resolution;

    if (this.overlayGraphics) this.overlayGraphics!.visible = false;

    this.app!.renderer.resolution = 1;
    this.app!.renderer.resize(target.width, target.height);
    this.renderModelForExport(target.width, target.height);
    this.app.render();

    const link = document.createElement("a");
    link.download = `live2d-snapshot-${target.width}x${target.height}-${Date.now()}.png`;
    link.href = this.app!.view.toDataURL("image/png");
    link.click();

    this.app!.renderer.resolution = origRes;
    this.app!.renderer.resize(origW, origH);
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

    this.app!.renderer.resolution = 1;
    this.app!.renderer.resize(target.width, target.height);
    this.renderModelForExport(target.width, target.height);

    this.recordedChunks = [];
    let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(
      this.app!.view.captureStream(60),
      { mimeType }
    );
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
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
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    this.statusMsg = `Recording video (${target.width}x${target.height})...`;
  }

  async loadModelSource(source: string | File[]): Promise<void> {
    this.lastModelSource = source;
    if (typeof source === "string") this.selectedModelPath = source;
    this.statusMsg = `Loading model...`;

    if (this.currentModel) {
      this.app!.stage.removeChild(this.currentModel!);
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
          autoInteract: this.mouseTracking,
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
          autoInteract: this.mouseTracking,
        });
      }

      this.app!.stage.addChild(this.currentModel!);
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
    this.app!.renderer.resolution = this.getResolutionValue();
    this.app!.renderer.resize(this.clientWidth, this.clientHeight);
    this.fitModel();
  }

  private setupDragAndDrop(): void {
    this.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      this.isDragging = true;
    });
    this.addEventListener("dragleave", (e: DragEvent) => {
      if (!this.contains(e.relatedTarget as Node)) this.isDragging = false;
    });
    this.addEventListener("drop", async (e: DragEvent) => {
      e.preventDefault();
      this.isDragging = false;
      const files = e.dataTransfer?.files;
      if (files && files.length) await this.processDroppedFile(files[0]);
    });
  }

  async processDroppedFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith(".zip")) return;
    this.statusMsg = `Extracting ZIP: ${file.name}...`;
    try {
      /* JSZip imported */
      const zip = await JSZip.loadAsync(file);
      const modelKey = Object.keys(zip.files).find(
        (k) =>
          !zip.files[k].dir &&
          (k.endsWith(".model3.json") || k.endsWith(".model.json"))
      );
      if (!modelKey)
        throw new Error("No .model3.json or .model.json found in ZIP!");

      const lastSlashIndex = modelKey.lastIndexOf("/");
      const baseDir =
        lastSlashIndex >= 0
          ? modelKey.substring(0, lastSlashIndex + 1)
          : "";
      const normalizedFiles: File[] = [];

      for (const [path, entry] of Object.entries<any>(zip.files)) {
        if (entry.dir || (baseDir && !path.startsWith(baseDir))) continue;
        const relPath = baseDir ? path.substring(baseDir.length) : path;
        const fileObj = new File([await entry.async("blob")], relPath);
        Object.defineProperty(fileObj, "webkitRelativePath", {
          value: relPath,
          writable: false,
        });
        normalizedFiles.push(fileObj);
      }

      await this.loadModelSource(normalizedFiles);
    } catch (err: any) {
      this.statusMsg = `ZIP load failed: ${err.message || err}`;
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
                    @click=${() => onSelect(val)}
                  >
                    ${lbl}
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
      <section id="viewport"></section>

      ${this.isDragging
        ? html`
              <div class="drop-overlay"><span>Drop ZIP file</span></div>
            `
        : ""
      }

      <aside>
        <section class="panel">
          <div class="control-group">
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
          <div class="control-group">
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
          <div class="control-group">
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
          <div class="action-buttons">
            <button
              type="button"
              class="drop-btn"
              @click=${() =>
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click()}
            >
              Import
              <kbd>I</kbd>
            </button>
            <button type="button" @click=${this.captureScreenshot}>
              Screenshot
              <kbd>F</kbd>
            </button>
            <button type="button" @click=${this.toggleRecording}>
              ${this.isRecording ? "Stop recording" : "Start recording"}
              <kbd>R</kbd>
            </button>
            <div class="input-item">
              <label for="exportResolutionSelect">Export</label>
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
          </div>
          ${this.exportResolution === "custom"
        ? html`
                  <div class="row-custom">
                    <div class="input-item">
                      <label for="customW">Width</label>
                      <input
                        id="customW"
                        type="number"
                        min="100"
                        .value=${this.customWidth.toString()}
                        @input=${(e: Event) => {
            this.customWidth =
              Number.parseInt((e.target as HTMLInputElement).value, 10) || 1920;
            this.fitModel();
          }}
                      />
                    </div>
                    <div class="input-item">
                      <label for="customH">Height</label>
                      <input
                        id="customH"
                        type="number"
                        min="100"
                        .value=${this.customHeight.toString()}
                        @input=${(e: Event) => {
            this.customHeight =
              Number.parseInt((e.target as HTMLInputElement).value, 10) || 1080;
            this.fitModel();
          }}
                      />
                    </div>
                  </div>
                `
        : ""
      }
          <input
            id="zipInput"
            type="file"
            accept=".zip"
            hidden
            @change=${(e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) this.processDroppedFile(file);
      }}
          />
          <div class="control-group">
            <span class="section-label">Camera</span>
            <div class="row-group">
              <div class="input-item">
                <label for="panXInput">X</label>
                <input
                  id="panXInput"
                  type="number"
                  .value=${this.panX.toString()}
                  @input=${(e: Event) => {
        this.panX = Number.parseFloat((e.target as HTMLInputElement).value) || 0;
        this.fitModel();
      }}
                />
              </div>
              <div class="input-item">
                <label for="panYInput">Y</label>
                <input
                  id="panYInput"
                  type="number"
                  .value=${this.panY.toString()}
                  @input=${(e: Event) => {
        this.panY = Number.parseFloat((e.target as HTMLInputElement).value) || 0;
        this.fitModel();
      }}
                />
              </div>
              <div class="input-item">
                <label for="scaleInput">Scale</label>
                <input
                  id="scaleInput"
                  type="number"
                  min="0.1"
                  step="0.05"
                  .value=${this.scale.toString()}
                  @input=${(e: Event) => {
        this.scale = Number.parseFloat((e.target as HTMLInputElement).value) || 0.9;
        this.fitModel();
      }}
                />
              </div>
              <button type="button" @click=${this.resetView}>
                Reset
              </button>
            </div>
          </div>
        </section>

        <details class="panel">
          <summary>Advanced</summary>
          <div class="input-item">
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
          <div class="control-group">
            <div class="toggle-row">
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
            <div class="toggle-row">
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
        <div class="panel">
          <span style="word-wrap: anywhere;">Based on <a target="_blank" href="https://github.com/lihaohong6/StellaSoraBot/blob/7f0064dc5a6f2cee75d03b594fcc239f3873df53/tools/live2d_viewer.html">https://github.com/lihaohong6/StellaSoraBot/blob/7f0064dc5a6f2cee75d03b594fcc239f3873df53/tools/live2d_viewer.html</a></span>
        </div>
      </aside>

      <div class="small-screen-actions-container">
        <div class="small-screen-actions">
          <button
            type="button"
            class="drop-btn"
            @click=${() =>
        (this.shadowRoot?.querySelector("#zipInput") as HTMLInputElement)?.click()}
          >
            Import <kbd>I</kbd>
          </button>
        </div>
        <div class="small-screen-actions">
          <button type="button" @click=${this.captureScreenshot}>
            Screenshot <kbd>F</kbd>
          </button>
          <button type="button" @click=${this.toggleRecording}>
            ${this.isRecording ? "Stop" : "Record"} <kbd>R</kbd>
          </button>
        </div>
      </div>

      <footer role="status">${this.statusMsg}</footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "live2d-viewer": Live2DViewer;
  }
}
