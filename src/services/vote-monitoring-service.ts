// src/services/vote-monitoring-service.ts
import { LoggingService} from './logging-service';
import { HttpService } from './http-service';
import { SELECTORS, PATHS } from '../constants';
import { storageService } from './storage-service';
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {StorageArea} from "../interfaces/services/IStorageService";

export class VoteMonitoringService {
    private userNick: string = '';
    private enabled: boolean = true;
    private checkInterval: number = 1; // minutes

    constructor(private loggingService: ILoggingService) {
        this.loggingService.debug('VoteMonitoringService instance created');
    }

    /**
     * Initialize the service by extracting the username
     */
    public async initialize(): Promise<boolean> {
        try {
            this.loggingService.debug('Starting vote monitoring service initialization');
            
            // Attempt to extract username from the page
            await this.extractUsername();

            // Load settings from storage
            await this.loadSettings();

            this.loggingService.debug('Vote monitoring service initialized successfully', {
                username: this.userNick,
                enabled: this.enabled,
                checkInterval: this.checkInterval
            });

            return true;
        } catch (error) {
            this.loggingService.error('Failed to initialize vote monitoring service', {
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'Unknown',
                errorStack: error instanceof Error ? error.stack : undefined
            });
            return false;
        }
    }

    /**
     * Extract username from the page
     */
    private async extractUsername(): Promise<void> {
        try {
            // Check if we should force fresh extraction (24-hour invalidation)
            const lastExtracted = await storageService.getItem<number>('usernameLastExtracted', undefined, StorageArea.LOCAL);
            const shouldForceExtraction = !lastExtracted.success || 
                                        !lastExtracted.data || 
                                        (Date.now() - lastExtracted.data > 24 * 60 * 60 * 1000);
            
            this.loggingService.debug('Cache invalidation check', {
                lastExtracted: lastExtracted.data,
                shouldForceExtraction,
                cacheAge: lastExtracted.data ? (Date.now() - lastExtracted.data) / (1000 * 60 * 60) : 'N/A'
            });

            // If we have cached username and it's not expired, use it
            if (!shouldForceExtraction) {
                const cachedResult = await storageService.getItem<string>('userNick', undefined, StorageArea.LOCAL);
                if (cachedResult.success && cachedResult.data) {
                    this.userNick = cachedResult.data;
                    this.loggingService.debug('Using cached username (not expired)', { 
                        username: this.userNick,
                        cacheAge: (Date.now() - lastExtracted.data!) / (1000 * 60 * 60) + ' hours'
                    });
                    return;
                }
            }

            // Force fresh extraction or no valid cache
            this.loggingService.debug('Performing fresh username extraction', { 
                reason: shouldForceExtraction ? 'cache expired' : 'no valid cache' 
            });

            // Look for username in top navigation
            const topNavSelector = `#top-navigation > a[href*="${PATHS.BIRI}"]`;
            this.loggingService.debug('Attempting to extract username from top navigation', {
                selector: topNavSelector,
                currentUrl: window.location.href,
                pathBiri: PATHS.BIRI
            });

            const usernameElement = document.querySelector(topNavSelector);
            
            this.loggingService.debug('Username element search result', {
                elementFound: !!usernameElement,
                elementTagName: usernameElement?.tagName,
                elementHref: usernameElement?.getAttribute('href'),
                elementText: usernameElement?.textContent?.trim(),
                elementTitle: usernameElement?.getAttribute('title')
            });

            if (usernameElement) {
                const hrefAttribute = usernameElement.getAttribute('href');
                this.loggingService.debug('Processing href attribute', { 
                    href: hrefAttribute, 
                    pathBiri: PATHS.BIRI 
                });
                
                if (hrefAttribute && hrefAttribute.includes(PATHS.BIRI)) {
                    // Extract username from href like "/biri/straits" -> "straits"
                    const username = hrefAttribute.replace(PATHS.BIRI, '');
                    this.loggingService.debug('Username extraction from href', { 
                        originalHref: hrefAttribute,
                        pathBiri: PATHS.BIRI,
                        extractedUsername: username 
                    });
                    
                    if (username && username.length > 0) {
                        this.userNick = username;
                        this.loggingService.debug('Username successfully extracted from top navigation', { username });
                        
                        // Save to storage with timestamp
                        const saveResult = await storageService.setItem('userNick', username, StorageArea.LOCAL);
                        await storageService.setItem('usernameLastExtracted', Date.now(), StorageArea.LOCAL);
                        
                        this.loggingService.debug('Username saved to storage with timestamp', { 
                            success: saveResult, 
                            username,
                            timestamp: Date.now()
                        });
                        
                        // Send to background script
                        chrome.runtime.sendMessage({ username });
                        this.loggingService.debug('Username sent to background script', { username });
                        return;
                    } else {
                        this.loggingService.debug('Username extraction failed - empty username after processing href');
                    }
                } else {
                    this.loggingService.debug('Username extraction failed - href does not contain expected path', {
                        href: hrefAttribute,
                        expectedPath: PATHS.BIRI
                    });
                }
            } else {
                this.loggingService.debug('Username extraction failed - no matching element found in top navigation');
                
                // Try fallback selector in entry authors as alternative
                this.loggingService.debug('Attempting fallback username extraction from entry authors');
                const fallbackSelector = `a${SELECTORS.ENTRY_AUTHOR}[href^="${PATHS.BIRI}"]`;
                const fallbackElement = document.querySelector(fallbackSelector);
                
                this.loggingService.debug('Fallback element search result', {
                    selector: fallbackSelector,
                    elementFound: !!fallbackElement,
                    elementHref: fallbackElement?.getAttribute('href'),
                    elementText: fallbackElement?.textContent?.trim()
                });
                
                if (fallbackElement) {
                    const fallbackHref = fallbackElement.getAttribute('href');
                    if (fallbackHref) {
                        const fallbackUsername = fallbackHref.replace(PATHS.BIRI, '');
                        if (fallbackUsername && fallbackUsername.length > 0) {
                            this.userNick = fallbackUsername;
                            this.loggingService.debug('Username extracted from fallback method', { username: fallbackUsername });
                            
                            // Save to storage with timestamp
                            const saveResult = await storageService.setItem('userNick', fallbackUsername, StorageArea.LOCAL);
                            await storageService.setItem('usernameLastExtracted', Date.now(), StorageArea.LOCAL);
                            
                            this.loggingService.debug('Fallback username saved to storage with timestamp', { 
                                success: saveResult, 
                                username: fallbackUsername,
                                timestamp: Date.now()
                            });
                            
                            // Send to background script
                            chrome.runtime.sendMessage({ username: fallbackUsername });
                            this.loggingService.debug('Fallback username sent to background script', { username: fallbackUsername });
                            return;
                        }
                    }
                }
                
                // Log all potential username elements for debugging
                const allUserElements = document.querySelectorAll(`a[href*="${PATHS.BIRI}"]`);
                this.loggingService.debug('Found all potential username elements', { 
                    count: allUserElements.length,
                    elements: Array.from(allUserElements).map(el => ({
                        tagName: el.tagName,
                        href: el.getAttribute('href'),
                        text: el.textContent?.trim(),
                        title: el.getAttribute('title'),
                        parent: el.parentElement?.tagName
                    }))
                });
            }

            // If we couldn't extract it, try to get from storage as final fallback
            this.loggingService.debug('Attempting to load username from storage as final fallback');
            const result = await storageService.getItem<string>('userNick', undefined, StorageArea.LOCAL);
            
            this.loggingService.debug('Storage username retrieval result', { 
                success: result.success, 
                hasData: !!result.data,
                username: result.data 
            });
            
            if (result.success && result.data) {
                this.userNick = result.data;
                this.loggingService.debug('Username loaded from storage as fallback', { username: this.userNick });
            } else {
                this.loggingService.error('No username available - neither from page nor storage');
                throw new Error('Unable to extract or retrieve username');
            }
        } catch (error) {
            this.loggingService.error('Error extracting username', {
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'Unknown',
                currentUrl: window.location.href,
                pageTitle: document.title
            });
            throw error;
        }
    }

