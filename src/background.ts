/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/preferences-manager';
import { logger, logDebug, logError, logInfo } from './services/logging-service';
import { StorageArea, storageService } from './services/storage-service';
import { BlockType, STORAGE_KEYS, Endpoints } from './constants';
import { BlockerState } from './types';
import { HttpService } from './services/http-service';
import { HtmlParserService } from './services/html-parser-service';

/**
 * Background Blocking Service
 * Handles blocking operations in the background to continue regardless of navigation
 */
class BackgroundBlockingService {
    private isProcessing: boolean = false;
    private abortProcessing: boolean = false;
    private currentOperation: BlockerState | null = null;
    private processedUsers: Set<string> = new Set();
    private pendingUsers: string[] = [];
    private errorCount: number = 0;
    private maxErrors: number = 10;
    private requestDelay: number = 7;
    private retryDelay: number = 5;
    private maxRetries: number = 3;

    // Use existing services
    private httpService: HttpService;
    private htmlParser: HtmlParserService;

    constructor() {
        this.httpService = new HttpService();
        this.htmlParser = new HtmlParserService();

        // Load preferences when service is initialized
        this.loadOperationParams();
    }

    /**
     * Load operation parameters from preferences
     */
    async loadOperationParams(): Promise<void> {
        try {
            // Initialize preferences if needed
            await preferencesManager.initialize();

            // Get preferences
            const preferences = preferencesManager.getPreferences();

            // Update operation parameters from preferences
            this.requestDelay = preferences.requestDelay || 7;
            this.retryDelay = preferences.retryDelay || 5;
            this.maxRetries = preferences.maxRetries || 3;

            logDebug('Background operation parameters loaded', {
                requestDelay: this.requestDelay,
                retryDelay: this.retryDelay,
                maxRetries: this.maxRetries
            }, 'BackgroundBlockingService');
        } catch (error) {
            logError('Error loading operation parameters:', error, 'BackgroundBlockingService');
            // Use default values if there's an error
        }
    }

