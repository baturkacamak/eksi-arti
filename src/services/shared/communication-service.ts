/**
 * Communication Service
 * Handles messaging between content scripts, UI components, and the background script
 */

import { ICommunicationService, MessageRequest, MessageResponse, MessageHandler } from '../../interfaces/services/shared/ICommunicationService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

// Error types for better error handling
enum CommunicationErrorType {
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    HANDLER_ERROR = 'HANDLER_ERROR',
    CONTEXT_INVALIDATED = 'CONTEXT_INVALIDATED',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    UNKNOWN_ACTION = 'UNKNOWN_ACTION'
}

interface CommunicationError {
    type: CommunicationErrorType;
    message: string;
    originalError?: any;
}

export class CommunicationService implements ICommunicationService {
    private handlers: Map<string, MessageHandler> = new Map();
    private isBackgroundScript: boolean;
    private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 1000; // 1 second

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
                // Validate message structure
                const validationError = this.validateMessage(message);
                if (validationError) {
                    this.loggingService.error('Message validation failed', validationError);
                    resolve(this.createErrorResponse(CommunicationErrorType.VALIDATION_ERROR, validationError.message));
                    return;
                }

                // Check if chrome extension context is available
                if (!this.isExtensionContextValid()) {
                    const error = this.createError(CommunicationErrorType.CONTEXT_INVALIDATED, 'Extension context is not available');
                    this.loggingService.error('Extension context validation failed', error);
                    resolve(this.createErrorResponse(error.type, error.message));
                    return;
                }

                this.loggingService.debug('Sending message to background', { action: message.action, message });
                
                // Set up timeout
                const timeoutId = setTimeout(() => {
                    const timeoutError = this.createError(CommunicationErrorType.TIMEOUT_ERROR, `Message timeout after ${this.DEFAULT_TIMEOUT}ms`);
                    this.loggingService.error('Message timeout', { action: message.action, timeout: this.DEFAULT_TIMEOUT });
                    resolve(this.createErrorResponse(timeoutError.type, timeoutError.message));
                }, this.DEFAULT_TIMEOUT);

                chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
                    clearTimeout(timeoutId);

                    // Handle Chrome runtime errors
                    if (chrome.runtime.lastError) {
                        const runtimeError = this.handleChromeRuntimeError(chrome.runtime.lastError);
                        this.loggingService.error('Chrome runtime error during message send', runtimeError);
                        resolve(this.createErrorResponse(runtimeError.type, runtimeError.message));
                        return;
                    }

                    // Handle missing response
                    if (!response) {
                        const connectionError = this.createError(CommunicationErrorType.CONNECTION_ERROR, 'No response from background script - connection may be lost');
                        this.loggingService.warn('No response received from background script', { action: message.action });
                        resolve(this.createErrorResponse(connectionError.type, connectionError.message));
                        return;
                    }

                    // Validate response structure
                    const responseValidationError = this.validateResponse(response);
                    if (responseValidationError) {
                        this.loggingService.error('Response validation failed', responseValidationError);
                        resolve(this.createErrorResponse(CommunicationErrorType.VALIDATION_ERROR, responseValidationError.message));
                        return;
                    }

