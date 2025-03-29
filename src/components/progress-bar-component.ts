/**
 * ProgressBarComponent
 * A standalone component for displaying a progress bar
 */
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import {LoggingService} from "../services/logging-service";

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

export class ProgressBarComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private progressBarElement: HTMLElement | null = null;
    private progressFillElement: HTMLElement | null = null;
    private labelElement: HTMLElement | null = null;
    private percentageElement: HTMLElement | null = null;
    private percentage: number = 0;
    private static stylesApplied = false;
    private loggingService: LoggingService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.loggingService = new LoggingService();
        this.applyProgressBarStyles();
    }

    /**
     * Create a progress bar element
     */
    create(options: ProgressBarOptions = {}): HTMLElement {
        try {
            // Create container element
            this.progressBarElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.progressBarElement, 'eksi-progress-container');

            // Apply custom class if provided
            if (options.className) {
                this.domHandler.addClass(this.progressBarElement, options.className);
            }

            // Set custom height if provided
            if (options.height) {
                this.progressBarElement.style.height = options.height;
            }

            // Set custom background color if provided
            if (options.backgroundColor) {
                this.progressBarElement.style.backgroundColor = options.backgroundColor;
            }

            // Create progress fill element
            this.progressFillElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.progressFillElement, 'eksi-progress-bar');

            // Apply animation and striped classes if requested
            if (options.animated) {
                this.domHandler.addClass(this.progressFillElement, 'eksi-progress-bar-animated');
            }

            if (options.striped) {
                this.domHandler.addClass(this.progressFillElement, 'eksi-progress-bar-striped');
            }

            // Set custom progress color if provided
            if (options.progressColor) {
                this.progressFillElement.style.backgroundColor = options.progressColor;
            }

            // Add label if provided
            if (options.label) {
                this.labelElement = this.domHandler.createElement('div');
                this.domHandler.addClass(this.labelElement, 'eksi-progress-label');
                this.labelElement.textContent = options.label;
                this.domHandler.appendChild(this.progressBarElement, this.labelElement);
            }

            // Add percentage text element if requested
            if (options.showPercentage) {
                this.percentageElement = this.domHandler.createElement('div');
                this.domHandler.addClass(this.percentageElement, 'eksi-progress-percentage');
                this.percentageElement.textContent = '0%';
                this.domHandler.appendChild(this.progressBarElement, this.percentageElement);
            }

            // Add progress fill to container
            this.domHandler.appendChild(this.progressBarElement, this.progressFillElement);

            // Initialize with 0%
            this.updateProgress(0);

            return this.progressBarElement;
        } catch (error) {
          this.loggingService.error('Error creating progress bar:', error);

            // Return a fallback element in case of error
            const fallbackElement = this.domHandler.createElement('div');
            fallbackElement.textContent = 'Progress bar unavailable';
            return fallbackElement;
        }
    }

    /**
     * Update progress value
     * @param current Current progress value
     * @param total Total progress value
     */
    updateProgress(current: number, total: number = 100): void {
        if (!this.progressFillElement) return;

        // Calculate percentage (clamped between 0-100)
        this.percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

        // Update fill width
        this.progressFillElement.style.width = `${this.percentage}%`;

        // Update percentage text if it exists
        if (this.percentageElement) {
            this.percentageElement.textContent = `${this.percentage}%`;
        }
    }

    /**
     * Get current percentage
     */
    getPercentage(): number {
        return this.percentage;
    }

    /**
     * Set the label text
     */
    setLabel(label: string): void {
        if (!this.labelElement) {
            this.labelElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.labelElement, 'eksi-progress-label');

            if (this.progressBarElement) {
                this.domHandler.appendChild(this.progressBarElement, this.labelElement);
            }
        }

        this.labelElement.textContent = label;
    }

    /**
     * Apply CSS styles for progress bars
     */
    private applyProgressBarStyles(): void {
        // Only apply styles once across all instances
        if (ProgressBarComponent.stylesApplied) return;

        const progressBarStyles = `
      /* Progress bar container */
      .eksi-progress-container {
        width: 100%;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin: 15px 0;
        overflow: hidden;
        position: relative;
      }

      /* Progress bar fill */
      .eksi-progress-bar {
        height: 100%;
        background-color: #81c14b;
        border-radius: 3px;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      /* Animated progress bar */
      @keyframes eksiProgressAnimation {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 30px 0;
        }
      }
      
      /* Striped effect */
      .eksi-progress-bar-striped {
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.15) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.15) 50%,
          rgba(255, 255, 255, 0.15) 75%,
          transparent 75%,
          transparent
        );
        background-size: 30px 30px;
      }
      
      /* Animated striped effect */
      .eksi-progress-bar-animated {
        animation: eksiProgressAnimation 2s linear infinite;
      }
      
      /* Progress label */
      .eksi-progress-label {
        margin-bottom: 5px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      /* Percentage indicator */
      .eksi-progress-percentage {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
      }
    `;

        this.cssHandler.addCSS(progressBarStyles);
        ProgressBarComponent.stylesApplied = true;
    }
}