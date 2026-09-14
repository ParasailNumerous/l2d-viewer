import { css } from 'lit';

export const live2DViewerStyles = css`
  :host {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
    touch-action: manipulation;
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
    touch-action: none;
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
`