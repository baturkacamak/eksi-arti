export interface ProgressWidgetOptions {
    title?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    draggable?: boolean;
    closable?: boolean;
    onClose?: () => void;
    onStop?: () => void;
}

export interface ProgressWidgetData {
    current: number;
    total: number;
    message?: string;
    countdownSeconds?: number;
    icon?: {
        name: string;
        color?: string;
        size?: 'small' | 'medium' | 'large' | number;
    };
}

export interface IProgressWidgetComponent {
    show(options?: ProgressWidgetOptions): void;
    updateProgress(data: ProgressWidgetData): void;
    updateMessage(message: string): void;
    hide(): void;
} 