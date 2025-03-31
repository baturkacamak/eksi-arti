export interface ITooltipOptions {
    content?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    theme?: 'dark' | 'light';
    offsetX?: number;
    offsetY?: number;
    delay?: number;
    hideDelay?: number;
    triggerEvent?: 'hover' | 'click' | 'focus' | 'both';
    maxWidth?: string;
    interactive?: boolean;
    appendTo?: HTMLElement | 'parent' | 'body';
    container?: HTMLElement;
    width?: string;
    closeOnOutsideClick?: boolean;
    showDelay?: number;
    offset?: number;
    closeButton?: boolean;
}


export interface ITooltipComponent {
    setupTooltip(triggerElement: HTMLElement, customOptions?: Partial<ITooltipOptions>): void

    showTooltip(triggerElement: HTMLElement, tooltipContent: HTMLElement, options: Required<ITooltipOptions>): void;

    hideTooltip(element: HTMLElement): void;

    updateTooltipContent(element: HTMLElement, content: string): void;

    initializeTooltips(container?: HTMLElement): void;

    destroyTooltip(element: HTMLElement): void;

    destroyAllTooltips(): void;
}
