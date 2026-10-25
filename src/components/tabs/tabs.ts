import { LitElement, css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { StellarTab } from "./tab.js";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivation = "automatic" | "manual";

export class StellarTabs extends LitElement {
  @property({ type: String, reflect: true }) orientation: TabsOrientation = "horizontal";
  @property({ type: String }) activation: TabsActivation = "manual";
  @property({ type: Boolean }) manual = false;
  @property({ type: Number, attribute: "selected-index" }) selectedIndex = 0;
  @property({ type: String, attribute: "selected-value" }) selectedValue = "";
  @query("slot") private tabSlot!: HTMLSlotElement;
  @state() private tabs: StellarTab[] = [];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        display: block;
        color: var(--stellar-foreground);
      }

      [role="tablist"] {
        display: flex;
        gap: 4px;
      }

      :host([orientation="vertical"]) [role="tablist"] {
        flex-direction: column;
      }

      ::slotted(stellar-tab) {
        display: contents;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("stellar-tab-activate", this.handleActivation);
    this.addEventListener("keydown", this.handleKeydown);
  }

  override disconnectedCallback(): void {
    this.removeEventListener("stellar-tab-activate", this.handleActivation);
    this.removeEventListener("keydown", this.handleKeydown);
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this.tabSlot.addEventListener("slotchange", this.handleSlotChange);
    this.syncTabs();
  }

  override updated(changed: Map<string, unknown>): void {
    if (
      changed.has("selectedIndex") ||
      changed.has("selectedValue") ||
      changed.has("orientation") ||
      changed.has("activation") ||
      changed.has("manual")
    ) {
      this.syncTabs();
    }
  }

  override render() {
    return html`
      <div
        role="tablist"
        aria-orientation=${this.orientation}
        @click=${this.handleTabClick}
      >
        <slot></slot>
      </div>
    `;
  }

  private handleSlotChange = (): void => this.syncTabs();

  private syncTabs(): void {
    if (!this.tabSlot) return;
    this.tabs = this.tabSlot
      .assignedElements({ flatten: true })
      .filter((element): element is StellarTab => element instanceof StellarTab);
    if (!this.tabs.length) return;

    let index = this.selectedValue
      ? this.tabs.findIndex((tab) => tab.value === this.selectedValue)
      : this.selectedIndex;
    if (index < 0 || index >= this.tabs.length || this.tabs[index]?.disabled) {
      index = this.tabs.findIndex((tab) => !tab.disabled);
      if (index < 0) return;
    }
    this.selectedIndex = index;
    this.selectedValue = this.tabs[index].value;
    this.tabs.forEach((tab, tabIndex) => {
      tab.selected = tabIndex === index;
      tab.setPosition(tabIndex + 1, this.tabs.length);
    });
  }

  private activate(index: number, moveFocus = false): void {
    const tab = this.tabs[index];
    if (!tab || tab.disabled) return;
    const changed = this.selectedIndex !== index;
    this.selectedIndex = index;
    this.selectedValue = tab.value;
    this.tabs.forEach((item, itemIndex) => {
      item.selected = itemIndex === index;
      item.setTabIndex(itemIndex === index ? 0 : -1);
    });
    if (moveFocus) tab.focus();
    if (changed) {
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: { tab, index, value: tab.value },
        }),
      );
    }
  }

  private handleActivation = (event: Event): void => {
    const tab = (event as CustomEvent<{ tab: StellarTab }>).detail.tab;
    const index = this.tabs.indexOf(tab);
    if (index >= 0) this.activate(index, true);
  };

  private handleTabClick = (event: MouseEvent): void => {
    const tab = this.tabs.find((item) => event.composedPath().includes(item));
    if (tab) this.activate(this.tabs.indexOf(tab), true);
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    const tab = this.tabs.find((item) => event.composedPath().includes(item));
    if (!tab) return;
    const index = this.tabs.indexOf(tab);
    const isHorizontal = this.orientation === "horizontal";
    let nextIndex: number | undefined;
    if ((isHorizontal && event.key === "ArrowRight") || (!isHorizontal && event.key === "ArrowDown")) {
      nextIndex = this.nextEnabled(index, 1);
    } else if ((isHorizontal && event.key === "ArrowLeft") || (!isHorizontal && event.key === "ArrowUp")) {
      nextIndex = this.nextEnabled(index, -1);
    } else if (event.key === "Home") {
      nextIndex = this.nextEnabled(-1, 1);
    } else if (event.key === "End") {
      nextIndex = this.nextEnabled(this.tabs.length, -1);
    } else if (event.key === "Enter" || event.key === " ") {
      if (this.activation === "manual" || this.manual) {
        event.preventDefault();
        this.activate(index);
      }
      return;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    this.tabs[nextIndex].focus();
    if (this.activation === "automatic" && !this.manual) this.activate(nextIndex);
  };

  private nextEnabled(start: number, direction: 1 | -1): number | undefined {
    for (let offset = 1; offset <= this.tabs.length; offset += 1) {
      const index = (start + direction * offset + this.tabs.length) % this.tabs.length;
      if (!this.tabs[index].disabled) return index;
    }
    return undefined;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("stellar-tabs")) {
  customElements.define("stellar-tabs", StellarTabs);
}

export { StellarTab };
