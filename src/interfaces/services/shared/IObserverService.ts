/**
 * Configuration options for observer registration
 */
export interface ObserverConfig {
    /** CSS selector to watch for */
    selector: string;

    /** Handler to call when matching elements are found */
    handler: (elements: Element[]) => void;

    /** Root element to observe. Defaults to document.body */
    root?: Element | Document;

    /** Whether to process existing elements immediately. Defaults to true */
    processExisting?: boolean;

    /** Whether to observe subtree mutations. Defaults to true */
    subtree?: boolean;

    /** Watch for node additions only. Defaults to true */
    additionsOnly?: boolean;

    /** Delay in ms before processing to ensure DOM is fully updated. Defaults to 50ms */
    debounceTime?: number;

    /** Only call handler for direct matches vs. searching subtree. Defaults to false */
    directMatchesOnly?: boolean;

    /** Custom ID for this observer (for removal) */
    id?: string;
}

export interface IObserverService {
    initialize(): void;
    observe(config: ObserverConfig): string;
    unobserve(id: string): void;
    dispose(): void;
}
