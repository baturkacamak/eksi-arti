import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { NotificationOptions, BlockerPreferences } from '../types';
import { storageService } from '../services/storage-service';
import { STORAGE_KEYS } from '../constants';
import { logError, logDebug } from "../services/logging-service";
import { preferencesManager } from "../services/preferences-manager";
import {ButtonComponent, ButtonSize, ButtonVariant} from "./button-component";

export class NotificationComponent {
    private cssHandler: CSSService;
    private domHandler: DOMService;
    private buttonComponent: ButtonComponent;
    private notificationElement: HTMLElement | null = null;
    private timeoutId: number | null = null;
    private countdownIntervalId: number | null = null;
    private countdownElement: HTMLElement | null = null;
    private defaultDuration: number = 5; // Default duration in seconds

    constructor() {
        this.cssHandler = new CSSService();
        this.domHandler = new DOMService();
        this.buttonComponent = new ButtonComponent();
        this.initAnimations();
        this.loadNotificationDuration();
    }

    /**
     * Load notification duration from preferences
     */
    private async loadNotificationDuration(): Promise<void> {
        try {
            const preferences = await preferencesManager.getPreferences();
            this.defaultDuration = preferences.notificationDuration || 5;
            logDebug('Loaded notification duration from preferences:', this.defaultDuration);
        } catch (error) {
            logError('Error loading notification duration:', error);
        }
    }

