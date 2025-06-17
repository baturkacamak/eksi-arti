/**
 * BlockUsersService
 * Service to manage blocking users who favorited a specific entry
 */
import {HttpService, HttpError} from './http-service';
import {HtmlParserService} from './html-parser-service';
import {StorageService, storageService} from './storage-service';
import {preferencesManager} from './preferences-manager';
import {BlockType, Endpoints, STORAGE_KEYS} from '../constants';
import {LoggingService} from './logging-service';
import {PreferencesService} from "./preferences-service";
import {delay} from "./utilities";
import {NotificationService} from './notification-service';
import {IconComponent} from "../components/shared/icon-component";
import {IHtmlParserService} from "../interfaces/services/IHtmlParserService";
import {IHttpService} from "../interfaces/services/IHttpService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {INotificationService} from "../interfaces/services/INotificationService";
import {IPreferencesService} from "../interfaces/services/IPreferencesService";
import {IStorageService, StorageArea} from "../interfaces/services/IStorageService";
import {IIconComponent} from "../interfaces/components/IIconComponent";
import {IEventBus} from "../interfaces/services/IEventBus";
import {IProgressWidgetComponent} from "../interfaces/components/IProgressWidgetComponent";
import {BlockOperationRequest} from "../interfaces/services/IBlockUsersService";

export class BlockUsersService {
    private totalUserCount: number = 0;
    private currentBlocked: number = 1;
    private timeout: number = 30;
    private retryDelay: number = 5; // Default seconds to wait between retries
    private requestDelay: number = 7; // Default seconds between regular requests to avoid rate limiting
    private maxRetries: number = 3; // Default maximum number of retries
    private blockType: BlockType = BlockType.MUTE; // Default to mute
    private includeThreadBlocking: boolean = false; // Per-operation thread blocking
    private entryId: string | null = null;
    private processedUsers: Set<string> = new Set();
    private pendingUsers: string[] = [];
    private skippedUsers: string[] = []; // Track users that were skipped (deleted accounts)
    private isProcessing: boolean = false;
    private abortProcessing: boolean = false;
    private errorCount: number = 0;
    private maxErrors: number = 10; // Maximum errors before aborting
    
    // Updated for merging operations
    private currentOperationEntries: string[] = []; // Track all entries being processed
    private allFavoritesMap: Map<string, string[]> = new Map(); // Track favorites per entry

    constructor(
        private httpService: IHttpService,
        private htmlParser: IHtmlParserService,
        private storageService: IStorageService,
        private loggingService: ILoggingService,
        private notificationService: INotificationService,
        private preferencesService: IPreferencesService,
        private iconComponent: IIconComponent,
        private eventBus: IEventBus,
        private progressWidget: IProgressWidgetComponent
    ) {
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

            this.loggingService.debug('Operation parameters loaded', {
                requestDelay: this.requestDelay,
                retryDelay: this.retryDelay,
                maxRetries: this.maxRetries
            }, 'BlockUsersService');
        } catch (error) {
            this.loggingService.error('Error loading operation parameters:', error, 'BlockUsersService');
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
     * Set thread blocking option
     */
    setThreadBlocking(enabled: boolean): void {
        this.includeThreadBlocking = enabled;
    }

    /**
     * Get block type text description
     */
    getBlockTypeText(): string {
        switch (this.blockType) {
            case BlockType.MUTE:
                return 'sessiz alındı';
            case BlockType.BLOCK:
                return 'engellendi';
            case BlockType.BLOCK_THREADS:
                return 'başlıkları engellendi';
            default:
                return 'engellendi';
        }
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
                includeThreadBlocking?: boolean;
                skippedUsers?: string[];
                currentOperationEntries?: string[];
            }>(STORAGE_KEYS.CURRENT_OPERATION);

            // If successful and data exists
            if (result.success && result.data && result.data.entryId === this.entryId) {
                this.loggingService.debug('Loaded saved state from storage', {
                    source: result.source,
                    data: result.data
                }, 'BlockUsersService');

                this.processedUsers = new Set(result.data.processedUsers || []);
                this.skippedUsers = result.data.skippedUsers || [];
                this.currentBlocked = (result.data.processedUsers || []).length + this.skippedUsers.length + 1;
                this.blockType = result.data.blockType;
                this.includeThreadBlocking = result.data.includeThreadBlocking || false;
                this.currentOperationEntries = result.data.currentOperationEntries || [this.entryId!];
                this.totalUserCount = result.data.totalUserCount;
                
                this.loggingService.info('Successfully restored blocking operation state', {
                    entryId: this.entryId,
                    processedUsers: this.processedUsers.size,
                    skippedUsers: this.skippedUsers.length,
                    totalUsers: this.totalUserCount,
                    blockType: this.blockType,
                    includeThreadBlocking: this.includeThreadBlocking
                });
                
                return true;
            }

            this.loggingService.debug('No saved state found or entry ID mismatch', {
                currentEntryId: this.entryId,
                result
            }, 'BlockUsersService');
            return false;
        } catch (error) {
            this.loggingService.error('Error loading state', error, 'BlockUsersService');
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
                includeThreadBlocking: this.includeThreadBlocking,
                skippedUsers: this.skippedUsers,
                currentOperationEntries: this.currentOperationEntries,
            };

