import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { LoggingService} from '../services/logging-service';

export interface AccordionItem {
    id: string;
    header: string;
    content: string;
    isOpen?: boolean;
    icon?: string;
}

export interface AccordionOptions {
    allowMultiple?: boolean;
    defaultOpenIndex?: number;
    animated?: boolean;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    iconPosition?: 'left' | 'right';
    onToggle?: (itemId: string, isOpen: boolean) => void;
}

export class AccordionComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private accordionElement: HTMLElement | null = null;
    private items: AccordionItem[] = [];
    private options: AccordionOptions = {};
    private static stylesApplied = false;
    private loggingService: LoggingService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.loggingService = new LoggingService();
        this.applyAccordionStyles();
    }

    /**
     * Create an accordion element
     */
    create(items: AccordionItem[], options: AccordionOptions = {}): HTMLElement {
        try {
            this.items = [...items];
            this.options = {
                allowMultiple: false,
                animated: true,
                iconPosition: 'right',
                ...options
            };

            // Create container element
            this.accordionElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.accordionElement, 'eksi-accordion');

            // Add custom class if provided
            if (this.options.className) {
                this.domHandler.addClass(this.accordionElement, this.options.className);
            }

            // Add items to accordion
            this.renderItems();

            return this.accordionElement;
        } catch (error) {
          this.loggingService.error('Error creating accordion:', error);

            // Return a fallback element in case of error
            const fallbackElement = this.domHandler.createElement('div');
            fallbackElement.textContent = 'Accordion unavailable';
            return fallbackElement;
        }
    }

    /**
     * Render accordion items
     */
    private renderItems(): void {
        if (!this.accordionElement) return;

        // Clear existing items
        this.accordionElement.innerHTML = '';

        // Add each item
        this.items.forEach((item, index) => {
            // Create item container
            const itemElement = this.domHandler.createElement('div');
            this.domHandler.addClass(itemElement, 'eksi-accordion-item');
            itemElement.setAttribute('data-id', item.id);

            // Set initial state based on options
            const isInitiallyOpen = item.isOpen === true ||
                (this.options.defaultOpenIndex !== undefined && this.options.defaultOpenIndex === index);

            // Create header element
            const headerElement = this.createHeaderElement(item, isInitiallyOpen);

            // Create content element
            const contentElement = this.createContentElement(item, isInitiallyOpen);

            // Add to item container
            this.domHandler.appendChild(itemElement, headerElement);
            this.domHandler.appendChild(itemElement, contentElement);

            // Add to accordion
            this.domHandler.appendChild(this.accordionElement!, itemElement);
        });
    }

    /**
     * Create header element for an accordion item
     */
    private createHeaderElement(item: AccordionItem, isOpen: boolean): HTMLElement {
        const headerElement = this.domHandler.createElement('div');
        this.domHandler.addClass(headerElement, 'eksi-accordion-header');

        if (this.options.headerClassName) {
            this.domHandler.addClass(headerElement, this.options.headerClassName);
        }

        let headerContent = '';

        // Add icon if position is left
        if (item.icon && this.options.iconPosition === 'left') {
            headerContent += `<span class="material-icons eksi-accordion-icon eksi-accordion-custom-icon">${item.icon}</span>`;
        }

        // Add header text
        headerContent += `<span class="eksi-accordion-title">${item.header}</span>`;

        // Add toggle icon
        const toggleIconName = isOpen ? 'expand_less' : 'expand_more';
        headerContent += `<span class="material-icons eksi-accordion-toggle-icon">${toggleIconName}</span>`;

        // Add icon if position is right
        if (item.icon && this.options.iconPosition === 'right') {
            headerContent += `<span class="material-icons eksi-accordion-icon eksi-accordion-custom-icon">${item.icon}</span>`;
        }

        headerElement.innerHTML = headerContent;

        // Add click handler
        this.domHandler.addEventListener(headerElement, 'click', () => {
            this.toggleItem(item.id);
        });

        return headerElement;
    }

    /**
     * Create content element for an accordion item
     */
    private createContentElement(item: AccordionItem, isOpen: boolean): HTMLElement {
        const contentWrapper = this.domHandler.createElement('div');
        this.domHandler.addClass(contentWrapper, 'eksi-accordion-content-wrapper');

        if (!isOpen) {
            contentWrapper.style.display = 'none';
        }

        const contentElement = this.domHandler.createElement('div');
        this.domHandler.addClass(contentElement, 'eksi-accordion-content');

        if (this.options.contentClassName) {
            this.domHandler.addClass(contentElement, this.options.contentClassName);
        }

        // Add content (HTML is allowed)
        contentElement.innerHTML = item.content;

        this.domHandler.appendChild(contentWrapper, contentElement);
        return contentWrapper;
    }

    /**
     * Toggle an accordion item
     */
    toggleItem(itemId: string, forceState?: boolean): void {
        if (!this.accordionElement) return;

        // Find the item element
        const itemElement = this.domHandler.querySelector<HTMLElement>(
            `.eksi-accordion-item[data-id="${itemId}"]`,
            this.accordionElement
        );

        if (!itemElement) {
           this.loggingService.debug(`Item with ID ${itemId} not found`);
            return;
        }

        // Find content wrapper
        const contentWrapper = this.domHandler.querySelector<HTMLElement>(
            '.eksi-accordion-content-wrapper',
            itemElement
        );

        // Find toggle icon
        const toggleIcon = this.domHandler.querySelector<HTMLElement>(
            '.eksi-accordion-toggle-icon',
            itemElement
        );

        if (!contentWrapper || !toggleIcon) return;

        // Determine if we're opening or closing
        const isCurrentlyOpen = contentWrapper.style.display !== 'none';
        const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

        // Update item in items array
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            this.items[itemIndex].isOpen = shouldOpen;
        }

        // If not allowing multiple open items, close all other items
        if (shouldOpen && !this.options.allowMultiple) {
            this.closeAllExcept(itemId);
        }

        // Toggle visibility
        if (shouldOpen) {
            // Show content
            contentWrapper.style.display = 'block';
            toggleIcon.textContent = 'expand_less';

            // Animate if enabled
            if (this.options.animated) {
                // Get content height for animation
                const content = this.domHandler.querySelector<HTMLElement>(
                    '.eksi-accordion-content',
                    contentWrapper
                );

                if (content) {
                    // Set initial height to 0
                    contentWrapper.style.height = '0';

                    // Force reflow
                    void contentWrapper.offsetHeight;

                    // Set target height and animate
                    contentWrapper.style.height = `${content.offsetHeight}px`;

                    // After animation completes, set height to auto
                    setTimeout(() => {
                        contentWrapper.style.height = 'auto';
                    }, 300);
                }
            }
        } else {
            // Hide content
            toggleIcon.textContent = 'expand_more';

            // Animate if enabled
            if (this.options.animated) {
                // Get current height
                const currentHeight = contentWrapper.offsetHeight;

                // Set fixed height
                contentWrapper.style.height = `${currentHeight}px`;

                // Force reflow
                void contentWrapper.offsetHeight;

                // Animate to 0
                contentWrapper.style.height = '0';

                // After animation completes, set display to none
                setTimeout(() => {
                    contentWrapper.style.display = 'none';
                    contentWrapper.style.height = '';
                }, 300);
            } else {
                contentWrapper.style.display = 'none';
            }
        }

        // Call onToggle callback if provided
        if (this.options.onToggle) {
            this.options.onToggle(itemId, shouldOpen);
        }
    }

    /**
     * Close all items except the one with the given ID
     */
    private closeAllExcept(itemId: string): void {
        if (!this.accordionElement) return;

        const items = this.domHandler.querySelectorAll<HTMLElement>(
            '.eksi-accordion-item:not([data-id="' + itemId + '"])',
            this.accordionElement
        );

        items.forEach(itemElement => {
            const contentWrapper = this.domHandler.querySelector<HTMLElement>(
                '.eksi-accordion-content-wrapper',
                itemElement
            );

            const toggleIcon = this.domHandler.querySelector<HTMLElement>(
                '.eksi-accordion-toggle-icon',
                itemElement
            );

            if (!contentWrapper || !toggleIcon) return;

            // Only close if currently open
            if (contentWrapper.style.display !== 'none') {
                // Update toggle icon
                toggleIcon.textContent = 'expand_more';

                // Animate if enabled
                if (this.options.animated) {
                    // Get current height
                    const currentHeight = contentWrapper.offsetHeight;

                    // Set fixed height
                    contentWrapper.style.height = `${currentHeight}px`;

                    // Force reflow
                    void contentWrapper.offsetHeight;

                    // Animate to 0
                    contentWrapper.style.height = '0';

                    // After animation completes, set display to none
                    setTimeout(() => {
                        contentWrapper.style.display = 'none';
                        contentWrapper.style.height = '';
                    }, 300);
                } else {
                    contentWrapper.style.display = 'none';
                }

                // Update item in items array
                const item = itemElement.getAttribute('data-id');
                if (item) {
                    const itemIndex = this.items.findIndex(i => i.id === item);
                    if (itemIndex !== -1) {
                        this.items[itemIndex].isOpen = false;
                    }
                }
            }
        });
    }

    /**
     * Open all accordion items
     */
    openAll(): void {
        this.items.forEach(item => {
            this.toggleItem(item.id, true);
        });
    }

    /**
     * Close all accordion items
     */
    closeAll(): void {
        this.items.forEach(item => {
            this.toggleItem(item.id, false);
        });
    }

    /**
     * Update an item's content
     */
    updateItemContent(itemId: string, content: string): void {
        if (!this.accordionElement) return;

        // Find the item element
        const itemElement = this.domHandler.querySelector<HTMLElement>(
            `.eksi-accordion-item[data-id="${itemId}"]`,
            this.accordionElement
        );

        if (!itemElement) {
           this.loggingService.debug(`Item with ID ${itemId} not found`);
            return;
        }

        // Find content element
        const contentElement = this.domHandler.querySelector<HTMLElement>(
            '.eksi-accordion-content',
            itemElement
        );

        if (!contentElement) return;

        // Update content
        contentElement.innerHTML = content;

        // Update item in items array
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            this.items[itemIndex].content = content;
        }
    }

    /**
     * Update an item's header
     */
    updateItemHeader(itemId: string, header: string): void {
        if (!this.accordionElement) return;

        // Find the item element
        const itemElement = this.domHandler.querySelector<HTMLElement>(
            `.eksi-accordion-item[data-id="${itemId}"]`,
            this.accordionElement
        );

        if (!itemElement) {
           this.loggingService.debug(`Item with ID ${itemId} not found`);
            return;
        }

        // Find title element
        const titleElement = this.domHandler.querySelector<HTMLElement>(
            '.eksi-accordion-title',
            itemElement
        );

        if (!titleElement) return;

        // Update title
        titleElement.textContent = header;

        // Update item in items array
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            this.items[itemIndex].header = header;
        }
    }

    /**
     * Check if an item is open
     */
    isItemOpen(itemId: string): boolean {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            return !!this.items[itemIndex].isOpen;
        }
        return false;
    }

    /**
     * Add a new item to the accordion
     */
    addItem(item: AccordionItem): void {
        // Add to items array
        this.items.push(item);

        // Re-render all items
        this.renderItems();
    }

    /**
     * Remove an item from the accordion
     */
    removeItem(itemId: string): void {
        // Remove from items array
        this.items = this.items.filter(item => item.id !== itemId);

        // Re-render all items
        this.renderItems();
    }

    /**
     * Apply CSS styles for accordions
     */
    private applyAccordionStyles(): void {
        // Only apply styles once across all instances
        if (AccordionComponent.stylesApplied) return;

        const accordionStyles = `
            /* Accordion container */
            .eksi-accordion {
                width: 100%;
                border-radius: 6px;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            }

            /* Accordion item */
            .eksi-accordion-item {
                margin-bottom: 1px;
                background-color: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                overflow: hidden;
            }

            .eksi-accordion-item:last-child {
                margin-bottom: 0;
            }

            /* Accordion header */
            .eksi-accordion-header {
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                position: relative;
                color: #e0e0e0;
                font-weight: 500;
                font-size: 14px;
                background-color: rgba(255, 255, 255, 0.07);
                transition: background-color 0.2s ease;
            }

            .eksi-accordion-header:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }

            /* Accordion title */
            .eksi-accordion-title {
                flex-grow: 1;
            }

            /* Accordion toggle icon */
            .eksi-accordion-toggle-icon {
                font-size: 18px;
                transition: transform 0.2s ease;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Accordion custom icon */
            .eksi-accordion-custom-icon {
                margin-right: 10px;
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Accordion content wrapper (for animation) */
            .eksi-accordion-content-wrapper {
                height: auto;
                overflow: hidden;
                transition: height 0.3s ease;
            }

            /* Accordion content */
            .eksi-accordion-content {
                padding: 16px;
                color: #e0e0e0;
                font-size: 14px;
                line-height: 1.5;
                background-color: rgba(0, 0, 0, 0.1);
            }

            /* Light theme overrides */
            @media (prefers-color-scheme: light) {
                .eksi-accordion-item {
                    background-color: rgba(0, 0, 0, 0.02);
                }

                .eksi-accordion-header {
                    color: #333;
                    background-color: rgba(0, 0, 0, 0.03);
                }

                .eksi-accordion-header:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }

                .eksi-accordion-toggle-icon,
                .eksi-accordion-custom-icon {
                    color: rgba(0, 0, 0, 0.6);
                }

                .eksi-accordion-content {
                    color: #333;
                    background-color: rgba(0, 0, 0, 0.01);
                }
            }

            /* Primary theme variant */
            .eksi-accordion-primary .eksi-accordion-header {
                border-left: 3px solid #81c14b;
            }

            .eksi-accordion-primary .eksi-accordion-toggle-icon,
            .eksi-accordion-primary .eksi-accordion-custom-icon {
                color: #81c14b;
            }

            /* Secondary theme variant */
            .eksi-accordion-secondary .eksi-accordion-header {
                border-left: 3px solid #ff7063;
            }

            .eksi-accordion-secondary .eksi-accordion-toggle-icon,
            .eksi-accordion-secondary .eksi-accordion-custom-icon {
                color: #ff7063;
            }
        `;

        this.cssHandler.addCSS(accordionStyles);
        AccordionComponent.stylesApplied = true;
    }

    /**
     * Cleanup
     */
    destroy(): void {
        if (this.accordionElement && this.accordionElement.parentNode) {
            this.accordionElement.parentNode.removeChild(this.accordionElement);
        }
        this.accordionElement = null;
        this.items = [];
    }
}