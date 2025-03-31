export interface IconProps {
    name: string;
    color?: string;
    size?: 'small' | 'medium' | 'large' | number;
    className?: string;
    ariaHidden?: boolean;
}

export interface IconTransitionOptions {
    duration?: number;
    animation?: 'none' | 'fade' | 'scale' | 'rotate';
    onComplete?: () => void;
}

export interface IIconComponent {
    create(props: IconProps): HTMLElement;
    transitionTo(
        iconElement: HTMLElement,
        newIconName: string,
        newColor?: string,
        options?: IconTransitionOptions
    ): void;
    createSuccessIcon(size?: 'small' | 'medium' | 'large' | number): HTMLElement;
    createErrorIcon(size?: 'small' | 'medium' | 'large' | number): HTMLElement;
    showSuccessState(iconElement: HTMLElement, duration?: number, successIcon?: string): void;
    showErrorState(iconElement: HTMLElement, duration?: number): void;
}
