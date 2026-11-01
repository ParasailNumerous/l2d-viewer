import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";

@customElement("stellar-list-item")
export class StellarListItem extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: Boolean, reflect: true }) disabled = false;

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: block;
        min-block-size: var(--stellar-min-touch-target);
        color: var(--stellar-foreground);
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-block-size: var(--stellar-min-touch-target);
        inline-size: 100%;
        border-block-end: 1px solid var(--stellar-surface);
      }

      .start {
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-inline-size: 0;
        padding-inline: 8px;
      }

      .label {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .end {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 8px;
        padding-inline: 0;
      }

      ::slotted([slot="start"]),
      ::slotted([slot="label"]),
      ::slotted(:not([slot])) {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :host([disabled]) {
        opacity: 0.38;
      }
    `,
  ];

  override render() {
    return html`
      <div class="row" part="row">
        <div class="start" part="start">
          <slot name="start">
            <span class="label" part="label">
              <slot name="label"><slot>${this.label}</slot></slot>
            </span>
          </slot>
        </div>
        <div class="end" part="end">
          <slot name="end" part="end-slot"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-list-item": StellarListItem;
  }
}
