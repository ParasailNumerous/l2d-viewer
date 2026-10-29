import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { ifDefined } from "lit/directives/if-defined.js";

export type StellarButtonVariant =
  | "surface"
  | "base"
  | "primary"
  | "selected"
  | "text";

@customElement("stellar-button")
export class StellarButton extends LitElement {
  @property({ type: String, reflect: true })
  variant: StellarButtonVariant = "surface";

  @property({ type: Boolean, reflect: true })
  selected = false;

  @property({ type: Boolean, reflect: true })
  toggle = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String })
  type: "button" | "submit" | "reset" = "button";

  @property({ type: String })
  name = "";

  @property({ type: String })
  value = "";

  @property({ type: String })
  form?: string;

  @property({ type: String, attribute: "formaction" })
  formAction?: string;

  @property({ type: String, attribute: "formenctype" })
  formEncType?: string;

  @property({ type: String, attribute: "formmethod" })
  formMethod?: string;

  @property({ type: Boolean, attribute: "formnovalidate" })
  formNoValidate = false;

  @property({ type: String, attribute: "formtarget" })
  formTarget?: string;

  @property({ type: Boolean, attribute: "autofocus" })
  autoFocus = false;

  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "";

  @property({ type: String, attribute: "aria-labelledby" })
  ariaLabelledBy = "";

  @property({ type: String, attribute: "aria-describedby" })
  ariaDescribedBy = "";

  @property({ type: String })
  title = "";

  @query("button")
  private button!: HTMLButtonElement;

  private buttonTabIndex = 0;
  private radioChecked?: boolean;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        --stellar-button-background: var(--stellar-surface);
        --stellar-button-content: var(--stellar-foreground);
      }

      button {
        display: inline-flex;
        inline-size: 100%;
        min-block-size: var(--stellar-min-touch-target);
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 0 10px;
        border: 0;
        border-radius: var(--stellar-radius-base);
        background: var(--stellar-button-background);
        color: var(--stellar-button-content);
        font: inherit;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        position: relative;
        transition: border-radius 75ms steps(6, jump-none), padding 75ms steps(6, jump-none);
        &:focus-visible {
          outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
          outline-offset: var(--stellar-focus-ring-offset);
        }

        @media (pointer: coarse) {
          min-block-size: min(40px, var(--stellar-min-touch-target));
          &::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            inline-size: 100%;
            block-size: var(--stellar-min-touch-target);
            transform: translate(-50%, -50%);
          }
        }
  
        &:disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }

        @media (hover: hover) {
          &:not(:disabled):hover {
            background: color-mix(in oklab, currentColor var(--stellar-hover-mix), var(--stellar-button-background));
          }
        }

        &:not(:disabled):active {
          background: color-mix(in oklab, currentColor var(--stellar-active-mix), var(--stellar-button-background));
        }
      }
      
      :host([variant="surface"]) {
        --stellar-button-background: var(--stellar-surface);
        --stellar-button-content: var(--stellar-foreground);
      }

      :host([variant="base"]) {
        --stellar-button-background: var(--stellar-base);
        --stellar-button-content: var(--stellar-foreground);
      }

      :host([variant="primary"]) {
        --stellar-button-background: var(--stellar-primary);
        --stellar-button-content: var(--stellar-on-primary);
      }

      :host([variant="selected"]),
      :host([selected]) {
        --stellar-button-background: var(--stellar-secondary);
        --stellar-button-content: var(--stellar-on-secondary);
        button {
          /* 1/2 height */
          border-radius: calc(var(--stellar-min-touch-target) / 2);
          /* Increased horizontal padding */
          padding: 0 16px;
        }
      }

      :host([variant="text"]) {
        --stellar-button-background: transparent;
        --stellar-button-content: var(--stellar-foreground);
      }
    `,
  ];

  override render() {
    const isRadio = this.radioChecked !== undefined;

    return html`
      <button
        part="button"
        type=${this.type}
        ?disabled=${this.disabled}
        ?autofocus=${this.autoFocus}
        ?formnovalidate=${this.formNoValidate}
        name=${ifDefined(this.name || undefined)}
        value=${ifDefined(this.value || undefined)}
        form=${ifDefined(this.form)}
        formaction=${ifDefined(this.formAction)}
        formenctype=${ifDefined(this.formEncType)}
        formmethod=${ifDefined(this.formMethod)}
        formtarget=${ifDefined(this.formTarget)}
        role=${isRadio ? "radio" : nothing}
        aria-checked=${isRadio ? String(this.radioChecked) : nothing}
        tabindex=${this.buttonTabIndex}
        aria-label=${this.ariaLabel.trim() || nothing}
        aria-labelledby=${this.ariaLabelledBy.trim() || nothing}
        aria-describedby=${this.ariaDescribedBy.trim() || nothing}
        aria-pressed=${this.toggle ? String(this.selected) : nothing}
        title=${this.title || nothing}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  override focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  override blur(): void {
    this.button?.blur();
  }
  // Marks as radio for accessibility
  setRadio(checked: boolean): void {
    this.radioChecked = checked;
    this.requestUpdate();
  }

  // For roving tabindex
  setTabIndex(tabIndex: number): void {
    this.buttonTabIndex = tabIndex;
    if (this.button) this.button.tabIndex = tabIndex;
  }

  private handleClick = (): void => {
    if (this.toggle && !this.disabled) {
      this.selected = !this.selected;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-button": StellarButton;
  }
}
