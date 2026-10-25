import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";

let fieldId = 0;

@customElement("stellar-field")
export class StellarField extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    modernNormalizeStyles,
    css`
    :host {
      display: inline-block;
      min-inline-size: 0;
      color: var(--stellar-foreground);
    }

    .field {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      min-block-size: var(--stellar-min-touch-target);
      padding-inline: 8px;
      border-radius: var(--stellar-radius-base);
      background: var(--stellar-inset);
    }

    .label {
      display: contents;
    }

    input {
      min-inline-size: 0;
      min-block-size: var(--stellar-min-touch-target);
      flex: 1 1 auto;
      border: 0;
      outline: 0;
      background: transparent;
      color: inherit;
      font: inherit;
    }

    input::placeholder {
      color: currentColor;
      opacity: 0.65;
    }

    :host(:focus-within) .field {
      outline: var(--stellar-focus-ring-width) solid var(--stellar-primary);
      outline-offset: var(--stellar-focus-ring-offset);
    }

    :host([disabled]),
    :host([data-fieldset-disabled]) {
      opacity: 0.38;
    }

    :host([disabled]) .field,
    :host([data-fieldset-disabled]) .field {
      cursor: not-allowed;
    }

    @media (pointer: coarse) {
      .field,
      input {
        min-block-size: var(--stellar-min-touch-target);
      }
    }
    `,
  ];

  @property({ type: String }) type: "text" | "number" = "text";
  @property({ type: String }) value = "";
  @property({ type: String }) name = "";
  @property({ type: String }) label = "";
  @property({ type: String }) placeholder = "";
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, attribute: "readonly", reflect: true }) readOnly = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: String }) min = "";
  @property({ type: String }) max = "";
  @property({ type: String }) step = "";
  @property({ type: String }) autocomplete = "";
  @property({ type: String }) inputmode = "";
  @property({ type: String }) pattern = "";
  @property({ type: Number, attribute: "maxlength" }) maxLength?: number;
  @property({ type: Number, attribute: "minlength" }) minLength?: number;
  @property({ type: String, attribute: "aria-label" }) ariaLabel = "";
  @property({ type: String, attribute: "aria-labelledby" }) ariaLabelledBy = "";
  @property({ type: String, attribute: "aria-describedby" }) ariaDescribedBy = "";

  @query("input") private inputElement!: HTMLInputElement;

  private readonly inputId = `stellar-field-${++fieldId}`;
  private readonly internals: ElementInternals | null = this.attachFormInternals();
  private initialValue = "";
  private fieldsetDisabled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.initialValue = this.value;
  }

  override updated(): void {
    this.syncAriaReferences();
    this.syncFormValue();
  }

  override firstUpdated(): void {
    this.syncFormValue();
  }

  formResetCallback(): void {
    this.value = this.initialValue;
  }

  formDisabledCallback(disabled: boolean): void {
    this.fieldsetDisabled = disabled;
    this.toggleAttribute("data-fieldset-disabled", disabled);
    this.requestUpdate();
  }

  formStateRestoreCallback(state: File | string | FormData | null): void {
    if (typeof state === "string") {
      this.value = state;
      this.syncFormValue();
    } else if (typeof FormData !== "undefined" && state instanceof FormData && this.name) {
      const restoredValue = state.get(this.name);
      if (typeof restoredValue === "string") {
        this.value = restoredValue;
        this.syncFormValue();
      }
    }
  }

  override focus(options?: FocusOptions): void {
    this.inputElement?.focus(options);
  }

  override blur(): void {
    this.inputElement?.blur();
  }

  private handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.syncFormValue();
  }

  private handleChange(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.syncFormValue();
  }

  private syncFormValue(): void {
    if (!this.inputElement) return;

    this.internals?.setFormValue(this.isDisabled ? null : this.inputElement.value);

    const validity = this.inputElement.validity;
    if (validity.valid) {
      this.internals?.setValidity({});
    } else {
      this.internals?.setValidity(
        {
          badInput: validity.badInput,
          customError: validity.customError,
          patternMismatch: validity.patternMismatch,
          rangeOverflow: validity.rangeOverflow,
          rangeUnderflow: validity.rangeUnderflow,
          stepMismatch: validity.stepMismatch,
          tooLong: validity.tooLong,
          tooShort: validity.tooShort,
          typeMismatch: validity.typeMismatch,
          valueMissing: validity.valueMissing,
        },
        this.inputElement.validationMessage,
        this.inputElement,
      );
    }
  }

  private attachFormInternals(): ElementInternals | null {
    if (
      typeof this.attachInternals !== "function" ||
      typeof ElementInternals === "undefined" ||
      !("setFormValue" in ElementInternals.prototype)
    ) {
      return null;
    }

    try {
      return this.attachInternals();
    } catch {
      return null;
    }
  }

  private syncAriaReferences(): void {
    if (!this.inputElement) return;

    this.syncAriaReference(
      "ariaLabelledByElements",
      this.ariaLabelledBy,
      "aria-labelledby",
    );
    this.syncAriaReference(
      "ariaDescribedByElements",
      this.ariaDescribedBy,
      "aria-describedby",
    );
  }

  private syncAriaReference(
    propertyName: "ariaLabelledByElements" | "ariaDescribedByElements",
    ids: string,
    attributeName: "aria-labelledby" | "aria-describedby",
  ): void {
    const elements = ids
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => this.findLabelElement(id))
      .filter((element): element is HTMLElement => element !== null);
    const input = this.inputElement as HTMLInputElement & {
      ariaLabelledByElements?: Element[];
      ariaDescribedByElements?: Element[];
    };

    if (propertyName in input) {
      input[propertyName] = elements;
      input.removeAttribute(attributeName);
    } else {
      if (ids) input.setAttribute(attributeName, ids);
      else input.removeAttribute(attributeName);
    }
  }

  private findLabelElement(id: string): HTMLElement | null {
    const escapedId = CSS.escape(id);
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.querySelector<HTMLElement>(`[id="${escapedId}"]`) ?? document.getElementById(id);
  }

  override render() {
    const isDisabled = this.isDisabled;
    const input = html`
      <input
        id=${this.inputId}
        .value=${this.value}
        type=${this.type}
        name=${this.name}
        placeholder=${this.placeholder}
        ?disabled=${isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        min=${this.type === "number" ? this.min : nothing}
        max=${this.type === "number" ? this.max : nothing}
        step=${this.type === "number" ? this.step : nothing}
        autocomplete=${this.autocomplete || nothing}
        inputmode=${this.inputmode || nothing}
        pattern=${this.type === "text" ? this.pattern : nothing}
        maxlength=${this.maxLength ?? nothing}
        minlength=${this.minLength ?? nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-labelledby=${this.ariaLabelledBy || nothing}
        aria-describedby=${this.ariaDescribedBy || nothing}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
    `;

    return html`
      <div class="field" part="field">
        <slot name="start" part="start"></slot>
        ${this.label
          ? html`<label class="label" for=${this.inputId} part="label">${this.label}${input}</label>`
          : input}
        <slot name="end" part="end"></slot>
      </div>
    `;
  }

  private get isDisabled(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-field": StellarField;
  }
}
