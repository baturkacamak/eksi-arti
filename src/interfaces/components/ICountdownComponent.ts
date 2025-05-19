export interface CountdownOptions {
    initialSeconds?: number;
    autoStart?: boolean;
    showIcon?: boolean;
    icon?: any | null;
    showLabel?: boolean;
    label?: string;
    className?: string;
    onComplete?: () => void;
    onTick?: (secondsRemaining: number) => void;
    textFormat?: (seconds: number) => string;
}

export interface ICountdownComponent {
    create(seconds: number, options?: CountdownOptions): HTMLElement;
    start(): void;
    stop(): void;
    reset(seconds?: number): void;
    getRemainingSeconds(): number;
    setLabel(label: string): void;
    setIcon(iconProps: any): void;
    toggleIcon(show: boolean): void;
    toggleLabel(show: boolean): void;
    setTextFormat(formatFn: (seconds: number) => string): void;
    destroy(): void;
}
