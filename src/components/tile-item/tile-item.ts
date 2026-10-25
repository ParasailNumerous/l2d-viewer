import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { getTileItemSemantics } from "./tile-item-contract.js";

@customElement("stellar-tile-item")
export class StellarTileItem extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: String, reflect: true }) value = "";
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) gridcell = false;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: false,
  };

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        user-select: none;
      }

      :host([hidden]) {
        display: none;
      }

      button,
      .gridcell-content {
        box-sizing: border-box;
        display: flex;
        min-width: 0;
        min-block-size: var(--stellar-min-dense-touch-target);
        inline-size: 100%;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding-block: 0;
        padding-inline: 8px;
        border: 0;
        border-radius: var(--stellar-radius-base);
        background: transparent;
        color: var(--stellar-foreground);
        font: inherit;
        font-size: 0.875rem;
        line-height: 1.25;
        text-align: center;
        cursor: pointer;
        touch-action: manipulation;
        &:hover:not(:disabled) {
          background: color-mix(
            in oklab,
            transparent,
            currentColor var(--stellar-hover-mix)
          );
        }
  
        &:active:not(:disabled) {
          background: color-mix(
            in oklab,
            transparent,
            currentColor var(--stellar-active-mix)
          );
        }
  
        &:focus-visible,
        :host(:focus-visible) {
          outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
          outline-offset: var(--stellar-focus-ring-offset);
        }
  
        &[aria-pressed="true"] {
          background: var(--stellar-secondary);
          color: var(--stellar-on-secondary);
          &:hover:not(:disabled) {
            background: color-mix(
              in oklab,
              transparent,
              currentColor var(--stellar-hover-mix)
            );
          }
          &:active:not(:disabled) {
            background: color-mix(
              in oklab,
              transparent,
              currentColor var(--stellar-active-mix)
            );
          }
        }
  
        &:disabled {
          cursor: default;
          opacity: 0.38;
        }
      }

      .label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncGridcellSemantics();
  }

  override updated(): void {
    this.syncGridcellSemantics();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue !== newValue && (name === "role" || name === "aria-selected")) {
      this.requestUpdate();
    }
  }

  override render() {
    const semantics = getTileItemSemantics(
      this.gridcell,
      this.getAttribute("role"),
    );

    if (semantics === "gridcell") {
      return html`
        <span class="gridcell-content" aria-hidden="true">
          <slot name="icon"></slot>
          <!-- \/\/ SUPPOsed to be a <slot>, but it wasn't working... -->
          <span class="label" part="label">${this.label}</span>
        </span>
      `;
    }

    return html`
      <button
        type="button"
        part="button"
        aria-label=${this.label || nothing}
        aria-pressed=${this.selected ? "true" : "false"}
        title=${this.label || nothing}
        ?disabled=${this.disabled}
      >
        <slot name="icon"></slot>
        <span class="label" part="label"><slot>${this.label}</slot></span>
      </button>
    `;
  }

  private syncGridcellSemantics(): void {
    if (getTileItemSemantics(this.gridcell, this.getAttribute("role")) !== "gridcell") {
      if (this.hasAttribute("aria-selected")) this.removeAttribute("aria-selected");
      if (this.hasAttribute("aria-disabled")) this.removeAttribute("aria-disabled");
      return;
    }

    this.setAttribute("role", "gridcell");
    if (this.hasAttribute("selected") || !this.hasAttribute("aria-selected")) {
      this.setAttribute("aria-selected", String(this.selected));
    }
    this.setAttribute("aria-disabled", String(this.disabled));
    if (this.disabled) {
      this.tabIndex = -1;
    } else if (!this.hasAttribute("tabindex")) {
      this.tabIndex = 0;
    }
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-tile-item": StellarTileItem;
  }
}