    /**
     * Load settings from storage
     */
    private async loadSettings(): Promise<void> {
        try {
            this.loggingService.debug('Loading vote monitoring settings from storage');
            
            // Load enabled state
            const enabledResult = await storageService.getItem<boolean>('voteMonitoringEnabled', undefined, StorageArea.SYNC);
            this.loggingService.debug('Vote monitoring enabled setting loaded', { 
                success: enabledResult.success, 
                value: enabledResult.data,
                hasData: enabledResult.data !== undefined
            });
            
            if (enabledResult.success && enabledResult.data !== undefined) {
                this.enabled = enabledResult.data;
                this.loggingService.debug('Vote monitoring enabled state updated', { enabled: this.enabled });
            } else {
                this.loggingService.debug('Using default enabled state', { enabled: this.enabled });
            }

            // Load interval setting
            const intervalResult = await storageService.getItem<number>('voteMonitoringInterval', undefined, StorageArea.SYNC);
            this.loggingService.debug('Vote monitoring interval setting loaded', { 
                success: intervalResult.success, 
                value: intervalResult.data,
                hasData: !!intervalResult.data
            });
            
            if (intervalResult.success && intervalResult.data) {
                this.checkInterval = intervalResult.data;
                this.loggingService.debug('Vote monitoring interval updated', { interval: this.checkInterval });
            } else {
                this.loggingService.debug('Using default interval', { interval: this.checkInterval });
            }
            
            this.loggingService.debug('Vote monitoring settings loaded successfully', {
                enabled: this.enabled,
                interval: this.checkInterval,
                username: this.userNick
            });
        } catch (error) {
            this.loggingService.error('Error loading vote monitoring settings', {
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'Unknown'
            });
        }
    }

