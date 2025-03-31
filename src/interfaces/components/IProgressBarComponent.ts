export interface ProgressBarOptions {
    height?: string;
    backgroundColor?: string;
    progressColor?: string;
    animated?: boolean;
    striped?: boolean;
    showPercentage?: boolean;
    label?: string;
    className?: string;
}

export interface IProgressBarComponent {
    create(options?: ProgressBarOptions): HTMLElement;
    updateProgress(current: number, total?: number): void;
    getPercentage(): number;
    setLabel(label: string): void;
}
