import { ISortingStrategy } from "./ISortingStrategy";

/**
 * Abstract base class for sorting strategies that implements the Template Method Pattern
 * Handles direction logic centrally while allowing concrete strategies to focus on comparison logic
 */
export abstract class BaseSortingStrategy implements ISortingStrategy {
    abstract readonly name: string;
    abstract readonly icon: string;
    abstract readonly tooltip: string;
    
    readonly displayName?: string;
    readonly defaultDirection: 'asc' | 'desc' = 'desc';

    /**
     * Template method that handles direction logic
     * Concrete strategies should not override this method
     */
    public sort(a: HTMLElement, b: HTMLElement, direction: 'asc' | 'desc' = 'desc'): number {
        const result = this.compare(a, b);
        return direction === 'asc' ? -result : result;
    }

    /**
     * Abstract method that concrete strategies must implement
     * Should return positive if b should come before a, negative if a should come before b
     * This assumes descending order by default (larger values first)
     */
    protected abstract compare(a: HTMLElement, b: HTMLElement): number;
} 