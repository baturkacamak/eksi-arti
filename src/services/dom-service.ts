import {IDOMService} from "../interfaces/services/IDOMService";

export class DOMService implements IDOMService {
    /**
     * Query selector wrapper
     */
    querySelector<T extends Element>(selector: string, context: Document | Element = document): T | null {
        return context.querySelector<T>(selector);
    }

    /**
     * Query selector all wrapper
     */
    querySelectorAll<T extends Element | HTMLElement>(selector: string, context: Document | Element | HTMLElement = document): NodeListOf<T> {
        return context.querySelectorAll<T>(selector);
    }

    /**
     * Create element wrapper
     */
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] {
        return document.createElement(tagName);
    }

    /**
     * Add class to element
     */
    addClass(element: Element, className: string): void {
        element.classList.add(className);
    }

    /**
     * Remove class from element
     */
    removeClass(element: Element, className: string): void {
        element.classList.remove(className);
    }

    /**
     * Check if element has class
     */
    hasClass(element: Element, className: string): boolean {
        return element.classList.contains(className);
    }

    /**
     * Toggle class on element
     */
    toggleClass(element: Element, className: string): void {
        element.classList.toggle(className);
    }

    /**
     * Append child element
     */
    appendChild(parent: Node, child: Node): void {
        parent.appendChild(child);
    }

    /**
     * Remove child element
     */
    removeChild(parent: Node, child: Node): void {
        parent.removeChild(child);
    }

    /**
     * Add event listener
     */
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
    ): void {
        element.addEventListener(event, callback, options);
    }

    /**
     * Create text node
     */
    createTextNode(text: string): Text {
        return document.createTextNode(text);
    }

    /**
     * Safe insert before - validates parent-child relationships before insertion
     */
    insertBefore(parent: Node, newNode: Node, referenceNode: Node | null): void {
        // If referenceNode is null, append to parent (standard behavior)
        if (!referenceNode) {
            parent.appendChild(newNode);
            return;
        }

        // Verify that referenceNode is actually a DIRECT child of parent
        if (referenceNode.parentNode !== parent) {
            // Fallback to appendChild if reference node is not a direct child
            parent.appendChild(newNode);
            return;
        }

        try {
            // Safe to insert before the reference node
            parent.insertBefore(newNode, referenceNode);
        } catch (error) {
            // Final fallback - if insertion still fails, append to parent
            console.warn('DOMService: insertBefore failed, falling back to appendChild:', error);
            parent.appendChild(newNode);
        }
    }

    insertAfter(parent: Node, newNode: Node, referenceNode: Node | null): void {
        if (!referenceNode) {
            parent.appendChild(newNode);
            return;
        }

        if (referenceNode.parentNode !== parent) {
            parent.appendChild(newNode);
            return;
        }

        this.insertBefore(parent, newNode, referenceNode.nextSibling);
    }
}