    /**
     * Start blocking users for a specific entry
     */
    async startBlocking(entryId: string, blockType: BlockType, userUrls: string[], postTitle: string): Promise<void> {
        if (this.isProcessing) {
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: 'Başka bir engelleme işlemi zaten devam ediyor.',
                messageType: 'warning',
                timeout: 5
            });
            return;
        }

        try {
            // Initialize operation state
            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;

            // Set up operation data
            this.currentOperation = {
                entryId,
                blockType,
                processedUsers: [],
                totalUserCount: userUrls.length,
                timestamp: Date.now()
            };

            this.processedUsers = new Set();
            this.pendingUsers = [...userUrls];

            // Notify user about starting the operation
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: `${userUrls.length} kullanıcı işlenecek...`,
                showStopButton: true,
                timeout: 0
            });

            // Start processing after a short delay
            await this.delay(2);
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                this.sendMessageToActiveTab({
                    action: 'showNotification',
                    message: `İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText(blockType)}.`,
                    messageType: 'success',
                    timeout: 5
                });
                await this.clearState();
            } else {
                await this.saveState();
                this.sendMessageToActiveTab({
                    action: 'showNotification',
                    message: 'İşlem durduruldu. Daha sonra devam edebilirsiniz.',
                    messageType: 'warning',
                    timeout: 5
                });
            }
        } catch (error) {
            logError('Error in background blocking service:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: `Hata oluştu: ${errorMessage}`,
                messageType: 'error',
                timeout: 10
            });

            await this.saveState(); // Save progress on error
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Resume a previously started blocking operation
     */
    async resumeBlocking(savedState: BlockerState, postTitle: string): Promise<void> {
        if (this.isProcessing) {
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: 'Başka bir engelleme işlemi zaten devam ediyor.',
                messageType: 'warning',
                timeout: 5
            });
            return;
        }

        try {
            // Initialize from saved state
            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;
            this.currentOperation = savedState;

            // Fetch users again to ensure we have the complete list
            const userUrls = await this.fetchFavoritesInBackground(savedState.entryId);

            // Initialize processed and pending users
            this.processedUsers = new Set(savedState.processedUsers);
            this.pendingUsers = userUrls.filter(url => {
                const username = this.getUsernameFromUrl(url);
                return !this.processedUsers.has(username);
            });

            // Notify user about resuming the operation
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: `İşlem devam ediyor. Kalan kullanıcı: ${this.pendingUsers.length}`,
                showStopButton: true,
                timeout: 0
            });

            // Start processing
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                this.sendMessageToActiveTab({
                    action: 'showNotification',
                    message: `İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText(savedState.blockType)}.`,
                    messageType: 'success',
                    timeout: 5
                });
                await this.clearState();
            } else {
                await this.saveState();
                this.sendMessageToActiveTab({
                    action: 'showNotification',
                    message: 'İşlem durduruldu. Daha sonra devam edebilirsiniz.',
                    messageType: 'warning',
                    timeout: 5
                });
            }
        } catch (error) {
            logError('Error in resuming background blocking:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: `Hata oluştu: ${errorMessage}`,
                messageType: 'error',
                timeout: 10
            });

            await this.saveState(); // Save progress on error
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Stop the current blocking operation
     */
    stopBlocking(): void {
        if (this.isProcessing) {
            this.abortProcessing = true;
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: 'İşlem durduruldu...',
                messageType: 'warning',
                timeout: 3
            });
        }
    }

    /**
     * Process a batch of users
     */
    private async processBatch(postTitle: string): Promise<void> {
        if (!this.currentOperation) return;

        let userIndex = 0;

        while (userIndex < this.pendingUsers.length && !this.abortProcessing && this.errorCount < this.maxErrors) {
            const userUrl = this.pendingUsers[userIndex];
            const username = this.getUsernameFromUrl(userUrl);

            if (this.processedUsers.has(username)) {
                userIndex++;
                continue;
            }

            try {
                // Update notification about current user
                this.sendMessageToActiveTab({
                    action: 'updateNotification',
                    message: `İşleniyor: ${username}`,
                    progress: {
                        current: this.processedUsers.size,
                        total: this.currentOperation.totalUserCount
                    },
                    countdown: this.requestDelay
                });

                await this.processUser(userUrl, postTitle);
                this.processedUsers.add(username);

                // Update processed users in the current operation
                if (this.currentOperation) {
                    this.currentOperation.processedUsers = Array.from(this.processedUsers);
                }

                // Update notification with progress
                this.sendMessageToActiveTab({
                    action: 'updateNotification',
                    message: `${this.getBlockTypeText(this.currentOperation.blockType)} kullanıcılar: <strong>${this.processedUsers.size}</strong> / <strong>${this.currentOperation.totalUserCount}</strong> (Kalan: ${this.pendingUsers.length - userIndex - 1})`,
                    progress: {
                        current: this.processedUsers.size,
                        total: this.currentOperation.totalUserCount
                    }
                });

                await this.saveState();
            } catch (error) {
                this.errorCount++;
                logError(`Error processing user ${username}:`, error);

                if (this.errorCount >= this.maxErrors) {
                    this.sendMessageToActiveTab({
                        action: 'showNotification',
                        message: `Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.`,
                        messageType: 'error',
                        timeout: 10
                    });
                    this.abortProcessing = true;
                    break;
                }

                // Show error notification but continue
                this.sendMessageToActiveTab({
                    action: 'showNotification',
                    message: `Kullanıcı işlenirken hata oluştu: ${username}. Yeniden deneniyor...`,
                    messageType: 'warning',
                    timeout: this.retryDelay
                });

                await this.delay(this.retryDelay);
            }

            userIndex++;

            if (userIndex < this.pendingUsers.length && !this.abortProcessing) {
                // Show countdown for next user
                this.sendMessageToActiveTab({
                    action: 'updateNotification',
                    countdown: this.requestDelay
                });

                await this.delay(this.requestDelay);
            }
        }
    }

    /**
     * Process a single user
     */
    private async processUser(userUrl: string, postTitle: string): Promise<boolean> {
        if (!this.currentOperation) return false;

        const username = this.getUsernameFromUrl(userUrl);

        try {
            // Fetch user profile to get user ID - using HttpService
            const userProfileHtml = await this.fetchUserProfile(userUrl);
            const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);

            if (!userId) {
                throw new Error(`User ID not found for ${username}`);
            }

            // Block the user
            await this.retryOperation(() => this.blockUser(userId, this.currentOperation!.blockType));

            // Add a note to the user
            await this.retryOperation(() => this.addNoteToUser(
                userUrl,
                userId,
                postTitle,
                this.currentOperation!.entryId,
                this.currentOperation!.blockType
            ));

            return true;
        } catch (error) {
            logError(`Failed to process user ${username}:`, error);
            throw error;
        }
    }

    /**
     * Fetch favorites in background
     */
    private async fetchFavoritesInBackground(entryId: string): Promise<string[]> {
        try {
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: 'Favori listesi yükleniyor...',
                timeout: 60
            });

            // Use HttpService instead of fetch
            const html = await this.httpService.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
            return this.htmlParser.parseFavoritesHtml(html);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
            this.sendMessageToActiveTab({
                action: 'showNotification',
                message: 'Favori listesi yüklenemedi: ' + message,
                messageType: 'error',
                timeout: 10
            });
            throw error;
        }
    }

    /**
     * Fetch user profile
     */
    private async fetchUserProfile(url: string): Promise<string> {
        try {
            // Use HttpService
            return await this.httpService.get(url);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to fetch user profile: ${errorMessage}`);
        }
    }

    /**
     * Block a user by ID
     */
    private async blockUser(userId: string, blockType: BlockType): Promise<boolean> {
        if (!userId) {
            throw new Error('User ID is required for blocking');
        }

        try {
            // Use HttpService for POST request
            await this.httpService.post(`${Endpoints.BLOCK}/${userId}?r=${blockType}`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to block user: ${errorMessage}`);
        }
    }

    /**
     * Add a note to a user
     */
    private async addNoteToUser(userUrl: string, userId: string, postTitle: string, entryId: string, blockType: BlockType): Promise<boolean> {
        if (!userId || !entryId) {
            throw new Error('User ID and Entry ID are required for adding note');
        }

        try {
            const username = this.getUsernameFromUrl(userUrl);
            const noteUrl = Endpoints.ADD_NOTE.replace('{username}', username);

            // Get the preferences to use the custom note template
            const preferences = await preferencesManager.getPreferences();
            const noteTemplate = preferences.defaultNoteTemplate;

            // Generate custom note with the template from preferences
            const actionType = blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';
            const noteText = noteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', `https://eksisozluk.com/entry/${entryId}`)
                .replace('{date}', new Date().toLocaleString('tr-TR'));

            // Use HttpService for POST request
            const data = `who=${userId}&usernote=${encodeURIComponent(noteText)}`;
            await this.httpService.post(noteUrl, data);

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to add note to user: ${errorMessage}`);
        }
    }

    /**
     * Retry an operation with exponential backoff
     */
    private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
        let attempts = 0;

        while (attempts < this.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                attempts++;
                if (attempts >= this.maxRetries) {
                    throw error;
                }

                // Use the configurable retry delay from preferences with exponential backoff
                const delayTime = this.retryDelay * Math.pow(1.5, attempts - 1);
                await this.delay(delayTime);
            }
        }

        throw new Error('Maximum retry attempts exceeded');
    }

    /**
     * Helper to get block type text
     */
    private getBlockTypeText(blockType: BlockType): string {
        return blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';
    }

    /**
     * Extract username from URL
     */
    private getUsernameFromUrl(url: string): string {
        return url.split('/').pop() || '';
    }

    /**
     * Save current processing state
     */
    private async saveState(): Promise<void> {
        if (!this.currentOperation) return;

        try {
            // Update processed users in state
            this.currentOperation.processedUsers = Array.from(this.processedUsers);
            this.currentOperation.timestamp = Date.now();

            // Save to storage
            await storageService.setItem(
                STORAGE_KEYS.CURRENT_OPERATION,
                this.currentOperation,
                StorageArea.LOCAL
            );

            logDebug('Saved state to storage', {
                data: this.currentOperation
            }, 'BackgroundBlockingService');
        } catch (error) {
            logError('Failed to save state', error, 'BackgroundBlockingService');
        }
    }

    /**
     * Clear saved state
     */
    private async clearState(): Promise<void> {
        try {
            await storageService.removeItem(
                STORAGE_KEYS.CURRENT_OPERATION,
                StorageArea.LOCAL
            );

            logDebug('Cleared state from storage', {}, 'BackgroundBlockingService');
        } catch (error) {
            logError('Failed to clear state', error, 'BackgroundBlockingService');
        }
    }

    /**
     * Send message to active tab
     */
    private async sendMessageToActiveTab(message: any): Promise<void> {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tabs.length > 0 && tabs[0].id) {
                chrome.tabs.sendMessage(<number>tabs[0].id, {
                    source: 'background-blocker',
                    ...message
                });
            } else {
                // If no active tab is found, we try to send to all tabs matching our URL pattern
                const allTabs = await chrome.tabs.query({ url: "https://eksisozluk.com/*" });

                if (allTabs.length > 0) {
                    for (const tab of allTabs) {
                        if (tab.id) {
                            chrome.tabs.sendMessage(tab.id, {
                                source: 'background-blocker',
                                ...message
                            });
                        }
                    }
                }
            }
        } catch (error) {
            logError('Error sending message to tab:', error);
        }
    }

    /**
     * Promise-based delay function
     */
    private delay(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
}

// Initialize the background blocking service
const blockingService = new BackgroundBlockingService();

/**
 * Initialize extension
 */
async function initializeExtension() {
    try {
        // Initialize preferences
        await preferencesManager.initialize();
        const preferences = preferencesManager.getPreferences();

        // Set up logger based on preferences
        logger.setDebugMode(preferences.enableDebugMode);

        logDebug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message listeners
        setupMessageListeners();

        // Set up context menu if needed
        // setupContextMenu();

        return true;
    } catch (error) {
        logError('Failed to initialize extension', error);
        return false;
    }
}

/**
 * Set up message listeners for communication between scripts
 */
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            logDebug('Message received', { message, sender });

            switch (message.action) {
                case 'getPreferences':
                    // Send current preferences
                    sendResponse({
                        success: true,
                        data: preferencesManager.getPreferences()
                    });
                    break;

                case 'savePreferences':
                    // Save preferences
                    preferencesManager.savePreferences(message.data)
                        .then(success => {
                            sendResponse({ success });
                        })
                        .catch(error => {
                            logError('Error saving preferences', error);
                            sendResponse({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        });
                    return true; // Indicates we will call sendResponse asynchronously

                case 'resetPreferences':
                    // Reset preferences to defaults
                    preferencesManager.resetPreferences()
                        .then(success => {
                            sendResponse({ success });
                        })
                        .catch(error => {
                            logError('Error resetting preferences', error);
                            sendResponse({
                                success: false,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        });
                    return true; // Indicates we will call sendResponse asynchronously

                case 'getVersion':
                    // Get extension version
                    sendResponse({
                        success: true,
                        version: chrome.runtime.getManifest().version
                    });
                    break;

                case 'getLogs':
                    // Get debug logs
                    sendResponse({
                        success: true,
                        logs: logger.getLogs()
                    });
                    break;

                default:
                    logDebug('Unknown message action', message.action);
                    sendResponse({
                        success: false,
                        error: 'Unknown action'
                    });
            }
        } catch (error) {
            logError('Error processing message', error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        return false; // No asynchronous response for default cases
    });
}

/**
 * Set up context menu for the extension
 */
function setupContextMenu() {
    // Clear existing menu items
    chrome.contextMenus.removeAll();

    // Create main menu item
    chrome.contextMenus.create({
        id: 'eksiArti',
        title: 'Ekşi Artı',
        contexts: ['page']
    });

    // Add options submenu
    chrome.contextMenus.create({
        id: 'eksiArtiOptions',
        parentId: 'eksiArti',
        title: 'Ayarlar',
        contexts: ['page']
    });

    // Add context menu click listener
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'eksiArtiOptions') {
            chrome.runtime.openOptionsPage();
        }
    });
}

// Handle extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        await initializeExtension();

        if (details.reason === 'install') {
            // First install
            logDebug('Extension installed');

            // Open options page on first install
            chrome.runtime.openOptionsPage();
        } else if (details.reason === 'update') {
            // Extension updated
            const currentVersion = chrome.runtime.getManifest().version;
            const previousVersion = details.previousVersion;

            logDebug('Extension updated', { previousVersion, currentVersion });

            // Check if this is a major update that needs attention
            if (previousVersion && isMajorUpdate(previousVersion, currentVersion)) {
                // Show update notification or open options page
                // chrome.runtime.openOptionsPage();
            }
        }
    } catch (error) {
        logError('Error during extension installation', error);
    }
});

/**
 * Check if this is a major version update
 */
function isMajorUpdate(oldVersion: string, newVersion: string): boolean {
    const oldParts = oldVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);

    // Consider it a major update if the major version number changed
    return oldParts[0] < newParts[0];
}

// Initialize when background script loads
initializeExtension().catch(error => {
    logError('Failed to initialize extension on load', error);
});

// Listen for browser startup
chrome.runtime.onStartup.addListener(() => {
    initializeExtension().catch(error => {
        logError('Failed to initialize extension on browser startup', error);
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});