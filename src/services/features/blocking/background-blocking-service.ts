/**
 * Background Blocking Service
 * Handles blocking operations in the background script
 */

import {Endpoints, BlockType, STORAGE_KEYS, DEFAULT_PREFERENCES, buildUrl, SITE_DOMAIN} from '../../../constants';
import {storageService} from '../../shared/storage-service';
import {StorageArea} from '../../../interfaces/services/shared/IStorageService';
import {BlockerState} from '../../../types';
import {ILoggingService} from '../../../interfaces/services/shared/ILoggingService';

// Background blocking service state
interface BackgroundBlockingState {
    isProcessing: boolean;
    entryId: string | null;
    entryIds: string[]; // Track multiple entries in the current operation
    blockType: BlockType;
    includeThreadBlocking: boolean;
    customNote?: string;
    blockAuthor?: boolean;
    processedUsers: Set<string>;
    skippedUsers: string[];
    pendingUsers: string[];
    allFavoritesMap: Map<string, string[]>; // Track favorites per entry
    totalUserCount: number;
    currentBlocked: number;
    abortProcessing: boolean;
    errorCount: number;
    maxErrors: number;
}

export class BackgroundBlockingService {
    private state: BackgroundBlockingState = {
        isProcessing: false,
        entryId: null,
        entryIds: [],
        blockType: BlockType.MUTE,
        includeThreadBlocking: false,
        processedUsers: new Set(),
        skippedUsers: [],
        pendingUsers: [],
        allFavoritesMap: new Map(),
        totalUserCount: 0,
        currentBlocked: 0,
        abortProcessing: false,
        errorCount: 0,
        maxErrors: 5
    };

    private processingInterval: NodeJS.Timeout | null = null;
    private monitoringInterval: NodeJS.Timeout | null = null; // Add monitoring interval reference
    private readonly PROCESSING_INTERVAL = 8000; // 8 seconds between users

    constructor(private loggingService: ILoggingService) {
        // Start monitoring for persistent processing on construction
        this.startMonitoring();
    }

    /**
     * Start monitoring for persistent processing
     * This creates a persistent background process that checks for work to do
     */
    private startMonitoring() {
        // Clear existing monitoring interval if any
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Check every 2 seconds for pending work
        this.monitoringInterval = setInterval(async () => {
            try {
                if (this.state.isProcessing && !this.state.abortProcessing && 
                    this.state.pendingUsers.length > 0 && this.state.errorCount < this.state.maxErrors) {
                    
                    // Check if we're not currently processing a user
                    if (!this.processingInterval) {
                        await this.processNextUser();
                    }
                }
            } catch (error) {
                this.loggingService.error('Error in monitoring loop:', error);
            }
        }, 2000);
    }

