/**
 * Interface for entry sorting strategies
 */
export interface ISortingStrategy {
  /**
   * Sort two elements
   * @returns Negative if a should come before b, positive if b should come before a
   */
  sort(a: HTMLElement, b: HTMLElement): number;

  /**
   * Strategy name (for identification)
   */
  name: string;

  /**
   * Icon to display in UI
   */
  icon: string;

  /**
   * Tooltip text to display in UI
   */
  tooltip: string;
}