                    this.loggingService.debug('Received response from background', { action: message.action, response });
                    resolve(response);
                });
            } catch (error) {
                const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Error sending message to background', error);
                this.loggingService.error('Error sending message to background', handlerError);
                resolve(this.createErrorResponse(handlerError.type, handlerError.message));
            }
        });
    }

    /**
     * Send message with retry mechanism
     */
    public async sendMessageWithRetry<T = any>(message: MessageRequest, maxRetries: number = this.MAX_RETRY_ATTEMPTS): Promise<MessageResponse<T>> {
        let lastError: CommunicationError | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.loggingService.debug(`Sending message attempt ${attempt}/${maxRetries}`, { action: message.action });
                
                const response = await this.sendMessage<T>(message);
                
                // Return successful response immediately
                if (response.success) {
                    if (attempt > 1) {
                        this.loggingService.info(`Message succeeded on retry attempt ${attempt}`, { action: message.action });
                    }
                    return response;
                }
                
                // Check if this is a retryable error
                lastError = this.parseErrorFromResponse(response);
                if (!this.isRetryableError(lastError)) {
                    this.loggingService.warn('Non-retryable error encountered', { action: message.action, error: lastError });
                    return response;
                }
                
            } catch (error) {
                lastError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Unexpected error during message send', error);
                this.loggingService.error(`Message attempt ${attempt} failed`, lastError);
            }
            
            // Wait before retry (except on last attempt)
            if (attempt < maxRetries) {
                await this.delay(this.RETRY_DELAY * attempt); // Exponential backoff
            }
        }
        
        // All retries failed
        const finalError = lastError || this.createError(CommunicationErrorType.HANDLER_ERROR, 'All retry attempts failed');
        this.loggingService.error(`All ${maxRetries} retry attempts failed`, { action: message.action, finalError });
        
        return this.createErrorResponse(finalError.type, `Failed after ${maxRetries} attempts: ${finalError.message}`);
    }

    /**
     * Register a message handler (for background script)
     */
    public registerHandler(action: string, handler: MessageHandler): void {
        try {
            if (!this.isBackgroundScript) {
                this.loggingService.warn('Attempted to register handler outside background script', { action });
                return;
            }

            // Validate inputs
            if (!action || typeof action !== 'string') {
                throw new Error('Action must be a non-empty string');
            }

            if (!handler || typeof handler !== 'function') {
                throw new Error('Handler must be a function');
            }

            // Check for duplicate handlers
            if (this.handlers.has(action)) {
                this.loggingService.warn('Overwriting existing handler', { action });
            }

            // Wrap handler with error handling
            const wrappedHandler = this.wrapHandlerWithErrorHandling(action, handler);
            this.handlers.set(action, wrappedHandler);
            this.loggingService.debug('Registered message handler', { action });
        } catch (error) {
            const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Failed to register handler', error);
            this.loggingService.error('Error registering handler', handlerError);
            throw error;
        }
    }

    /**
     * Unregister a message handler (for background script)
     */
    public unregisterHandler(action: string): void {
        try {
            if (!this.isBackgroundScript) {
                this.loggingService.warn('Attempted to unregister handler outside background script', { action });
                return;
            }

            if (!action || typeof action !== 'string') {
                throw new Error('Action must be a non-empty string');
            }

            if (!this.handlers.has(action)) {
                this.loggingService.warn('Attempted to unregister non-existent handler', { action });
                return;
            }

            this.handlers.delete(action);
            this.loggingService.debug('Unregistered message handler', { action });
        } catch (error) {
            const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Failed to unregister handler', error);
            this.loggingService.error('Error unregistering handler', handlerError);
            throw error;
        }
    }

    /**
     * Listen for messages from background script (for content scripts)
     */
    public onMessage(callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): void {
        try {
            if (this.isBackgroundScript) {
                this.loggingService.warn('Attempted to listen for messages in background script');
                return;
            }

            if (!callback || typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }

            // Check if chrome extension context is available
            if (!this.isExtensionContextValid()) {
                throw new Error('Extension context is not available');
            }

            // Wrap callback with error handling
            const wrappedCallback = this.wrapCallbackWithErrorHandling(callback);
            chrome.runtime.onMessage.addListener(wrappedCallback);
            this.loggingService.debug('Added message listener for content script');
        } catch (error) {
            const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Failed to setup message listener', error);
            this.loggingService.error('Error setting up message listener', handlerError);
            throw error;
        }
    }

    /**
     * Set up the background script message listener
     */
    private setupBackgroundListener(): void {
        try {
            chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
                try {
                    this.loggingService.debug('Background received message', { action: message.action, message, sender });

                    // Validate message
                    const validationError = this.validateMessage(message);
                    if (validationError) {
                        this.loggingService.error('Invalid message received', validationError);
                        sendResponse(this.createErrorResponse(CommunicationErrorType.VALIDATION_ERROR, validationError.message));
                        return false;
                    }

                    // Validate sender
                    const senderValidationError = this.validateSender(sender);
                    if (senderValidationError) {
                        this.loggingService.error('Invalid sender', senderValidationError);
                        sendResponse(this.createErrorResponse(CommunicationErrorType.PERMISSION_ERROR, senderValidationError.message));
                        return false;
                    }

                    const handler = this.handlers.get(message.action);
                    if (!handler) {
                        const unknownActionError = this.createError(CommunicationErrorType.UNKNOWN_ACTION, `Unknown action: ${message.action}`);
                        this.loggingService.debug('No handler found for action', unknownActionError);
                        sendResponse(this.createErrorResponse(unknownActionError.type, unknownActionError.message));
                        return false;
                    }

                    // Handle both sync and async handlers
                    const result = handler(message, sender);
                    
                    if (result instanceof Promise) {
                        // Async handler with timeout
                        const timeoutPromise = new Promise<MessageResponse>((_, reject) => {
                            setTimeout(() => {
                                reject(this.createError(CommunicationErrorType.TIMEOUT_ERROR, `Handler timeout after ${this.DEFAULT_TIMEOUT}ms`));
                            }, this.DEFAULT_TIMEOUT);
                        });

                        Promise.race([result, timeoutPromise])
                            .then(response => {
                                // Validate response before sending
                                const responseValidationError = this.validateResponse(response);
                                if (responseValidationError) {
                                    this.loggingService.error('Handler returned invalid response', responseValidationError);
                                    sendResponse(this.createErrorResponse(CommunicationErrorType.VALIDATION_ERROR, responseValidationError.message));
                                    return;
                                }
                                
                                this.loggingService.debug('Async handler completed', { action: message.action, response });
                                sendResponse(response);
                            })
                            .catch(error => {
                                const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Async handler error', error);
                                this.loggingService.error('Async handler error', handlerError);
                                sendResponse(this.createErrorResponse(handlerError.type, handlerError.message));
                            });
                        return true; // Indicates async response
                    } else {
                        // Sync handler
                        const responseValidationError = this.validateResponse(result);
                        if (responseValidationError) {
                            this.loggingService.error('Handler returned invalid response', responseValidationError);
                            sendResponse(this.createErrorResponse(CommunicationErrorType.VALIDATION_ERROR, responseValidationError.message));
                            return false;
                        }

                        this.loggingService.debug('Sync handler completed', { action: message.action, response: result });
                        sendResponse(result);
                        return false;
                    }
                } catch (error) {
                    const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Error in background message handler', error);
                    this.loggingService.error('Error in background message handler', handlerError);
                    sendResponse(this.createErrorResponse(handlerError.type, handlerError.message));
                    return false;
                }
            });

            this.loggingService.info('Background message listener setup complete');
        } catch (error) {
            const setupError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Failed to setup background listener', error);
            this.loggingService.error('Error setting up background listener', setupError);
            throw error;
        }
    }

    /**
     * Validation methods
     */
    private validateMessage(message: any): CommunicationError | null {
        if (!message || typeof message !== 'object') {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Message must be an object');
        }

        if (!message.action || typeof message.action !== 'string') {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Message must have a valid action string');
        }

        if (message.action.length === 0) {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Action cannot be empty');
        }

        return null;
    }

    private validateResponse(response: any): CommunicationError | null {
        if (!response || typeof response !== 'object') {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Response must be an object');
        }

        if (typeof response.success !== 'boolean') {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Response must have a boolean success property');
        }

        if (!response.success && (!response.error || typeof response.error !== 'string')) {
            return this.createError(CommunicationErrorType.VALIDATION_ERROR, 'Error responses must have an error message');
        }

        return null;
    }

    private validateSender(sender: chrome.runtime.MessageSender): CommunicationError | null {
        if (!sender) {
            return this.createError(CommunicationErrorType.PERMISSION_ERROR, 'Invalid sender');
        }

        // Check if sender is from our extension
        if (sender.id && sender.id !== chrome.runtime.id) {
            return this.createError(CommunicationErrorType.PERMISSION_ERROR, 'Message from unauthorized extension');
        }

        return null;
    }

    /**
     * Error handling utilities
     */
    private createError(type: CommunicationErrorType, message: string, originalError?: any): CommunicationError {
        return {
            type,
            message,
            originalError
        };
    }

    private createErrorResponse<T>(errorType: CommunicationErrorType, message: string): MessageResponse<T> {
        return {
            success: false,
            error: `[${errorType}] ${message}`
        };
    }

    private handleChromeRuntimeError(runtimeError: chrome.runtime.LastError): CommunicationError {
        const message = runtimeError.message || 'Unknown runtime error';
        
        // Categorize runtime errors
        if (message.includes('context invalidated') || message.includes('Extension context')) {
            return this.createError(CommunicationErrorType.CONTEXT_INVALIDATED, 'Extension context was invalidated');
        }
        
        if (message.includes('connection') || message.includes('port')) {
            return this.createError(CommunicationErrorType.CONNECTION_ERROR, 'Connection error');
        }
        
        if (message.includes('permission')) {
            return this.createError(CommunicationErrorType.PERMISSION_ERROR, 'Permission error');
        }
        
        return this.createError(CommunicationErrorType.RUNTIME_ERROR, message, runtimeError);
    }

    private parseErrorFromResponse(response: MessageResponse): CommunicationError {
        if (!response.error) {
            return this.createError(CommunicationErrorType.HANDLER_ERROR, 'Unknown error');
        }

        // Try to extract error type from error message
        const errorTypeMatch = response.error.match(/^\[(\w+)\]/);
        if (errorTypeMatch) {
            const typeString = errorTypeMatch[1] as keyof typeof CommunicationErrorType;
            const type = CommunicationErrorType[typeString] || CommunicationErrorType.HANDLER_ERROR;
            const message = response.error.replace(/^\[\w+\]\s*/, '');
            return this.createError(type, message);
        }

        return this.createError(CommunicationErrorType.HANDLER_ERROR, response.error);
    }

    private isRetryableError(error: CommunicationError): boolean {
        const retryableTypes = [
            CommunicationErrorType.TIMEOUT_ERROR,
            CommunicationErrorType.CONNECTION_ERROR,
            CommunicationErrorType.RUNTIME_ERROR
        ];
        
        return retryableTypes.includes(error.type);
    }

    private isExtensionContextValid(): boolean {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch {
            return false;
        }
    }

    private wrapHandlerWithErrorHandling(action: string, handler: MessageHandler): MessageHandler {
        return async (message: MessageRequest, sender: chrome.runtime.MessageSender) => {
            try {
                const startTime = Date.now();
                const result = await handler(message, sender);
                const duration = Date.now() - startTime;
                
                this.loggingService.debug(`Handler executed successfully`, { 
                    action, 
                    duration: `${duration}ms`,
                    success: result.success 
                });
                
                return result;
            } catch (error) {
                const handlerError = this.createError(CommunicationErrorType.HANDLER_ERROR, `Handler for action '${action}' failed`, error);
                this.loggingService.error('Handler execution failed', handlerError);
                
                return this.createErrorResponse(handlerError.type, handlerError.message);
            }
        };
    }

    private wrapCallbackWithErrorHandling(callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void): (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void {
        return (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
            try {
                callback(message, sender, sendResponse);
            } catch (error) {
                const callbackError = this.createError(CommunicationErrorType.HANDLER_ERROR, 'Callback execution failed', error);
                this.loggingService.error('Message callback failed', callbackError);
                
                if (sendResponse) {
                    sendResponse(this.createErrorResponse(callbackError.type, callbackError.message));
                }
            }
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    /**
     * Get handler statistics (for debugging)
     */
    public getHandlerStats(): { action: string, registered: boolean }[] {
        if (!this.isBackgroundScript) {
            return [];
        }

        return Array.from(this.handlers.keys()).map(action => ({
            action,
            registered: true
        }));
    }

    /**
     * Check service health
     */
    public checkHealth(): { status: 'healthy' | 'unhealthy', issues: string[] } {
        const issues: string[] = [];

        if (!this.isExtensionContextValid()) {
            issues.push('Extension context is not available');
        }

        if (this.isBackgroundScript && this.handlers.size === 0) {
            issues.push('No message handlers registered in background script');
        }

        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            issues
        };
    }
} 