    /**
     * Enable or disable vote monitoring
     */
    public async setEnabled(enabled: boolean): Promise<boolean> {
        try {
            this.loggingService.debug('Updating vote monitoring enabled state', { 
                oldValue: this.enabled, 
                newValue: enabled 
            });
            
            this.enabled = enabled;
            const saveResult = await storageService.setItem('voteMonitoringEnabled', enabled, StorageArea.SYNC);
            
            this.loggingService.debug('Vote monitoring enabled state saved to storage', { 
                success: saveResult, 
                enabled 
            });

            // Notify background script of the change
            chrome.runtime.sendMessage({
                action: 'updateVoteMonitoring',
                enabled: enabled
            });
            
            this.loggingService.debug('Vote monitoring enabled state change sent to background', { enabled });

            return true;
        } catch (error) {
            this.loggingService.error('Error updating vote monitoring enabled state', {
                error: error instanceof Error ? error.message : String(error),
                enabled,
                currentState: this.enabled
            });
            return false;
        }
    }

    /**
     * Set the checking interval
     */
    public async setCheckInterval(minutes: number): Promise<boolean> {
        try {
            this.loggingService.debug('Updating vote monitoring interval', { 
                oldValue: this.checkInterval, 
                newValue: minutes,
                adjustedValue: minutes < 1 ? 1 : minutes
            });
            
            if (minutes < 1) minutes = 1;
            this.checkInterval = minutes;
            
            const saveResult = await storageService.setItem('voteMonitoringInterval', minutes, StorageArea.SYNC);
            this.loggingService.debug('Vote monitoring interval saved to storage', { 
                success: saveResult, 
                interval: minutes 
            });

            // Notify background script of the change
            chrome.runtime.sendMessage({
                action: 'updateVoteMonitoring',
                interval: minutes
            });
            
            this.loggingService.debug('Vote monitoring interval change sent to background', { interval: minutes });

            return true;
        } catch (error) {
            this.loggingService.error('Error updating vote monitoring interval', {
                error: error instanceof Error ? error.message : String(error),
                requestedInterval: minutes,
                currentInterval: this.checkInterval
            });
            return false;
        }
    }

