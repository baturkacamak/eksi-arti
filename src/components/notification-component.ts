import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { NotificationOptions } from '../types';

export class NotificationComponent {
    private cssHandler: CSSService;
    private domHandler: DOMService;
    private notificationElement: HTMLElement | null = null;
    private timeoutId: number | null = null;
    private countdownIntervalId: number | null = null;
    private countdownElement: HTMLElement | null = null;

    constructor() {
        this.cssHandler = new CSSService();
        this.domHandler = new DOMService();
        this.initAnimations();
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
    show(message: string, options: NotificationOptions = {}): void {
        this.applyStyles();

        if (!this.notificationElement) {
            this.createElement(message);
            this.createCloseButton();
            this.appendNotificationToDOM();
        } else {
            this.updateMessage(message);
        }

        this.setAutoCloseTimeout(options.timeout);
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

        // Set initial text with icon
        let remainingSeconds = seconds;
        this.countdownElement.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
        <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="#a0e577"/>
      </svg>
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
            <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="#a0e577"/>
          </svg>
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

        // Create a header with icon
        const headerElement = this.domHandler.createElement('div');
        this.domHandler.addClass(headerElement, 'eksi-notification-header');
        headerElement.innerHTML = `
      <div class="eksi-notification-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
        </svg>
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
     * Create close button for notification
     */
    private createCloseButton(): void {
        const closeButton = this.domHandler.createElement('button');
        closeButton.innerHTML = '×';
        this.domHandler.addClass(closeButton, 'eksi-close-button');
        this.domHandler.addEventListener(closeButton, 'click', () => {
            this.removeWithTransition();
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
     * Add stop button to notification
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

        const stopButton = this.domHandler.createElement('button');
        stopButton.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
      </svg>
      Durdur
    `;
        this.domHandler.addClass(stopButton, 'eksi-notification-button');
        this.domHandler.addClass(stopButton, 'stop');
        this.domHandler.addEventListener(stopButton, 'click', clickHandler);

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
    private setAutoCloseTimeout(timeout: number = 10): void {
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
          top: 20px;
          right: 20px;
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

      /* Notification states */
      .eksi-notification-container.show {
          opacity: 1;
          transform: translateY(0);
          max-height: 100%;
      }

      .eksi-notification-container.hidden {
          opacity: 0;
          transform: translateY(-20px);
          max-height: 0;
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

      /* Button styling */
      .eksi-notification-button {
          padding: 8px 14px;
          border: none;
          border-radius: 4px;
          background-color: #444;
          color: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
          font-weight: 500;
      }

      .eksi-notification-button:hover {
          background-color: #555;
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      .eksi-notification-button:active {
          transform: translateY(0);
          box-shadow: none;
      }

      .eksi-notification-button.stop {
          background-color: #e55353;
      }

      .eksi-notification-button.stop:hover {
          background-color: #f06464;
      }

      /* Close button styling */
      .eksi-close-button {
          position: absolute;
          right: 12px;
          top: 12px;
          z-index: 20;
          cursor: pointer;
          padding: 4px;
          font-size: 18px;
          line-height: 1;
          color: #999;
          transition: color 0.2s ease;
          background: none;
          border: none;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
      }

      .eksi-close-button:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
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