    /**
     * Process the next pending user
     */
    private async processNextUser() {
        if (this.state.pendingUsers.length === 0 || this.state.abortProcessing) {
            return;
        }

        // Find next unprocessed user
        let userUrl: string | null = null;
        let userIndex = -1;
        
        for (let i = 0; i < this.state.pendingUsers.length; i++) {
            const url = this.state.pendingUsers[i];
            const username = this.getUsernameFromUrl(url);
            
            if (!this.state.processedUsers.has(username)) {
                userUrl = url;
                userIndex = i;
                break;
            }
        }

        if (!userUrl) {
            // All users processed
            await this.handleCompletion();
            return;
        }

        const username = this.getUsernameFromUrl(userUrl);

        try {
            this.loggingService.info(`Processing user: ${username}`);
            
            await this.processUser(userUrl);
            this.state.processedUsers.add(username);
            
            const totalProcessed = this.state.processedUsers.size + this.state.skippedUsers.length;
            
            // Show the last processed username instead of repeating the progress info
            let message = `Son işlenen: ${username}`;
            
            // Find next user to be processed
            if (this.state.pendingUsers.length > 0) {
                for (let i = 0; i < this.state.pendingUsers.length; i++) {
                    const nextUrl = this.state.pendingUsers[i];
                    const nextUsername = this.getUsernameFromUrl(nextUrl);
                    
                    if (!this.state.processedUsers.has(nextUsername)) {
                        message += ` • Sıradaki: ${nextUsername}`;
                        break;
                    }
                }
            }
            
            this.sendProgressUpdate({
                current: totalProcessed,
                total: this.state.totalUserCount,
                message: message
            });
            
            await this.saveState();
            
        } catch (error) {
            this.state.errorCount++;
            this.loggingService.error(`Failed to process user ${username}:`, error);
            
            if (error instanceof Error && error.message.includes('404')) {
                this.state.skippedUsers.push(username);
                this.loggingService.info(`User ${username} no longer exists, skipping`);
            }
            
            await this.saveState();
        }

        // Schedule next user processing (this creates the delay between users)
        if (!this.state.abortProcessing && this.state.errorCount < this.state.maxErrors) {
            // Check if there are more users to process
            const hasMoreUsers = this.state.pendingUsers.some(userUrl => {
                const username = this.getUsernameFromUrl(userUrl);
                return !this.state.processedUsers.has(username);
            });
            
            if (hasMoreUsers) {
                // Start countdown display only if there are more users
                this.startCountdownDisplay();
                
                this.processingInterval = setTimeout(async () => {
                    this.processingInterval = null;
                    // The monitoring loop will pick up the next user automatically
                }, this.PROCESSING_INTERVAL);
            } else {
                // No more users to process, complete immediately
                await this.handleCompletion();
            }
        }
    }

    /**
     * Handle completion of blocking operation
     */
    private async handleCompletion() {
        if (this.state.abortProcessing) {
            await this.saveState();
            return;
        }

        const totalProcessed = this.state.processedUsers.size + this.state.skippedUsers.length;
        let completionMessage = `İşlem tamamlandı! ${this.state.processedUsers.size} kullanıcı ${this.getBlockTypeText()}.`;
        
        if (this.state.skippedUsers.length > 0) {
            completionMessage = `${this.state.processedUsers.size} / ${this.state.totalUserCount} kullanıcı ${this.getBlockTypeText()}. ${this.state.skippedUsers.length} kullanıcı artık mevcut değil.`;
        }
        
        this.sendProgressUpdate({
            current: totalProcessed,
            total: this.state.totalUserCount,
            message: completionMessage,
            icon: {
                name: 'check_circle',
                color: '#43a047',
                size: 'small'
            }
        });
        
        setTimeout(() => {
            this.sendProgressUpdate({ action: 'hide' });
        }, 3000);
        
        this.state.isProcessing = false;
        await this.clearState();
    }

    /**
     * Start countdown display for next user processing
     */
    private startCountdownDisplay() {
        const totalProcessed = this.state.processedUsers.size + this.state.skippedUsers.length;
        const countdownSeconds = Math.ceil(this.PROCESSING_INTERVAL / 1000); // Convert to seconds
        
        // Get the last processed username
        const lastProcessedUser = Array.from(this.state.processedUsers).pop() || 'Bilinmeyen';
        
        this.sendProgressUpdate({
            current: totalProcessed,
            total: this.state.totalUserCount,
            message: `Son işlenen: ${lastProcessedUser}`,
            countdownSeconds: countdownSeconds
        });
    }

