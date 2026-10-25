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
      display: inline-block;
      color: var(--stellar-foreground);
    }

    button {
      align-items: center;
      appearance: none;
      background: var(--stellar-surface);
      border: 0;
      border-radius: var(--stellar-radius-base);
      color: var(--stellar-foreground);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      inline-size: var(--stellar-min-touch-target);
      justify-content: center;
      min-block-size: var(--stellar-min-touch-target);
      min-inline-size: var(--stellar-min-touch-target);
      padding: 0;
      position: relative;
      touch-action: manipulation;
    }

    button:disabled {
      cursor: default;
      opacity: 0.5;
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

    :host([variant="surface"]) button {
      --button-background: var(--stellar-surface);
      background: var(--button-background);
    }

    :host([variant="base"]) button {
      --button-background: var(--stellar-base);
      background: var(--button-background);
    }

    :host([variant="primary"]) button {
      --button-background: var(--stellar-primary);
      background: var(--button-background);
      color: var(--stellar-on-primary);
    }

    :host([variant="selected"]) button,
    :host([selected]) button {
      --button-background: var(--stellar-secondary);
      background: var(--button-background);
      border-radius: var(--stellar-radius-full);
      color: var(--stellar-on-secondary);
    }

    :host([variant="text"]) button {
      background: transparent;
    }

    ::slotted(*) {
      pointer-events: none;
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
