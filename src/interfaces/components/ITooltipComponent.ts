export interface TooltipOptions {
    content?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    theme?: 'dark' | 'light';
    offsetX?: number;
    offsetY?: number;
    delay?: number;
    hideDelay?: number;
    triggerEvent?: 'hover' | 'click' | 'focus';
    maxWidth?: string;
    interactive?: boolean;
    appendTo?: HTMLElement | 'parent' | 'body';
    container?: HTMLElement;
}

export interface ITooltipComponent {
    setupTooltip(element: HTMLElement, options?: TooltipOptions): HTMLElement;
    showTooltip(element: HTMLElement): void;
    hideTooltip(element: HTMLElement): void;
    updateTooltipContent(element: HTMLElement, content: string): void;
    initializeTooltips(container?: HTMLElement): void;
    destroyTooltip(element: HTMLElement): void;
    destroyAllTooltips(): void;
}
