import { BaseSortingStrategy } from "../BaseSortingStrategy";

/**
 * Strategy for sorting entries by date (using data-id as proxy for timestamp)
 */
export class DateSortingStrategy extends BaseSortingStrategy {
  readonly name = "date";
  readonly icon = "access_time";
  readonly tooltip = "Tarihe göre sırala (varsayılan)";

  protected compare(a: HTMLElement, b: HTMLElement): number {
    const aId = parseInt(a.getAttribute("data-id") || "0");
    const bId = parseInt(b.getAttribute("data-id") || "0");
    return bId - aId; // Descending by default (newer first)
  }
} 