    /**
     * Get current settings
     */
    public getSettings(): { enabled: boolean, interval: number, username: string } {
        const settings = {
            enabled: this.enabled,
            interval: this.checkInterval,
            username: this.userNick
        };
        
        this.loggingService.debug('Vote monitoring settings requested', settings);
        return settings;
    }

    /**
     * Manually set username (for testing or when automatic extraction fails)
     */
    public async setUsername(username: string): Promise<boolean> {
        try {
            this.loggingService.debug('Manually setting username', { username });
            
            this.userNick = username;
            
            // Save to storage with timestamp
            const saveResult = await storageService.setItem('userNick', username, StorageArea.LOCAL);
            await storageService.setItem('usernameLastExtracted', Date.now(), StorageArea.LOCAL);
            
            this.loggingService.debug('Username manually saved to storage with timestamp', { 
                success: saveResult, 
                username,
                timestamp: Date.now()
            });
            
            // Send to background script
            chrome.runtime.sendMessage({ username });
            this.loggingService.debug('Username manually sent to background script', { username });
            
            return true;
        } catch (error) {
            this.loggingService.error('Error manually setting username', {
                error: error instanceof Error ? error.message : String(error),
                username
            });
            return false;
        }
    }

    /**
     * Get cached username information
     */
    public async getCachedUsernameInfo(): Promise<{
        username: string | null;
        lastExtracted: number | null;
        cacheAge: string | null;
        isExpired: boolean;
    }> {
        try {
            const usernameResult = await storageService.getItem<string>('userNick', undefined, StorageArea.LOCAL);
            const timestampResult = await storageService.getItem<number>('usernameLastExtracted', undefined, StorageArea.LOCAL);
            
            const username = usernameResult.success ? (usernameResult.data || null) : null;
            const lastExtracted = timestampResult.success ? (timestampResult.data || null) : null;
            
            let cacheAge: string | null = null;
            let isExpired = false;
            
            if (lastExtracted) {
                const ageMs = Date.now() - lastExtracted;
                const ageHours = ageMs / (1000 * 60 * 60);
                
                if (ageHours < 1) {
                    cacheAge = `${Math.round(ageMs / (1000 * 60))} dakika`;
                } else if (ageHours < 24) {
                    cacheAge = `${Math.round(ageHours)} saat`;
                } else {
                    cacheAge = `${Math.round(ageHours / 24)} gün`;
                }
                
                isExpired = ageMs > 24 * 60 * 60 * 1000;
            }
            
            this.loggingService.debug('Retrieved cached username info', {
                username,
                lastExtracted,
                cacheAge,
                isExpired
            });
            
            return {
                username,
                lastExtracted,
                cacheAge,
                isExpired
            };
        } catch (error) {
            this.loggingService.error('Error getting cached username info', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                username: null,
                lastExtracted: null,
                cacheAge: null,
                isExpired: true
            };
        }
    }

    /**
     * Clear cached username data
     */
    public async clearUsernameCache(): Promise<boolean> {
        try {
            this.loggingService.debug('Clearing username cache');
            
            // Clear from storage
            await storageService.removeItem('userNick', StorageArea.LOCAL);
            await storageService.removeItem('usernameLastExtracted', StorageArea.LOCAL);
            
            // Clear from instance
            this.userNick = '';
            
            this.loggingService.debug('Username cache cleared successfully');
            return true;
        } catch (error) {
            this.loggingService.error('Error clearing username cache', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Force fresh username extraction
     */
    public async refreshUsername(): Promise<boolean> {
        try {
            this.loggingService.debug('Forcing fresh username extraction');
            
            // Clear cache first
            await this.clearUsernameCache();
            
            // Extract fresh username
            await this.extractUsername();
            
            this.loggingService.debug('Fresh username extraction completed', { 
                username: this.userNick 
            });
            
            return !!this.userNick;
        } catch (error) {
            this.loggingService.error('Error refreshing username', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
}