            // Use the instance method that leverages Chrome storage API with proper fallbacks
            const result = await storageService.setItem(
                STORAGE_KEYS.CURRENT_OPERATION,
                stateData,
                StorageArea.LOCAL
            );

            this.loggingService.debug('Saved state to storage', {
                source: result.source,
                success: result.success,
                data: stateData
            }, 'BlockUsersService');
        } catch (error) {
            this.loggingService.error('Failed to save state', error, 'BlockUsersService');
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

            this.loggingService.debug('Cleared state from storage', {
                source: result.source,
                success: result.success
            }, 'BlockUsersService');
        } catch (error) {
            this.loggingService.error('Failed to clear state', error, 'BlockUsersService');
        }
    }

    /**
     * Fetch users who favorited a post
     */
    async fetchFavorites(entryId: string): Promise<string[]> {
        try {
            // Progress widget will show the loading status, no need for separate notification
            const html = await this.httpService.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
            return this.htmlParser.parseFavoritesHtml(html);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
            // Keep error notifications as they're important for troubleshooting
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
            this.eventBus.publish('blockUsers:started', {entryId});

            // Initialize operation tracking if this is the first entry
            if (!this.isProcessing) {
                this.currentOperationEntries = [entryId];
                this.allFavoritesMap.clear();
            }

            // Show progress widget early to replace the loading notification
            this.progressWidget.show({
                title: 'Kullanıcı Engelleme',
                position: 'bottom-right',
                onStop: async () => {
                    this.abortProcessing = true;
                    this.progressWidget.hide();
                }
            });

            this.progressWidget.updateProgress({
                current: 0,
                total: 1,
                message: 'Favori listesi yükleniyor...'
            });

            // Load updated settings from preferences
            await this.loadOperationParams();

            // Load previous state if exists
            const hasState = await this.loadState();
            const isResuming = hasState;
            
            if (!hasState) {
                this.processedUsers = new Set();
                this.skippedUsers = [];
                this.currentBlocked = 1;
            }

            const userUrls = await this.fetchFavorites(entryId);
            this.allFavoritesMap.set(entryId, userUrls);
            
            // If not resuming, set total count from fetched favorites
            // If resuming, keep the saved total count (in case some favorites were removed)
            if (!isResuming) {
            this.totalUserCount = userUrls.length;
            }
            
            const postTitle = this.htmlParser.parsePostTitle();

            // Filter out already processed users
            this.pendingUsers = userUrls.filter((userUrl) => {
                const username = this.getUsernameFromUrl(userUrl);
                return !this.processedUsers.has(username);
            });

            if (isResuming) {
                this.loggingService.info('Resuming blocking operation', {
                    entryId,
                    totalUsers: this.totalUserCount,
                    processedUsers: this.processedUsers.size,
                    skippedUsers: this.skippedUsers.length,
                    pendingUsers: this.pendingUsers.length
                });
                
                // Update progress widget to show current state when resuming
                const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
                this.progressWidget.updateProgress({
                    current: totalProcessed,
                    total: this.totalUserCount,
                    message: `İşlem devam ediyor... ${totalProcessed}/${this.totalUserCount} tamamlandı`
                });
            }

            if (this.pendingUsers.length === 0) {
                // Brief notification for "already processed" case - still useful
                await this.notificationService.show(
                    `<div style="display: flex; align-items: center">
                        ${this.iconComponent.create({name: 'check_circle', color: '#81c14b', size: 'medium'}).outerHTML}
                        <span>Tüm kullanıcılar zaten işlendi.</span>
                    </div>`,
                    {
                        theme: 'success',
                        timeout: 5
                    }
                );
                return;
            }

            // Update progress widget with actual user count and start processing
            this.progressWidget.updateProgress({
                current: 0,
                total: this.pendingUsers.length,
                message: `${this.pendingUsers.length} kullanıcı hazırlanıyor...`
            });

            this.isProcessing = true;
            this.abortProcessing = false;
            this.errorCount = 0;

            // Start processing after a short delay
            await delay(2);
            await this.processBatch(postTitle);

            if (!this.abortProcessing) {
                let completionMessage = `✅ İşlem tamamlandı! ${this.processedUsers.size} kullanıcı ${this.getBlockTypeText()}.`;
                
                if (this.skippedUsers.length > 0) {
                    completionMessage = `✅ ${this.processedUsers.size} / ${this.totalUserCount} kullanıcı ${this.getBlockTypeText()}. ${this.skippedUsers.length} kullanıcı artık mevcut değil.`;
                }
                
                if (isResuming) {
                    completionMessage += ' (Sayfa yenilenmeden sonra otomatik devam etti)';
                }
                
                // Show completion status in widget before hiding - include skipped users in count
                const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
                this.progressWidget.updateProgress({
                    current: totalProcessed,
                    total: this.totalUserCount,
                    message: completionMessage
                });
                
                // Auto-hide widget after showing completion for 3 seconds
                setTimeout(() => {
                    this.progressWidget.hide();
                }, 3000);
                
                await this.clearState();
            } else {
                await this.saveState();
            }
        } catch (error) {
            this.loggingService.error('Error in blockUsers:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

            // Show error in widget before hiding - include skipped users in count
            const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
            this.progressWidget.updateProgress({
                current: totalProcessed,
                total: this.totalUserCount,
                message: `❌ Hata oluştu: ${errorMessage}`
            });
            
            // Auto-hide widget after showing error for 5 seconds
            setTimeout(() => {
                this.progressWidget.hide();
            }, 5000);

            await this.saveState(); // Save progress on error
            throw error;
        } finally {
            this.isProcessing = false;
            this.currentOperationEntries = [];
            this.allFavoritesMap.clear();
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
                this.eventBus.publish('blockUsers:userProcessed', {
                    entryId: this.entryId,
                    username,
                    current: this.processedUsers.size + this.skippedUsers.length,
                    total: this.totalUserCount
                });
                this.updateProgress(username);
                await this.saveState();

            } catch (error) {
                this.errorCount++;
                this.loggingService.error(`Error processing user ${username}:`, error);

                // Check if this is a "user not found" error (deleted user)
                const errorMessage = error instanceof Error ? error.message : '';
                if (errorMessage.includes('USER_DELETED') ||
                    errorMessage.includes('User ID not found') || 
                    errorMessage.includes('Failed to fetch user profile') ||
                    errorMessage.includes('404') ||
                    errorMessage.includes('user not found') ||
                    errorMessage.includes('profile not found')) {
                    
                    // Add to skipped users list but keep original total count
                    this.skippedUsers.push(username);
                    this.loggingService.debug(`User ${username} appears to be deleted, skipping`);
                    
                    // Update progress display showing the skip - include skipped users in count
                    const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
                    this.progressWidget.updateProgress({
                        current: totalProcessed,
                        total: this.totalUserCount,
                        message: `${totalProcessed} / ${this.totalUserCount} kullanıcı işlendi • ${username} atlandı (silinmiş)`
                    });
                    
                    // Reset error count for deleted users since this isn't really an "error"
                    this.errorCount--;
                    
                    // Continue to next user
                    userIndex++;
                    continue;
                }

                if (this.errorCount >= this.maxErrors) {
                    // Show error count in widget - include skipped users in count
                    const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
                    this.progressWidget.updateProgress({
                        current: totalProcessed,
                        total: this.totalUserCount,
                        message: `❌ Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.`
                    });
                    
                    this.abortProcessing = true;
                    break;
                }

                await delay(this.retryDelay);
            }

            userIndex++;

            if (userIndex < this.pendingUsers.length && !this.abortProcessing) {
                // Get the next user to be processed for display
                const nextUserUrl = this.pendingUsers[userIndex];
                const nextUsername = this.getUsernameFromUrl(nextUserUrl);
                
                // Update progress widget with current user context (including skipped users in progress)
                const totalProcessed = this.processedUsers.size + this.skippedUsers.length;
                this.progressWidget.updateProgress({
                    current: totalProcessed,
                    total: this.totalUserCount,
                    message: `${totalProcessed} / ${this.totalUserCount} kullanıcı işlendi • Sıradaki: ${nextUsername}`,
                    countdownSeconds: this.requestDelay
                });

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
            
            // Check if thread blocking is enabled and perform additional thread block
            if (this.includeThreadBlocking) {
                await this.retryOperation(() => this.blockUserThreads(userId));
            }
            
            await this.retryOperation(() => this.addNoteToUser(userUrl, userId, postTitle));

            return true;
        } catch (error) {
            this.loggingService.error(`Failed to process user ${username}:`, error);
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
            return await this.httpService.get(url);
        } catch (error) {
            // Check if this is a 404 error indicating the user has been deleted
            if (error instanceof HttpError && error.statusCode === 404) {
                const username = this.getUsernameFromUrl(url);
                this.loggingService.debug(`User ${username} profile returned 404 - user has been deleted from the site`);
                throw new Error('USER_DELETED'); // Special error type for deleted users
            }
            
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
            await this.httpService.post(`${Endpoints.BLOCK}/${userId}?r=${this.blockType}`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to block user: ${errorMessage}`);
        }
    }

    /**
     * Block user threads/topics by ID
     */
    private async blockUserThreads(userId: string): Promise<boolean> {
        if (!userId) {
            throw new Error('User ID is required for thread blocking');
        }

        try {
            await this.httpService.post(`${Endpoints.BLOCK}/${userId}?r=i`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to block user threads: ${errorMessage}`);
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

            const noteText = await this.preferencesService.generateCustomNote(postTitle, this.entryId, this.blockType, this.includeThreadBlocking);

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
                await delay(delayTime);
            }
        }

        throw new Error('Maximum retry attempts exceeded');
    }

    /**
     * Update progress display
     * @param currentUser Optional username being currently processed
     */
    private updateProgress(currentUser?: string): void {
        const processed = this.processedUsers.size;
        const skipped = this.skippedUsers.length;
        const totalProcessed = processed + skipped;
        const total = this.totalUserCount;

        const actionType = this.getBlockTypeText();
        const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

        let message = `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} kullanıcılar: ${totalProcessed} / ${total}`;
        
        if (currentUser) {
            message += ` • İşleniyor: ${currentUser}`;
        } else if (remaining > 0) {
            message += ` (Kalan: ${remaining})`;
        }

        // Update progress widget (include skipped users in progress count)
        this.progressWidget.updateProgress({
            current: totalProcessed,
            total: total,
            message: message
        });

        this.currentBlocked = totalProcessed + 1;
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
            this.loggingService.info('User requested to cancel the blocking operation');
        }
    }

    /**
     * Add an entry to the current blocking operation
     */
    async addEntryToCurrentOperation(entryId: string, blockType: BlockType, includeThreadBlocking: boolean): Promise<boolean> {
        if (!this.isProcessing) {
            this.loggingService.warn(`Cannot add entry ${entryId} to operation - no operation in progress`);
            return false;
        }

        // Check if this entry is already being processed
        if (this.currentOperationEntries.includes(entryId)) {
            this.loggingService.info(`Entry ${entryId} already being processed, skipping duplicate`);
            return false;
        }

        // Validate that block types are compatible
        if (blockType !== this.blockType) {
            this.loggingService.warn(`Cannot add entry ${entryId} - incompatible block type`, {
                currentBlockType: this.blockType,
                requestedBlockType: blockType,
                solution: 'All entries in the same operation must use the same block type'
            });
            return false;
        }

        // Validate that thread blocking settings are compatible
        if (includeThreadBlocking !== this.includeThreadBlocking) {
            this.loggingService.warn(`Cannot add entry ${entryId} - incompatible thread blocking setting`, {
                currentThreadBlocking: this.includeThreadBlocking,
                requestedThreadBlocking: includeThreadBlocking,
                solution: 'All entries in the same operation must use the same thread blocking setting'
            });
            return false;
        }

        try {
            this.loggingService.info(`Adding entry ${entryId} to current blocking operation`, {
                entryId,
                currentEntries: this.currentOperationEntries.length,
                blockType,
                includeThreadBlocking
            });

            // Fetch favorites for the new entry
            const favorites = await this.fetchFavorites(entryId);
            this.allFavoritesMap.set(entryId, favorites);
            this.currentOperationEntries.push(entryId);

            // Get all unique users from all entries
            const allUsers = new Set<string>();
            this.allFavoritesMap.forEach(favs => {
                favs.forEach(userUrl => {
                    const username = this.getUsernameFromUrl(userUrl);
                    if (!this.processedUsers.has(username)) {
                        allUsers.add(userUrl);
                    }
                });
            });

            // Update pending users and total count
            // Get only the new users that weren't in the original pending list
            const currentPendingSet = new Set(this.pendingUsers);
            const newUsers = Array.from(allUsers).filter(userUrl => !currentPendingSet.has(userUrl));
            
            // Append new users to the existing pending list so the processing loop picks them up
            this.pendingUsers.push(...newUsers);
            this.totalUserCount = this.pendingUsers.length;
            
            this.loggingService.debug(`Added ${newUsers.length} new users to pending list`, {
                originalPendingCount: currentPendingSet.size,
                newUsersCount: newUsers.length,
                totalPendingCount: this.pendingUsers.length,
                newUsers: newUsers.map(url => this.getUsernameFromUrl(url))
            });

            // Update progress widget to show the expanded operation
            const entriesText = this.currentOperationEntries.length > 1 
                ? `${this.currentOperationEntries.length} yazı` 
                : 'yazı';
            
            this.progressWidget.updateProgress({
                current: this.processedUsers.size + this.skippedUsers.length,
                total: this.totalUserCount,
                message: `${entriesText} için ${this.totalUserCount} kullanıcı işleniyor • +${newUsers.length} yeni kullanıcı eklendi`
            });

            // Show notification about adding to current operation
            await this.notificationService.show(
                `<div style="display: flex; align-items: center">
                    ${this.iconComponent.create({name: 'add_circle', color: '#059669', size: 'medium'}).outerHTML}
                    <span>Mevcut işleme eklendi (+${newUsers.length} kullanıcı)</span>
                </div>`,
                {
                    theme: 'success',
                    timeout: 3
                }
            );

            this.loggingService.info(`Successfully added entry ${entryId} to current operation`, {
                entryId,
                addedUsers: favorites.length,
                totalEntries: this.currentOperationEntries.length,
                totalUsers: this.totalUserCount
            });

            return true;
        } catch (error) {
            this.loggingService.error(`Failed to add entry ${entryId} to current operation:`, error);
            return false;
        }
    }

    /**
     * Get entries currently being processed
     */
    getCurrentOperationEntries(): string[] {
        return [...this.currentOperationEntries];
    }

    /**
     * Get current operation details
     */
    getCurrentOperationDetails(): { entryIds: string[], blockType: BlockType, includeThreadBlocking: boolean } | null {
        if (!this.isProcessing || this.currentOperationEntries.length === 0) {
            return null;
        }

        return {
            entryIds: [...this.currentOperationEntries],
            blockType: this.blockType,
            includeThreadBlocking: this.includeThreadBlocking
        };
    }
}