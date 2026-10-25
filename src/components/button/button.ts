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

const buttonVariants: readonly StellarButtonVariant[] = [
  "surface",
  "base",
  "primary",
  "selected",
  "text",
];

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
        background: var(--stellar-surface);
        color: var(--stellar-foreground);
        font: inherit;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      :host([variant="surface"]) button {
        background: var(--stellar-surface);
        color: var(--stellar-foreground);
      }

      :host([variant="base"]) button {
        background: var(--stellar-base);
        color: var(--stellar-foreground);
      }

      :host([variant="primary"]) button {
        background: var(--stellar-primary);
        color: var(--stellar-on-primary);
      }

      :host([variant="selected"]) button,
      :host([selected]) button {
        border-radius: var(--stellar-radius-full);
        background: var(--stellar-secondary);
        color: var(--stellar-on-secondary);
      }

      :host([variant="text"]) button {
        background: transparent;
        color: var(--stellar-foreground);
      }

      @media (hover: hover) {
        button:not(:disabled):hover {
          background: color-mix(in oklab, currentColor var(--stellar-hover-mix), transparent);
        }

        :host([variant="primary"]) button:not(:disabled):hover {
          background: color-mix(in oklab, var(--stellar-primary), var(--stellar-on-primary) var(--stellar-hover-mix));
        }
      }

      button:not(:disabled):active {
        background: color-mix(in oklab, currentColor var(--stellar-active-mix), transparent);
      }

      :host([variant="primary"]) button:not(:disabled):active {
        background: color-mix(in oklab, var(--stellar-primary), var(--stellar-on-primary) var(--stellar-active-mix));
      }

      button:focus-visible {
        outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
        outline-offset: var(--stellar-focus-ring-offset);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.38;
      }

      @media (prefers-reduced-motion: reduce) {
        button {
          transition: none;
        }
      }
    `,
  ];

  override render() {
    const variant = buttonVariants.includes(this.variant) ? this.variant : "surface";
    const isToggle = this.toggle || this.selected || variant === "selected";

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
        aria-label=${this.ariaLabel.trim() || nothing}
        aria-labelledby=${this.ariaLabelledBy.trim() || nothing}
        aria-describedby=${this.ariaDescribedBy.trim() || nothing}
        aria-pressed=${isToggle ? String(this.selected) : nothing}
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
