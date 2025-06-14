/**
 * Interface for entry sorting strategies
 */
export interface ISortingStrategy {
  /**
   * Sort two elements
   * @param direction - 'asc' for ascending, 'desc' for descending
   * @returns Negative if a should come before b, positive if b should come before a
   */
  sort(a: HTMLElement, b: HTMLElement, direction?: 'asc' | 'desc'): number;

  /**
   * Strategy name (for identification)
   */
  name: string;

  readonly displayName?: string;

  /**
   * Icon to display in UI
   */
  icon: string;

  /**
   * Tooltip text to display in UI
   */
  tooltip: string;

  /**
   * Default sort direction for this strategy
   */
  defaultDirection?: 'asc' | 'desc';
} 