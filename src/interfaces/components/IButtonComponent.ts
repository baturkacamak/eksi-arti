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
}

export interface IButtonComponent {
    create(props: ButtonProps): HTMLButtonElement;
    updateText(text: string): void;
    setDisabled(disabled: boolean): void;
    setLoading(loading: boolean, loadingText?: string): void;
}
