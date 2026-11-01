import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { StellarButton } from "../button/button.js";

export interface ButtonGroupChangeDetail {
  value: string;
  index: number;
  button: StellarButton;
}

/**
 * A wrapping, single-select group of buttons.
 *
 * Use `<stellar-button>` children with a `value` attribute. The group follows
 * the WAI-ARIA radio group pattern: it exposes the buttons as radios, keeps a
 * roving tabindex so only the selected button is in the tab order, and emits a
 * `change` event when the selection changes. Arrow keys move focus and select
 * the next/previous button.
 *
 * Add `<span data-spacer aria-hidden="true"></span>` between buttons to push
 * the following buttons to the end of the current line, matching the Figma
 * ToggleGroup layout.
 */
@customElement("stellar-button-group")
export class StellarButtonGroup extends LitElement {
  @property({ type: String, attribute: "selected-value" })
  selectedValue = "";

  @property({ type: Number, attribute: "selected-index" })
  selectedIndex = 0;

  @property({ type: String, attribute: "aria-label", reflect: true })
  ariaLabel = "";

  @property({ type: String, attribute: "aria-labelledby", reflect: true })
  ariaLabelledBy = "";

  @property({ type: String, attribute: "aria-describedby", reflect: true })
  ariaDescribedBy = "";

  @query("slot")
  private buttonSlot?: HTMLSlotElement;

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: block;
        color: var(--stellar-foreground);
      }

      .group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 2px;
      }

      ::slotted(*) {
        flex: 0 0 auto;
      }

      ::slotted([data-spacer]) {
        flex: 1 1 0;
        align-self: stretch;
      }
    `,
  ];

  override render() {
    return html`
      <div class="group" part="group" @click=${this.handleClick} @keydown=${this.handleKeydown}>
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "radiogroup");
  }

  override firstUpdated(): void {
    this.syncButtons();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("selectedValue") || changed.has("selectedIndex")) {
      this.syncButtons();
    }
  }

  private getButtons(): StellarButton[] {
    return (
      this.buttonSlot
        ?.assignedElements({ flatten: true })
        .filter(
          (element): element is StellarButton =>
            element instanceof StellarButton &&
            !element.hasAttribute("hidden") &&
            element.getAttribute("aria-hidden") !== "true",
        ) ?? []
    );
  }

  private handleSlotChange = (): void => this.syncButtons();

  private syncButtons(): void {
    const buttons = this.getButtons();
    if (!buttons.length) {
      this.selectedIndex = -1;
      return;
    }

    let index = this.selectedValue
      ? buttons.findIndex((button) => button.value === this.selectedValue)
      : this.selectedIndex;

    if (index < 0 || index >= buttons.length || buttons[index].disabled) {
      index = buttons.findIndex((button) => button.selected && !button.disabled);
    }
    if (index < 0) {
      index = buttons.findIndex((button) => !button.disabled);
    }

    this.selectedIndex = index;
    if (index >= 0 && this.selectedValue !== buttons[index].value) {
      this.selectedValue = buttons[index].value;
    }

    buttons.forEach((button, buttonIndex) => {
      const checked = buttonIndex === index;
      button.toggle = false;
      button.selected = checked;
      button.setRadio(checked);
      button.setTabIndex(checked ? 0 : -1);
    });
  }

  private buttonFromEvent(event: Event): StellarButton | null {
    const buttons = this.getButtons();
    const button = event
      .composedPath()
      .find(
        (node): node is StellarButton =>
          node instanceof StellarButton && buttons.includes(node),
      );
    return button ?? null;
  }

  private handleClick = (event: MouseEvent): void => {
    const button = this.buttonFromEvent(event);
    if (!button) return;
    this.selectButton(this.getButtons().indexOf(button));
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    const button = this.buttonFromEvent(event);
    if (
      !button ||
      event.defaultPrevented ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return;
    }

    const index = this.getButtons().indexOf(button);
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = this.nextEnabled(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = this.nextEnabled(index, -1);
    } else if (event.key === "Home") {
      nextIndex = this.nextEnabled(-1, 1);
    } else if (event.key === "End") {
      nextIndex = this.nextEnabled(this.getButtons().length, -1);
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    this.selectButton(nextIndex, true);
  };

  private nextEnabled(start: number, direction: 1 | -1): number | undefined {
    const buttons = this.getButtons();
    for (let offset = 1; offset <= buttons.length; offset += 1) {
      const index =
        (start + direction * offset + buttons.length) % buttons.length;
      if (!buttons[index].disabled) return index;
    }
    return undefined;
  }

  private selectButton(index: number, moveFocus = false): void {
    const buttons = this.getButtons();
    const button = buttons[index];
    if (!button || button.disabled) return;

    const changed =
      index !== this.selectedIndex || button.value !== this.selectedValue;
    this.selectedIndex = index;
    this.selectedValue = button.value;
    this.syncButtons();
    if (moveFocus) button.focus();

    if (changed) {
      this.dispatchEvent(
        new CustomEvent<ButtonGroupChangeDetail>("change", {
          bubbles: true,
          composed: true,
          detail: { value: button.value, index, button },
        }),
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-button-group": StellarButtonGroup;
  }
}
