/**
 * CountdownComponent
 * A standalone component for displaying and managing countdown timers
 */
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import {LoggingService} from "../services/logging-service";
import {IconComponent, IconProps} from "./icon-component";
import {ICSSService} from "../interfaces/services/ICSSService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IDOMService} from "../interfaces/services/IDOMService";

export interface CountdownOptions {
    autoStart?: boolean;
    showIcon?: boolean;
    icon?: IconProps | null;
    showLabel?: boolean;
    label?: string;
    className?: string;
    onComplete?: () => void;
    onTick?: (secondsRemaining: number) => void;
    textFormat?: (seconds: number) => string;
}

export class CountdownComponent {
    private countdownElement: HTMLElement | null = null;
    private timeElement: HTMLElement | null = null;
    private intervalId: number | null = null;
    private remainingSeconds: number = 0;
    private options: CountdownOptions = {};
    private static stylesApplied = false;

    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IconComponent,
    ) {
        this.applyCountdownStyles();
    }

    /**
     * Create a countdown element
     */
    /**
     * Create a countdown element
     */
    create(seconds: number, options: CountdownOptions = {}): HTMLElement {
        try {
            this.remainingSeconds = Math.max(0, seconds);

            // Default icon props if not provided
            const defaultIconProps: IconProps = {
                name: 'schedule',
                size: 'small',
                color: '#81c14b'
            };

            this.options = {
                autoStart: true,
                showIcon: true,
                icon: defaultIconProps,
                showLabel: true,
                label: 'Sonraki işlem için bekleniyor:',
                ...options
            };

            // Create container element
            this.countdownElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.countdownElement, 'eksi-countdown-container');

            // Apply custom class if provided
            if (this.options.className) {
                this.domHandler.addClass(this.countdownElement, this.options.className);
            }

            // Create content
            let content = '';

            // Add icon if requested
            if (this.options.showIcon && this.options.icon) {
                const iconElement = this.iconComponent.create({
                    ...this.options.icon,
                    className: 'eksi-countdown-icon'
                });

                // If countdownElement is already in DOM, append directly
                if (this.countdownElement.isConnected) {
                    this.domHandler.appendChild(this.countdownElement, iconElement);
                } else {
                    // Otherwise, we'll add it via innerHTML later
                    content += this.iconComponent.create({
                        ...this.options.icon,
                        className: 'eksi-countdown-icon'
                    }).outerHTML;
                }
            }

            // Add label if requested
            if (this.options.showLabel && this.options.label) {
                content += `<span class="eksi-countdown-label">${this.options.label}</span>`;
            }

            // Add time element
            content += `<span class="eksi-countdown-time"><strong>${this.formatTime(this.remainingSeconds)}</strong></span>`;

            this.countdownElement.innerHTML = content;

            // Store reference to time element for updates
            this.timeElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-time', this.countdownElement);

            // Start countdown if autoStart is true
            if (this.options.autoStart) {
                this.start();
            }

            return this.countdownElement;
        } catch (error) {
          this.loggingService.error('Error creating countdown:', error);

            // Return a fallback element in case of error
            const fallbackElement = this.domHandler.createElement('div');
            fallbackElement.textContent = `${seconds} seconds remaining`;
            return fallbackElement;
        }
    }

    /**
     * Start the countdown
     */
    start(): void {
        if (this.intervalId !== null) {
            this.stop();
        }

        this.updateDisplay();

        this.intervalId = window.setInterval(() => {
            this.remainingSeconds--;

            // Call tick callback if provided
            if (this.options.onTick) {
                this.options.onTick(this.remainingSeconds);
            }

            this.updateDisplay();

            if (this.remainingSeconds <= 0) {
                this.stop();

                // Call complete callback if provided
                if (this.options.onComplete) {
                    this.options.onComplete();
                }
            }
        }, 1000);
    }

    /**
     * Stop the countdown
     */
    stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Reset the countdown
     */
    reset(seconds?: number): void {
        this.stop();

        if (seconds !== undefined) {
            this.remainingSeconds = Math.max(0, seconds);
        }

        this.updateDisplay();
    }

    /**
     * Update the display
     */
    private updateDisplay(): void {
        if (!this.timeElement) return;

        if (this.options.textFormat) {
            this.timeElement.innerHTML = `<strong>${this.options.textFormat(this.remainingSeconds)}</strong>`;
        } else {
            this.timeElement.innerHTML = `<strong>${this.formatTime(this.remainingSeconds)}</strong>`;
        }
    }

    /**
     * Format time (default implementation)
     */
    private formatTime(seconds: number): string {
        if (seconds <= 0) {
            return 'Tamamlandı';
        }

        return `${seconds} saniye`;
    }

    /**
     * Get remaining seconds
     */
    getRemainingSeconds(): number {
        return this.remainingSeconds;
    }

    /**
     * Set the label text
     */
    setLabel(label: string): void {
        if (!this.countdownElement) return;

        const labelElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-label', this.countdownElement);

        if (labelElement) {
            labelElement.textContent = label;
        } else if (this.options.showLabel) {
            // Create label if it doesn't exist
            const iconElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownElement);

            const newLabelElement = this.domHandler.createElement('span');
            this.domHandler.addClass(newLabelElement, 'eksi-countdown-label');
            newLabelElement.textContent = label;

            if (iconElement && iconElement.nextSibling) {
                this.countdownElement.insertBefore(newLabelElement, iconElement.nextSibling);
            } else {
                // Insert at beginning if no icon
                this.countdownElement.insertBefore(newLabelElement, this.countdownElement.firstChild);
            }
        }

        this.options.label = label;
    }

    /**
     * Set the icon
     */
    setIcon(iconProps: IconProps): void {
        if (!this.countdownElement) return;

        const iconElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownElement);

        if (iconElement) {
            // Replace existing icon
            const newIconElement = this.iconComponent.create({
                ...iconProps,
                className: 'eksi-countdown-icon'
            });

            iconElement.parentNode?.replaceChild(newIconElement, iconElement);
        } else if (this.options.showIcon) {
            // Create icon if it doesn't exist
            const newIconElement = this.iconComponent.create({
                ...iconProps,
                className: 'eksi-countdown-icon'
            });

            // Insert at beginning
            this.countdownElement.insertBefore(newIconElement, this.countdownElement.firstChild);
        }

        this.options.icon = iconProps;
    }


    /**
     * Show or hide the icon
     */
    toggleIcon(show: boolean): void {
        if (!this.countdownElement) return;

        const iconElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownElement);

        if (show && !iconElement && this.options.icon) {
            this.setIcon(this.options.icon);
        } else if (!show && iconElement && iconElement.parentNode) {
            iconElement.parentNode.removeChild(iconElement);
        }

        this.options.showIcon = show;
    }

    /**
     * Show or hide the label
     */
    toggleLabel(show: boolean): void {
        if (!this.countdownElement) return;

        const labelElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-label', this.countdownElement);

        if (show && !labelElement && this.options.label) {
            this.setLabel(this.options.label);
        } else if (!show && labelElement && labelElement.parentNode) {
            labelElement.parentNode.removeChild(labelElement);
        }

        this.options.showLabel = show;
    }

    /**
     * Set text format function
     */
    setTextFormat(formatFn: (seconds: number) => string): void {
        this.options.textFormat = formatFn;
        this.updateDisplay();
    }

    /**
     * Apply CSS styles for countdown timers
     */
    private applyCountdownStyles(): void {
        // Only apply styles once across all instances
        if (CountdownComponent.stylesApplied) return;

        const countdownStyles = `
            /* Countdown container */
            .eksi-countdown-container {
                display: flex;
                align-items: center;
                background-color: rgba(129, 193, 75, 0.1);
                border-radius: 4px;
                padding: 8px 12px;
                margin: 8px 0;
                font-size: 13px;
                line-height: 1.4;
            }
            
            /* Countdown icon */
            .eksi-countdown-icon {
                color: #81c14b;
                font-size: 16px;
                margin-right: 8px;
            }
            
            /* Countdown label */
            .eksi-countdown-label {
                margin-right: 6px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* Countdown time */
            .eksi-countdown-time {
                color: #fff;
            }
            
            .eksi-countdown-time strong {
                font-weight: 600;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-countdown-container {
                    background-color: rgba(129, 193, 75, 0.15);
                }
            }
        `;

        this.cssHandler.addCSS(countdownStyles);
        CountdownComponent.stylesApplied = true;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.stop();

        if (this.countdownElement && this.countdownElement.parentNode) {
            this.countdownElement.parentNode.removeChild(this.countdownElement);
        }

        this.countdownElement = null;
        this.timeElement = null;
    }
}