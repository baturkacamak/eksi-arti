import { BaseSortingStrategy } from "../BaseSortingStrategy";

/**
 * Strategy for sorting entries by favorite count
 */
export class FavoriteCountSortingStrategy extends BaseSortingStrategy {
  readonly name = "favorite";
  readonly icon = "favorite";
  readonly tooltip = "Favori sayısına göre sırala";

  protected compare(a: HTMLElement, b: HTMLElement): number {
    const aFav = parseInt(a.getAttribute("data-favorite-count") || "0");
    const bFav = parseInt(b.getAttribute("data-favorite-count") || "0");
    return bFav - aFav; // Descending by default (most favorites first)
  }
} 