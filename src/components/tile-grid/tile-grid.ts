import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { modernNormalizeStyles } from "../../styles/modern-normalize-styles.js";
import { getNextGridIndex, getSelectionChange } from "./tile-grid-navigation.js";
import type { TileGridNavigationKey } from "./tile-grid-navigation.js";

export interface TileGridSelectDetail {
  index: number;
  item: HTMLElement;
  selected: boolean;
}

const navigationKeys = new Set<TileGridNavigationKey>([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

@customElement("stellar-tile-grid")
export class StellarTileGrid extends LitElement {
  @property({ type: Number, reflect: true }) columns = 0;
  @property({ type: String, attribute: "min-item-width" }) minItemWidth = "6rem";
  @property({ type: String, attribute: "min-item-height" }) minItemHeight = "var(--stellar-min-dense-touch-target)";
  @property({ type: String }) label = "";
  @property({ type: Number, attribute: "selected-index", reflect: true })
  selectedIndex = -1;
  @property({ type: Boolean, attribute: "autofocus" })
  autofocus = true;
  @state() private itemCount = 0;

  static override styles = [
    modernNormalizeStyles,
    css`
      :host {
        --stellar-tile-grid-min-item-width: 6rem;
        --stellar-tile-grid-min-item-height: var(--stellar-min-dense-touch-target);
        display: block;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(
            var(--stellar-tile-grid-min-item-width),
            1fr
          )
        );
        gap: 2px;
        padding: 2px;
        background: var(--stellar-surface);
        border-radius: var(--stellar-radius-base);
      }

      :host([columns]:not([columns="0"])) .grid {
        grid-template-columns: repeat(
          var(--stellar-tile-grid-columns),
          minmax(var(--stellar-tile-grid-min-item-width))
        );
      }

      ::slotted(*) {
        min-inline-size: 0;
        min-block-size: var(--stellar-tile-grid-min-item-height);
        border-radius: var(--stellar-radius-base);
      }

      ::slotted([aria-selected="true"]) {
        background: var(--stellar-secondary);
        color: var(--stellar-on-secondary);
      }

      ::slotted(:focus-visible) {
        outline: var(--stellar-focus-ring-width) solid
          var(--stellar-primary);
        outline-offset: var(--stellar-focus-ring-offset);
      }
    `,
  ];

  override render() {
    return html`
      <div
        class="grid"
        role="grid"
        aria-label=${this.label || "Tile grid"}
        aria-rowcount=${this.itemCount
        ? Math.ceil(this.itemCount / this.getColumnCount())
        : 0}
        aria-colcount=${this.getColumnCount()}
        style=${`--stellar-tile-grid-columns: ${this.getColumnCount()}; --stellar-tile-grid-min-item-width: ${this.minItemWidth}; --stellar-tile-grid-min-item-height: ${this.minItemHeight};`}
        @keydown=${this.handleKeydown}
        @click=${this.handleClick}
      >
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `;
  }

  override firstUpdated(): void {
    this.syncItems();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("selectedIndex") || changed.has("columns")) {
      this.syncItems();
    }
  }

  private getSlot(): HTMLSlotElement | null {
    return this.shadowRoot?.querySelector("slot") ?? null;
  }

  private getItems(): HTMLElement[] {
    return (
      this.getSlot()
        ?.assignedElements({ flatten: true })
        .filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement &&
            !element.hasAttribute("data-tile-grid-ignore") &&
            !element.hasAttribute("hidden") &&
            element.getAttribute("aria-hidden") !== "true",
        ) ?? []
    );
  }

  private getColumnCount(): number {
    return Math.max(1, this.columns || this.itemCount || 1);
  }

  private getNavigationColumnCount(): number {
    if (this.columns > 0) return this.columns;

    const items = this.getItems();
    if (items.length < 2) return 1;
    const firstTop = items[0].getBoundingClientRect().top;
    const measuredColumns = items.findIndex(
      (item) => Math.abs(item.getBoundingClientRect().top - firstTop) > 1,
    );
    return measuredColumns > 0 ? measuredColumns : items.length;
  }

  private handleSlotChange(): void {
    this.syncItems();
  }

  private syncItems(): void {
    const items = this.getItems();
    this.itemCount = items.length;

    if (items.length === 0) {
      this.selectedIndex = -1;
      return;
    }

    const markedIndex = items.findIndex(
      (item) =>
        item.getAttribute("aria-selected") === "true" ||
        item.hasAttribute("selected"),
    );
    const nextSelectedIndex =
      this.selectedIndex >= 0 && this.selectedIndex < items.length
        ? this.selectedIndex
        : markedIndex >= 0
          ? markedIndex
          : 0;
    const enabledSelectedIndex = this.isDisabled(items[nextSelectedIndex])
      ? items.findIndex((item) => !this.isDisabled(item))
      : nextSelectedIndex;
    this.selectedIndex = enabledSelectedIndex >= 0 ? enabledSelectedIndex : -1;

    items.forEach((item, index) => {
      item.setAttribute("role", "gridcell");
      item.setAttribute("tabindex", index === this.selectedIndex ? "0" : "-1");
      item.setAttribute(
        "aria-selected",
        index === this.selectedIndex ? "true" : "false",
      );
      item.setAttribute("aria-rowindex", String(Math.floor(index / this.getColumnCount()) + 1));
      item.setAttribute("aria-colindex", String((index % this.getColumnCount()) + 1));
    });
  }

  private itemFromEvent(event: Event): HTMLElement | null {
    const item = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && this.getItems().includes(node),
      );
    return item ?? null;
  }

  private handleKeydown(event: KeyboardEvent): void {
    const item = this.itemFromEvent(event);
    if (!item || event.defaultPrevented || event.altKey || event.metaKey) return;

    const key = event.key;
    if (key === " " || key === "Enter") {
      event.preventDefault();
      this.selectItem(this.getItems().indexOf(item));
      return;
    }
    if (!navigationKeys.has(key as TileGridNavigationKey)) return;
    if (event.ctrlKey && key !== "Home" && key !== "End") return;

    const items = this.getItems();
    const nextIndex = getNextGridIndex(
      items.indexOf(item),
      items.length,
      this.getNavigationColumnCount(),
      key as TileGridNavigationKey,
      event.ctrlKey,
    );
    if (nextIndex === null) return;
    if (this.isDisabled(items[nextIndex])) return;

    event.preventDefault();
    this.focusItem(nextIndex);
    if (this.autofocus) this.selectItem(nextIndex);
  }

  private handleClick(event: MouseEvent): void {
    const item = this.itemFromEvent(event);
    if (item) this.selectItem(this.getItems().indexOf(item));
  }

  private focusItem(index: number): void {
    const items = this.getItems();
    const item = items[index];
    if (!item) return;
    items.forEach((candidate, candidateIndex) =>
      candidate.setAttribute("tabindex", candidateIndex === index ? "0" : "-1"),
    );
    item.focus();
    item.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  private selectItem(index: number): void {
    const items = this.getItems();
    const item = items[index];
    if (!item || this.isDisabled(item)) return;
    if (this.selectedIndex === index) {
      this.focusItem(index);
      return;
    }

    const selection = getSelectionChange(this.selectedIndex, index, items.length);
    this.selectedIndex = index;
    items.forEach((candidate, candidateIndex) => {
      candidate.setAttribute(
        "aria-selected",
        candidateIndex === index ? "true" : "false",
      );
    });
    this.focusItem(index);
    if (!selection) return;

    this.dispatchEvent(
      new CustomEvent<TileGridSelectDetail>("tile-select", {
        bubbles: true,
        composed: true,
        detail: { index, item, selected: true },
      }),
    );
  }

  private isDisabled(item: HTMLElement): boolean {
    return (
      item.hasAttribute("disabled") ||
      item.getAttribute("aria-disabled") === "true"
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-tile-grid": StellarTileGrid;
  }
}