    /**
     * Initialize animations for modals and notifications
     */
    private initAnimations(): void {
        const style = document.createElement('style');
        style.textContent = `
      @keyframes eksiModalSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
        document.head.appendChild(style);
    }

    /**
     * Show notification
     */
    async show(message: string, options: NotificationOptions = {}): Promise<void> {
        const preferences = await preferencesManager.getPreferences();

        if (!preferences.enableNotifications) {
            return;
        }

        // Ensure we have the latest notification duration
        await this.loadNotificationDuration();

        this.applyStyles();

        if (!this.notificationElement) {
            this.createElement(message);
            this.createCloseButton();
            await this.applyPositionFromStorage();
            this.appendNotificationToDOM();
        } else {
            this.updateMessage(message);
        }

        // Use the provided timeout or fall back to the default duration from preferences
        const timeout = options.timeout !== undefined ? options.timeout : this.defaultDuration;
        this.setAutoCloseTimeout(timeout);
    }

    /**
     * Apply position based on user preferences from storage
     */
    private async applyPositionFromStorage(): Promise<void> {
        try {
            if (!this.notificationElement) return;

            // Get preferences directly from storage, avoiding PreferencesService
            const result = await storageService.getItem<Partial<BlockerPreferences>>(STORAGE_KEYS.PREFERENCES);
            let position = 'top-right'; // Default position

            if (result.success && result.data && result.data.notificationPosition) {
                position = result.data.notificationPosition;
            }

            // Reset position classes
            this.domHandler.removeClass(this.notificationElement, 'position-top-right');
            this.domHandler.removeClass(this.notificationElement, 'position-top-left');
            this.domHandler.removeClass(this.notificationElement, 'position-bottom-right');
            this.domHandler.removeClass(this.notificationElement, 'position-bottom-left');

            // Apply the selected position
            this.domHandler.addClass(this.notificationElement, `position-${position}`);
        } catch (error) {
            logError('Error applying notification position from storage:', error);
            // Default to top-right if there's an error
            if (this.notificationElement) {
                this.domHandler.addClass(this.notificationElement, 'position-top-right');
            }
        }
    }

    /**
     * Update notification message
     */
    updateMessage(message: string): void {
        if (this.notificationElement) {
            const messageElement = this.domHandler.querySelector<HTMLElement>('.eksi-notification-message', this.notificationElement);
            if (messageElement) {
                messageElement.innerHTML = message;
            }
        }
    }

    /**
     * Update countdown display
     */
    updateDelayCountdown(seconds: number): void {
        // Clear any existing countdown interval first
        this.clearCountdown();

        // Create countdown element if it doesn't exist
        if (!this.countdownElement) {
            this.countdownElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.countdownElement, 'eksi-notification-countdown');

            if (this.notificationElement) {
                // Find the progress container
                const progressContainer = this.domHandler.querySelector<HTMLElement>('.eksi-progress-container', this.notificationElement);

                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.parentNode.insertBefore(this.countdownElement, progressContainer.nextSibling);
                } else {
                    // Fallback to insert after message
                    const messageElement = this.domHandler.querySelector<HTMLElement>('.eksi-notification-message', this.notificationElement);
                    if (messageElement && messageElement.parentNode) {
                        messageElement.parentNode.insertBefore(this.countdownElement, messageElement.nextSibling);
                    }
                }
            }
        }

        // Set initial text with Material Icons
        let remainingSeconds = seconds;
        this.countdownElement.innerHTML = `
      <span class="material-icons" style="vertical-align: middle; margin-right: 5px; font-size: 12px; color: #a0e577;">schedule</span>
      Sonraki işlem için bekleniyor: <strong>${remainingSeconds}</strong> saniye
    `;

        // Start the countdown
        this.countdownIntervalId = window.setInterval(() => {
            remainingSeconds--;

            if (remainingSeconds <= 0) {
                this.clearCountdown();
                return;
            }

            if (this.countdownElement) {
                this.countdownElement.innerHTML = `
          <span class="material-icons" style="vertical-align: middle; margin-right: 5px; font-size: 12px; color: #a0e577;">schedule</span>
          Sonraki işlem için bekleniyor: <strong>${remainingSeconds}</strong> saniye
        `;
            }
        }, 1000);
    }

    /**
     * Clear countdown timer
     */
    clearCountdown(): void {
        if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
        }

        if (this.countdownElement) {
            this.countdownElement.textContent = '';
        }
    }

    /**
     * Create notification element
     */
    private createElement(message: string): void {
        if (this.notificationElement) {
            this.removeExistingNotification();
        }

        this.notificationElement = this.domHandler.createElement('div');
        this.domHandler.addClass(this.notificationElement, 'eksi-notification-container');
        // Default position class - will be updated based on preferences
        this.domHandler.addClass(this.notificationElement, 'position-top-right');

        // Create a header with Material Icons
        const headerElement = this.domHandler.createElement('div');
        this.domHandler.addClass(headerElement, 'eksi-notification-header');
        headerElement.innerHTML = `
      <div class="eksi-notification-icon">
        <span class="material-icons" style="color: #81c14b; font-size: 16px;">check_circle</span>
      </div>
      <div class="eksi-notification-title">Ekşi Kullanıcı İşlemi</div>
    `;

        const messageElement = this.domHandler.createElement('p');
        this.domHandler.addClass(messageElement, 'eksi-notification-message');
        messageElement.innerHTML = message;

        const buttonsContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(buttonsContainer, 'eksi-notification-buttons');

        this.domHandler.appendChild(this.notificationElement, headerElement);
        this.domHandler.appendChild(this.notificationElement, messageElement);
        this.domHandler.appendChild(this.notificationElement, buttonsContainer);

        this.showWithTransition();
    }

    /**
     * Remove existing notification
     */
    private removeExistingNotification(): void {
        if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
            this.notificationElement = null;
        }
    }

    /**
     * Create close button for notification using ButtonComponent
     */
    private createCloseButton(): void {
        const closeButton = this.buttonComponent.create({
            text: '',
            icon: 'close',
            size: ButtonSize.SMALL,
            ariaLabel: 'Bildirimi kapat',
            onClick: () => {
                this.removeWithTransition();
            },
            className: 'eksi-close-button'
        });

        this.domHandler.appendChild(this.notificationElement!, closeButton);
    }

    /**
     * Add progress bar to notification
     */
    addProgressBar(current: number, total: number): void {
        // Remove existing progress bar if any
        const existingContainer = this.domHandler.querySelector<HTMLElement>('.eksi-progress-container', this.notificationElement!);
        if (existingContainer) {
            existingContainer.parentNode?.removeChild(existingContainer);
        }

        // Calculate percentage
        const percentage = Math.min(100, Math.round((current / total) * 100));

        // Create progress container
        const progressContainer = this.domHandler.createElement('div');
        this.domHandler.addClass(progressContainer, 'eksi-progress-container');

        // Create progress bar
        const progressBar = this.domHandler.createElement('div');
        this.domHandler.addClass(progressBar, 'eksi-progress-bar');
        progressBar.style.width = `${percentage}%`;

        // Append to container
        this.domHandler.appendChild(progressContainer, progressBar);

        // Insert after message
        const messageElement = this.domHandler.querySelector<HTMLElement>('.eksi-notification-message', this.notificationElement!);
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.insertBefore(progressContainer, messageElement.nextSibling);
        }
    }

    /**
     * Add stop button to notification using ButtonComponent
     */
    addStopButton(clickHandler: () => void): void {
        if (!this.notificationElement) return;

        const buttonsContainer = this.domHandler.querySelector<HTMLElement>('.eksi-notification-buttons', this.notificationElement);
        if (!buttonsContainer) return;

        // Remove existing stop button if any
        const existingButton = this.domHandler.querySelector<HTMLButtonElement>('.eksi-notification-button.stop', buttonsContainer);
        if (existingButton) {
            this.domHandler.removeChild(buttonsContainer, existingButton);
        }

        // Create a stop button using ButtonComponent
        const stopButton = this.buttonComponent.create({
            text: 'Durdur',
            icon: 'close',
            variant: ButtonVariant.DANGER,
            size: ButtonSize.SMALL,
            onClick: clickHandler,
            className: 'eksi-notification-stop-button'
        });

        this.domHandler.appendChild(buttonsContainer, stopButton);
    }

    /**
     * Append notification to DOM
     */
    private appendNotificationToDOM(): void {
        this.domHandler.appendChild(document.body, this.notificationElement!);
    }

    /**
     * Set auto-close timeout
     */
    private setAutoCloseTimeout(timeout: number = 5): void {
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
        }

        if (timeout > 0) {
            this.timeoutId = window.setTimeout(() => {
                this.removeWithTransition();
            }, timeout * 1000);
        }
    }

    /**
     * Remove notification with transition
     */
    removeWithTransition(): void {
        if (!this.notificationElement) return;

        // Clear any active countdown
        this.clearCountdown();

        // Clear auto-close timeout
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this.domHandler.removeClass(this.notificationElement, 'show');
        this.domHandler.addClass(this.notificationElement, 'hidden');

        const handleTransitionEnd = () => {
            if (this.notificationElement && this.notificationElement.parentNode) {
                this.notificationElement.parentNode.removeChild(this.notificationElement);
                this.notificationElement = null;
                this.countdownElement = null;
            }
        };

        this.domHandler.addEventListener(this.notificationElement, 'transitionend', handleTransitionEnd, { once: true });

        // Fallback in case transition doesn't trigger
        setTimeout(handleTransitionEnd, 500);
    }

    /**
     * Show notification with transition
     */
    private showWithTransition(): void {
        if (!this.notificationElement) return;

        this.domHandler.addClass(this.notificationElement, 'hidden');
        requestAnimationFrame(() => {
            if (this.notificationElement) { // Check again inside the callback
                this.domHandler.removeClass(this.notificationElement, 'hidden');
                this.domHandler.addClass(this.notificationElement, 'show');
            }
        });
    }

    /**
     * Apply CSS styles for notifications
     */
    private applyStyles(): void {
        const defaultCSS = `
      /* Base notification container */
      .eksi-notification-container {
          position: fixed;
          background-color: #2c2c2c;
          color: #fff;
          padding: 1.4rem;
          border-radius: 8px;
          font-size: 14px;
          z-index: 100000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          min-width: 320px;
          border-left: 4px solid #81c14b;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      /* Position classes */
      .eksi-notification-container.position-top-right {
          top: 20px;
          right: 20px;
      }

      .eksi-notification-container.position-top-left {
          top: 20px;
          left: 20px;
      }

      .eksi-notification-container.position-bottom-right {
          bottom: 20px;
          right: 20px;
      }

      .eksi-notification-container.position-bottom-left {
          bottom: 20px;
          left: 20px;
      }

      /* Notification states */
      .eksi-notification-container.show {
          opacity: 1;
          transform: translateY(0);
          max-height: 100%;
      }

      .eksi-notification-container.hidden {
          opacity: 0;
          max-height: 0;
      }

      /* Position-specific animations */
      .position-top-left.hidden,
      .position-top-right.hidden {
          transform: translateY(-20px);
      }

      .position-bottom-left.hidden,
      .position-bottom-right.hidden {
          transform: translateY(20px);
      }

      /* Message styling */
      .eksi-notification-message {
          padding: 0;
          margin: 0 0 12px 0;
          line-height: 1.5;
      }

      /* Countdown timer styling */
      .eksi-notification-countdown {
          font-size: 12px;
          color: #a0e577;
          margin: 8px 0;
          font-style: italic;
          padding: 6px 10px;
          background-color: rgba(129, 193, 75, 0.1);
          border-radius: 4px;
          display: inline-block;
      }

      /* Button container */
      .eksi-notification-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 15px;
      }

      /* Custom styling for close button from ButtonComponent */
      .eksi-close-button {
          position: absolute !important;
          right: 12px !important;
          top: 12px !important;
          z-index: 20 !important;
          width: 24px !important;
          height: 24px !important;
          min-width: unset !important;
          padding: 0 !important;
          background-color: transparent !important;
          box-shadow: none !important;
          border: none !important;
          color: #999 !important;
      }

      .eksi-close-button:hover {
          color: #fff !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
      }

      .eksi-close-button .material-icons {
          font-size: 18px !important;
      }

      /* Custom styling for notification stop button */
      .eksi-notification-stop-button {
          /* Add any specific styling needed for the stop button */
      }

      /* Header styling */
      .eksi-notification-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .eksi-notification-icon {
          margin-right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(129, 193, 75, 0.15);
          width: 28px;
          height: 28px;
          border-radius: 50%;
      }

      .eksi-notification-title {
          font-weight: 600;
          font-size: 15px;
          color: #81c14b;
      }

      /* Progress bar */
      .eksi-progress-container {
          width: 100%;
          height: 6px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          margin: 15px 0;
          overflow: hidden;
      }

      .eksi-progress-bar {
          height: 100%;
          background-color: #81c14b;
          border-radius: 3px;
          transition: width 0.3s ease;
          width: 0%;
      }

      /* Status messages */
      .eksi-notification-success,
      .eksi-notification-error,
      .eksi-notification-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 10px;
          line-height: 1.5;
      }

      .eksi-notification-success {
          background-color: rgba(129, 193, 75, 0.1);
      }

      .eksi-notification-error {
          background-color: rgba(229, 57, 53, 0.1);
      }

      .eksi-notification-warning {
          background-color: rgba(255, 152, 0, 0.1);
      }

      /* Tooltip styles */
      .eksi-tooltip {
          position: relative;
          display: inline-block;
          cursor: help;
      }

      .eksi-tooltip .eksi-tooltiptext {
          visibility: hidden;
          width: 200px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          margin-left: -100px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }

      .eksi-tooltip .eksi-tooltiptext::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #333 transparent transparent transparent;
      }

      .eksi-tooltip:hover .eksi-tooltiptext {
          visibility: visible;
          opacity: 1;
      }
    `;

        this.cssHandler.addCSS(defaultCSS);
    }
}