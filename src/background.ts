/**
 * Ekşi Artı Background Script
 * Handles extension initialization and background operations
 */

import { preferencesManager } from './services/features/preferences/preferences-manager';
import {LoggingService} from './services/shared/logging-service';
import {Endpoints} from "./constants";
import {BackgroundBlockingService} from './services/features/blocking/background-blocking-service';
import {CommunicationService} from './services/shared/communication-service';

const loggingService = new LoggingService();
const communicationService = new CommunicationService(loggingService);
let blockingService: BackgroundBlockingService;

// Global flag to prevent duplicate setup
let voteMonitoringSetup = false;

/**
 * Initialize extension
 */
async function initializeExtension() {
    try {
        loggingService.debug('Initializing extension...');
        // Initialize preferences
        await preferencesManager.initialize();
        const preferences = preferencesManager.getPreferences();

        // Set up logger based on preferences
        loggingService.debug('Setting debug mode', { enableDebugMode: preferences.enableDebugMode });
        loggingService.setDebugMode(preferences.enableDebugMode);

        // Initialize blocking service
        loggingService.debug('Initializing BackgroundBlockingService...');
        blockingService = new BackgroundBlockingService(loggingService);

        // Set up vote monitoring
        loggingService.debug('Calling setupVoteMonitoring...');
        setupVoteMonitoring();

        loggingService.debug('Extension initialized successfully', { version: chrome.runtime.getManifest().version });

        // Set up message handlers
        loggingService.debug('Registering message handlers...');
        setupMessageHandlers();

        // Check for saved blocking state and auto-resume
        loggingService.debug('Checking and resuming blocking if needed...');
        await blockingService.checkAndResumeBlocking();

        loggingService.debug('Initialization complete.');
        return true;
    } catch (error) {
        loggingService.error('Failed to initialize extension', error);
        return false;
    }
}

/**
 * Set up message handlers for communication between scripts
 */
