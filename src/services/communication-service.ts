/**
 * Communication Service
 * Handles messaging between content scripts, UI components, and the background script
 */

import { ICommunicationService, MessageRequest, MessageResponse, MessageHandler } from '../interfaces/services/ICommunicationService';
import { ILoggingService } from '../interfaces/services/ILoggingService';

export class CommunicationService implements ICommunicationService {
    private handlers: Map<string, MessageHandler> = new Map();
    private isBackgroundScript: boolean;

    constructor(private loggingService: ILoggingService) {
        // Detect if we're in the background script
        this.isBackgroundScript = typeof chrome !== 'undefined' && 
                                  chrome.runtime && 
                                  typeof chrome.runtime.getManifest === 'function' && 
                                  typeof document === 'undefined';

        if (this.isBackgroundScript) {
            this.setupBackgroundListener();
        }
    }

    /**
     * Send a message to the background script (from content script/UI)
     */
    public async sendMessage<T = any>(message: MessageRequest): Promise<MessageResponse<T>> {
        return new Promise((resolve) => {
            try {
                this.loggingService.debug('Sending message to background', { action: message.action, message });
                
                chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
                    if (chrome.runtime.lastError) {
                        this.loggingService.error('Chrome runtime error during message send', chrome.runtime.lastError);
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message || 'Unknown runtime error'
                        });
                        return;
                    }

                    if (!response) {
                        this.loggingService.warn('No response received from background script', { action: message.action });
                        resolve({
                            success: false,
                            error: 'No response from background script'
                        });
                        return;
                    }

                    this.loggingService.debug('Received response from background', { action: message.action, response });
                    resolve(response);
                });
            } catch (error) {
                this.loggingService.error('Error sending message to background', error);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    /**
     * Register a message handler (for background script)
     */
    public registerHandler(action: string, handler: MessageHandler): void {
        if (!this.isBackgroundScript) {
            this.loggingService.warn('Attempted to register handler outside background script', { action });
            return;
        }

        this.handlers.set(action, handler);
        this.loggingService.debug('Registered message handler', { action });
    }

    /**
     * Unregister a message handler (for background script)
     */
    public unregisterHandler(action: string): void {
        if (!this.isBackgroundScript) {
            this.loggingService.warn('Attempted to unregister handler outside background script', { action });
            return;
        }

        this.handlers.delete(action);
        this.loggingService.debug('Unregistered message handler', { action });
    }

    /**
     * Listen for messages from background script (for content scripts)
     */
    public onMessage(callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): void {
        if (this.isBackgroundScript) {
            this.loggingService.warn('Attempted to listen for messages in background script');
            return;
        }

        chrome.runtime.onMessage.addListener(callback);
        this.loggingService.debug('Added message listener for content script');
    }

    /**
     * Set up the background script message listener
     */
    private setupBackgroundListener(): void {
        chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
            try {
                this.loggingService.debug('Background received message', { action: message.action, message, sender });

                const handler = this.handlers.get(message.action);
                if (!handler) {
                    this.loggingService.debug('No handler found for action', { action: message.action });
                    sendResponse({
                        success: false,
                        error: `Unknown action: ${message.action}`
                    });
                    return false;
                }

                // Handle both sync and async handlers
                const result = handler(message, sender);
                
                if (result instanceof Promise) {
                    // Async handler
                    result.then(response => {
                        this.loggingService.debug('Async handler completed', { action: message.action, response });
                        sendResponse(response);
                    }).catch(error => {
                        this.loggingService.error('Async handler error', { action: message.action, error });
                        sendResponse({
                            success: false,
                            error: error instanceof Error ? error.message : 'Handler error'
                        });
                    });
                    return true; // Indicates async response
                } else {
                    // Sync handler
                    this.loggingService.debug('Sync handler completed', { action: message.action, response: result });
                    sendResponse(result);
                    return false;
                }
            } catch (error) {
                this.loggingService.error('Error in background message handler', error);
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return false;
            }
        });

        this.loggingService.info('Background message listener setup complete');
    }

    /**
     * Utility method to create a success response
     */
    public static createSuccessResponse<T>(data?: T): MessageResponse<T> {
        return {
            success: true,
            data
        };
    }

    /**
     * Utility method to create an error response
     */
    public static createErrorResponse(error: string): MessageResponse {
        return {
            success: false,
            error
        };
    }
} 