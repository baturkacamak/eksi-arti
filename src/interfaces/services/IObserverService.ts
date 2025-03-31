export interface ObserverConfig {
    selector: string;
    handler: (elements: Element[]) => void;
    root?: Element | Document;
    processExisting?: boolean;
    subtree?: boolean;
    additionsOnly?: boolean;
    debounceTime?: number;
    directMatchesOnly?: boolean;
    id?: string;
}

export interface IObserverService {
    initialize(): void;
    observe(config: ObserverConfig): string;
    unobserve(id: string): void;
    dispose(): void;
}
