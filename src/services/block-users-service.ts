/**
 * BlockUsersService
 * Service to manage blocking users who favorited a specific entry
 */
import { HttpService } from './http-service';
import { HtmlParserService } from './html-parser-service';
import { StorageArea, storageService } from './storage-service';
import { preferencesManager } from './preferences-manager';
import { BlockType, Endpoints, STORAGE_KEYS } from '../constants';
import { logDebug, logError, logInfo } from './logging-service';
import { ButtonVariant } from "../components/button-component";
import { PreferencesService } from "./preferences-service";
import { delay } from "./utilities";
import { NotificationService } from './notification-service';
import {IconComponent} from "../components/icon-component";

export class BlockUsersService {
    private remoteRequest: HttpService;
    private htmlParser: HtmlParserService;
    private notificationService: NotificationService;
    private preferencesService: PreferencesService;
    private iconComponent: IconComponent;

    private totalUserCount: number = 0;
    private currentBlocked: number = 1;
    private timeout: number = 30;
    private retryDelay: number = 5; // Default seconds to wait between retries
    private requestDelay: number = 7; // Default seconds between regular requests to avoid rate limiting
    private maxRetries: number = 3; // Default maximum number of retries
    private blockType: BlockType = BlockType.MUTE; // Default to mute
    private entryId: string | null = null;
    private processedUsers: Set<string> = new Set();
    private pendingUsers: string[] = [];
    private isProcessing: boolean = false;
    private abortProcessing: boolean = false;
    private errorCount: number = 0;
    private maxErrors: number = 10; // Maximum errors before aborting

    constructor() {
        this.remoteRequest = new HttpService();
        this.htmlParser = new HtmlParserService();
        this.notificationService = new NotificationService();
        this.preferencesService = new PreferencesService();
        this.iconComponent = new IconComponent();
        this.loadOperationParams();
    }

    /**
     * Load operation parameters from preferences
     */
    private async loadOperationParams(): Promise<void> {
        try {
            // Initialize preferences if needed
            await preferencesManager.initialize();

            // Get preferences
            const preferences = preferencesManager.getPreferences();

            // Update operation parameters from preferences
            this.requestDelay = preferences.requestDelay || 7;
            this.retryDelay = preferences.retryDelay || 5;
            this.maxRetries = preferences.maxRetries || 3;

            logDebug('Operation parameters loaded', {
                requestDelay: this.requestDelay,
                retryDelay: this.retryDelay,
                maxRetries: this.maxRetries
            }, 'BlockUsersService');
        } catch (error) {
            logError('Error loading operation parameters:', error, 'BlockUsersService');
            // Use default values if there's an error
        }
    }

    /**
     * Set block type (mute or block)
     */
    setBlockType(type: BlockType): void {
        this.blockType = type;
    }

    /**
     * Get block type text description
     */
    getBlockTypeText(): string {
        return this.blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';
    }

    /**
     * Load previously saved processing state
     */
    async loadState(): Promise<boolean> {
        try {
            // Use the instance method that leverages Chrome storage API with proper fallbacks
            const result = await storageService.getItem<{
                entryId: string;
                processedUsers: string[];
                blockType: BlockType;
                totalUserCount: number;
            }>(STORAGE_KEYS.CURRENT_OPERATION);

            // If successful and data exists
            if (result.success && result.data && result.data.entryId === this.entryId) {
                logDebug('Loaded saved state from storage', {
                    source: result.source,
                    data: result.data
                }, 'BlockUsersService');

                this.processedUsers = new Set(result.data.processedUsers || []);
                this.currentBlocked = (result.data.processedUsers || []).length + 1;
                this.blockType = result.data.blockType;
                return true;
            }

            logDebug('No saved state found or entry ID mismatch', {
                currentEntryId: this.entryId,
                result
            }, 'BlockUsersService');
            return false;
        } catch (error) {
            logError('Error loading state', error, 'BlockUsersService');
            return false;
        }
    }

    /**
     * Save current processing state
     */
    async saveState(): Promise<void> {
        try {
            const stateData = {
                entryId: this.entryId,
                blockType: this.blockType,
                processedUsers: Array.from(this.processedUsers),
                totalUserCount: this.totalUserCount,
                timestamp: Date.now(),
            };

            // Use the instance method that leverages Chrome storage API with proper fallbacks
            const result = await storageService.setItem(
                STORAGE_KEYS.CURRENT_OPERATION,
                stateData,
                StorageArea.LOCAL
            );

            logDebug('Saved state to storage', {
                source: result.source,
                success: result.success,
                data: stateData
            }, 'BlockUsersService');
        } catch (error) {
            logError('Failed to save state', error, 'BlockUsersService');
        }
    }

