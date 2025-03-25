/**
 * NotificationService
 * Service that composes and manages notifications, progress bars, and countdowns
 * This service follows the Composition pattern, using the individual components
 * instead of extending them
 */
import {ExtendedNotificationOptions, NotificationComponent} from '../components/notification-component';
import {ProgressBarComponent, ProgressBarOptions} from '../components/progress-bar-component';
import {CountdownComponent, CountdownOptions} from '../components/countdown-component';
import {ButtonComponent, ButtonProps, ButtonSize, ButtonVariant} from '../components/button-component';
import {logError} from './logging-service';
import {preferencesManager} from "./preferences-manager";

// Combined options for the notification service
export interface NotificationServiceOptions extends ExtendedNotificationOptions {
    progress?: {
        current: number;
        total: number;
        options?: ProgressBarOptions;
    };
    countdown?: {
        seconds: number;
        options?: CountdownOptions;
    };
    buttons?: ButtonProps[];
}

export class NotificationService {
    private notificationComponent: NotificationComponent;
    private progressBarComponent: ProgressBarComponent | null = null;
    private countdownComponent: CountdownComponent | null = null;
    private buttonComponent: ButtonComponent;
    private activeProgressBar: HTMLElement | null = null;
    private activeCountdown: HTMLElement | null = null;
    private activeButtons: HTMLElement[] = [];
    private hasProgressBar: boolean = false;
    private hasCountdown: boolean = false;

    constructor() {
        this.notificationComponent = new NotificationComponent();
        this.buttonComponent = new ButtonComponent();
    }

    /**
     * Show a notification with optional progress bar, countdown, and buttons
     */
    async show(content: string, options: NotificationServiceOptions = {}): Promise<void> {
        try {
            // Get preferences for notification position
            const preferences = await preferencesManager.getPreferences();

            // Determine notification position (from options or preferences)
            const position = options.position || preferences.notificationPosition || 'top-right';

            // Modify options to include position
            const modifiedOptions = {
                ...options,
                position: position
            };

            // First show the basic notification
            const notificationElement = await this.notificationComponent.show(content, modifiedOptions);

            if (!notificationElement) {
                return; // Notification settings disabled or error occurred
            }

            // Get containers for adding components
            const contentContainer = this.notificationComponent.getContentContainer();
            const footerContainer = this.notificationComponent.getFooterContainer();

            if (!contentContainer || !footerContainer) {
                return;
            }

            // Add progress bar if requested
            if (options.progress) {
                this.addProgressBar(footerContainer, options.progress.current, options.progress.total, options.progress.options);
            }

            // Add countdown timer if requested
            if (options.countdown) {
                this.addCountdown(footerContainer, options.countdown.seconds, options.countdown.options);
            }

            // Add buttons if requested
            if (options.buttons && options.buttons.length > 0) {
                this.addButtons(footerContainer, options.buttons);
            }
        } catch (error) {
            logError('Error showing notification with components:', error);
        }
    }

    /**
     * Update the notification content
     */
    updateContent(content: string): void {
        this.notificationComponent.updateContent(content);
    }

    /**
     * Add a progress bar to the notification
     */
    private addProgressBar(container: HTMLElement, current: number, total: number, options: ProgressBarOptions = {}): void {
        try {
            // Clear any existing progress bar first
            if (this.hasProgressBar && this.activeProgressBar) {
                if (this.activeProgressBar.parentNode === container) {
                    container.removeChild(this.activeProgressBar);
                }
                this.activeProgressBar = null;
            }

            // Create progress bar component if not already created
            if (!this.progressBarComponent) {
                this.progressBarComponent = new ProgressBarComponent();
            }

            // Create the progress bar element
            this.activeProgressBar = this.progressBarComponent.create(options);

            // Add to container
            this.domAppendElement(container, this.activeProgressBar);
            this.hasProgressBar = true;

            // Update the progress value
            this.updateProgress(current, total);
        } catch (error) {
            logError('Error adding progress bar:', error);
        }
    }

    /**
     * Update progress bar values
     */
    updateProgress(current: number, total: number): void {
        if (this.progressBarComponent) {
            this.progressBarComponent.updateProgress(current, total);
        }
    }

    /**
     * Add a countdown timer to the notification
     */
    private addCountdown(container: HTMLElement, seconds: number, options: CountdownOptions = {}): void {
        try {
            // Clear any existing countdown first
            if (this.hasCountdown && this.activeCountdown) {
                if (this.activeCountdown.parentNode === container) {
                    container.removeChild(this.activeCountdown);
                }
                this.activeCountdown = null;
            }

            // Create countdown component if not already created
            if (!this.countdownComponent) {
                this.countdownComponent = new CountdownComponent();
            }

            // Create the countdown element
            this.activeCountdown = this.countdownComponent.create(seconds, options);

            // Add to container
            this.domAppendElement(container, this.activeCountdown);
            this.hasCountdown = true;
        } catch (error) {
            logError('Error adding countdown:', error);
        }
    }

    /**
     * Update countdown seconds
     */
    updateCountdown(seconds: number): void {
        if (this.countdownComponent) {
            this.countdownComponent.reset(seconds);
            this.countdownComponent.start();
        }
    }

    /**
     * Add buttons to the notification
     */
    private addButtons(container: HTMLElement, buttonProps: ButtonProps[]): void {
        try {
            // Clear any existing buttons
            this.activeButtons.forEach(button => {
                if (button.parentNode === container) {
                    container.removeChild(button);
                }
            });
            this.activeButtons = [];

            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'eksi-notification-button-container';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '8px';
            buttonContainer.style.marginTop = '10px';

            // Add each button
            buttonProps.forEach(props => {
                const button = this.buttonComponent.create(props);
                buttonContainer.appendChild(button);
                this.activeButtons.push(button);
            });

            // Add to container
            this.domAppendElement(container, buttonContainer);
        } catch (error) {
            logError('Error adding buttons:', error);
        }
    }

    /**
     * Add a stop button to the notification
     */
    addStopButton(clickHandler: () => void): void {
        if (!this.notificationComponent) return;

        const footerContainer = this.notificationComponent.getFooterContainer();
        if (!footerContainer) return;

        const buttonProps: ButtonProps = {
            text: 'Durdur',
            icon: 'close',
            variant: ButtonVariant.DANGER,
            size: ButtonSize.SMALL,
            onClick: clickHandler,
            className: 'eksi-notification-stop-button'
        };

        // Pass an array containing the ButtonProps object
        this.addButtons(footerContainer, [buttonProps]);
    }

    /**
     * Close the notification
     */
    close(): void {
        this.notificationComponent.removeWithTransition();

        // Stop countdown if active
        if (this.countdownComponent) {
            this.countdownComponent.stop();
        }

        // Clear references
        this.activeProgressBar = null;
        this.activeCountdown = null;
        this.activeButtons = [];
    }

    /**
     * Helper method to append an element to a container
     */
    private domAppendElement(container: HTMLElement, element: HTMLElement): void {
        if (container && element) {
            container.appendChild(element);
        }
    }
}