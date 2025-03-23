import { HttpService, HttpError } from './http-service';
import { HtmlParserService } from './html-parser-service';
import { NotificationComponent } from '../components/notification-component';
import { storageService, StorageArea } from './storage-service';
import { PreferencesService } from './preferences-service';
import { BlockType, STORAGE_KEYS, Endpoints } from '../constants';
import { logger, logDebug, logError } from './logging-service';

export class BlockUsersService {
    private remoteRequest: HttpService;
    private htmlParser: HtmlParserService;
    private notification: NotificationComponent;
    private preferencesService: PreferencesService;

    private totalUserCount: number = 0;
    private currentBlocked: number = 1;
    private timeout: number = 30;
    private retryDelay: number = 5; // Seconds to wait between retries
    private requestDelay: number = 7; // Seconds between regular requests to avoid rate limiting
    private maxRetries: number = 3; // Maximum number of retries
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
        this.preferencesService = new PreferencesService();
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
            this.notification.show('Favori listesi yükleniyor...', {timeout: 60});
            const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
            return this.htmlParser.parseFavoritesHtml(html);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
            this.notification.show('Favori listesi yüklenemedi: ' + message, {timeout: 10});
            throw error;
        }
    }

    /**
     * Main method to block users who favorited a post
     */
    async blockUsers(entryId: string): Promise<void> {
        try {
            this.entryId = entryId;

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
                this.notification.show(
                    `<div class="eksi-notification-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
            </svg>
            Tüm kullanıcılar zaten işlendi.
          </div>`,
                    {timeout: 5},
                );
                return;
            }

            this.notification.show(`${this.pendingUsers.length} kullanıcı işlenecek...`, {timeout: 10});

            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;

            // Create a Stop button in the notification
            this.notification.addStopButton(() => {
                this.abortProcessing = true;
                this.notification.show(
                    `<div class="eksi-notification-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 7H11V13H13V7ZM13 15H11V17H13V15Z" fill="#ff9800"/>
            </svg>
            İşlem durduruldu.
          </div>`,
                    {timeout: 5},
                );
            });

            // Start processing after a short delay
            await this.delay(2);
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                this.notification.show(
                    `<div class="eksi-notification-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
            </svg>
            İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText()}.
          </div>`,
                    {timeout: 10},
                );
                await this.clearState(); // Clear saved state after successful completion
            } else {
                await this.saveState(); // Save progress for later continuation
            }
        } catch (error) {
            logError('Error in blockUsers:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            this.notification.show(
                `<div class="eksi-notification-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM7.12 14.88L9.12 16.88L16.88 9.12L14.88 7.12L7.12 14.88Z" fill="#e53935"/>
          </svg>
          Hata oluştu: ${errorMessage}
        </div>`,
                {timeout: 10},
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

        // Process users sequentially with proper delays to avoid rate limiting
        while (userIndex < this.pendingUsers.length && !this.abortProcessing && this.errorCount < this.maxErrors) {
            const userUrl = this.pendingUsers[userIndex];
            const username = this.getUsernameFromUrl(userUrl);

            if (this.processedUsers.has(username)) {
                userIndex++;
                continue; // Skip already processed user
            }

            try {
                await this.processUser(userUrl, postTitle);
                this.processedUsers.add(username);
                this.updateNotification();
                await this.saveState(); // Save state after each successful processing
            } catch (error) {
                this.errorCount++;
                logError(`Error processing user ${username}:`, error);

                if (this.errorCount >= this.maxErrors) {
                    this.notification.show(`Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.`, {timeout: 10});
                    this.abortProcessing = true;
                    break;
                }

                // Short extra delay after an error to give the server some rest
                await this.delay(this.retryDelay);
            }

            userIndex++;

            // Add a delay between processing users to avoid rate limiting
            // Only delay if we're not at the end and not aborting
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

            // Await the result of generateCustomNote which now returns a Promise<string>
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
                await this.delay(this.retryDelay * Math.pow(1.5, attempts - 1)); // Exponential backoff
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
    private updateNotificationMessage(): void {
        const actionType = this.getBlockTypeText();
        const total = this.totalUserCount;
        const processed = this.processedUsers.size;
        const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

        this.notification.show(
            `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} kullanıcılar: ` +
            `<strong>${processed}</strong> / <strong>${total}</strong> (Kalan: ${remaining})`,
            {timeout: 60}
        );

        this.currentBlocked = processed + 1;
    }

    /**
     * Promise-based delay function
     */
    private delay(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
}