import { HttpService, HttpError } from './http-service';
import { HtmlParserService } from './html-parser-service';
import { NotificationComponent } from '../components/notification-component';
import { storageService, StorageArea } from './storage-service';
import { preferencesManager } from './preferences-manager';
import { BlockType, STORAGE_KEYS, Endpoints } from '../constants';
import { logger, logDebug, logError } from './logging-service';
import {ButtonComponent, ButtonSize, ButtonVariant} from "../components/button-component";

export class BlockUsersService {
    private remoteRequest: HttpService;
    private htmlParser: HtmlParserService;
    private notification: NotificationComponent;
    private buttonComponent: ButtonComponent;

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
        this.notification = new NotificationComponent();
        this.buttonComponent = new ButtonComponent();
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
     * Load previously saved processing state using Chrome storage API with fallbacks
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
     * Save current processing state using Chrome storage API with fallbacks
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
     * Clear saved state using Chrome storage API with fallbacks
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
            await this.notification.show('Favori listesi yükleniyor...', {timeout: 60});
            const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
            return this.htmlParser.parseFavoritesHtml(html);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
            await this.notification.show('Favori listesi yüklenemedi: ' + message, {timeout: 10});
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
                await this.notification.show(
                    `<div class="eksi-notification-success">
            <span class="material-icons" style="color: #81c14b; margin-right: 8px;">check_circle</span>
            Tüm kullanıcılar zaten işlendi.
        </div>`,
                    {timeout: 5},
                );
                return;
            }

            await this.notification.show(`${this.pendingUsers.length} kullanıcı işlenecek...`);

            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;

            // Create a Stop button in the notification
            this.notification.addStopButton(async () => {
                this.abortProcessing = true;
                await this.notification.show(
                    `<div class="eksi-notification-warning">
            <span class="material-icons" style="color: #ff9800; margin-right: 8px;">warning</span>
            İşlem durduruldu.
        </div>`,
                    {timeout: 5},
                );
            });

            // Start processing after a short delay
            await this.delay(2);
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                await this.notification.show(
                    `<div class="eksi-notification-success">
                        <span class="material-icons" style="color: #81c14b; margin-right: 8px;">check_circle</span>
                        İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText()}.
                    </div>`,
                    {timeout: 5}
                );
                await this.clearState();
            } else {
                await this.saveState();
            }
        } catch (error) {
            logError('Error in blockUsers:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            await this.notification.show(
                `<div class="eksi-notification-error">
                    <span class="material-icons" style="color: #e53935; margin-right: 8px;">error</span>
                    Hata oluştu: ${errorMessage}
                </div>`,
                {timeout: 10}
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

        // Add stop button at the start of processing
        this.addStopButton();

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
                this.updateNotification();
                await this.saveState();
            } catch (error) {
                this.errorCount++;
                logError(`Error processing user ${username}:`, error);

                if (this.errorCount >= this.maxErrors) {
                    await this.notification.show(
                        `<div class="eksi-notification-error">
                            <span class="material-icons" style="color: #e53935; margin-right: 8px;">error_outline</span>
                            Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.
                        </div>`,
                        {timeout: 10}
                    );
                    this.abortProcessing = true;
                    break;
                }

                await this.delay(this.retryDelay);
            }

            userIndex++;

            if (userIndex < this.pendingUsers.length && !this.abortProcessing) {
                this.notification.updateDelayCountdown(this.requestDelay);
                await this.delay(this.requestDelay);
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

            // Get the preferences to use the custom note template
            const preferences = preferencesManager.getPreferences();
            const noteTemplate = preferences.defaultNoteTemplate;

            // Generate custom note with the template from preferences
            const actionType = this.blockType === BlockType.MUTE ? 'sessiz alındı' : 'engellendi';
            const noteText = noteTemplate
                .replace('{postTitle}', postTitle)
                .replace('{actionType}', actionType)
                .replace('{entryLink}', `https://eksisozluk.com/entry/${this.entryId}`)
                .replace('{date}', new Date().toLocaleString('tr-TR'));

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
     * Uses maxRetries from preferences
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
     * Update notification with progress info
     */
    private updateNotification(): void {
        const processed = this.processedUsers.size;
        const total = this.totalUserCount;

        this.updateNotificationMessage();
        this.notification.addProgressBar(processed, total);
    }

    /**
     * Update notification message
     */
    private async updateNotificationMessage(): Promise<void> {
        const actionType = this.getBlockTypeText();
        const total = this.totalUserCount;
        const processed = this.processedUsers.size;
        const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

        // Create a more dynamic notification message with icons
        const notificationContent = `
            <div class="eksi-notification-status">
                <span class="material-icons" style="color: #81c14b; margin-right: 8px;">check_circle_outline</span>
                ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} kullanıcılar: 
                <strong>${processed}</strong> / <strong>${total}</strong> 
                (Kalan: ${remaining})
            </div>
        `;

        await this.notification.show(notificationContent, {timeout: 60});

        this.currentBlocked = processed + 1;
    }

    /**
     * Add stop button
     */
    private addStopButton(): void {
        const stopButton = this.buttonComponent.create({
            text: 'Durdur',
            variant: ButtonVariant.DANGER,
            size: ButtonSize.SMALL,
            icon: 'stop',
            onClick: async () => {
                this.abortProcessing = true;
                await this.notification.show(
                    `<div class="eksi-notification-warning">
                        <span class="material-icons" style="color: #ff9800; margin-right: 8px;">warning</span>
                        İşlem durduruldu.
                    </div>`,
                    {timeout: 5}
                );
            }
        });

        this.notification.addStopButton(async () => {
            stopButton.click(); // Trigger the programmatic click
        });
    }

    /**
     * Promise-based delay function
     */
    private delay(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
}