export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type NotificationTheme = 'default' | 'success' | 'error' | 'warning' | 'info';
export type NotificationType = 'notification' | 'toast';

export interface ExtendedNotificationOptions {
    type?: NotificationType;
    position?: NotificationPosition;
    theme?: NotificationTheme;
    closable?: boolean;
    timeout?: number;
    width?: string;
    onClose?: () => void;
}

export interface INotificationComponent {
    show(content: string, options?: ExtendedNotificationOptions): Promise<HTMLElement | null>;
    updateContent(content: string): void;
    getContentContainer(): HTMLElement | null;
    getFooterContainer(): HTMLElement | null;
    removeWithTransition(onClose?: () => void): void;
}
