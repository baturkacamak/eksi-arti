import {storageService} from './storage-service';
import {STORAGE_KEYS} from '../../constants';
import {BlockerState} from '../../types';

import {ILoggingService} from "../../interfaces/services/shared/ILoggingService";
import {StorageArea} from "../../interfaces/services/shared/IStorageService";
import {INotificationService, INotificationServiceOptions} from "../../interfaces/services/shared/INotificationService";
import {ButtonProps, ButtonSize, ButtonVariant, IButtonComponent} from "../../interfaces/components/IButtonComponent";
import {CountdownOptions, ICountdownComponent} from "../../interfaces/components/ICountdownComponent";
import {IProgressBarComponent, ProgressBarOptions} from "../../interfaces/components/IProgressBarComponent";
import {INotificationComponent} from "../../interfaces/components/INotificationComponent";
import {IContainer} from "../../interfaces/IContainer";

export class NotificationService implements INotificationService {
    private activeProgressBar: HTMLElement | null = null;
    private activeCountdown: HTMLElement | null = null;
    private activeButtons: HTMLElement[] = [];
    private hasProgressBar: boolean = false;
    private hasCountdown: boolean = false;

    constructor(
        private loggingService: ILoggingService,
        private buttonComponent: IButtonComponent,
        private progressBarComponent: IProgressBarComponent,
        private countdownComponent: ICountdownComponent,
        private notificationComponent: INotificationComponent,
        private container: IContainer  // Add this parameter
    ) {
    }

    /**
     * Show a notification with optional progress bar, countdown, and buttons
     */
    async show(content: string, options: INotificationServiceOptions = {}): Promise<void> {
        try {
            const type = options.type || 'notification';

            // Apply toast-specific defaults
            if (type === 'toast') {
                // Set shorter timeout for toasts if not specified
                if (options.timeout === undefined) {
                    options.timeout = 3;
                }
                
                // Disable progress bars, countdowns, and buttons for toasts
                // These don't make sense for simple toast messages
                if (options.progress || options.countdown || options.buttons) {
                    this.loggingService.warn('Progress bars, countdowns, and buttons are not supported for toast notifications. Use type: "notification" for rich content.');
                    delete options.progress;
                    delete options.countdown;
                    delete options.buttons;
                }
            }

            // First show the basic notification
            const notificationElement = await this.notificationComponent.show(content, options);

            if (!notificationElement) {
                return; // Notification settings disabled or error occurred
            }

            // Only add rich components for notification type
            if (type === 'notification') {
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
            }
        } catch (error) {
            this.loggingService.error('Error showing notification with components:', error);
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

            // Create the progress bar element
            this.activeProgressBar = this.progressBarComponent.create(options);

            // Add to container
            this.domAppendElement(container, this.activeProgressBar);
            this.hasProgressBar = true;

            // Update the progress value
            this.updateProgress(current, total);
        } catch (error) {
            this.loggingService.error('Error adding progress bar:', error);
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

            // Create the countdown element
            this.activeCountdown = this.countdownComponent.create(seconds, options);

            // Add to container
            this.domAppendElement(container, this.activeCountdown);
            this.hasCountdown = true;
        } catch (error) {
            this.loggingService.error('Error adding countdown:', error);
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
            this.loggingService.error('Error adding buttons:', error);
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
     * Get the footer container element
     * This can be used to add buttons or other controls to the notification
     */
    getFooterContainer(): HTMLElement | null {
        return this.notificationComponent ? this.notificationComponent.getFooterContainer() : null;
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