    /**
     * Clear saved state
     */
    async clearState(): Promise<void> {
        try {
            // Use the instance method to remove the item
            const result = await storageService.removeItem(
                STORAGE_KEYS.CURRENT_OPERATION,
                StorageArea.LOCAL
            );

            logDebug('Cleared state from storage', {
                source: result.source,
                success: result.success
            }, 'BlockUsersService');
        } catch (error) {
            logError('Failed to clear state', error, 'BlockUsersService');
        }
    }

    /**
     * Fetch users who favorited a post
     */
    async fetchFavorites(entryId: string): Promise<string[]> {
        try {
            await this.notificationService.show('Favori listesi yükleniyor...', {
                theme: 'info',
                timeout: 60
            });

            const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
            return this.htmlParser.parseFavoritesHtml(html);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
            await this.notificationService.show(`Favori listesi yüklenemedi: ${message}`, {
                theme: 'error',
                timeout: 10
            });
            throw error;
        }
    }

    /**
     * Main method to block users who favorited a post
     */
    async blockUsers(entryId: string): Promise<void> {
        try {
            this.entryId = entryId;

            // Load updated settings from preferences
            await this.loadOperationParams();

            // Load previous state if exists
            const hasState = await this.loadState();
            if (!hasState) {
                this.processedUsers = new Set();
                this.currentBlocked = 1;
            }

            const userUrls = await this.fetchFavorites(entryId);
            this.totalUserCount = userUrls.length;
            const postTitle = this.htmlParser.parsePostTitle();

            // Filter out already processed users
            this.pendingUsers = userUrls.filter((userUrl) => {
                const username = this.getUsernameFromUrl(userUrl);
                return !this.processedUsers.has(username);
            });

            if (this.pendingUsers.length === 0) {
                // Show success notification with no progress bar
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'check_circle', color: '#81c14b', size: 'medium' }).outerHTML}
                        <span>Tüm kullanıcılar zaten işlendi.</span>
                    </div>`,
                    {
                        theme: 'success',
                        timeout: 5
                    }
                );
                return;
            }

            // Show initial notification with progress bar
            await this.notificationService.show(
                `${this.pendingUsers.length} kullanıcı işlenecek...`,
                {
                    progress: {
                        current: 0,
                        total: this.pendingUsers.length,
                        options: {
                            height: '8px',
                            animated: true,
                            striped: true
                        }
                    }
                }
            );

            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;

            // Add stop button
            this.notificationService.addStopButton(async () => {
                this.abortProcessing = true;
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'warning', color: '#ff9800', size: 'medium' }).outerHTML}
                        <span>İşlem durduruldu.</span>
                    </div>`,
                    {
                        theme: 'warning',
                        timeout: 5
                    }
                );
            });

            // Start processing after a short delay
            await delay(2);
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({ name: 'check_circle', color: '#81c14b', size: 'medium' }).outerHTML}
                        <span>İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText()}.</span>
                    </div>`,
                    {
                        theme: 'success',
                        timeout: 5
                    }
                );
                await this.clearState();
            } else {
                await this.saveState();
            }
        } catch (error) {
            logError('Error in blockUsers:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({ name: 'error', color: '#e53935', size: 'medium' }).outerHTML}
                    <span>Hata oluştu: ${errorMessage}</span>
                </div>`,
                {
                    theme: 'error',
                    timeout: 10
                }
            );

            await this.saveState(); // Save progress on error
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a batch of users
     */
    private async processBatch(postTitle: string): Promise<void> {
        let userIndex = 0;
        let notificationShown = false;

        while (userIndex < this.pendingUsers.length && !this.abortProcessing && this.errorCount < this.maxErrors) {
            const userUrl = this.pendingUsers[userIndex];
            const username = this.getUsernameFromUrl(userUrl);

            if (this.processedUsers.has(username)) {
                userIndex++;
                continue;
            }

            try {
                await this.processUser(userUrl, postTitle);
                this.processedUsers.add(username);
                this.updateProgress();
                await this.saveState();
            } catch (error) {
                this.errorCount++;
                logError(`Error processing user ${username}:`, error);

                if (this.errorCount >= this.maxErrors) {
                    await this.notificationService.show(
                        `<div style="display: flex; align-items: center">
                            ${this.iconComponent.create({ name: 'error_outline', color: '#e53935', size: 'medium' }).outerHTML}
                            <span>Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.</span>
                        </div>`,
                        {
                            theme: 'error',
                            timeout: 10
                        }
                    );
                    this.abortProcessing = true;
                    break;
                }

                await delay(this.retryDelay);
            }

            userIndex++;

            if (userIndex < this.pendingUsers.length && !this.abortProcessing) {
                if (!notificationShown) {
                    // Only create a new notification if we don't have one
                    this.notificationService.show(
                        `<div style="display: flex; align-items: center">
                            ${this.iconComponent.create({ name: 'person', color: '#81c14b', size: 'medium' }).outerHTML}
                            <span>${this.processedUsers.size} / ${this.totalUserCount} kullanıcı işlendi</span>
                        </div>`,
                        {
                            progress: {
                                current: this.processedUsers.size,
                                total: this.totalUserCount,
                                options: {
                                    height: '8px',
                                    animated: true,
                                    striped: true
                                }
                            },
                            countdown: {
                                seconds: this.requestDelay,
                                options: {
                                    label: 'Sonraki işlem için bekleniyor:',
                                    onComplete: () => {
                                        logDebug('Countdown completed');
                                    }
                                }
                            }
                        }
                    );
                    notificationShown = true;
                } else {
                    // Just update the existing notification
                    this.notificationService.updateContent(
                        `<div style="display: flex; align-items: center">
                            ${this.iconComponent.create({ name: 'person', color: '#81c14b', size: 'medium' }).outerHTML}
                            <span>${this.processedUsers.size} / ${this.totalUserCount} kullanıcı işlendi</span>
                        </div>`
                    );
                    this.notificationService.updateProgress(this.processedUsers.size, this.totalUserCount);
                    this.notificationService.updateCountdown(this.requestDelay);
                }

                await delay(this.requestDelay);
            }
        }
    }

    /**
     * Process a single user
     */
    private async processUser(userUrl: string, postTitle: string): Promise<boolean> {
        const username = this.getUsernameFromUrl(userUrl);
        try {
            const userProfileHtml = await this.fetchUserProfile(userUrl);
            const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);

            if (!userId) {
                throw new Error(`User ID not found for ${username}`);
            }

            await this.retryOperation(() => this.blockUser(userId));
            await this.retryOperation(() => this.addNoteToUser(userUrl, userId, postTitle));

            return true;
        } catch (error) {
            logError(`Failed to process user ${username}:`, error);
            throw error;
        }
    }

    /**
     * Extract username from URL
     */
    private getUsernameFromUrl(url: string): string {
        return url.split('/').pop() || '';
    }

    /**
     * Fetch user profile page
     */
    private async fetchUserProfile(url: string): Promise<string> {
        try {
            return await this.remoteRequest.get(url);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to fetch user profile: ${errorMessage}`);
        }
    }

    /**
     * Block a user by ID
     */
    private async blockUser(userId: string): Promise<boolean> {
        if (!userId) {
            throw new Error('User ID is required for blocking');
        }

        try {
            await this.remoteRequest.post(`${Endpoints.BLOCK}/${userId}?r=${this.blockType}`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to block user: ${errorMessage}`);
        }
    }

    /**
     * Add a note to a user
     */
    private async addNoteToUser(userUrl: string, userId: string, postTitle: string): Promise<boolean> {
        if (!userId || !this.entryId) {
            throw new Error('User ID and Entry ID are required for adding note');
        }

        try {
            const username = this.getUsernameFromUrl(userUrl);
            const noteUrl = Endpoints.ADD_NOTE.replace('{username}', username);

            const noteText = await this.preferencesService.generateCustomNote(postTitle, this.entryId, this.blockType);

            const data = `who=${userId}&usernote=${encodeURIComponent(noteText)}`;
            await this.remoteRequest.post(noteUrl, data);
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
                await delay(delayTime);
            }
        }

        throw new Error('Maximum retry attempts exceeded');
    }

    /**
     * Update progress display
     */
    private updateProgress(): void {
        const processed = this.processedUsers.size;
        const total = this.totalUserCount;

        const actionType = this.getBlockTypeText();
        const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

        // Update notification content with progress
        this.notificationService.updateContent(
            `<div style="display: flex; align-items: center">
                ${this.iconComponent.create({ name: 'person', color: '#81c14b', size: 'medium' }).outerHTML}
                <span>${actionType.charAt(0).toUpperCase() + actionType.slice(1)} kullanıcılar: 
                <strong>${processed}</strong> / <strong>${total}</strong> 
                (Kalan: ${remaining})</span>
            </div>`
        );

        // Update progress bar
        this.notificationService.updateProgress(processed, total);

        this.currentBlocked = processed + 1;
    }

    /**
     * Check if a blocking operation is currently in progress
     */
    isBlockingInProgress(): boolean {
        return this.isProcessing;
    }

    /**
     * Cancel the current blocking operation
     */
    cancelOperation(): void {
        if (this.isProcessing) {
            this.abortProcessing = true;
            logInfo('User requested to cancel the blocking operation');
        }
    }
}