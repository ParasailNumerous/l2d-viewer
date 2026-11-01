import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { formatPlaybackTime } from "./playback-bar-format.js";

export interface PlaybackPlayEventDetail {
  currentTime: number;
  duration: number;
}

export interface PlaybackPauseEventDetail {
  currentTime: number;
  duration: number;
}

export interface PlaybackSeekEventDetail {
  currentTime: number;
}

export interface PlaybackLoopChangeEventDetail {
  loop: boolean;
}

export type PlaybackPlayEvent = CustomEvent<PlaybackPlayEventDetail>;
export type PlaybackPauseEvent = CustomEvent<PlaybackPauseEventDetail>;
export type PlaybackSeekEvent = CustomEvent<PlaybackSeekEventDetail>;
export type PlaybackLoopChangeEvent = CustomEvent<PlaybackLoopChangeEventDetail>;

export interface StellarPlaybackBarEventMap {
  play: PlaybackPlayEvent;
  pause: PlaybackPauseEvent;
  seek: PlaybackSeekEvent;
  "loop-change": PlaybackLoopChangeEvent;
}

@customElement("stellar-playback-bar")
export class StellarPlaybackBar extends LitElement {
  @property({ type: Number }) currentTime = 0;
  @property({ type: Number }) duration = 0;
  @property({ type: Boolean }) playing = false;
  @property({ type: Boolean }) loop = false;

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: block;
        inline-size: 100%;
        color: var(--stellar-foreground);
      }

      .playback-bar {
        inline-size: 100%;
        padding: 8px 12px;
      }

      .controls {
        display: flex;
        align-items: center;
        inline-size: 100%;
        gap: 10px;
        padding-inline: 4px;
        border-radius: var(--stellar-radius-full);
        background: var(--stellar-base);
      }

      button {
        flex: 0 0 auto;
        inline-size: var(--stellar-min-touch-target);
        min-block-size: var(--stellar-min-touch-target);
        padding: 0;
        border: 0;
        border-radius: var(--stellar-radius-full);
        color: inherit;
        background: transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
      }

      button:hover:not(:disabled) {
        background: color-mix(in oklab, var(--stellar-base), currentColor var(--stellar-hover-mix));
      }

      button:active:not(:disabled) {
        background: color-mix(in oklab, var(--stellar-base), currentColor var(--stellar-active-mix));
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .time {
        flex: 0 0 auto;
        min-inline-size: 3.25em;
        font-size: 0.875rem;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        text-align: center;
        white-space: nowrap;
      }

      .visually-hidden {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
      }

      input[type="range"] {
        accent-color: var(--stellar-primary);
        flex: 1 1 auto;
        inline-size: 100%;
        block-size: var(--stellar-min-touch-target);
        min-inline-size: 4rem;
        margin: 0;
        padding: 0;
        border: 0;
      }

      input[type="range"]:focus-visible,
      button:focus-visible {
        outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
        outline-offset: var(--stellar-focus-ring-offset);
      }
    `,
  ];

  override render() {
    const max = Math.max(0, Number.isFinite(this.duration) ? this.duration : 0);
    const value = Math.min(Math.max(0, Number.isFinite(this.currentTime) ? this.currentTime : 0), max);
    const playLabel = this.playing ? "Pause playback" : "Play playback";

    return html`
      <div class="playback-bar">
        <div class="controls elevation-2">
          <!-- Should this be a toggle button? -->
          <button
            class="focus-ring"
            type="button"
            aria-label=${playLabel}
            title=${playLabel}
            @click=${this.handlePlayPause}
          >
            ${this.playing
              ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentcolor" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause preview-icon"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>`
              : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentcolor" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play preview-icon"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>`}
          </button>
          <span class="time" aria-label="Elapsed time">${formatPlaybackTime(value)}</span>
          <label class="visually-hidden" for="seek-slider">Seek playback</label>
          <input
            id="seek-slider"
            type="range"
            min="0"
            max=${max}
            step="0.1"
            .value=${String(value)}
            aria-label="Seek playback"
            aria-valuetext=${formatPlaybackTime(value)}
            ?disabled=${max <= 0}
            @input=${this.handleSeek}
          />
          <span class="time" aria-label="Duration">${formatPlaybackTime(max)}</span>
          <button
            class="focus-ring"
            type="button"
            aria-label="Loop playback"
            title="Loop playback"
            aria-pressed=${this.loop}
            @click=${this.handleLoopChange}
          >
            ${this.loop
              ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-repeat preview-icon"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`
              : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-repeat-off preview-icon"><path d="M11.656 6H21l-4-4"/><path d="M17.898 17.898A4 4 0 0 1 17 18H3l4-4"/><path d="m2 2 20 20"/><path d="M21 13v1a4 4 0 0 1-.171 1.159"/><path d="m21 6-4 4"/><path d="M3 11v-1a4 4 0 0 1 3.102-3.898"/><path d="m7 22-4-4"/></svg>`}
          </button>
        </div>
      </div>
    `;
  }

  private handlePlayPause = (): void => {
    const detail = { currentTime: this.currentTime, duration: this.duration };
    const event = this.playing
      ? new CustomEvent<PlaybackPauseEventDetail>("pause", {
        bubbles: true,
        composed: true,
        detail,
      })
      : new CustomEvent<PlaybackPlayEventDetail>("play", {
        bubbles: true,
        composed: true,
        detail,
      });
    this.dispatchEvent(event);
  };

  private handleSeek = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.dispatchEvent(new CustomEvent<PlaybackSeekEventDetail>("seek", {
      bubbles: true,
      composed: true,
      detail: { currentTime: Number(input.value) },
    }));
  };

  private handleLoopChange = (): void => {
    this.dispatchEvent(new CustomEvent<PlaybackLoopChangeEventDetail>("loop-change", {
      bubbles: true,
      composed: true,
      detail: { loop: !this.loop },
    }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-playback-bar": StellarPlaybackBar;
  }
}
