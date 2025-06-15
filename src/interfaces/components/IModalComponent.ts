import { ButtonVariant } from './IButtonComponent';

export interface ModalOptions {
    showCloseButton?: boolean;
    allowBackdropClose?: boolean;
    allowEscapeClose?: boolean;
    title?: string;
}

export interface IModalComponent {
    show(options?: ModalOptions): void;
    close(): void;
    updateOptions(options: ModalOptions): void;
}
