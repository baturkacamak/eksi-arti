import { ISortingStrategy } from "../ISortingStrategy";

/**
 * Strategy for sorting entries by date (using data-id as proxy for timestamp)
 */
export class DateSortingStrategy implements ISortingStrategy {
  name = "date";
  icon = "access_time";
  tooltip = "Tarihe göre sırala (varsayılan)";

  sort(a: HTMLElement, b: HTMLElement): number {
    const aId = parseInt(a.getAttribute("data-id") || "0");
    const bId = parseInt(b.getAttribute("data-id") || "0");
    return bId - aId;
  }
}
