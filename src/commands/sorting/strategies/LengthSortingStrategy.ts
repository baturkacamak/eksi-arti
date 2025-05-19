import { ISortingStrategy } from "../ISortingStrategy";

/**
 * Strategy for sorting entries by content length
 */
export class LengthSortingStrategy implements ISortingStrategy {
  name = "length";
  icon = "format_line_spacing";
  tooltip = "Uzunluğa göre sırala";

  sort(a: HTMLElement, b: HTMLElement): number {
    return this.getEntryLength(b) - this.getEntryLength(a);
  }

  private getEntryLength(entry: HTMLElement): number {
    const content = entry.querySelector(".content");
    if (!content) return 0;
    const whitespaceMatches = content.textContent?.match(/\s+/g);
    return whitespaceMatches ? whitespaceMatches.length : 0;
  }
} 