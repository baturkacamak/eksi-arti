import { BaseSortingStrategy } from "../BaseSortingStrategy";

/**
 * Strategy for sorting entries by content length
 */
export class LengthSortingStrategy extends BaseSortingStrategy {
  readonly name = "length";
  readonly icon = "format_line_spacing";
  readonly tooltip = "Uzunluğa göre sırala";

  protected compare(a: HTMLElement, b: HTMLElement): number {
    return this.getEntryLength(b) - this.getEntryLength(a); // Descending by default (longest first)
  }

  private getEntryLength(entry: HTMLElement): number {
    const content = entry.querySelector(".content");
    if (!content) return 0;
    const whitespaceMatches = content.textContent?.match(/\s+/g);
    return whitespaceMatches ? whitespaceMatches.length : 0;
  }
} 