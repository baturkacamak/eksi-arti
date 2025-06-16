export interface INotificationServiceOptions {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    theme?: 'default' | 'success' | 'error' | 'warning' | 'info';
    closable?: boolean;
    timeout?: number;
    width?: string;
    onClose?: () => void;
    progress?: {
        current: number;
        total: number;
        options?: any;
    };
    countdown?: {
        seconds: number;
        options?: any;
    };
    buttons?: any[];
}

export interface INotificationService {
    show(content: string, options?: INotificationServiceOptions): Promise<void>;
    updateContent(content: string): void;
    updateProgress(current: number, total: number): void;
    updateCountdown(seconds: number): void;
    addStopButton(clickHandler: () => void): void;
    getFooterContainer(): HTMLElement | null;
    close(): void;
}