    // Send progress updates to content script
    private sendProgressUpdate(data: any) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id && tab.url?.includes(SITE_DOMAIN)) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'progressUpdate',
                        data: data
                    }).catch(() => {
                        // Ignore errors - content script might not be ready
                    });
                }
            });
        });
    }

    async startBlocking(entryId: string, blockType: BlockType, includeThreadBlocking: boolean, customNote?: string | undefined, blockAuthor?: boolean) {
        try {
            
            this.loggingService.info('Starting blocking operation in background', { 
                entryId, blockType, includeThreadBlocking,
                currentlyProcessing: this.state.isProcessing
            });
            
            // Check if an operation is already in progress
            if (this.state.isProcessing) {
                // Try to add to current operation if compatible
                const canMerge = await this.canMergeOperation(entryId, blockType, includeThreadBlocking, customNote, blockAuthor);
                if (canMerge) {
                    return await this.addToCurrentOperation(entryId, blockType, includeThreadBlocking, customNote, blockAuthor);
                } else {
                    this.loggingService.warn('Blocking operation already in progress with incompatible settings');
                    return { success: false, error: 'Operation already in progress with incompatible settings' };
                }
            }

            // Initialize state
            this.state.isProcessing = true;
            this.state.entryId = entryId;
            this.state.entryIds = [entryId];
            this.state.blockType = blockType;
            this.state.includeThreadBlocking = includeThreadBlocking;
            this.state.customNote = customNote;
            this.state.blockAuthor = blockAuthor;
            this.state.abortProcessing = false;
            this.state.errorCount = 0;
            this.state.allFavoritesMap.clear();

            // Try to load existing state first
            const savedState = await this.loadState();
            if (savedState && savedState.entryId === entryId) {
                this.state.processedUsers = new Set(savedState.processedUsers);
                this.state.skippedUsers = savedState.skippedUsers || [];
                this.state.totalUserCount = savedState.totalUserCount;
                this.state.entryIds = savedState.currentOperationEntries || [entryId];
                this.state.currentBlocked = this.state.processedUsers.size + this.state.skippedUsers.length + 1;
                this.loggingService.info('Loaded existing state', {
                    processed: this.state.processedUsers.size,
                    skipped: this.state.skippedUsers.length,
                    total: this.state.totalUserCount,
                    entryIds: this.state.entryIds
                });
            } else {
                this.state.processedUsers = new Set();
                this.state.skippedUsers = [];
                this.state.currentBlocked = 1;
                this.loggingService.info('Starting fresh blocking operation');
            }

            // Send initial progress update
            this.sendProgressUpdate({
                action: 'show',
                title: 'Kullanıcı Engelleme',
                current: 0,
                total: 1,
                message: 'Favori listesi yükleniyor...'
            });

            // Fetch favorites
            const userUrls = await this.fetchFavorites(entryId);
            
            if (!userUrls || userUrls.length === 0) {
                throw new Error('No favorites found or entry does not exist');
            }
            
            // Store favorites for this entry
            this.state.allFavoritesMap.set(entryId, userUrls);
            
            // If not resuming, set total count
            if (!savedState || savedState.entryId !== entryId) {
                this.state.totalUserCount = userUrls.length;
            }

            // Filter pending users
            this.state.pendingUsers = userUrls.filter(userUrl => {
                const username = this.getUsernameFromUrl(userUrl);
                return !this.state.processedUsers.has(username);
            });

            if (this.state.pendingUsers.length === 0) {
                this.sendProgressUpdate({
                    action: 'hide'
                });
                this.state.isProcessing = false;
                await this.clearState();
                return { success: true, message: 'All users already processed' };
            }

            // Update progress with actual counts
            const totalProcessed = this.state.processedUsers.size + this.state.skippedUsers.length;
            this.sendProgressUpdate({
                current: totalProcessed,
                total: this.state.totalUserCount,
                message: `${this.state.pendingUsers.length} kullanıcı hazırlanıyor...`
            });

            // Restart monitoring loop to ensure it's running
            this.startMonitoring();

            // Start processing - the monitoring loop will handle the rest
            this.loggingService.info('Background blocking started - persistent processing will continue automatically');

            return { success: true };
        } catch (error) {
            this.loggingService.error('Error in background blocking operation:', {
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'Unknown',
                errorStack: error instanceof Error ? error.stack : undefined,
                entryId,
                blockType,
                currentState: {
                    isProcessing: this.state.isProcessing,
                    entryId: this.state.entryId,
                    processedUsers: this.state.processedUsers.size,
                    totalUsers: this.state.totalUserCount
                }
            });
            this.state.isProcessing = false;
            await this.clearState();
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error instanceof Error ? error.stack : undefined
            };
        }
    }

    stopBlocking() {
        if (this.state.isProcessing) {
            this.state.abortProcessing = true;
            this.state.isProcessing = false;
            this.loggingService.info('Blocking operation stopped by user');
            
            // Clear processing interval
            if (this.processingInterval) {
                clearTimeout(this.processingInterval);
                this.processingInterval = null;
            }
            
            // Clear monitoring interval to completely stop the operation
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            
            this.clearState().catch(error => {
                this.loggingService.error('Error clearing state after stop:', error);
            });
        }
    }

    forceStopBlocking() {
        this.loggingService.info('Force stopping blocking operation');
        this.state.isProcessing = false;
        this.state.abortProcessing = true;
        
        // Clear processing interval
        if (this.processingInterval) {
            clearTimeout(this.processingInterval);
            this.processingInterval = null;
        }
        
        // Clear monitoring interval to completely stop the operation
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.clearState().catch(error => {
            this.loggingService.error('Error clearing state after force stop:', error);
        });
        this.sendProgressUpdate({ action: 'hide' });
    }

    async resetStuckState() {
        this.loggingService.info('Resetting potentially stuck state');
        this.state.isProcessing = false;
        this.state.abortProcessing = true;
        await this.clearState();
        return { success: true, message: 'State reset successfully' };
    }

    getStatus() {
        return {
            isProcessing: this.state.isProcessing,
            entryId: this.state.entryId,
            entryIds: this.state.entryIds,
            processedUsers: this.state.processedUsers.size,
            totalUsers: this.state.totalUserCount,
            blockType: this.state.blockType
        };
    }

    // Check for saved state and auto-resume
    async checkAndResumeBlocking() {
        try {
            // Don't auto-resume if already processing
            if (this.state.isProcessing) {
                this.loggingService.info('Blocking already in progress, skipping auto-resume');
                return;
            }

            const savedState = await this.loadState();
            if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                // Additional validation - ensure the saved state is valid
                if (savedState.entryId && savedState.blockType && 
                    savedState.totalUserCount > 0 && 
                    savedState.processedUsers && 
                    savedState.processedUsers.length < savedState.totalUserCount) {
                    
                    this.loggingService.info('Found valid saved blocking state, auto-resuming', { 
                        entryId: savedState.entryId,
                        processed: savedState.processedUsers.length,
                        total: savedState.totalUserCount
                    });
                    
                    await this.startBlocking(
                        savedState.entryId, 
                        savedState.blockType as BlockType, 
                        savedState.includeThreadBlocking || false
                    );
                } else {
                    this.loggingService.info('Found invalid saved state, clearing it', { savedState });
                    await this.clearState();
                }
            } else if (savedState) {
                this.loggingService.info('Found old saved state, clearing it', { 
                    age: Date.now() - savedState.timestamp 
                });
                await this.clearState();
            }
        } catch (error) {
            this.loggingService.error('Error checking for saved blocking state:', error);
            // Clear potentially corrupted state
            await this.clearState();
        }
    }

    private async processUser(userUrl: string): Promise<void> {
        const username = this.getUsernameFromUrl(userUrl);
        
        // Fetch user profile
        const response = await fetch(userUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`User ${username} not found (404)`);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const userId = this.parseUserIdFromHtml(html);

        if (!userId) {
            throw new Error(`User ID not found for ${username}`);
        }

        // Block user
        await this.blockUser(userId);
        
        // Block threads if enabled
        if (this.state.includeThreadBlocking) {
            await this.blockUserThreads(userId);
        }
        
        // Add note
        await this.addNoteToUser(userUrl, userId);
    }

    private async blockUser(userId: string): Promise<void> {
        const response = await fetch(`${Endpoints.BLOCK}/${userId}?r=${this.state.blockType}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to block user: HTTP ${response.status}`);
        }
    }

    private async blockUserThreads(userId: string): Promise<void> {
        const response = await fetch(`${Endpoints.BLOCK}/${userId}?r=i`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to block user threads: HTTP ${response.status}`);
        }
    }

    private async addNoteToUser(userUrl: string, userId: string): Promise<void> {
        const username = this.getUsernameFromUrl(userUrl);
        const noteUrl = Endpoints.ADD_NOTE.replace('{username}', username);
        
        // Use custom note if provided, otherwise fall back to simple template
        let noteText: string;
        if (this.state.customNote && this.state.customNote.trim()) {
            noteText = this.state.customNote.trim();
        } else {
            noteText = `${this.state.entryId} için ${this.getBlockTypeText()}`;
        }

        const response = await fetch(noteUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-requested-with': 'XMLHttpRequest'
            },
            body: `who=${userId}&usernote=${encodeURIComponent(noteText)}`
        });

        if (!response.ok) {
            throw new Error(`Failed to add note: HTTP ${response.status}`);
        }
    }

    private getUsernameFromUrl(userUrl: string): string {
        const match = userUrl.match(/\/biri\/([^/?]+)/);
        return match ? match[1] : '';
    }

    private parseUserIdFromHtml(html: string): string | null {
        const patterns = [
            /<input[^>]*id="who"[^>]*value="([^"]+)"/i,
            /<input[^>]*value="([^"]+)"[^>]*id="who"/i,
            /name="who"[^>]*value="([^"]+)"/i,
            /value="([^"]+)"[^>]*name="who"/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    private async fetchFavorites(entryId: string): Promise<string[]> {
        try {
            this.loggingService.info('Fetching favorites for entry', { entryId });
            
            const url = `${Endpoints.FAVORITES}?entryId=${entryId}`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'x-requested-with': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                const errorMsg = `Failed to fetch favorites: HTTP ${response.status} ${response.statusText}`;
                this.loggingService.error('Fetch favorites request failed', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    entryId
                });
                throw new Error(errorMsg);
            }

            const html = await response.text();
            
            if (!html || html.trim().length === 0) {
                throw new Error('Empty response received from favorites endpoint');
            }
            
            const userUrls: string[] = [];
            const regex = /href="(\/biri\/[^"]+)"/g;
            let match;

            while ((match = regex.exec(html)) !== null) {
                userUrls.push(buildUrl(match[1]));
            }

            this.loggingService.info('Successfully fetched favorites', {
                entryId,
                userCount: userUrls.length,
                responseLength: html.length
            });

            if (userUrls.length === 0) {
                // Check if the page indicates no favorites or if entry doesn't exist
                if (html.includes('favori') && html.includes('bulunmuyor')) {
                    throw new Error('No favorites found for this entry');
                } else if (html.includes('entry') && html.includes('bulunamadı')) {
                    throw new Error('Entry not found or does not exist');
                } else {
                    throw new Error('No favorites could be extracted from the page');
                }
            }

            return userUrls;
        } catch (error) {
            this.loggingService.error('Error in fetchFavorites', {
                entryId,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    private getBlockTypeText(): string {
        return this.state.blockType === BlockType.MUTE ? 'sessize alındı' : 'engellendi';
    }

    private async saveState(): Promise<void> {
        const state: BlockerState = {
            entryId: this.state.entryId!,
            blockType: this.state.blockType,
            processedUsers: Array.from(this.state.processedUsers),
            totalUserCount: this.state.totalUserCount,
            timestamp: Date.now(),
            includeThreadBlocking: this.state.includeThreadBlocking,
            skippedUsers: this.state.skippedUsers,
            currentOperationEntries: this.state.entryIds
        };

        await storageService.setItem(STORAGE_KEYS.CURRENT_OPERATION, state, StorageArea.LOCAL);
    }

    private async loadState(): Promise<BlockerState | null> {
        const result = await storageService.getItem<BlockerState>(STORAGE_KEYS.CURRENT_OPERATION, undefined, StorageArea.LOCAL);
        return result.success && result.data ? result.data : null;
    }

    private async clearState(): Promise<void> {
        await storageService.removeItem(STORAGE_KEYS.CURRENT_OPERATION, StorageArea.LOCAL);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if a new operation can be merged with the current one
     */
    private async canMergeOperation(entryId: string, blockType: BlockType, includeThreadBlocking: boolean, customNote?: string, blockAuthor?: boolean): Promise<boolean> {
        // Check if entry is already being processed
        if (this.state.entryIds.includes(entryId)) {
            this.loggingService.info(`Entry ${entryId} already being processed, skipping duplicate`);
            return false;
        }

        // Check if block types are compatible
        if (blockType !== this.state.blockType) {
            this.loggingService.warn(`Cannot add entry ${entryId} - incompatible block type`, {
                currentBlockType: this.state.blockType,
                requestedBlockType: blockType
            });
            return false;
        }

        // Check if thread blocking settings are compatible
        if (includeThreadBlocking !== this.state.includeThreadBlocking) {
            this.loggingService.warn(`Cannot add entry ${entryId} - incompatible thread blocking setting`, {
                currentThreadBlocking: this.state.includeThreadBlocking,
                requestedThreadBlocking: includeThreadBlocking
            });
            return false;
        }

        return true;
    }

    /**
     * Add an entry to the current operation
     */
    private async addToCurrentOperation(entryId: string, blockType: BlockType, includeThreadBlocking: boolean, customNote?: string, blockAuthor?: boolean): Promise<any> {
        try {
            this.loggingService.info(`Adding entry ${entryId} to current blocking operation`, {
                entryId,
                currentEntries: this.state.entryIds.length,
                blockType,
                includeThreadBlocking
            });

            // Fetch favorites for the new entry
            const favorites = await this.fetchFavorites(entryId);
            this.state.allFavoritesMap.set(entryId, favorites);
            this.state.entryIds.push(entryId);

            // Get all unique users from all entries
            const allUsers = new Set<string>();
            this.state.allFavoritesMap.forEach(favs => {
                favs.forEach(userUrl => {
                    const username = this.getUsernameFromUrl(userUrl);
                    if (!this.state.processedUsers.has(username)) {
                        allUsers.add(userUrl);
                    }
                });
            });

            // Update pending users and total count
            const currentPendingSet = new Set(this.state.pendingUsers);
            const newUsers = Array.from(allUsers).filter(userUrl => !currentPendingSet.has(userUrl));
            
            // Append new users to the existing pending list
            this.state.pendingUsers.push(...newUsers);
            this.state.totalUserCount = this.state.pendingUsers.length;
            
            this.loggingService.info(`Added ${newUsers.length} new users to pending list`, {
                originalPendingCount: currentPendingSet.size,
                newUsersCount: newUsers.length,
                totalPendingCount: this.state.pendingUsers.length
            });

            // Update progress
            const totalProcessed = this.state.processedUsers.size + this.state.skippedUsers.length;
            const entriesText = this.state.entryIds.length > 1 
                ? `${this.state.entryIds.length} yazı` 
                : 'yazı';
            
            this.sendProgressUpdate({
                current: totalProcessed,
                total: this.state.totalUserCount,
                message: `${entriesText} için ${this.state.totalUserCount} kullanıcı işleniyor • +${newUsers.length} yeni kullanıcı eklendi`
            });

            // Save the updated state
            await this.saveState();

            this.loggingService.info(`Successfully added entry ${entryId} to current operation`, {
                entryId,
                addedUsers: favorites.length,
                totalEntries: this.state.entryIds.length,
                totalUsers: this.state.totalUserCount
            });

            return { success: true, message: `Added ${newUsers.length} new users to current operation` };
        } catch (error) {
            this.loggingService.error(`Failed to add entry ${entryId} to current operation:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
} 