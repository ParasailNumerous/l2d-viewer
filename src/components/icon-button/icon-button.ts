import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";

export type StellarIconButtonVariant =
  | "surface"
  | "base"
  | "primary"
  | "selected"
  | "text";

const variants: readonly StellarIconButtonVariant[] = [
  "surface",
  "base",
  "primary",
  "selected",
  "text",
];

export function isStellarIconButtonVariant(
  value: string,
): value is StellarIconButtonVariant {
  return variants.includes(value as StellarIconButtonVariant);
}

export function getStellarIconButtonAccessibleLabel(
  ariaLabel: string,
  ariaLabelledBy: string,
  title: string,
): string | undefined {
  const label = ariaLabel.trim();
  if (label) return label;
  if (ariaLabelledBy.trim()) return undefined;
  return title.trim() || "Icon button";
}

@customElement("stellar-icon-button")
export class StellarIconButton extends LitElement {
  @property({ type: String, reflect: true })
  variant: StellarIconButtonVariant = "surface";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  selected = false;

  @property({ attribute: "aria-label" })
  ariaLabel = "";

  @property({ attribute: "aria-labelledby" })
  ariaLabelledBy = "";

  @property({ attribute: "aria-describedby" })
  ariaDescribedBy = "";

  @property({ type: String })
  title = "";

  @query("button")
  private button?: HTMLButtonElement;

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
        inline-size: var(--stellar-min-touch-target);
        block-size: var(--stellar-min-touch-target);
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: var(--stellar-radius-base);
        background: var(--stellar-button-background);
        color: var(--stellar-button-content);
        font: inherit;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        &:focus-visible {
          outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
          outline-offset: var(--stellar-focus-ring-offset);
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
          border-radius: var(--stellar-radius-full);
        }
      }

      :host([variant="text"]) {
        --stellar-button-background: transparent;
        --stellar-button-content: var(--stellar-foreground);
      }
    `,
  ];

  override render() {
    const variant = isStellarIconButtonVariant(this.variant)
      ? this.variant
      : "surface";
    const hasLabelReference = this.ariaLabelledBy.trim().length > 0;
    const accessibleLabel = getStellarIconButtonAccessibleLabel(
      this.ariaLabel,
      this.ariaLabelledBy,
      this.title,
    );

    return html`
      <button
        part="button"
        class=${`variant-${variant}`}
        type="button"
        ?disabled=${this.disabled}
        aria-label=${accessibleLabel || nothing}
        aria-labelledby=${hasLabelReference ? this.ariaLabelledBy.trim() : nothing}
        aria-describedby=${this.ariaDescribedBy.trim() || nothing}
        aria-pressed=${this.selected ? "true" : "false"}
        title=${this.title || nothing}
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
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-icon-button": StellarIconButton;
  }
}
