import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";

let nextTabId = 0;

export type TabActivation = "automatic" | "manual";

@customElement("stellar-tab")
export class StellarTab extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: String }) value = "";
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  private readonly tabId = `stellar-tab-${++nextTabId}`;
  private readonly panelId = `${this.tabId}-panel`;

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: inline-flex;
      }

      button {
        min-block-size: var(--stellar-min-touch-target);
        max-block-size: 72px;
        padding: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        &[aria-selected="true"] {
          background: linear-gradient(180deg, transparent 25%, var(--stellar-primary) 100%);
        }
  
        &:disabled {
          cursor: default;
          opacity: 0.5;
        }
  
        &:focus-visible {
          outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
          outline-offset: var(--stellar-focus-ring-offset);
        }
      }

      :host(:focus-visible) {
        outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
        outline-offset: var(--stellar-focus-ring-offset);
      }

      [role="tabpanel"] {
        display: block;
      }

      [role="tabpanel"][hidden] {
        display: none;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
  }

  override updated(): void {
    this.setAttribute("role", "tab");
    this.setAttribute("aria-label", this.label);
    this.setAttribute("aria-selected", String(this.selected));
    this.setAttribute("aria-disabled", String(this.disabled));
    this.tabIndex = this.selected && !this.disabled ? 0 : -1;
  }

  override render() {
    return html`
      <button
        id=${this.tabId}
        class="focus-ring"
        type="button"
        role="presentation"
        aria-hidden="true"
        ?disabled=${this.disabled}
        tabindex="-1"
        @click=${this.handleClick}
      >
        <slot name="label">${this.label}</slot>
      </button>
      <div
        id=${this.panelId}
        role="tabpanel"
        aria-label=${this.label ? `${this.label} panel` : "Tab panel"}
        ?hidden=${!this.selected}
        tabindex="0"
      >
        <slot></slot>
      </div>
    `;
  }

  focus(options?: FocusOptions): void {
    super.focus(options);
  }

  setTabIndex(tabIndex: number): void {
    this.tabIndex = tabIndex;
  }

  setPosition(position: number, setSize: number): void {
    this.setAttribute("aria-posinset", String(position));
    this.setAttribute("aria-setsize", String(setSize));
  }

  private handleClick = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent("stellar-tab-activate", {
        bubbles: true,
        composed: true,
        detail: { tab: this },
      }),
    );
  };
}
