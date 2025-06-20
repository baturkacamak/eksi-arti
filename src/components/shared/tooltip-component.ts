import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { ITooltipComponent, ITooltipOptions } from "../../interfaces/components/ITooltipComponent";

export interface TooltipOptions {
    position?: 'top' | 'bottom' | 'left' | 'right';
    triggerEvent?: 'hover' | 'click' | 'both';
    width?: string;
    maxWidth?: string;
    theme?: 'light' | 'dark';
    closeOnOutsideClick?: boolean;
    showDelay?: number;
    hideDelay?: number;
    offset?: number;
    closeButton?: boolean;
}

export class TooltipComponent {
    private activeTooltips: Map<HTMLElement, HTMLElement> = new Map();
    private delayTimeouts: Map<HTMLElement, number> = new Map();
    private documentClickListener: ((e: MouseEvent) => void) | null = null;

    private defaultOptions: Required<TooltipOptions> = {
        position: 'top',
        triggerEvent: 'hover',
        width: 'auto',
        maxWidth: '300px',
        theme: 'dark',
        closeOnOutsideClick: true,
        showDelay: 300,
        hideDelay: 200,
        offset: 8,
        closeButton: false
    };

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
    ) {
        this.applyTooltipStyles();
        this.initializeTooltips();
    }

    /**
     * Initialize all tooltips on the page
     */
    public initializeTooltips(): void {
        const tooltipTriggers = this.domService.querySelectorAll<HTMLElement>('.tooltip-trigger');
        tooltipTriggers.forEach(trigger => {
            this.setupTooltip(trigger);
        });
    }

    /**
     * Setup tooltip for a specific trigger element
     */
    public setupTooltip(triggerElement: HTMLElement, customOptions: Partial<TooltipOptions> = {}): void {
        // Get tooltip content element
        const tooltipContentId = triggerElement.getAttribute('data-tooltip-content');
        if (!tooltipContentId) return;

        const tooltipContent = this.domService.querySelector(`#${tooltipContentId}`) as HTMLElement;
        if (!tooltipContent) return;

        // Hide tooltip content element
        tooltipContent.style.display = 'none';

        // Parse options from data attributes and merge with defaults
        const options = this.parseOptions(triggerElement, customOptions);

        // Setup event listeners
        this.setupEventListeners(triggerElement, tooltipContent, options);
    }

    /**
     * Parse tooltip options from data attributes
     */
    private parseOptions(element: HTMLElement, customOptions: Partial<TooltipOptions> = {}): Required<TooltipOptions> {
        const options = { ...this.defaultOptions };

        // Parse data attributes
        if (element.hasAttribute('data-tooltip-position')) {
            const position = element.getAttribute('data-tooltip-position') as TooltipOptions['position'];
            if (position && ['top', 'bottom', 'left', 'right'].includes(position)) {
                options.position = position;
            }
        }

        if (element.hasAttribute('data-tooltip-trigger')) {
            const trigger = element.getAttribute('data-tooltip-trigger') as TooltipOptions['triggerEvent'];
            if (trigger && ['hover', 'click', 'both'].includes(trigger)) {
                options.triggerEvent = trigger;
            }
        }

        if (element.hasAttribute('data-tooltip-theme')) {
            const theme = element.getAttribute('data-tooltip-theme') as TooltipOptions['theme'];
            if (theme && ['light', 'dark'].includes(theme)) {
                options.theme = theme;
            }
        }

        if (element.hasAttribute('data-tooltip-width')) {
            options.width = element.getAttribute('data-tooltip-width') || options.width;
        }

        if (element.hasAttribute('data-tooltip-max-width')) {
            options.maxWidth = element.getAttribute('data-tooltip-max-width') || options.maxWidth;
        }

        if (element.hasAttribute('data-tooltip-close-outside')) {
            options.closeOnOutsideClick = element.getAttribute('data-tooltip-close-outside') === 'true';
        }

        if (element.hasAttribute('data-tooltip-show-delay')) {
            const delay = parseInt(element.getAttribute('data-tooltip-show-delay') || '0', 10);
            if (!isNaN(delay)) options.showDelay = delay;
        }

        if (element.hasAttribute('data-tooltip-hide-delay')) {
            const delay = parseInt(element.getAttribute('data-tooltip-hide-delay') || '0', 10);
            if (!isNaN(delay)) options.hideDelay = delay;
        }

        if (element.hasAttribute('data-tooltip-offset')) {
            const offset = parseInt(element.getAttribute('data-tooltip-offset') || '0', 10);
            if (!isNaN(offset)) options.offset = offset;
        }

        if (element.hasAttribute('data-tooltip-close-button')) {
            options.closeButton = element.getAttribute('data-tooltip-close-button') === 'true';
        }

        // Merge with custom options
        return { ...options, ...customOptions };
    }

    /**
     * Setup event listeners for tooltip
     */
    private setupEventListeners(
        triggerElement: HTMLElement,
        tooltipContent: HTMLElement,
        options: Required<TooltipOptions>
    ): void {
        if (options.triggerEvent === 'hover' || options.triggerEvent === 'both') {
            this.domService.addEventListener(triggerElement, 'mouseenter', () => {
                this.showTooltip(triggerElement, tooltipContent, options);
            });

            this.domService.addEventListener(triggerElement, 'mouseleave', () => {
                this.hideTooltipWithDelay(triggerElement, options.hideDelay);
            });
        }

        if (options.triggerEvent === 'click' || options.triggerEvent === 'both') {
            this.domService.addEventListener(triggerElement, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.activeTooltips.has(triggerElement)) {
                    this.hideTooltip(triggerElement);
                } else {
                    this.showTooltip(triggerElement, tooltipContent, options);
                }
            });
        }
    }

    /**
     * Show tooltip
     */
    private showTooltip(
        triggerElement: HTMLElement,
        tooltipContent: HTMLElement,
        options: Required<TooltipOptions>
    ): void {
        // Clear any existing hide delay
        this.clearDelayTimeout(triggerElement);

        // Set show delay
        const timeoutId = window.setTimeout(() => {
            // Check if there's an existing tooltip for this trigger
            const existingTooltip = this.activeTooltips.get(triggerElement);
            if (existingTooltip) {
                // Already showing, don't do anything
                return;
            }

            // Create tooltip element
            const tooltipElement = this.createTooltipElement(tooltipContent, options);

            // Set initial state - invisible but taking up space in DOM
            tooltipElement.style.opacity = '0';
            tooltipElement.style.visibility = 'visible';

            // Add to DOM first so dimensions can be calculated
            const body = this.domService.querySelector('body');
        if (body) {
            this.domService.appendChild(body, tooltipElement);
        }

            // Force a layout calculation
            void tooltipElement.offsetWidth;

            // Now position with accurate dimensions
            this.positionTooltip(tooltipElement, triggerElement, options);

            // Show with animation after positioning
            requestAnimationFrame(() => {
                this.domService.addClass(tooltipElement, 'tooltip-visible');
            });

            // Store reference
            this.activeTooltips.set(triggerElement, tooltipElement);

            // Handle outside clicks if needed
            if (options.closeOnOutsideClick && options.triggerEvent === 'click') {
                this.setupOutsideClickListener(triggerElement);
            }

            // Setup tooltip event listeners (for hover on tooltip itself)
            this.domService.addEventListener(tooltipElement, 'mouseenter', () => {
                this.clearDelayTimeout(triggerElement);
            });

            this.domService.addEventListener(tooltipElement, 'mouseleave', () => {
                this.hideTooltipWithDelay(triggerElement, options.hideDelay);
            });
        }, options.showDelay);

        this.delayTimeouts.set(triggerElement, timeoutId);
    }

    /**
     * Create tooltip element
     */
    private createTooltipElement(
        contentElement: HTMLElement,
        options: Required<TooltipOptions>
    ): HTMLElement {
        const tooltipElement = this.domService.createElement('div');
        this.domService.addClass(tooltipElement, 'eksi-tooltip');
        this.domService.addClass(tooltipElement, `tooltip-theme-${options.theme}`);
        this.domService.addClass(tooltipElement, `tooltip-position-${options.position}`);

        // Clone the content
        const contentClone = contentElement.cloneNode(true) as HTMLElement;
        contentClone.style.display = 'block';

        // Set tooltip width if specified
        if (options.width !== 'auto') {
            tooltipElement.style.width = options.width;
        }

        tooltipElement.style.maxWidth = options.maxWidth;

        // Create tooltip arrow
        const tooltipArrow = this.domService.createElement('div');
        this.domService.addClass(tooltipArrow, 'tooltip-arrow');

        // Create tooltip content wrapper
        const tooltipContent = this.domService.createElement('div');
        this.domService.addClass(tooltipContent, 'tooltip-content');

        // Add close button if needed
        if (options.closeButton) {
            const closeButton = this.domService.createElement('button');
            this.domService.addClass(closeButton, 'tooltip-close-button');
            closeButton.innerHTML = '×';

            this.domService.addEventListener(closeButton, 'click', () => {
                const activeTrigger = this.findTriggerByTooltip(tooltipElement);
                if (activeTrigger) {
                    this.hideTooltip(activeTrigger);
                }
            });

            this.domService.appendChild(tooltipContent, closeButton);
        }

        // Add content to tooltip
        this.domService.appendChild(tooltipContent, contentClone);
        this.domService.appendChild(tooltipElement, tooltipArrow);
        this.domService.appendChild(tooltipElement, tooltipContent);

        return tooltipElement;
    }

    /**
     * Find trigger element by tooltip element
     */
    private findTriggerByTooltip(tooltipElement: HTMLElement): HTMLElement | null {
        for (const [trigger, tooltip] of this.activeTooltips.entries()) {
            if (tooltip === tooltipElement) {
                return trigger;
            }
        }
        return null;
    }

    /**
     * Position tooltip relative to trigger element
     */
    private positionTooltip(
        tooltipElement: HTMLElement,
        triggerElement: HTMLElement,
        options: Required<TooltipOptions>
    ): void {
        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipArrow = tooltipElement.querySelector('.tooltip-arrow') as HTMLElement;

        // Initial positioning to calculate tooltip dimensions
        tooltipElement.style.opacity = '0';
        tooltipElement.style.position = 'fixed';
        tooltipElement.style.left = '0';
        tooltipElement.style.top = '0';

        const tooltipRect = tooltipElement.getBoundingClientRect();

        // Custom positioning for toggle switches and small inline elements
        const adjustedPosition: Record<string, { left: number; top: number }> = {
            top: {
                left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
                top: triggerRect.top - tooltipRect.height - options.offset
            },
            bottom: {
                left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
                top: triggerRect.bottom + options.offset
            },
            left: {
                left: triggerRect.left - tooltipRect.width - options.offset,
                top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)
            },
            right: {
                left: triggerRect.right + options.offset,
                top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)
            }
        };

        // Use adjusted positioning with fallback to center
        const position = options.position;
        let { left, top } = adjustedPosition[position];

        // Additional horizontal adjustment for small triggers
        if (position === 'right') {
            left += 10; // Nudge right tooltip slightly further away
        }

        // Keep tooltip within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust horizontal position
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }

        // Adjust vertical position
        if (top < 10) {
            top = 10;
        } else if (top + tooltipRect.height > viewportHeight - 10) {
            top = viewportHeight - tooltipRect.height - 10;
        }

        // Position arrow
        if (tooltipArrow) {
            switch (position) {
                case 'top':
                    tooltipArrow.style.left = '50%';
                    tooltipArrow.style.top = '100%';
                    tooltipArrow.style.transform = '';
                    break;
                case 'bottom':
                    tooltipArrow.style.left = '50%';
                    tooltipArrow.style.top = '0';
                    tooltipArrow.style.transform = 'translateX(-50%) translateY(-100%) rotate(180deg)';
                    break;
                case 'left':
                    tooltipArrow.style.left = '100%';
                    tooltipArrow.style.top = '50%';
                    tooltipArrow.style.transform = 'translateY(-50%) rotate(-90deg)';
                    break;
                case 'right':
                    tooltipArrow.style.left = '0';
                    tooltipArrow.style.top = '50%';
                    tooltipArrow.style.transform = 'translateX(-100%) translateY(-50%) rotate(90deg)';
                    break;
            }
        }

        // Set final position
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.opacity = '1';
    }

    /**
     * Hide tooltip with delay
     */
    private hideTooltipWithDelay(triggerElement: HTMLElement, delay: number): void {
        // Clear any existing timeouts
        this.clearDelayTimeout(triggerElement);

        // Set hide delay
        const timeoutId = window.setTimeout(() => {
            this.hideTooltip(triggerElement);
        }, delay);

        this.delayTimeouts.set(triggerElement, timeoutId);
    }

    /**
     * Hide tooltip
     */
    private hideTooltip(triggerElement: HTMLElement): void {
        const tooltipElement = this.activeTooltips.get(triggerElement);
        if (!tooltipElement) return;

        // Remove with animation
        this.domService.removeClass(tooltipElement, 'tooltip-visible');

        // Remove after animation completes
        const handleTransitionEnd = () => {
            if (tooltipElement.parentNode) {
                tooltipElement.parentNode.removeChild(tooltipElement);
            }
            this.activeTooltips.delete(triggerElement);

            // Remove document click listener if it exists
            this.removeOutsideClickListener();
        };

        this.domService.addEventListener(tooltipElement, 'transitionend', handleTransitionEnd, { once: true });

        // Fallback in case transition doesn't trigger
        setTimeout(handleTransitionEnd, 300);
    }

    /**
     * Clear any pending delay timeouts
     */
    private clearDelayTimeout(triggerElement: HTMLElement): void {
        const timeoutId = this.delayTimeouts.get(triggerElement);
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
            this.delayTimeouts.delete(triggerElement);
        }
    }

    /**
     * Set up document click listener to close tooltip when clicking outside
     */
    private setupOutsideClickListener(triggerElement: HTMLElement): void {
        // Remove existing listener if any
        this.removeOutsideClickListener();

        // Add new listener
        this.documentClickListener = (e: MouseEvent) => {
            const tooltipElement = this.activeTooltips.get(triggerElement);
            if (!tooltipElement) return;

            const target = e.target as HTMLElement;
            if (
                target !== triggerElement &&
                !triggerElement.contains(target) &&
                target !== tooltipElement &&
                !tooltipElement.contains(target)
            ) {
                this.hideTooltip(triggerElement);
            }
        };

        this.domService.addEventListener(document as unknown as HTMLElement, 'click', this.documentClickListener);
    }

    /**
     * Remove document click listener
     */
    private removeOutsideClickListener(): void {
        if (this.documentClickListener) {
            document.removeEventListener('click', this.documentClickListener);
            this.documentClickListener = null;
        }
    }

    /**
     * Manually show tooltip for a trigger element
     */
    public show(triggerElement: HTMLElement): void {
        const tooltipContentId = triggerElement.getAttribute('data-tooltip-content');
        if (!tooltipContentId) return;

        const tooltipContent = this.domService.querySelector(`#${tooltipContentId}`) as HTMLElement;
        if (!tooltipContent) return;

        const options = this.parseOptions(triggerElement);
        this.showTooltip(triggerElement, tooltipContent, options);
    }

    /**
     * Manually hide tooltip for a trigger element
     */
    public hide(triggerElement: HTMLElement): void {
        this.hideTooltip(triggerElement);
    }

    /**
     * Hide all active tooltips
     */
    public hideAll(): void {
        for (const triggerElement of this.activeTooltips.keys()) {
            this.hideTooltip(triggerElement);
        }
    }

    /**
     * Apply tooltip styles
     */
    private applyTooltipStyles(): void {
        const css = `
            /* Base tooltip container */
            .eksi-tooltip {
                position: fixed;
                z-index: 100001;
                pointer-events: auto;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
                transform: scale(0.95);
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
                max-width: 300px;
            }

            .eksi-tooltip.tooltip-visible {
                opacity: 1;
                visibility: visible;
                transform: scale(1);
            }

            /* Tooltip themes */
            .eksi-tooltip.tooltip-theme-dark {
                color: #fff;
            }

            .eksi-tooltip.tooltip-theme-light {
                color: #333;
            }

            /* Tooltip arrow */
            .tooltip-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
                border-width: 6px;
                z-index: 1;
            }

            .tooltip-theme-dark .tooltip-arrow {
                border-color: #292a2d transparent transparent transparent;
            }

            .tooltip-theme-light .tooltip-arrow {
                border-color: #fff transparent transparent transparent;
            }

            /* Tooltip content */
            .tooltip-content {
                position: relative;
                border-radius: 6px;
                padding: 10px 14px;
                line-height: 1.4;
                font-size: 13px;
                text-align: left;
                z-index: 2;
            }

            .tooltip-theme-dark .tooltip-content {
                background-color: #292a2d;
                border: 1px solid #444;
            }

            .tooltip-theme-light .tooltip-content {
                background-color: #fff;
                border: 1px solid #e0e0e0;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            /* Tooltip trigger styling */
            .tooltip-trigger {
                position: relative;
                display: inline-flex;
                cursor: help;
                align-items: center;
            }

            .tooltip-trigger.icon-only {
                width: 16px;
                height: 16px;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                font-size: 12px;
                background-color: rgba(128, 128, 128, 0.2);
                margin-left: 5px;
                transition: background-color 0.2s ease;
                line-height: 1;
                padding: 0;
            }

            .tooltip-trigger.icon-only:hover {
                background-color: rgba(128, 128, 128, 0.3);
            }

            .tooltip-trigger.icon-only > * {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                height: 100%;
            }

            /* Close button styling */
            .tooltip-close-button {
                position: absolute;
                top: 4px;
                right: 4px;
                background: none;
                border: none;
                font-size: 18px;
                line-height: 1;
                padding: 2px 4px;
                cursor: pointer;
                opacity: 0.7;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s ease, background-color 0.2s ease;
            }

            .tooltip-theme-dark .tooltip-close-button {
                color: #fff;
            }

            .tooltip-theme-light .tooltip-close-button {
                color: #555;
            }

            .tooltip-close-button:hover {
                opacity: 1;
                background-color: rgba(0, 0, 0, 0.1);
            }

            /* Tooltip content sections */
            .tooltip-content h4 {
                margin-top: 0;
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 600;
            }

            .tooltip-content p {
                margin: 0 0 8px 0;
            }

            .tooltip-content p:last-child {
                margin-bottom: 0;
            }

            .tooltip-content ul, .tooltip-content ol {
                margin: 8px 0;
                padding-left: 20px;
            }

            .tooltip-content li {
                margin-bottom: 4px;
            }

            /* Info, warning, and other sections */
            .tooltip-content .info,
            .tooltip-content .warning,
            .tooltip-content .success {
                display: flex;
                align-items: flex-start;
                padding: 8px;
                margin: 8px 0;
                border-radius: 4px;
                font-size: 12px;
            }

            .tooltip-theme-dark .tooltip-content .info {
                background-color: rgba(33, 150, 243, 0.2);
                border-left: 3px solid #2196f3;
            }

            .tooltip-theme-light .tooltip-content .info {
                background-color: rgba(33, 150, 243, 0.1);
                border-left: 3px solid #2196f3;
            }

            .tooltip-theme-dark .tooltip-content .warning {
                background-color: rgba(255, 152, 0, 0.2);
                border-left: 3px solid #ff9800;
            }

            .tooltip-theme-light .tooltip-content .warning {
                background-color: rgba(255, 152, 0, 0.1);
                border-left: 3px solid #ff9800;
            }

            .tooltip-theme-dark .tooltip-content .success {
                background-color: rgba(129, 193, 75, 0.2);
                border-left: 3px solid #81c14b;
            }

            .tooltip-theme-light .tooltip-content .success {
                background-color: rgba(129, 193, 75, 0.1);
                border-left: 3px solid #81c14b;
            }

            .tooltip-content .info .material-icons,
            .tooltip-content .warning .material-icons,
            .tooltip-content .success .material-icons {
                font-size: 16px;
                margin-right: 6px;
            }

            .tooltip-content .info .material-icons {
                color: #2196f3;
            }

            .tooltip-content .warning .material-icons {
                color: #ff9800;
            }

            .tooltip-content .success .material-icons {
                color: #81c14b;
            }

            /* Code styling */
            .tooltip-content code {
                font-family: monospace;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 12px;
                white-space: nowrap;
            }

            .tooltip-theme-dark .tooltip-content code {
                background-color: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
            }

            .tooltip-theme-light .tooltip-content code {
                background-color: rgba(0, 0, 0, 0.05);
                color: #333;
            }

            /* Dark mode adjustments */
            @media (prefers-color-scheme: dark) {
                .tooltip-theme-light .tooltip-content {
                    background-color: #292a2d;
                    border-color: #444;
                    color: #e0e0e0;
                }
                
                .tooltip-theme-light .tooltip-arrow {
                    border-color: #292a2d transparent transparent transparent;
                }
                
                .tooltip-theme-light .tooltip-close-button {
                    color: #e0e0e0;
                }
                
                .tooltip-theme-light .tooltip-content code {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                }

                .tooltip-theme-light .tooltip-content .info {
                    background-color: rgba(33, 150, 243, 0.2);
                    border-left-color: #2196f3;
                }

                .tooltip-theme-light .tooltip-content .warning {
                    background-color: rgba(255, 152, 0, 0.2);
                    border-left-color: #ff9800;
                }

                .tooltip-theme-light .tooltip-content .success {
                    background-color: rgba(129, 193, 75, 0.2);
                    border-left-color: #81c14b;
                }
            }
        `;

        this.cssService.addCSS(css);
    }

    /**
     * Update tooltip content for a specific element
     */
    public updateTooltipContent(element: HTMLElement, content: string): void {
        const tooltip = this.activeTooltips.get(element);
        if (tooltip) {
            const contentElement = tooltip.querySelector('.eksi-tooltip-content');
            if (contentElement) {
                contentElement.innerHTML = content;
            }
        }
    }

    /**
     * Destroy tooltip for a specific element
     */
    public destroyTooltip(element: HTMLElement): void {
        this.hideTooltip(element);
        // Remove any stored references or listeners for this specific element
        this.clearDelayTimeout(element);
    }

    /**
     * Destroy all tooltips
     */
    public destroyAllTooltips(): void {
        this.hideAll();
    }

    /**
     * Destroy tooltip component
     */
    public destroy(): void {
        // Remove all active tooltips
        this.hideAll();

        // Clear timeouts
        for (const timeoutId of this.delayTimeouts.values()) {
            window.clearTimeout(timeoutId);
        }
        this.delayTimeouts.clear();

        // Remove document click listener
        this.removeOutsideClickListener();
    }
}