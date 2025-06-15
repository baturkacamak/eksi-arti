export enum ButtonVariant {
    DEFAULT = 'default',
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    DANGER = 'danger',
    SUCCESS = 'success',
}

export enum ButtonSize {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
}

export enum ButtonAnimation {
    NONE = 'none',
    DIRECTION_TOGGLE = 'direction-toggle',
    PULSE = 'pulse',
    ROTATE = 'rotate',
    BOUNCE = 'bounce',
    SHAKE = 'shake'
}

export interface ButtonProps {
    text: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: string;
    iconPosition?: 'left' | 'right';
    ariaLabel?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
    onClick?: (event: MouseEvent) => void;
    // Animation system
    animation?: ButtonAnimation;
    animationState?: string | number; // Generic state for animations (e.g., 'asc'/'desc', degrees, etc.)
}

export interface IButtonComponent {
    create(props: ButtonProps): HTMLButtonElement;
    updateText(text: string): void;
    setDisabled(disabled: boolean): void;
    setLoading(loading: boolean, loadingText?: string): void;
    setAnimationState?(state: string | number): void;
    triggerAnimation?(animationType?: ButtonAnimation): void;
}