function setupMessageHandlers() {
    loggingService.debug('Setting up message handlers for communication...');
    // Register blocking-related handlers
    communicationService.registerHandler('startBlocking', async (message) => {
        loggingService.debug('Received startBlocking message', message);
        try {
            const result = await blockingService.startBlocking(
                message.entryId,
                message.blockType,
                message.includeThreadBlocking || false
            );
            loggingService.debug('Blocking started', result);
            return CommunicationService.createSuccessResponse(result);
        } catch (error) {
            loggingService.error('Error starting blocking operation', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('stopBlocking', () => {
        loggingService.debug('Received stopBlocking message');
        blockingService.stopBlocking();
        loggingService.debug('Blocking stopped');
        return CommunicationService.createSuccessResponse();
    });

    communicationService.registerHandler('forceStopBlocking', () => {
        loggingService.debug('Received forceStopBlocking message');
        blockingService.forceStopBlocking();
        loggingService.debug('Blocking force-stopped');
        return CommunicationService.createSuccessResponse();
    });

    communicationService.registerHandler('resetStuckState', async () => {
        loggingService.debug('Received resetStuckState message');
        try {
            const result = await blockingService.resetStuckState();
            loggingService.debug('Stuck state reset', result);
            return CommunicationService.createSuccessResponse(result);
        } catch (error) {
            loggingService.error('Error resetting stuck state', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('getBlockingStatus', () => {
        loggingService.debug('Received getBlockingStatus message');
        return CommunicationService.createSuccessResponse(blockingService.getStatus());
    });

    communicationService.registerHandler('checkAndResumeBlocking', async () => {
        loggingService.debug('Received checkAndResumeBlocking message');
        try {
            await blockingService.checkAndResumeBlocking();
            loggingService.debug('Checked and resumed blocking if needed');
            return CommunicationService.createSuccessResponse();
        } catch (error) {
            loggingService.error('Error checking/resuming blocking', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    // Register preferences-related handlers
    communicationService.registerHandler('getPreferences', () => {
        loggingService.debug('Received getPreferences message');
        return CommunicationService.createSuccessResponse(preferencesManager.getPreferences());
    });

    communicationService.registerHandler('savePreferences', async (message) => {
        loggingService.debug('Received savePreferences message', message);
        try {
            const success = await preferencesManager.savePreferences(message.data);
            loggingService.debug('Preferences saved', { success });
            return CommunicationService.createSuccessResponse({ success });
        } catch (error) {
            loggingService.error('Error saving preferences', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    communicationService.registerHandler('resetPreferences', async () => {
        loggingService.debug('Received resetPreferences message');
        try {
            const success = await preferencesManager.resetPreferences();
            loggingService.debug('Preferences reset', { success });
            return CommunicationService.createSuccessResponse({ success });
        } catch (error) {
            loggingService.error('Error resetting preferences', error);
            return CommunicationService.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    });

    // Register utility handlers
    communicationService.registerHandler('getVersion', () => {
        loggingService.debug('Received getVersion message');
        return CommunicationService.createSuccessResponse({
            version: chrome.runtime.getManifest().version
        });
    });

    communicationService.registerHandler('getLogs', () => {
        loggingService.debug('Received getLogs message');
        return CommunicationService.createSuccessResponse({
            logs: loggingService.getLogs()
        });
    });

    loggingService.debug('Message handlers registered successfully');
}

/**
 * Set up vote monitoring (existing functionality)
 */
function setupVoteMonitoring() {
    loggingService.debug('setupVoteMonitoring called');
    // Prevent duplicate setup
    if (voteMonitoringSetup) {
        loggingService.debug('Vote monitoring already set up, skipping duplicate setup');
        return;
    }

    loggingService.debug('Setting up vote monitoring');

    // Set up alarm for checking votes
    chrome.alarms.create('checkForNewVote', {
        periodInMinutes: 1 // Default to 1 minute
    });

    loggingService.debug('Vote monitoring alarm created', {
        alarmName: 'checkForNewVote',
        periodInMinutes: 1
    });

    // Mark vote monitoring as set up
    voteMonitoringSetup = true;
    loggingService.debug('Vote monitoring setup completed');
}

/**
 * Check for new votes for a user
 */
async function checkForNewVotes(username: string): Promise<void> {
    try {
        loggingService.debug('Starting vote check', { username });
        
        if (!username || username === 'unknown') {
            loggingService.debug('Cannot check votes - no valid username');
            return;
        }

        // Fetch the user's vote history (first page)
        const voteHistoryUrl = Endpoints.VOTE_HISTORY(username, 1);
        loggingService.debug('Fetching vote history', { url: voteHistoryUrl });
        
        const response = await fetch(voteHistoryUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            loggingService.error('Failed to fetch vote history', {
                status: response.status,
                statusText: response.statusText,
                url: voteHistoryUrl
            });
            return;
        }

        const html = await response.text();
        loggingService.debug('Vote history response received', { 
            responseLength: html.length,
            username 
        });

        // Extract the most recent voted item from the HTML
        const mostRecentVotedItem = extractMostRecentVotedItem(html);
        loggingService.debug('Extracted most recent voted item', { 
            mostRecentVotedItem,
            username 
        });

        if (mostRecentVotedItem) {
            // Get the last known voted item from storage
            const lastVotedRes = await chrome.storage.local.get('lastVotedItem');
            const lastKnownVotedItem = lastVotedRes.lastVotedItem || null;

            loggingService.debug('Comparing voted items', {
                mostRecentVotedItem,
                lastKnownVotedItem,
                isNewVote: mostRecentVotedItem !== lastKnownVotedItem
            });

            // If this is a new vote, update storage and potentially notify
            if (mostRecentVotedItem !== lastKnownVotedItem) {
                await chrome.storage.local.set({ 
                    lastVotedItem: mostRecentVotedItem,
                    lastVoteCheckTime: Date.now()
                });
                
                loggingService.info('New vote detected!', {
                    username,
                    newVotedItem: mostRecentVotedItem,
                    previousVotedItem: lastKnownVotedItem
                });

                // Show notification for new vote
                try {
                    // Extract entry title without the timestamp for cleaner display
                    const cleanTitle = mostRecentVotedItem.replace(/\s*\(\d+\)$/, ''); // Remove (entryId)
                    
                    const notificationOptions = {
                        type: 'basic' as const,
                        iconUrl: 'icons/icon48.png',
                        title: '🗳️ Yeni Oy Tespit Edildi!',
                        message: `"${cleanTitle}" başlığına oy verildi`,
                        requireInteraction: true, // Keep notification visible until user interacts
                        priority: 1 // Higher priority for better visibility
                    };
                    
                    const notificationId = `newVote_${Date.now()}`;
                    await chrome.notifications.create(notificationId, notificationOptions);
                    loggingService.debug('Vote notification sent', {
                        username,
                        votedItem: mostRecentVotedItem,
                        cleanTitle,
                        notificationId
                    });
                } catch (notificationError) {
                    loggingService.error('Failed to send vote notification', {
                        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
                        username,
                        votedItem: mostRecentVotedItem
                    });
                }
            } else {
                loggingService.debug('No new votes detected', { username });
            }
        } else {
            loggingService.debug('No voted items found in response', { username });
        }

    } catch (error) {
        loggingService.error('Error checking for new votes', {
            username,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined
        });
    }
}

/**
 * Extract the most recent voted item from vote history HTML
 */
function extractMostRecentVotedItem(html: string): string | null {
    try {
        // Look for the topic title in the h1 tag and entry ID in the li tag
        // Method 1: Try to get title from h1 data-title attribute
        const titleFromDataAttr = html.match(/<h1[^>]*data-title="([^"]+)"[^>]*>/);
        
        // Method 2: Try to get title from span with itemprop="name"
        const titleFromItemprop = html.match(/<span[^>]*itemprop="name"[^>]*>([^<]+)<\/span>/);
        
        // Method 3: Try to get title from h1 > a > span structure
        const titleFromStructure = html.match(/<h1[^>]*>.*?<a[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<\/a>.*?<\/h1>/s);
        
        // Get entry ID from the first li with data-id
        const entryIdMatch = html.match(/<li[^>]*data-id="(\d+)"[^>]*>/);
        
        let topicTitle = null;
        let entryId = null;
        
        // Try different methods to get the title
        if (titleFromDataAttr) {
            topicTitle = titleFromDataAttr[1].trim();
        } else if (titleFromItemprop) {
            topicTitle = titleFromItemprop[1].trim();
        } else if (titleFromStructure) {
            topicTitle = titleFromStructure[1].trim();
        }
        
        // Get entry ID
        if (entryIdMatch) {
            entryId = entryIdMatch[1];
        }
        
        if (topicTitle && entryId) {
            const votedItem = `${topicTitle} (${entryId})`;
            
            loggingService.debug('Successfully extracted voted item from vote history structure', {
                entryId,
                topicTitle,
                votedItem,
                extractionMethod: titleFromDataAttr ? 'data-title' : titleFromItemprop ? 'itemprop' : 'structure'
            });
            
            return votedItem;
        }
        
        // Fallback: try the old method for backward compatibility
        const fallbackTitleRegex = /<a[^>]*href="[^"]*\/([^\/\?"]+)(?:\?[^"]*)?(?:#\d+)?"[^>]*>([^<]+)<\/a>/g;
        const fallbackEntryRegex = /<a[^>]*href="[^"]*\/entry\/(\d+)[^"]*"[^>]*>/;
        
        let fallbackMatch;
        while ((fallbackMatch = fallbackTitleRegex.exec(html)) !== null) {
            const potentialTitle = fallbackMatch[2].trim();
            // Skip datetime patterns and short/common texts
            if (!potentialTitle.match(/^\d{2}\.\d{2}\.\d{4}/) && 
                potentialTitle.length > 3 &&
                !potentialTitle.includes('sayfa') &&
                !potentialTitle.includes('önceki') &&
                !potentialTitle.includes('sonraki')) {
                
                const entryMatch = html.match(fallbackEntryRegex);
                if (entryMatch) {
                    const votedItem = `${potentialTitle} (${entryMatch[1]})`;
                    
                    loggingService.debug('Successfully extracted voted item (fallback method)', {
                        entryId: entryMatch[1],
                        topicTitle: potentialTitle,
                        votedItem
                    });
                    
                    return votedItem;
                }
            }
        }
        
        loggingService.debug('No topic title found in vote history HTML', {
            hadDataTitle: !!titleFromDataAttr,
            hadItemprop: !!titleFromItemprop,
            hadStructure: !!titleFromStructure,
            hadEntryId: !!entryIdMatch
        });
        return null;
    } catch (error) {
        loggingService.error('Error extracting voted item from HTML', error);
        return null;
    }
}

// Handle extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        await initializeExtension();

        if (details.reason === 'install') {
            // First install
            loggingService.debug('Extension installed');
            // Options page is available via right-click on extension icon
        } else if (details.reason === 'update') {
            // Extension updated
            const currentVersion = chrome.runtime.getManifest().version;
            const previousVersion = details.previousVersion;
            loggingService.debug('Extension updated', { previousVersion, currentVersion });
        }
    } catch (error) {
        loggingService.error('Error during extension installation', error);
    }
});

// Initialize when background script loads
initializeExtension().catch(error => {
    loggingService.error('Failed to initialize extension on load', error);
});

// Listen for browser startup
chrome.runtime.onStartup.addListener(() => {
    initializeExtension().catch(error => {
        loggingService.error('Failed to initialize extension on browser startup', error);
    });
});

chrome.action.onClicked.addListener((tab) => {
    // Extension icon clicked - you can add your preferred action here
    // For now, we'll show a notification instead of opening options
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Ekşi Artı',
        message: 'Extension is active! Right-click the icon to access options.'
    });
});

// Listen for vote checking alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkForNewVote') {
        // Retrieve last voted item and username from storage
        let lastVotedItem = 'unknown';
        let username = 'unknown';
        try {
            const [lastVotedRes, userNickRes] = await Promise.all([
                chrome.storage.local.get('lastVotedItem'),
                chrome.storage.local.get('userNick'),
            ]);
            if (lastVotedRes && lastVotedRes.lastVotedItem) lastVotedItem = lastVotedRes.lastVotedItem;
            if (userNickRes && userNickRes.userNick) username = userNickRes.userNick;
        } catch (e) {
            loggingService.error('Error retrieving last voted item or username', e);
        }
        loggingService.debug('Vote checking alarm fired', {
            alarmName: alarm.name,
            scheduledTime: alarm.scheduledTime,
            firedAt: Date.now(),
            lastVotedItem,
            username,
        });
        
        // Actually check for new votes
        await checkForNewVotes(username);
    }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('newVote_')) {
        loggingService.debug('Vote notification clicked', { notificationId });
        
        // Get the entry ID from storage to construct the URL
        chrome.storage.local.get('lastVotedItem').then((result) => {
            if (result.lastVotedItem) {
                // Extract entry ID from the voted item string like "Title (123456)"
                const entryIdMatch = result.lastVotedItem.match(/\((\d+)\)$/);
                if (entryIdMatch) {
                    const entryId = entryIdMatch[1];
                    const entryUrl = Endpoints.ENTRY_URL(entryId);
                    
                    loggingService.debug('Opening entry URL from notification', {
                        entryId,
                        entryUrl,
                        votedItem: result.lastVotedItem
                    });
                    
                    // Open the entry in a new tab
                    chrome.tabs.create({ url: entryUrl });
                } else {
                    loggingService.error('Could not extract entry ID from voted item', {
                        votedItem: result.lastVotedItem
                    });
                }
            }
        }).catch((error) => {
            loggingService.error('Error retrieving voted item for notification click', error);
        });
        
        // Clear the notification
        chrome.notifications.clear(notificationId);
    }
});