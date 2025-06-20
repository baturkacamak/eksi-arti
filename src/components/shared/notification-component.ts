import { preferencesManager } from "../../services/features/preferences/preferences-manager";
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ExtendedNotificationOptions, INotificationComponent } from "../../interfaces/components/INotificationComponent";

export class NotificationComponent implements INotificationComponent {
    private notificationElement: HTMLElement | null = null;
    private timeoutId: number | null = null;
    private defaultDuration: number = 5; // Default duration in seconds
    private contentContainer: HTMLElement | null = null;
    private footerContainer: HTMLElement | null = null;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
    ) {
        this.initAnimations();
        this.applyStyles();
        this.loadNotificationDuration();
    }

    /**
     * Load notification duration from preferences
     */
    private async loadNotificationDuration(): Promise<void> {
        try {
            const preferences = preferencesManager.getPreferences();
            this.defaultDuration = preferences.notificationDuration || 5;
           this.loggingService.debug('Loaded notification duration from preferences:', this.defaultDuration);
        } catch (error) {
          this.loggingService.error('Error loading notification duration:', error);
        }
    }

    /**
     * Initialize animations for notifications
     */
    private initAnimations(): void {
        const css = `
      @keyframes eksiNotificationSlideIn {
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
        this.cssService.addCSS(css);
    }

    /**
     * Show notification
     * @param content HTML content or string message
     * @param options Notification options
     * @returns The notification element for further customization
     */
    async show(content: string, options: ExtendedNotificationOptions = {}): Promise<HTMLElement | null> {
        try {
            const preferences = preferencesManager.getPreferences();

            if (!preferences.enableNotifications) {
                return null;
            }

            // Ensure we have the latest notification duration
            await this.loadNotificationDuration();

            // Determine notification position (from options or preferences)
            const position = options.position || preferences.notificationPosition || 'top-right';

            // If notification already exists, update its content
            if (this.notificationElement) {
                // Update position class
                if (this.notificationElement.classList.contains('position-top-right')) {
                    this.notificationElement.classList.remove('position-top-right');
                } else if (this.notificationElement.classList.contains('position-top-left')) {
                    this.notificationElement.classList.remove('position-top-left');
                } else if (this.notificationElement.classList.contains('position-bottom-right')) {
                    this.notificationElement.classList.remove('position-bottom-right');
                } else if (this.notificationElement.classList.contains('position-bottom-left')) {
                    this.notificationElement.classList.remove('position-bottom-left');
                }
                this.notificationElement.classList.add(`position-${position}`);

                this.updateContent(content);
            } else {
                // Merge position into options
                options.position = position;

                // Create a new notification
                this.createElement(content, options);
                this.appendNotificationToDOM();
            }

            // Use the provided timeout or fall back to the default duration from preferences
            const timeout = options.timeout !== undefined ? options.timeout : this.defaultDuration;
            this.setAutoCloseTimeout(timeout, options.onClose);

            // Show with transition
            this.showWithTransition();

            return this.notificationElement;
        } catch (error) {
          this.loggingService.error('Error showing notification:', error);
            return null;
        }
    }

    /**
     * Update notification content
     */
    updateContent(content: string): void {
        if (this.notificationElement && this.contentContainer) {
            this.contentContainer.innerHTML = content;
        }
    }

    /**
     * Create notification element
     */
    private createElement(content: string, options: ExtendedNotificationOptions): void {
        if (this.notificationElement) {
            this.removeExistingNotification();
        }

        const type = options.type || 'notification';
        
        this.notificationElement = this.domService.createElement('div');
        this.domService.addClass(this.notificationElement, 'eksi-notification-container');

        // Add type class
        this.domService.addClass(this.notificationElement, `eksi-notification-type-${type}`);

        // Add theme class
        const theme = options.theme || 'default';
        this.domService.addClass(this.notificationElement, `eksi-notification-theme-${theme}`);

        // Add position class - default or from options
        const position = options.position || 'top-right';
        this.domService.addClass(this.notificationElement, `position-${position}`);

        // Set custom width if provided
        if (options.width) {
            this.notificationElement.style.width = options.width;
        }

        if (type === 'toast') {
            // Toast layout: simple content with optional close button
            this.createToastLayout(content, options);
        } else {
            // Notification layout: header + content + footer (current behavior)
            this.createNotificationLayout(content, options);
        }
    }

    /**
     * Create toast layout (simple and compact)
     */
    private createToastLayout(content: string, options: ExtendedNotificationOptions): void {
        // Create content container
        this.contentContainer = this.domService.createElement('div');
        this.domService.addClass(this.contentContainer, 'eksi-toast-content');
        this.contentContainer.innerHTML = content;

        // Add close button if closable
        if (options.closable !== false) {
            const closeButton = this.domService.createElement('button');
            this.domService.addClass(closeButton, 'eksi-toast-close');
            closeButton.innerHTML = '×';
            closeButton.setAttribute('aria-label', 'Kapat');

            this.domService.addEventListener(closeButton, 'click', () => {
                this.removeWithTransition(options.onClose);
            });

            if (this.notificationElement) {
                this.domService.appendChild(this.notificationElement, closeButton);
            }
        }

        // Create minimal footer for compatibility
        this.footerContainer = this.domService.createElement('div');
        this.domService.addClass(this.footerContainer, 'eksi-toast-footer');
        this.footerContainer.style.display = 'none'; // Hidden by default for toasts

        // Assemble toast
        if (this.notificationElement && this.contentContainer && this.footerContainer) {
            this.domService.appendChild(this.notificationElement, this.contentContainer);
            this.domService.appendChild(this.notificationElement, this.footerContainer);
        }
    }

    /**
     * Create notification layout (rich with header and footer)
     */
    private createNotificationLayout(content: string, options: ExtendedNotificationOptions): void {
        // Create a header with title
        const headerElement = this.domService.createElement('div');
        this.domService.addClass(headerElement, 'eksi-notification-header');
        headerElement.innerHTML = `
      <div class="eksi-notification-icon">
        <span class="material-icons" aria-hidden="true">info</span>
      </div>
      <div class="eksi-notification-title">Ekşi Artı</div>
    `;

        // Add close button if closable
        if (options.closable !== false) {
            const closeButton = this.domService.createElement('button');
            this.domService.addClass(closeButton, 'eksi-notification-close');
            closeButton.innerHTML = '×';
            closeButton.setAttribute('aria-label', 'Kapat');

            this.domService.addEventListener(closeButton, 'click', () => {
                this.removeWithTransition(options.onClose);
            });

            this.domService.appendChild(headerElement, closeButton);
        }

        // Create content container
        this.contentContainer = this.domService.createElement('div');
        this.domService.addClass(this.contentContainer, 'eksi-notification-content');
        this.contentContainer.innerHTML = content;

        // Create footer container for additional controls
        this.footerContainer = this.domService.createElement('div');
        this.domService.addClass(this.footerContainer, 'eksi-notification-footer');

        // Assemble notification
        if (this.notificationElement && this.contentContainer && this.footerContainer) {
            this.domService.appendChild(this.notificationElement, headerElement);
            this.domService.appendChild(this.notificationElement, this.contentContainer);
            this.domService.appendChild(this.notificationElement, this.footerContainer);
        }
    }

    /**
     * Get the content container element
     * This can be used by external components to add their content
     */
    getContentContainer(): HTMLElement | null {
        return this.contentContainer;
    }

    /**
     * Get the footer container element
     * This can be used by external components to add buttons, progress bars, etc.
     */
    getFooterContainer(): HTMLElement | null {
        return this.footerContainer;
    }

    /**
     * Remove existing notification
     */
    private removeExistingNotification(): void {
        if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
            this.notificationElement = null;
            this.contentContainer = null;
            this.footerContainer = null;
        }
    }

    /**
     * Append notification to DOM
     */
    private appendNotificationToDOM(): void {
        if (this.notificationElement) {
            this.domService.appendChild(document.body, this.notificationElement);
        }
    }

    /**
     * Set auto-close timeout
     */
    private setAutoCloseTimeout(timeout: number = 5, onClose?: () => void): void {
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (timeout > 0) {
            this.timeoutId = window.setTimeout(() => {
                this.removeWithTransition(onClose);
            }, timeout * 1000);
        }
    }

    /**
     * Remove notification with transition
     */
    removeWithTransition(onClose?: () => void): void {
        if (!this.notificationElement) return;

        // Clear auto-close timeout
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this.domService.removeClass(this.notificationElement, 'show');
        this.domService.addClass(this.notificationElement, 'hidden');

        const handleTransitionEnd = () => {
            if (this.notificationElement && this.notificationElement.parentNode) {
                this.notificationElement.parentNode.removeChild(this.notificationElement);
                this.notificationElement = null;
                this.contentContainer = null;
                this.footerContainer = null;

                // Call onClose callback if provided
                if (onClose) {
                    onClose();
                }
            }
        };

        this.domService.addEventListener(this.notificationElement, 'transitionend', handleTransitionEnd, { once: true });

        // Fallback in case transition doesn't trigger
        setTimeout(handleTransitionEnd, 500);
    }

    /**
     * Show notification with transition
     */
    private showWithTransition(): void {
        if (!this.notificationElement) return;

        this.domService.addClass(this.notificationElement, 'hidden');
        requestAnimationFrame(() => {
            if (this.notificationElement) { // Check again inside the callback
                this.domService.removeClass(this.notificationElement, 'hidden');
                this.domService.addClass(this.notificationElement, 'show');
            }
        });
    }

    /**
     * Apply CSS styles for notifications
     */
    private applyStyles(): void {
        const notificationStyles = `
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
        min-width: 280px;
        max-width: 420px; /* Add max-width to limit notification width */
        width: auto; /* Allow notification to size based on content up to max-width */
        border-left: 4px solid #81c14b;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        overflow-wrap: break-word; /* Ensure text wraps properly within container */
        word-break: break-word; /* Help with long words */
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
      }

      .eksi-notification-container.hidden {
        opacity: 0;
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

      /* Header styling */
      .eksi-notification-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
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

      /* Content container */
      .eksi-notification-content {
        padding: 0;
        margin: 0 0 12px 0;
        line-height: 1.5;
      }

      /* Footer container */
      .eksi-notification-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* Button container styles */
      .eksi-notification-button-container {
        width: 100%;
      }

      /* Make continue button more prominent */
      .eksi-notification-continue-button {
        width: 100% !important;
        margin-top: 8px;
        padding: 10px !important;
        text-align: center;
        font-weight: 600 !important;
      }

      /* Close button */
      .eksi-notification-close {
        position: absolute;
        right: 0;
        top: 0;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 24px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }

      .eksi-notification-close:hover {
        color: rgba(255, 255, 255, 0.9);
      }

      /* Theme variations */
      .eksi-notification-theme-success {
        border-left-color: #43a047;
      }
      
      .eksi-notification-theme-success .eksi-notification-icon {
        background-color: rgba(67, 160, 71, 0.15);
      }
      
      .eksi-notification-theme-success .eksi-notification-title {
        color: #43a047;
      }
      
      .eksi-notification-theme-error {
        border-left-color: #e53935;
      }
      
      .eksi-notification-theme-error .eksi-notification-icon {
        background-color: rgba(229, 57, 53, 0.15);
      }
      
      .eksi-notification-theme-error .eksi-notification-title {
        color: #e53935;
      }
      
      .eksi-notification-theme-warning {
        border-left-color: #ffa000;
      }
      
      .eksi-notification-theme-warning .eksi-notification-icon {
        background-color: rgba(255, 160, 0, 0.15);
      }
      
      .eksi-notification-theme-warning .eksi-notification-title {
        color: #ffa000;
      }
      
      .eksi-notification-theme-info {
        border-left-color: #1e88e5;
      }
      
      .eksi-notification-theme-info .eksi-notification-icon {
        background-color: rgba(30, 136, 229, 0.15);
      }
      
      .eksi-notification-theme-info .eksi-notification-title {
        color: #1e88e5;
      }

      /* Toast-specific styles */
      .eksi-notification-type-toast {
        padding: 12px 16px !important;
        min-width: 250px !important;
        max-width: 350px !important;
        border-radius: 6px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15) !important;
        border-left: none !important;
        background-color: #1a1a1a !important;
        color: #ffffff !important;
      }

      /* Toast content */
      .eksi-toast-content {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        word-wrap: break-word !important;
      }

      /* Toast close button */
      .eksi-toast-close {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.6) !important;
        font-size: 18px !important;
        cursor: pointer !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: color 0.2s ease !important;
        padding: 0 !important;
      }

      .eksi-toast-close:hover {
        color: rgba(255, 255, 255, 0.9) !important;
      }

      /* Toast theme variations */
      .eksi-notification-type-toast.eksi-notification-theme-success {
        background-color: #2d5a2d !important;
        border-left: 3px solid #43a047 !important;
      }
      
      .eksi-notification-type-toast.eksi-notification-theme-error {
        background-color: #5a2d2d !important;
        border-left: 3px solid #e53935 !important;
      }
      
      .eksi-notification-type-toast.eksi-notification-theme-warning {
        background-color: #5a4d2d !important;
        border-left: 3px solid #ffa000 !important;
      }
      
      .eksi-notification-type-toast.eksi-notification-theme-info {
        background-color: #2d3e5a !important;
        border-left: 3px solid #1e88e5 !important;
      }

      /* Toast footer (hidden by default) */
      .eksi-toast-footer {
        display: none !important;
      }

      /* Utility tooltip for the notification */
      .eksi-tooltip {
        position: relative;
        display: inline-block;
        cursor: pointer;
        margin-top: 4px;
      }

      .eksi-tooltip .eksi-tooltiptext {
        visibility: hidden;
        width: 220px;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

        this.cssService.addCSS(notificationStyles);
    }
}