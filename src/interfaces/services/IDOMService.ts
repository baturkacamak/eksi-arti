export interface IDOMService {
    querySelector<T extends Element>(selector: string, context?: Document | Element): T | null;
    querySelectorAll<T extends Element | HTMLElement>(selector: string, context?: Document | Element | HTMLElement): NodeListOf<T>;
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K];
    addClass(element: Element, className: string): void;
    removeClass(element: Element, className: string): void;
    hasClass(element: Element, className: string): boolean;
    toggleClass(element: Element, className: string): void;
    appendChild(parent: Node, child: Node): void;
    removeChild(parent: Node, child: Node): void;
    addEventListener<K extends keyof HTMLElementEventMap>(
        element: HTMLElement,
        event: K,
        callback: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        element: HTMLElement,
        event: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void;
    insertBefore(parent: Node, newNode: Node, referenceNode: Node | null): void;
    createTextNode(text: string): Text;
}
