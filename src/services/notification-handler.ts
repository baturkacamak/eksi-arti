// src/services/notification-handler.ts

import { NotificationComponent } from '../components/notification-component';
import { logDebug, logError } from './logging-service';

/**
 * NotificationHandler
 * Handles displaying notifications from background script
 */
export class NotificationHandler {
    private static instance: NotificationHandler;
    private notification: NotificationComponent;
    private isInitialized: boolean = false;

    private constructor() {
        this.notification = new NotificationComponent();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): NotificationHandler {
        if (!NotificationHandler.instance) {
            NotificationHandler.instance = new NotificationHandler();
        }
        return NotificationHandler.instance;
    }

    /**
     * Initialize notification handler
     */
    public initialize(): void {
        if (this.isInitialized) return;

        this.setupMessageListener();
        this.isInitialized = true;
    }

    /**
     * Set up message listener
     */
    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                // Check if message is from our background blocker
                if (message.source !== 'background-blocker') {
                    sendResponse({ received: false, error: 'Not from background blocker' });
                    return;
                }

                logDebug('Notification message received', message);

                // Handle different notification actions
                switch (message.action) {
                    case 'showNotification':
                        this.handleShowNotification(message);
                        break;

                    case 'updateNotification':
                        this.handleUpdateNotification(message);
                        break;

                    case 'clearNotification':
                        this.handleClearNotification();
                        break;

                    default:
                        // Ignore unknown actions
                        break;
                }

                // Always send a response to avoid warnings
                sendResponse({ received: true });
            } catch (error) {
                logError('Error handling notification message', error);
                sendResponse({ error: 'Error handling notification' });
            }
        });
    }

    /**
     * Handle show notification message
     */
    private async handleShowNotification(message: any): Promise<void> {
        try {
            let content = message.message || '';
            const timeout = message.timeout !== undefined ? message.timeout : 5;
            const messageType = message.messageType || 'info';

            // Format message based on message type
            if (messageType && messageType !== 'info') {
                const iconName = this.getIconForMessageType(messageType);
                const iconColor = this.getColorForMessageType(messageType);

                content = `
                    <div class="eksi-notification-${messageType}">
                        <span class="material-icons" style="color: ${iconColor}; margin-right: 8px;">${iconName}</span>
                        ${content}
                    </div>
                `;
            }

            // Show notification
            await this.notification.show(content, { timeout });

            // Add stop button if requested
            if (message.showStopButton) {
                this.notification.addStopButton(() => {
                    // Send stop message to background script
                    chrome.runtime.sendMessage({
                        action: 'stopBlocking'
                    });
                });
            }
        } catch (error) {
            logError('Error showing notification', error);
        }
    }

    /**
     * Handle update notification message
     */
    private async handleUpdateNotification(message: any): Promise<void> {
        try {
            // Update notification message if provided
            if (message.message) {
                this.notification.updateMessage(message.message);
            }

            // Update progress bar if progress info is provided
            if (message.progress) {
                this.notification.addProgressBar(
                    message.progress.current,
                    message.progress.total
                );
            }

            // Show countdown if provided
            if (message.countdown) {
                this.notification.updateDelayCountdown(message.countdown);
            }
        } catch (error) {
            logError('Error updating notification', error);
        }
    }

    /**
     * Handle clear notification message
     */
    private handleClearNotification(): void {
        try {
            this.notification.removeWithTransition();
        } catch (error) {
            logError('Error clearing notification', error);
        }
    }

    /**
     * Get appropriate icon for message type
     */
    private getIconForMessageType(type: string): string {
        switch (type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            default:
                return 'info';
        }
    }

    /**
     * Get appropriate color for message type
     */
    private getColorForMessageType(type: string): string {
        switch (type) {
            case 'success':
                return '#81c14b';
            case 'error':
                return '#e53935';
            case 'warning':
                return '#ff9800';
            default:
                return '#2196f3';
        }
    }

    /**
     * Show notification manually
     * This can be used by content scripts directly if needed
     */
    public async showNotification(message: string, options: {
        messageType?: 'success' | 'error' | 'warning' | 'info',
        timeout?: number,
        showStopButton?: boolean
    } = {}): Promise<void> {
        try {
            const messageType = options.messageType || 'info';
            const timeout = options.timeout !== undefined ? options.timeout : 5;

            let content = message;

            // Format message based on message type
            if (messageType && messageType !== 'info') {
                const iconName = this.getIconForMessageType(messageType);
                const iconColor = this.getColorForMessageType(messageType);

                content = `
                    <div class="eksi-notification-${messageType}">
                        <span class="material-icons" style="color: ${iconColor}; margin-right: 8px;">${iconName}</span>
                        ${content}
                    </div>
                `;
            }

            // Show notification
            await this.notification.show(content, { timeout });

            // Add stop button if requested
            if (options.showStopButton) {
                this.notification.addStopButton(() => {
                    // Send stop message to background script
                    chrome.runtime.sendMessage({
                        action: 'stopBlocking'
                    });
                });
            }
        } catch (error) {
            logError('Error showing manual notification', error);
        }
    }

    /**
     * Update notification manually
     * This can be used by content scripts directly if needed
     */
    public updateNotification(options: {
        message?: string,
        progress?: { current: number, total: number },
        countdown?: number
    } = {}): void {
        try {
            // Update notification message if provided
            if (options.message) {
                this.notification.updateMessage(options.message);
            }

            // Update progress bar if progress info is provided
            if (options.progress) {
                this.notification.addProgressBar(
                    options.progress.current,
                    options.progress.total
                );
            }

            // Show countdown if provided
            if (options.countdown) {
                this.notification.updateDelayCountdown(options.countdown);
            }
        } catch (error) {
            logError('Error updating notification manually', error);
        }
    }

    /**
     * Clear notification manually
     * This can be used by content scripts directly if needed
     */
    public clearNotification(): void {
        try {
            this.notification.removeWithTransition();
        } catch (error) {
            logError('Error clearing notification manually', error);
        }
    }
}