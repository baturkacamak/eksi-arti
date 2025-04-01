import { ISortingStrategy } from "../ISortingStrategy";

/**
 * Strategy for sorting entries by favorite count
 */
export class FavoriteCountSortingStrategy implements ISortingStrategy {
  name = "favorite";
  icon = "favorite";
  tooltip = "Favori sayısına göre sırala";

  sort(a: HTMLElement, b: HTMLElement): number {
    const aFav = parseInt(a.getAttribute("data-favorite-count") || "0");
    const bFav = parseInt(b.getAttribute("data-favorite-count") || "0");
    return bFav - aFav;
  }
}
